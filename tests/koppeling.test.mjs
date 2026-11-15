// Tests voor de koppeling met Link & Lead One (lees-API v1), met een nep-CMS (geen netwerk):
// inhoud lezen, verversen, terugval bij een storing, artikelen, sitemap, redirects en de voorvertoning.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { laadAlles, normaliseerArtikel, sorteerArtikelen } from '../scripts/lib/cms-v1.mjs'
import { verwerk, maakInhoudsbron } from '../scripts/lib/app.mjs'
import { deelHoofdtekst, fotoMaat } from '../scripts/lib/artikelen.mjs'
import { voorvertoningsLinks } from '../scripts/lib/pagina.mjs'
import { tokenVorm, tokenSecondenGeldig, veiligPad, leesCookies } from '../scripts/lib/voorvertoning.mjs'

const CMS = 'https://cms.test'
const TOKEN_GELDIG = `${Math.floor(Date.now() / 1000) + 1800}.${'a'.repeat(64)}`
const TOKEN_ANDER = `${Math.floor(Date.now() / 1000) + 1800}.${'b'.repeat(64)}`

function site() {
  return {
    versie: 'v1',
    site: { id: '11111111-2222-3333-4444-555555555555', naam: 'Tandarts Test', domein: 'test.nl', status: 'live', taal: 'nl', talen: ['nl'] },
    merk: { naam: 'Tandarts Test', contact: { telefoon: '0174 622 373' } },
    navigatie: { hoofd: [{ titel: 'Contact', href: '/contact' }], footer: [], juridisch: [], actie: { titel: 'Bel de praktijk', href: 'tel:+31174622373' } },
    design_tokens: {},
    redirects: [{ van: '/oud', naar: '/contact', status: 301 }],
  }
}
const blok = (type, inhoud, bg = null) => ({ id: type, type, bg, gedeeld: null, inhoud })
const artikel = (slug, datum, extra = {}) => ({ id: slug, slug, titel: `Artikel ${slug}`, rubriek: 'Mondzorg', samenvatting: `Over ${slug}`, antwoordblok: 'Kort.', hoofdtekst: 'Intro.\n\nTussenkop\n\nSlot.', foto: 'https://images.pexels.com/photos/1/a.jpeg', auteur: 'Praktijk', gepubliceerd_op: datum, ...extra })

function nepCms(state) {
  const verzoeken = []
  const fetch = async (url, init) => {
    verzoeken.push({ url, headers: init?.headers ?? {} })
    if (state.plat) throw new Error('netwerkfout')
    const u = new URL(url)
    const p = u.pathname.replace('/api/v1/', '')
    const json = (b, status = 200) => ({ status, json: async () => b })
    if (init?.headers?.authorization !== 'Bearer cms_l_test') return json({ ok: false }, 401)
    if (p === 'site') return json(site())
    if (p === 'paginas')
      return json({
        versie: 'v1',
        paginas: [
          { slug: '/', titel: 'Home', beschrijving: 'Welkom', seo: { titel: 'Home', beschrijving: 'Welkom', noindex: false, canonical: null }, blokken: [blok('header', { heading: state.kop ?? 'Gepubliceerde kop' }, 'wit'), blok('artikelen_grid', { titel: 'Nieuws', maximaal: 2 })], records: { artikelen: state.artikelen } },
          { slug: '/contact', titel: 'Contact', seo: {}, blokken: [blok('header', { heading: 'Contact' })], records: {} },
          { slug: '/verborgen', titel: 'Verborgen', seo: { noindex: true }, blokken: [blok('header', { heading: 'Verborgen' })], records: {} },
          { slug: '/werk/:slug', titel: 'Sjabloon', seo: {}, blokken: [], records: {} },
        ],
        volgende: null,
      })
    if (p === 'collecties/artikelen') return json({ versie: 'v1', collectie: { sleutel: 'artikelen' }, records: state.artikelen.map((a) => ({ id: a.id, slug: a.slug, titel: a.titel, collectie: 'artikelen', data: a, tags: [], gepubliceerd_op: a.gepubliceerd_op })), totaal: state.artikelen.length, volgende: null })
    if (p === 'pagina') {
      const v = u.searchParams.get('voorvertoning')
      const pad = u.searchParams.get('pad')
      if (pad !== '/' && pad !== '/contact') return json({ ok: false }, 404)
      const concept = v === TOKEN_GELDIG
      return json({ versie: 'v1', taal: 'nl', concept, pagina: { slug: pad, titel: 'Home', seo: {}, blokken: [blok('header', { heading: concept ? 'CONCEPTKOP' : 'Gepubliceerde kop' })], records: {} } })
    }
    return json({ ok: false }, 404)
  }
  return { fetch, verzoeken }
}

function opzet(state = {}) {
  state.artikelen ??= [artikel('oud', '2026-01-01'), artikel('nieuw', '2026-11-15'), artikel('zonder-datum', null)]
  const nep = nepCms(state)
  const cfg = { cmsUrl: CMS, token: 'cms_l_test', fetch: nep.fetch }
  let klok = 1_000_000
  const momentopname = { site: { id: '', naam: 'Momentopname', merk: { naam: 'Momentopname' }, navigatie: {}, redirects: [] }, paginas: [{ slug: '/', titel: 'Home', beschrijving: '', blokken: [{ type: 'header', bg: 'wit', content: { heading: 'Kop uit de momentopname' } }], records: {} }], artikelen: [] }
  const bron = maakInhoudsbron({ cfg, momentopname, nu: () => klok })
  const o = { bron, cfg, siteUrl: 'https://test.nl', cmsUrl: CMS, nu: () => Date.now() }
  const vraag = (pad, { cookies = {} } = {}) => {
    const u = new URL(pad, 'https://test.nl')
    return verwerk({ pad: u.pathname, zoek: u.searchParams, cookies }, o)
  }
  return { state, nep, vraag, tik: (ms) => (klok += ms) }
}

test('lees-API v1: juiste endpoints, token en versieheader; artikelen nieuwste eerst', async () => {
  const { nep } = opzet()
  const inhoud = await laadAlles({ cmsUrl: CMS, token: 'cms_l_test', fetch: nep.fetch })
  assert.ok(nep.verzoeken.every((v) => v.headers['x-cms-api-versie'] === 'v1' && v.url.startsWith(CMS + '/api/v1/')))
  assert.deepEqual(inhoud.artikelen.map((a) => a.slug), ['nieuw', 'oud', 'zonder-datum'])
  assert.ok(!inhoud.paginas.some((p) => p.slug.includes(':slug')), 'detailsjablonen horen niet bij de pagina\'s')
})

test('pagina uit het CMS, met publieke cache van 60 s en zonder token in de HTML', async () => {
  const { vraag } = opzet()
  const r = await vraag('/')
  assert.equal(r.status, 200)
  assert.match(r.body, /Gepubliceerde kop/)
  assert.match(r.headers['cache-control'], /s-maxage=60/)
  assert.doesNotMatch(r.body, /cms_l_test/)
})

test('gepubliceerde wijziging is na de cacheperiode zichtbaar', async () => {
  const { vraag, state, tik } = opzet()
  assert.match((await vraag('/')).body, /Gepubliceerde kop/)
  state.kop = 'Nieuwe kop'
  assert.match((await vraag('/')).body, /Gepubliceerde kop/, 'binnen 30 s nog uit het geheugen')
  tik(31_000)
  assert.match((await vraag('/')).body, /Nieuwe kop/)
})

test('CMS onbereikbaar: laatst goede inhoud, anders de momentopname — nooit kapot', async () => {
  const a = opzet()
  await a.vraag('/')
  a.state.plat = true
  a.tik(31_000)
  const r = await a.vraag('/')
  assert.equal(r.status, 200)
  assert.match(r.body, /Gepubliceerde kop/)
  assert.match(r.headers['cache-control'], /s-maxage=10/)

  const b = opzet({ plat: true })
  const r2 = await b.vraag('/')
  assert.equal(r2.status, 200)
  assert.match(r2.body, /Kop uit de momentopname/)
})

test('artikeloverzicht, artikel en artikelblok', async () => {
  const { vraag } = opzet()
  const lijst = await vraag('/artikelen')
  assert.equal(lijst.status, 200)
  assert.ok(lijst.body.indexOf('/artikelen/nieuw') < lijst.body.indexOf('/artikelen/oud'), 'nieuwste eerst')
  const a = await vraag('/artikelen/nieuw')
  assert.equal(a.status, 200)
  assert.match(a.body, /<h1[^>]*>Artikel nieuw<\/h1>/)
  assert.match(a.body, /<h2>Tussenkop<\/h2>/)
  assert.match(a.body, /Kort antwoord/)
  assert.match(a.body, /"@type":"Article"/)
  assert.match(a.body, /images\.pexels\.com/)
  assert.equal((await vraag('/artikelen/bestaat-niet')).status, 404)
  const home = await vraag('/')
  assert.equal((home.body.match(/class="artikel-kaart"/g) ?? []).length, 2, 'maximaal uit het blok')
})

test('sitemap: CMS-pagina\'s en artikelen, zonder noindex en sjablonen', async () => {
  const { vraag } = opzet()
  const r = await vraag('/sitemap.xml')
  assert.match(r.headers['content-type'], /xml/)
  for (const pad of ['/', '/contact', '/artikelen', '/artikelen/nieuw', '/artikelen/oud']) assert.ok(r.body.includes(`<loc>https://test.nl${pad === '/' ? '/' : pad}</loc>`), pad)
  assert.doesNotMatch(r.body, /verborgen|:slug/)
})

test('redirects uit het CMS en 404', async () => {
  const { vraag } = opzet()
  const r = await vraag('/oud')
  assert.equal(r.status, 301)
  assert.equal(r.headers.location, '/contact')
  assert.equal((await vraag('/bestaat-niet')).status, 404)
})

test('voorvertoning: geldig token toont het concept met balk, privé en noindex', async () => {
  const { vraag } = opzet()
  const r = await vraag(`/__voorvertoning?pad=/&token=${TOKEN_GELDIG}`)
  assert.equal(r.status, 200, 'het CMS controleert 200 op ?pad=/')
  assert.match(r.body, /CONCEPTKOP/)
  assert.match(r.body, /Voorbeeld, niet gepubliceerd/)
  assert.equal(r.headers['cache-control'], 'private, no-store')
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow')
  assert.match(r.body, /<meta name="robots" content="noindex/)
  assert.match(r.headers['set-cookie'], /HttpOnly; Secure; SameSite=None; Partitioned/)
  assert.match(r.body, /href="\/__voorvertoning\?pad=%2Fcontact"/, 'doorklikken blijft in het voorbeeld')
  assert.doesNotMatch(r.body, /meet\.js/, 'voorbeelden tellen niet mee in de statistieken')
})

test('voorvertoning ingesloten in de CMS-editor: geen eigen balk, doorklikken blijft ingesloten', async () => {
  const { vraag } = opzet()
  const r = await vraag(`/__voorvertoning?pad=/&token=${TOKEN_GELDIG}&ingesloten=1`)
  assert.equal(r.status, 200)
  assert.match(r.body, /CONCEPTKOP/)
  assert.doesNotMatch(r.body, /Voorbeeld, niet gepubliceerd|met-voorbeeldbalk/)
  assert.match(r.body, /href="\/__voorvertoning\?pad=%2Fcontact&amp;ingesloten=1"/)
  assert.equal(r.headers['cache-control'], 'private, no-store')
})

test('voorvertoning: bezoekers zien nooit een concept', async () => {
  const { vraag } = opzet()
  await vraag(`/__voorvertoning?pad=/&token=${TOKEN_GELDIG}`)
  const gewoon = await vraag('/', { cookies: { vb_voorvertoning: TOKEN_GELDIG } })
  assert.doesNotMatch(gewoon.body, /CONCEPTKOP|Voorbeeld, niet gepubliceerd/)
  assert.match(gewoon.headers['cache-control'], /public/)
})

test('voorvertoning: ongeldig, verlopen of ontbrekend token → gepubliceerde pagina (geen 404)', async () => {
  const { vraag } = opzet()
  for (const url of [`/__voorvertoning?pad=/contact&token=${TOKEN_ANDER}`, '/__voorvertoning?pad=/contact&token=123.abc', `/__voorvertoning?pad=/contact&token=1000000000.${'a'.repeat(64)}`, '/__voorvertoning?pad=/contact']) {
    const r = await vraag(url)
    assert.equal(r.status, 307, url)
    assert.equal(r.headers.location, '/contact')
    assert.equal(r.headers['cache-control'], 'private, no-store')
  }
  assert.equal((await vraag('/__voorvertoning?pad=//evil.example')).headers.location, '/', 'alleen interne paden')
})

test('voorvertoning: doorklikken met cookie, en sluiten', async () => {
  const { vraag } = opzet()
  const r = await vraag('/__voorvertoning?pad=/contact', { cookies: { vb_voorvertoning: TOKEN_GELDIG } })
  assert.equal(r.status, 200)
  assert.match(r.body, /Voorbeeld, niet gepubliceerd/)
  const art = await vraag('/__voorvertoning?pad=/artikelen/nieuw', { cookies: { vb_voorvertoning: TOKEN_GELDIG } })
  assert.equal(art.status, 200, 'niet-CMS-pagina: gepubliceerde versie met balk')
  const s = await vraag('/__voorvertoning/sluiten?pad=/contact')
  assert.equal(s.status, 307)
  assert.equal(s.headers.location, '/contact')
  assert.match(s.headers['set-cookie'], /Max-Age=0/)
})

test('hoofdtekst: "## kop" en losse korte regel worden tussenkop', () => {
  const d = deelHoofdtekst('Eerste alinea zonder punt\n\nKorte kop\n\nGewone zin.\n\n## Expliciet\n\nVraag als kop?\n\n- lijstje\n\nLaatste regel zonder punt')
  assert.deepEqual(d.map((x) => x.soort), ['alinea', 'kop', 'alinea', 'kop', 'kop', 'alinea', 'alinea'])
  assert.equal(d[3].tekst, 'Expliciet')
})

test('hulpjes: token, pad, cookies, links en fotomaat', () => {
  assert.ok(tokenVorm(TOKEN_GELDIG))
  assert.ok(!tokenVorm('abc'))
  assert.ok(tokenSecondenGeldig(TOKEN_GELDIG) > 0 && tokenSecondenGeldig(TOKEN_GELDIG) <= 3600)
  assert.equal(veiligPad('//x.nl'), null)
  assert.equal(veiligPad('/a?b=1'), '/a?b=1')
  assert.deepEqual(leesCookies('a=1; vb_voorvertoning=x'), { a: '1', vb_voorvertoning: 'x' })
  assert.equal(voorvertoningsLinks('<a href="/spoed#a"><link href="/styles.css">'), '<a href="/__voorvertoning?pad=%2Fspoed#a"><link href="/styles.css">')
  assert.match(fotoMaat('https://images.pexels.com/photos/1/a.jpeg?x=1', 480), /w=480/)
  assert.equal(fotoMaat('https://elders.nl/a.jpg', 480), 'https://elders.nl/a.jpg')
  assert.doesNotMatch(fotoMaat('https://images.pexels.com/photos/1/a.jpeg?auto=compress&w=1600&h=900&fit=crop', 480), /h=900/)
  assert.equal(normaliseerArtikel({ slug: '../x', data: { titel: 'X' } }), null)
  assert.deepEqual(sorteerArtikelen([{ datum: '' }, { datum: '2026-01-01' }]).map((a) => a.datum), ['2026-01-01', ''])
})
