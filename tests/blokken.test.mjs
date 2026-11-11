// Acceptatietests uit de handoff: lange titels, lege optionele velden, 1 en 12 collectie-items,
// lege collectie, alle 5 achtergrondschema's, één h1, veilige uitvoer en de blauwdruk tegen het CMS-contract.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderBlok, RENDERERS, SCHEMA_VOOR_BG } from '../scripts/lib/blokken.mjs'
import { renderPagina } from '../scripts/lib/pagina.mjs'
import { controleerBlok } from '../scripts/lib/cms-contract.mjs'
import { rijkeTekst } from '../scripts/lib/rijk.mjs'
import { resolveRedirects } from '../scripts/lib/redirects.mjs'
import blauwdruk from '../cms/blauwdruk.mjs'

const ctx = (extra = {}) => ({ index: 1, isEersteHeader: false, records: {}, slug: '/test', paginaTitel: 'Test', ...extra })
const item = (n) => ({ titel: `Behandeling ${n}`, tekst: 'Korte omschrijving', link: `/behandelingen/b${n}`, beeld: '/img/preventie.webp', beeld_alt: 'Alt' })
const telItems = (html) => (html.match(/class="collectie-item"/g) ?? []).length
const site = { naam: 'Tandarts Van Beek', merk: { naam: 'Tandarts Van Beek' }, navigatie: { hoofd: [{ titel: 'Contact', href: '/contact' }] } }
const opties = { site, records: {}, titels: new Map(), SITE_URL: 'https://voorbeeld.nl', CMS_BASE: 'https://linkandlead.nl', SITE_ID: '' }

test('elk renderer-type werkt met lege content (alle velden optioneel)', () => {
  for (const type of Object.keys(RENDERERS)) {
    assert.doesNotThrow(() => renderBlok({ type, bg: null, content: {} }, ctx()), type)
    assert.doesNotThrow(() => renderBlok({ type, bg: 'wit', content: null }, ctx()), type)
  }
})

test('alle 5 achtergrondschema’s zijn per blok bruikbaar', () => {
  for (const type of Object.keys(RENDERERS)) {
    for (const [bg, schema] of Object.entries(SCHEMA_VOOR_BG)) {
      const html = renderBlok({ type, bg, content: { titel: 'X', heading: 'X', items: [item(1)], vragen: [{ vraag: 'V', antwoord: 'A' }], stappen: [{ titel: 'S' }], feiten: [{ label: 'L', waarde: 'W' }] } }, ctx())
      if (html) assert.match(html, new RegExp(`schema-${schema}`), `${type} met ${bg}`)
    }
  }
})

test('collectie: 1 item, 12 items, maximaal en lege stand', () => {
  const r = (items, extra = {}) => renderBlok({ type: 'kaarten', bg: 'mist', content: { weergave: 'collectie', titel: 'Behandelingen', items, ...extra } }, ctx())
  assert.equal(telItems(r([item(1)])), 1)
  assert.equal(telItems(r(Array.from({ length: 12 }, (_, i) => item(i)))), 12)
  assert.equal(telItems(r(Array.from({ length: 12 }, (_, i) => item(i)), { maximaal: 4 })), 4)
  assert.match(r([]), /lege-stand/)
})

test('lange titels worden volledig en ge-escaped weergegeven', () => {
  const lang = 'Een uitzonderlijk lange titel '.repeat(12).trim()
  const html = renderBlok({ type: 'header', content: { heading: lang, subheading: 'x' } }, ctx({ isEersteHeader: true }))
  assert.ok(html.includes(lang))
})

test('actiebalk: exact de CMS-items, tekst-only, zonder iconen; maximaal 3', () => {
  const items = ['Spoedgeval', 'Nieuwe patiënt worden', 'Veilig bericht sturen', 'Vierde'].map((t, i) => ({ titel: t, link: '/x' + i, icoon: 'doel' }))
  const html = renderBlok({ type: 'kaarten', bg: 'mist', content: { weergave: 'actiebalk', items } }, ctx())
  assert.equal((html.match(/<li>/g) ?? []).length, 3)
  assert.doesNotMatch(html, /<svg|<img/)
  assert.doesNotMatch(html, /Afspraak/)
})

test('XSS: CMS-inhoud wordt ge-escaped en onveilige links vervallen', () => {
  const html = renderBlok({ type: 'mediatekst', content: { titel: '<script>alert(1)</script>', knop: 'javascript:alert(1)', knoptekst: 'Klik', alineas: [{ tekst: '<img src=x onerror=alert(1)>' }] } }, ctx())
  assert.doesNotMatch(html, /<script>|<img src=x|javascript:/)
  assert.doesNotMatch(rijkeTekst('[klik](javascript:alert(1))'), /href/)
  assert.match(rijkeTekst('[Bel](tel:+31852221388)'), /href="tel:\+31852221388"/)
})

test('placeholders "[te bevestigen]" worden zichtbaar gemarkeerd', () => {
  assert.match(rijkeTekst('Adres: [te bevestigen: straat]'), /<mark class="placeholder"/)
})

test('elke pagina heeft precies één h1, ook zonder of met meerdere headers', () => {
  const h1 = (blokken) => (renderPagina({ slug: '/t', titel: 'T', beschrijving: '', blokken }, opties).match(/<h1[\s>]/g) ?? []).length
  assert.equal(h1([{ type: 'header', content: { heading: 'A' } }, { type: 'header', content: { heading: 'B' } }]), 1)
  assert.equal(h1([{ type: 'tekst', content: { titel: 'Zonder header' } }]), 1)
  for (const p of blauwdruk.paginas) assert.equal(h1(p.blokken), 1, p.slug)
})

test('team zonder gepubliceerde leden toont een nette lege stand, geen fictieve medewerkers', () => {
  const leeg = renderBlok({ type: 'mensen', content: { titel: 'Ons team' } }, ctx())
  assert.match(leeg, /lege-stand/)
  const vol = renderBlok({ type: 'mensen', content: { titel: 'Ons team' } }, ctx({ records: { teamleden: [{ naam: 'A. Tandarts', functie: 'Tandarts' }] } }))
  assert.match(vol, /A\. Tandarts/)
})

test('blauwdruk gebruikt alleen bestaande CMS-blokken en -velden', () => {
  const fouten = blauwdruk.paginas.flatMap((p) => p.blokken.flatMap((b, i) => controleerBlok(b, `${p.slug} #${i}`)))
  assert.deepEqual(fouten, [])
  assert.deepEqual(controleerBlok({ type: 'kaarten', content: { verzonnen: 1 } }, 'x').length, 1)
})

test('redirects worden gesaneerd', () => {
  const r = resolveRedirects([{ van: '/oud', naar: '/nieuw' }, { van: 'geen-pad', naar: '/x' }, { van: '/a', naar: 'javascript:alert(1)' }, { van: '/b', naar: 'https://voorbeeld.nl/c', status: 302 }])
  assert.deepEqual(r, [{ van: '/oud', naar: '/nieuw', status: 301 }, { van: '/b', naar: 'https://voorbeeld.nl/c', status: 302 }])
})
