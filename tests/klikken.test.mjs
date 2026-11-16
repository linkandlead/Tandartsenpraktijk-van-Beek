// Klik-om-te-bewerken (CMS B-115): alleen in de voorvertoning in de CMS-editor (/__voorvertoning?…&ingesloten=1)
// krijgen secties data-cms-sectie="<blok.id>" en tekstvelden data-cms-veld="<pad>", met een script dat een klik
// alleen naar de origin van het CMS meldt en dan geen link volgt. Gewone pagina's veranderen niet. Nep-CMS, geen netwerk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verwerk, maakInhoudsbron } from '../scripts/lib/app.mjs'
import { renderBlok } from '../scripts/lib/blokken.mjs'
import { klikAttributen, klikMaker, klikScript, voorvertoningKlikken } from '../scripts/lib/voorvertoningklikken.mjs'

const CMS = 'https://cms.test'
const TOKEN = `${Math.floor(Date.now() / 1000) + 1800}.${'a'.repeat(64)}`
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const HEADER = id(1), KAARTEN = id(2), FAQ = id(3), CTA = id(4)

function blokken(kop) {
  return [
    { id: HEADER, type: 'header', bg: 'wit', inhoud: { eyebrow: 'Welkom', heading: kop, subheading: 'Sub', cta_primair_label: 'Afspraak', cta_primair_link: '/contact', usps: [{ tekst: 'Snel' }] } },
    { id: KAARTEN, type: 'kaarten', bg: null, inhoud: { titel: 'Werkwijze', items: [null, { titel: 'Eén', tekst: 'Eerst', link: '/contact', knoptekst: 'Meer' }, { titel: 'Twee' }] } },
    { id: FAQ, type: 'faq', bg: null, inhoud: { titel: 'Vragen', vragen: [{ vraag: 'Waarom?', antwoord: 'Daarom.' }] } },
    { id: CTA, type: 'cta', bg: null, inhoud: { titel: 'Bel ons', tekst: 'Wij helpen', knop: '/contact', knoptekst: 'Contact' } },
  ]
}

function opzet() {
  const json = (b, status = 200) => ({ status, json: async () => b })
  const fetch = async (url, init) => {
    const u = new URL(url)
    const p = u.pathname.replace('/api/v1/', '')
    if (init?.headers?.authorization !== 'Bearer cms_l_test') return json({ ok: false }, 401)
    if (p === 'site') return json({ versie: 'v1', site: { id: id(99), naam: 'Test' }, merk: { naam: 'Test' }, navigatie: { hoofd: [{ titel: 'Contact', href: '/contact' }] }, design_tokens: {}, redirects: [] })
    if (p === 'paginas') return json({ versie: 'v1', paginas: [
      { slug: '/', titel: 'Home', seo: {}, blokken: blokken('Gepubliceerd'), records: {} },
      { slug: '/contact', titel: 'Contact', seo: {}, blokken: [{ id: id(5), type: 'tekst', inhoud: { titel: 'Contact', tekst: 'Bel ons.' } }], records: {} },
    ], volgende: null })
    if (p === 'collecties/artikelen') return json({ versie: 'v1', collectie: { sleutel: 'artikelen' }, records: [], totaal: 0, volgende: null })
    if (p === 'pagina') {
      if (u.searchParams.get('pad') !== '/') return json({ ok: false }, 404)
      const concept = u.searchParams.get('voorvertoning') === TOKEN
      return json({ versie: 'v1', taal: 'nl', concept, pagina: { slug: '/', titel: 'Home', seo: {}, blokken: blokken(concept ? 'CONCEPTKOP' : 'Gepubliceerd'), records: {} } })
    }
    return json({ ok: false }, 404)
  }
  const cfg = { cmsUrl: CMS, token: 'cms_l_test', fetch }
  const bron = maakInhoudsbron({ cfg, momentopname: null })
  const o = { bron, cfg, siteUrl: 'https://test.nl', cmsUrl: CMS }
  return (pad, { cookies = {} } = {}) => {
    const u = new URL(pad, 'https://test.nl')
    return verwerk({ pad: u.pathname, zoek: u.searchParams, cookies }, o)
  }
}

test('klikken: gewone pagina\'s en de voorvertoning in een eigen tabblad hebben geen data-cms-attributen of klikscript', async () => {
  const vraag = opzet()
  for (const pad of ['/', '/contact', '/bestaat-niet', '/artikelen', `/__voorvertoning?pad=/&token=${TOKEN}`]) {
    const r = await vraag(pad)
    assert.doesNotMatch(r.body, /data-cms-/, pad)
    assert.doesNotMatch(r.body, /cms-voorbeeld/, pad)
  }
})

test('klikken: in de editor (ingesloten=1) per blok data-cms-sectie en per tekstveld data-cms-veld', async () => {
  const vraag = opzet()
  const r = await vraag(`/__voorvertoning?pad=/&token=${TOKEN}&ingesloten=1`)
  assert.equal(r.status, 200)
  assert.match(r.body, /CONCEPTKOP/)
  for (const sectie of [HEADER, KAARTEN, FAQ, CTA]) assert.match(r.body, new RegExp(`<section[^>]*data-cms-sectie="${sectie}"`), sectie)
  assert.match(r.body, new RegExp(`<h1[^>]*data-cms-sectie="${HEADER}" data-cms-veld="heading">CONCEPTKOP</h1>`))
  assert.ok(r.body.includes(`data-cms-sectie="${HEADER}" data-cms-veld="usps.0.tekst"`))
  assert.ok(r.body.includes(`data-cms-sectie="${HEADER}" data-cms-veld="cta_primair_label"`))
  // het pad gebruikt de plek in de lijst uit het CMS (items.0 is leeg en wordt niet getoond)
  assert.ok(r.body.includes(`data-cms-sectie="${KAARTEN}" data-cms-veld="items.1.titel">Eén</h3>`))
  assert.ok(r.body.includes(`data-cms-sectie="${KAARTEN}" data-cms-veld="items.2.titel">Twee</h3>`))
  assert.ok(r.body.includes(`data-cms-sectie="${FAQ}" data-cms-veld="vragen.0.vraag"`))
  assert.ok(r.body.includes(`data-cms-sectie="${CTA}" data-cms-veld="knoptekst"`))
  // het script meldt alleen naar de origin van het CMS
  assert.match(r.body, /<script>\(function voorvertoningKlikken/)
  assert.ok(r.body.includes('{"cmsUrl":"https://cms.test","ingesloten":true,"velden":{'))
  // B-127: de tekstvelden gaan mee, zodat ook velden die de renderer niet zelf markeert typbaar worden
  assert.ok(r.body.includes(`"${HEADER}":[{"pad":["eyebrow"],"waarde":"Welkom"}`))
  assert.doesNotMatch(r.body, /postMessage\([^)]*'\*'/)
  // doorklikken in het editorvenster (cookie, &ingesloten=1 in de links) blijft klikbaar
  assert.match(r.body, /href="\/__voorvertoning\?pad=%2Fcontact&amp;ingesloten=1"/)
  const verder = await vraag('/__voorvertoning?pad=/contact&ingesloten=1', { cookies: { vb_voorvertoning: TOKEN } })
  assert.ok(verder.body.includes(`data-cms-sectie="${id(5)}" data-cms-veld="titel"`))
})

test('klikken: zonder geldig blok-id (uuid) geen attributen; buiten de editor geeft klikMaker altijd niets', () => {
  const ctx = { index: 0, klikken: true, isEersteHeader: true }
  assert.doesNotMatch(renderBlok({ id: 'header', type: 'header', content: { heading: 'A' } }, ctx), /data-cms-/)
  assert.doesNotMatch(renderBlok({ type: 'header', content: { heading: 'A' } }, ctx), /data-cms-/)
  assert.equal(klikMaker(HEADER, false)('titel'), '')
  assert.equal(klikMaker(HEADER, true)(['items', 0, 'titel']), ` data-cms-sectie="${HEADER}" data-cms-veld="items.0.titel"`)
  assert.deepEqual(klikAttributen(HEADER), { 'data-cms-sectie': HEADER })
  assert.equal(klikScript('http://cms.test'), '', 'alleen https (of localhost)')
  // inhoud kan het script niet afsluiten
  const script = klikScript(CMS, [{ id: HEADER, content: { titel: '</script><script>alert(1)</script>' }, type: 'tekst' }])
  assert.equal(script.match(/<\/script>/g).length, 1)
  assert.equal(klikScript('geen url'), '')
})

// Een nepvenster in een iframe: document met klikluisteraar, parent met postMessage
function venster(search, { inIframe = true, velden = [] } = {}) {
  const berichten = [], luisteraars = [], berichtLuisteraars = []
  const v = {
    location: { search },
    document: {
      addEventListener: (t, f) => luisteraars.push(f),
      removeEventListener: (t, f) => luisteraars.splice(luisteraars.indexOf(f), 1),
      querySelectorAll: () => velden,
    },
    addEventListener: (t, f) => berichtLuisteraars.push(f),
    removeEventListener: (t, f) => berichtLuisteraars.splice(berichtLuisteraars.indexOf(f), 1),
  }
  v.parent = inIframe ? { postMessage: (b, doel) => berichten.push({ b, doel }) } : v
  return { v, berichten, luisteraars, berichtLuisteraars }
}
const element = (attrs, ouder = null) => ({
  getAttribute: (n) => attrs[n] ?? null,
  closest(sel) { return sel.split(',').some((s) => s.slice(1, -1) in attrs) ? this : ouder?.closest(sel) ?? null },
  contains: () => true,
})
const klik = (target) => { const e = { target, button: 0, gevolgd: true }; e.preventDefault = () => { e.gevolgd = false }; e.stopPropagation = () => {}; return e }

test('klikscript: een klik meldt blok en veld alleen aan de CMS-origin en volgt de link niet', () => {
  // precies het script uit de pagina, uitgevoerd met een nepvenster
  const code = /^<script>([\s\S]*)<\/script>$/.exec(klikScript('https://cms.test/admin'))[1]
  const { v, berichten, luisteraars } = venster('?pad=/')
  new Function('window', code)(v)
  assert.equal(luisteraars.length, 1)
  const e = klik(element({ 'data-cms-sectie': FAQ, 'data-cms-veld': 'vragen.0.vraag' }, element({ 'data-cms-sectie': FAQ })))
  // de pagina meldt zich eerst als klaar (B-127)
  assert.deepEqual(berichten.shift(), { doel: 'https://cms.test', b: { bron: 'cms-voorbeeld', soort: 'klaar' } })
  luisteraars[0](e)
  assert.equal(e.gevolgd, false, 'de link wordt niet gevolgd')
  assert.deepEqual(berichten, [{ doel: 'https://cms.test', b: { bron: 'cms-voorbeeld', soort: 'kies', sectieId: FAQ, pad: ['vragen', 0, 'vraag'], item: null, typbaar: false } }])
  // buiten een gemarkeerde sectie, geen link: niets volgen of melden
  const buiten = klik(element({}))
  luisteraars[0](buiten)
  assert.equal(buiten.gevolgd, true)
  assert.equal(berichten.length, 1)
  // een link buiten een sectie (menu, footer) opent in het editorvenster geen andere pagina
  const menu = klik({ getAttribute: () => null, closest(sel) { return sel === 'a[href]' ? this : null } })
  luisteraars[0](menu)
  assert.equal(menu.gevolgd, false)
  assert.equal(berichten.length, 1)
})

test('voorvertoningKlikken: niets zonder ingesloten, buiten een iframe of met een onveilig CMS-adres', () => {
  for (const [search, opties, cmsUrl] of [['?pad=/', {}, CMS], ['?ingesloten=1', { inIframe: false }, CMS], ['?ingesloten=1', {}, 'http://cms.test'], ['?ingesloten=1', {}, 'geen url']]) {
    const { v, luisteraars } = venster(search, opties)
    voorvertoningKlikken({ cmsUrl, venster: v })
    assert.equal(luisteraars.length, 0, `${search} ${cmsUrl}`)
  }
})

// Een tekstelement zonder kind-elementen, dat bewerkbaar kan worden
function tekstElement(attrs, tekst, sectie) {
  const l = {}
  return {
    ...element(attrs, sectie),
    textContent: tekst,
    childElementCount: 0,
    contentEditable: 'inherit',
    addEventListener: (t, f) => { l[t] = f },
    removeEventListener: (t) => { delete l[t] },
    focus() {},
    luister: l,
  }
}

test('typen (B-127): typbaar veld, selectie van de editor maakt het bewerkbaar en stuurt tekst; Escape zet terug', () => {
  const sectie = element({ 'data-cms-sectie': FAQ })
  const veld = tekstElement({ 'data-cms-veld': 'vragen.0.vraag' }, 'Waarom?', sectie)
  const { v, berichten, luisteraars, berichtLuisteraars } = venster('?ingesloten=1', { velden: [veld] })
  voorvertoningKlikken({ cmsUrl: CMS, venster: v })
  berichten.shift()
  luisteraars[0](klik(veld))
  assert.equal(berichten.shift().b.typbaar, true)
  // een bericht van een andere origin telt niet
  berichtLuisteraars[0]({ origin: 'https://kwaad.test', data: { bron: 'cms-editor', soort: 'selectie', geselecteerd: FAQ, pad: ['vragen', 0, 'vraag'], typen: 1 } })
  assert.equal(veld.contentEditable, 'inherit')
  berichtLuisteraars[0]({ origin: CMS, data: { bron: 'cms-editor', soort: 'selectie', geselecteerd: FAQ, pad: ['vragen', 0, 'vraag'], typen: 1 } })
  assert.match(veld.contentEditable, /^(plaintext-only|true)$/)
  veld.textContent = 'Waarom\nnu?'
  veld.luister.input()
  assert.deepEqual(berichten.shift(), { doel: CMS, b: { bron: 'cms-voorbeeld', soort: 'tekst', sectieId: FAQ, pad: ['vragen', 0, 'vraag'], waarde: 'Waarom nu?', typen: 1 } })
  veld.luister.keydown({ key: 'Escape', preventDefault() {} })
  assert.equal(veld.textContent, 'Waarom?')
  assert.equal(berichten.shift().b.waarde, 'Waarom?')
  assert.equal(veld.contentEditable, 'false')
})
