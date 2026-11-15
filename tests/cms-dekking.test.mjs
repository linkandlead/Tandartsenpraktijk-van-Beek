// Tests voor wat vóór de volledige koppeling nog vast in de code stond: vaste teksten (Site > Teksten),
// standaard-SEO, organisatie (JSON-LD), huisstijlkleuren, meten uit, socials en slogan. Plus de
// headers van de voorvertoning (B-110: alleen het CMS mag /__voorvertoning in een frame tonen).
// Zonder ingevulde CMS-waarden moet de uitvoer gelijk blijven aan de standaard.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderPagina, organisatieJsonLd } from '../scripts/lib/pagina.mjs'
import { renderBlok } from '../scripts/lib/blokken.mjs'
import { normaliseerSite } from '../scripts/lib/cms-v1.mjs'
import { verwerk, maakInhoudsbron } from '../scripts/lib/app.mjs'
import { tekst, tekstLink, STANDAARD_TEKSTEN, TEKST_SLEUTELS } from '../scripts/lib/teksten.mjs'
import { kleurStijl } from '../scripts/lib/schil.mjs'
import { headerRoutes, csp, voorvertoningCsp, cmsOrigin } from '../scripts/lib/beveiliging.mjs'
import { readFileSync } from 'node:fs'

const basisSite = (extra = {}) => ({
  id: 'site-1',
  naam: 'Tandarts Van Beek',
  merk: { naam: 'Tandarts Van Beek', contact: { telefoon: '0174 622 373', adres: 'Groenelaan 128', postcode_plaats: '2675 RS Honselersdijk' } },
  navigatie: { hoofd: [{ titel: 'Contact', href: '/contact' }], footer: [], juridisch: [] },
  design_tokens: {},
  redirects: [],
  ...extra,
})
const pagina = (extra = {}) => ({ slug: '/contact', titel: 'Contact', beschrijving: '', blokken: [{ type: 'header', content: { heading: 'Contact' } }], records: {}, ...extra })
const render = (site, p = pagina(), extra = {}) => renderPagina(p, { site, siteUrl: 'https://test.nl', cmsUrl: 'https://cms.test', ...extra })
const ctx = (site) => ({ index: 1, isEersteHeader: false, records: {}, slug: '/t', paginaTitel: 'T', site })

test('teksten: zonder CMS-waarde de standaard, met CMS-waarde die tekst', () => {
  assert.equal(tekst({}, 'spoed.label'), 'Spoed')
  assert.equal(tekst({ teksten: { 'spoed.label': 'Spoedhulp' } }, 'spoed.label'), 'Spoedhulp')
  assert.equal(tekst({ teksten: { 'spoed.label': '   ' } }, 'spoed.label'), 'Spoed', 'leeg = standaard')
  assert.equal(tekstLink({ teksten: { 'spoed.link': 'javascript:alert(1)' } }, 'spoed.link'), '/spoed', 'onveilige link → standaard')
  assert.equal(tekstLink({ teksten: { 'spoed.link': '/acuut' } }, 'spoed.link'), '/acuut')
  for (const k of TEKST_SLEUTELS) assert.match(k, /^[a-z0-9][a-z0-9_.-]{0,79}$/, `geldige CMS-sleutel: ${k}`)
})

test('cms/teksten.json meldt precies de sleutels aan die de site gebruikt', () => {
  const manifest = JSON.parse(readFileSync(new URL('../cms/teksten.json', import.meta.url), 'utf8'))
  assert.deepEqual(manifest.bloktypes, [])
  assert.deepEqual([...manifest.teksten].sort(), [...TEKST_SLEUTELS].sort())
})

test('kop, voettekst en skiplink lezen Site > Teksten', () => {
  const zonder = render(basisSite())
  assert.match(zonder, /class="spoed-link" href="\/spoed">Spoed<\/a>/)
  assert.match(zonder, /Direct naar de inhoud/)
  assert.match(zonder, /Acute klachten\? Bekijk direct wat u moet doen\./)
  const met = render(basisSite({ teksten: { 'spoed.label': 'Pijn?', 'spoed.link': '/acuut', 'kop.menu': 'Navigatie', 'voet.spoed_tekst': 'Bel ons direct.', 'algemeen.skiplink': 'Naar de inhoud' } }))
  assert.match(met, /class="spoed-link" href="\/acuut">Pijn\?<\/a>/)
  assert.match(met, /<\/span>Navigatie<\/button>/)
  assert.match(met, /Bel ons direct\./)
  assert.match(met, /class="skiplink" href="#inhoud">Naar de inhoud</)
  assert.doesNotMatch(met, /href="\/spoed"/)
})

test('formulier, team, collectie en tekstblok: vaste teksten uit het CMS, standaard ongewijzigd', () => {
  const form = (site) => renderBlok({ type: 'formulier_bouwer', content: { titel: 'Bericht', velden: [{ label: 'Telefoon', type: 'telefoon', verplicht: 'nee' }] } }, ctx(site))
  const std = form({})
  assert.match(std, /volgens de <a href="\/privacyverklaring">privacyverklaring<\/a>\./)
  assert.match(std, /Controleer uw gegevens/)
  assert.match(std, /<span class="optioneel">\(optioneel\)<\/span>/)
  const eigen = form({ teksten: { 'formulier.akkoord': 'Akkoord met de [voorwaarden](/privacyverklaring).', 'formulier.versturen': 'Verstuur', 'formulier.fout_versturen': 'Mislukt.' } })
  assert.match(eigen, /Akkoord met de <a href="\/privacyverklaring">voorwaarden<\/a>\./)
  assert.match(eigen, /data-verstuur>Verstuur/)
  assert.match(eigen, /data-fout-versturen="Mislukt\."/)
  const xss = form({ teksten: { 'formulier.akkoord': '<img src=x onerror=alert(1)> [x](javascript:alert(1))' } })
  assert.doesNotMatch(xss, /<img src=x|javascript:/)

  assert.match(renderBlok({ type: 'mensen', content: {} }, ctx({})), /Het teamoverzicht wordt binnenkort aangevuld\. <mark class="placeholder"/)
  assert.match(renderBlok({ type: 'mensen', content: {} }, ctx({ teksten: { 'team.leeg': 'Binnenkort.' } })), />Binnenkort\.</)
  assert.match(renderBlok({ type: 'kaarten', content: { weergave: 'collectie', items: [] } }, ctx({ teksten: { 'collectie.leeg': 'Nog niets.' } })), /Nog niets\./)
  assert.match(renderBlok({ type: 'tekst', content: { tekst: 'x', bijgewerkt: '2026-11-11' } }, ctx({ teksten: { 'tekstblok.bijgewerkt': 'Bijgewerkt op' } })), /Bijgewerkt op <time/)
})

test('standaard-SEO: titelachtervoegsel, omschrijving, deelbeeld, noindex en verificatie', () => {
  const std = render(basisSite())
  assert.match(std, /<title>Contact \| Tandarts Van Beek<\/title>/)
  assert.doesNotMatch(std, /name="robots"|google-site-verification/)
  const seo = { titel_suffix: ' · Van Beek', beschrijving: 'Tandarts in Honselersdijk.', social_beeld: 'https://cdn.test/deel.jpg', noindex: false, google_verificatie: 'abcdefghij12345', bing_verificatie: '' }
  const met = render(basisSite({ seo }))
  assert.match(met, /<title>Contact · Van Beek<\/title>/)
  assert.match(met, /name="description" content="Tandarts in Honselersdijk\."/)
  assert.match(met, /og:image" content="https:\/\/cdn\.test\/deel\.jpg"/)
  assert.match(met, /name="google-site-verification" content="abcdefghij12345"/)
  assert.match(render(basisSite({ seo: { ...seo, noindex: true } })), /name="robots" content="noindex, nofollow"/)
  assert.doesNotMatch(render(basisSite({ seo: { ...seo, google_verificatie: '"><script>' } })), /<script>"/)
})

test('organisatie: JSON-LD uit Site > Navigatie > Organisatie, anders uit de contactgegevens', () => {
  const std = organisatieJsonLd(basisSite(), 'Tandarts Van Beek', 'https://test.nl')
  assert.deepEqual(std.address, { '@type': 'PostalAddress', streetAddress: 'Groenelaan 128', postalCode: '2675 RS', addressLocality: 'Honselersdijk', addressCountry: 'NL' })
  assert.equal(std['@type'], 'Dentist')
  const org = { type: 'LocalBusiness', straat: 'Groenelaan 128', postcode: '2675 RS', plaats: 'Honselersdijk', land: 'NL', telefoon: '0174 622 373', email: 'info@test.nl', openingstijden: [{ dag: 'ma', open: '08:30', dicht: '17:00' }, { dag: 'xx', open: '1', dicht: '2' }] }
  const ld = organisatieJsonLd(basisSite({ organisatie: org }), 'Tandarts Van Beek', 'https://test.nl')
  assert.equal(ld.email, 'info@test.nl')
  assert.deepEqual(ld.openingHoursSpecification, [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '08:30', closes: '17:00' }])
  // Een niet-ingevulde organisatie (v1 geeft dan een object met nulls) valt terug op de contactgegevens.
  const leeg = organisatieJsonLd(basisSite({ organisatie: { type: 'Organization', straat: null, postcode: null, plaats: null, openingstijden: [] } }), 'Tandarts Van Beek', 'https://test.nl')
  assert.deepEqual(leeg, std)
})

test('huisstijl: geldige kleuren als --cms-*, al het andere genegeerd', () => {
  assert.equal(kleurStijl({}), '')
  assert.equal(kleurStijl({ diep: '#064b3c', onbekend: '#fff', wit: 'red;}</style><script>' }), '<style>:root{--cms-diep:#064b3c}</style>')
  assert.match(render(basisSite({ design_tokens: { diep: '#123456' } })), /theme-color" content="#123456"/)
})

test('meten uit (consent analytics "uit") → geen meet.js; socials en slogan alleen als ze er zijn', () => {
  assert.match(render(basisSite()), /meet\.js/)
  assert.doesNotMatch(render(basisSite({ consent: { analytics: 'uit' } })), /meet\.js/)
  assert.doesNotMatch(render(basisSite()), /footer-socials/)
  const met = render(basisSite({ merk: { ...basisSite().merk, slogan: 'Met zorg.', socials: { instagram: 'https://instagram.com/vanbeek', facebook: 'javascript:alert(1)' } } }))
  assert.match(met, /footer-socials.*href="https:\/\/instagram\.com\/vanbeek"/s)
  assert.doesNotMatch(met, /javascript:/)
  assert.match(met, /<p>Met zorg\. © \d{4} Tandarts Van Beek<\/p>/)
})

test('normaliseerSite: seo, organisatie, consent en teksten uit /api/v1/site, gesaneerd', () => {
  const s = normaliseerSite({ versie: 'v1', site: { id: 'x', naam: 'X' }, seo: { titel_suffix: ' | X', noindex: 'ja' }, consent: { analytics: 'uit' }, teksten: { 'spoed.label': 'Hulp', 'FOUT KEY': 'x', 'leeg': '', 'getal': 3 } })
  assert.equal(s.seo.titel_suffix, ' | X')
  assert.equal(s.seo.noindex, false, 'alleen true telt')
  assert.equal(s.consent.analytics, 'uit')
  assert.deepEqual(s.teksten, { 'spoed.label': 'Hulp' })
  assert.equal(s.organisatie, null)
})

test('404 en artikeloverzicht lezen Site > Teksten', async () => {
  const site = basisSite({ teksten: { 'fout404.titel': 'Oeps, niet gevonden', 'artikelen.overzicht_titel': 'Nieuws' } })
  const bron = maakInhoudsbron({ cfg: null, momentopname: { site, paginas: [pagina({ slug: '/' })], artikelen: [] } })
  const o = { bron, cfg: null, siteUrl: 'https://test.nl', cmsUrl: 'https://cms.test' }
  const vraag = (pad) => verwerk({ pad, zoek: new URLSearchParams(), cookies: {} }, o)
  const r404 = await vraag('/bestaat-niet')
  assert.equal(r404.status, 404)
  assert.match(r404.body, /Oeps, niet gevonden/)
  const overzicht = await vraag('/artikelen')
  assert.match(overzicht.body, /<h1[^>]*>Nieuws<\/h1>/)
  assert.match(overzicht.body, /Er zijn nog geen artikelen gepubliceerd\./)
})

// ------------------------------------------------------------------ voorvertoning in een frame (B-110)

test('headers: alleen /__voorvertoning mag in een frame van het CMS, de rest nergens', () => {
  const routes = headerRoutes('https://cms.linkandlead.nl')
  const match = (pad) => routes.filter((r) => new RegExp(r.src).test(pad))
  for (const pad of ['/', '/contact', '/artikelen/x', '/__voorvertoningen', '/x/__voorvertoning']) {
    const r = match(pad)
    assert.equal(r.length, 1, `precies één CSP voor ${pad}`)
    assert.match(r[0].headers['Content-Security-Policy'], /frame-ancestors 'none'/, pad)
  }
  for (const pad of ['/__voorvertoning', '/__voorvertoning/sluiten']) {
    const r = match(pad)
    assert.equal(r.length, 1, `precies één CSP voor ${pad}`)
    assert.match(r[0].headers['Content-Security-Policy'], /frame-ancestors https:\/\/cms\.linkandlead\.nl(;|$)/)
    assert.doesNotMatch(r[0].headers['Content-Security-Policy'], /'none'/)
    assert.equal(r[0].headers['X-Robots-Tag'], 'noindex, nofollow')
    assert.equal(r[0].headers['Cache-Control'], 'private, no-store')
  }
  assert.equal(cmsOrigin('https://cms.linkandlead.nl/'), 'https://cms.linkandlead.nl')
  assert.equal(cmsOrigin('http://onveilig.test'), 'https://cms.linkandlead.nl', 'alleen https')
  assert.equal(cmsOrigin('niet-een-adres'), 'https://cms.linkandlead.nl')
  assert.match(voorvertoningCsp('https://cms.ander.nl'), /frame-ancestors https:\/\/cms\.ander\.nl;/)
  assert.match(csp('https://cms.ander.nl'), /frame-ancestors 'none'/)
})

test('antwoorden van de voorvertoning: CSP met het CMS als frame-ouder, noindex en no-store; gewone pagina’s niet', async () => {
  const bron = maakInhoudsbron({ cfg: null, momentopname: { site: basisSite(), paginas: [pagina({ slug: '/' })], artikelen: [] } })
  const o = { bron, cfg: null, siteUrl: 'https://test.nl', cmsUrl: 'https://cms.linkandlead.nl' }
  const vraag = (pad, zoek = '') => verwerk({ pad, zoek: new URLSearchParams(zoek), cookies: {} }, o)
  for (const r of [await vraag('/__voorvertoning', 'pad=/'), await vraag('/__voorvertoning/sluiten', 'pad=/'), await vraag('/__voorvertoning/onbekend')]) {
    assert.match(r.headers['content-security-policy'], /frame-ancestors https:\/\/cms\.linkandlead\.nl;/)
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow')
    assert.equal(r.headers['cache-control'], 'private, no-store')
  }
  const gewoon = await vraag('/')
  assert.equal(gewoon.headers['content-security-policy'], undefined, 'gewone pagina: CSP (frame-ancestors none) komt uit de Vercel-route')
  assert.match(gewoon.headers['cache-control'], /public/)
})

test('standaardteksten zijn gelijk aan de teksten van vóór de koppeling', () => {
  assert.equal(STANDAARD_TEKSTEN['voet.spoed_knop'], 'Naar spoed')
  assert.equal(STANDAARD_TEKSTEN['fout404.titel'], 'Deze pagina bestaat niet (meer)')
})
