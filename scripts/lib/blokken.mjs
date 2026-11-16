// Renderers per CMS-bloktype → het eigen Van Beek-ontwerp (model A).
//
// Elke renderer leest UITSLUITEND de velden uit de CMS-blokdefinitie (src/shared/blokregistry.ts in
// linkandlead-cms) plus de gedocumenteerde bouwer-eigen top-level velden (zie docs/CMS-MAPPING.md).
// Alle velden zijn optioneel: een leeg veld laat het onderdeel weg, nooit een kapotte sectie.
// Onbekende bloktypes renderen niets (veilige fallback) en worden bij de build gemeld.
import { esc, attr, txt, lijst, veiligeHref, isExtern, t, knop, PIJL } from './html.mjs'
import { rijkeTekst } from './rijk.mjs'
import { artikelenGridBlok, sorteerArtikelenVoorBlok } from './artikelen.mjs'
import { klikMaker } from './voorvertoningklikken.mjs'

// CMS-achtergrondwaarde → schema (Licht, Zacht, Accent, Donker, Diepst).
export const SCHEMA_VOOR_BG = { wit: 'licht', mist: 'zacht', limoenlicht: 'accent', diep: 'donker', nacht: 'diepst' }
const STANDAARD_BG = { header: 'wit', cta: 'diep', kaarten: 'wit', mediatekst: 'wit', tekst: 'wit', faq: 'wit', feiten: 'wit', kaart: 'wit', formulier_bouwer: 'mist', mensen: 'mist', reeks: 'mist' }

export function schemaVoor(blok) {
  const bg = SCHEMA_VOOR_BG[blok?.bg] ? blok.bg : STANDAARD_BG[blok?.type] ?? 'wit'
  return SCHEMA_VOOR_BG[bg]
}

function sectie(blok, ctx, klasse, binnen, { label } = {}) {
  const id = ctx.anker ? ` id="${attr(ctx.anker)}"` : ''
  const aria = label ? ` aria-labelledby="${attr(label)}"` : ''
  return `<section${id} class="blok ${klasse} schema-${schemaVoor(blok)}" data-blok="${attr(blok.type)}"${aria}${ctx.k()}>\n${binnen}\n</section>`
}

// extra: de attributen voor klik-om-te-bewerken (ctx.k('veld')); buiten de ingesloten voorvertoning altijd ''.
function kop(niveau, tekst, id, klasse = '', extra = '') {
  const s = txt(tekst, 1000)
  if (!s) return ''
  return `<h${niveau}${id ? ` id="${attr(id)}"` : ''}${klasse ? ` class="${klasse}"` : ''}${extra}>${t(s)}</h${niveau}>`
}

function eyebrow(v, extra = '') {
  const s = txt(v, 120)
  return s ? `<p class="eyebrow"${extra}>${t(s)}</p>` : ''
}

// De klik-attributen in de eerste tag van een stuk HTML (bv. een knop uit knop()); zonder attributen ongewijzigd.
function metKlik(html, extra) {
  return html && extra ? html.replace(/^<([a-z0-9]+)/, `<$1${extra}`) : html
}

function beeld(src, alt, { klasse = '', laden = 'lazy', prioriteit = false } = {}) {
  const s = veiligeHref(src)
  if (!s) return ''
  return `<img class="${klasse}" src="${attr(s)}" alt="${attr(txt(alt, 300))}" loading="${laden}" decoding="async"${prioriteit ? ' fetchpriority="high"' : ''}>`
}

// ------------------------------------------------------------------ header (hero)
function header(blok, ctx) {
  const c = blok.content
  const niveau = ctx.isEersteHeader ? 1 : 2
  const id = `kop-${ctx.index}`
  const metBeeld = txt(c.media_type) !== 'geen' && veiligeHref(c.media_afbeelding)
  const layout = ['split-links', 'split-rechts', 'gecentreerd', 'achtergrond', 'compact'].includes(c.layout) ? c.layout : 'split-rechts'
  const hoogte = ['compact', 'normaal', 'fullscreen'].includes(c.hoogte) ? c.hoogte : 'normaal'
  const fx = Number.isFinite(Number(c.focal_x)) ? Math.min(100, Math.max(0, Number(c.focal_x))) : 50
  const fy = Number.isFinite(Number(c.focal_y)) ? Math.min(100, Math.max(0, Number(c.focal_y))) : 50
  const kruimel = ctx.kruimelpad && c.auto_kruimelpad !== 'uit' && !ctx.isHome ? ctx.kruimelpad : ''
  const knoppen = [metKlik(knop(c.cta_primair_link, c.cta_primair_label, { klasse: 'knop knop-groot' }), ctx.k('cta_primair_label')), metKlik(knop(c.cta_secundair_link, c.cta_secundair_label, { klasse: 'knop knop-secundair' }), ctx.k('cta_secundair_label'))].filter(Boolean)
  const usps = lijst(c.usps, 6).map((u) => ({ tekst: txt(u.tekst, 120), klik: ctx.ki('usps', u, 'tekst') })).filter((u) => u.tekst)
  const tekst = `
  <div class="hero-tekst">
    ${kruimel}
    ${eyebrow(c.eyebrow, ctx.k('eyebrow'))}
    ${kop(niveau, c.heading || ctx.paginaTitel, id, 'hero-kop', txt(c.heading) ? ctx.k('heading') : '')}
    ${txt(c.subheading) ? `<p class="hero-sub"${ctx.k('subheading')}>${t(c.subheading, 600)}</p>` : ''}
    ${knoppen.length ? `<div class="knoppen">${knoppen.join('')}</div>` : ''}
    ${usps.length ? `<ul class="hero-usps">${usps.map((u) => `<li${u.klik}>${t(u.tekst)}</li>`).join('')}</ul>` : ''}
  </div>`
  const media = metBeeld
    ? `<div class="hero-media" style="--fx:${fx}%;--fy:${fy}%">${beeld(c.media_afbeelding, c.media_alt, { laden: 'eager', prioriteit: niveau === 1 })}</div>`
    : ''
  return sectie(
    blok,
    ctx,
    `hero hero-${layout} hero-${hoogte}${metBeeld ? ' hero-met-beeld' : ' hero-zonder-beeld'}`,
    `<div class="hero-binnen">${tekst}${media}</div>`,
    { label: id },
  )
}

// ------------------------------------------------------------------ tekst (Tekstblok)
function tekstBlok(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(txt(c.bijgewerkt)) ? txt(c.bijgewerkt) : ''
  const nl = datum ? new Date(datum + 'T12:00:00Z').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
  return sectie(
    blok,
    ctx,
    'tekstblok',
    `<div class="binnen smal">
      ${eyebrow(c.eyebrow, ctx.k('eyebrow'))}
      ${kop(2, c.titel, id, '', ctx.k('titel'))}
      <div class="rijk"${ctx.k('tekst')}>${rijkeTekst(txt(c.tekst, 20000))}</div>
      ${nl ? `<p class="bijgewerkt">Laatst bijgewerkt: <time datetime="${datum}">${nl}</time></p>` : ''}
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ mediatekst (Tekst met beeld)
function mediatekst(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const zijde = c.beeldzijde === 'rechts' ? 'rechts' : 'links'
  const vorm = c.beeldvorm === 'organisch' ? 'organisch' : 'recht'
  const alineas = lijst(c.alineas, 20).map((a) => ({ tekst: txt(a.tekst, 4000), klik: ctx.ki('alineas', a, 'tekst') })).filter((a) => a.tekst)
  const punten = lijst(c.punten, 20).map((a) => ({ tekst: txt(a.tekst, 300), klik: ctx.ki('punten', a, 'tekst') })).filter((a) => a.tekst)
  const img = beeld(c.beeld, c.beeld_alt)
  return sectie(
    blok,
    ctx,
    `mediatekst beeld-${zijde} vorm-${vorm}${img ? '' : ' zonder-beeld'}`,
    `<div class="binnen mediatekst-grid">
      ${img ? `<div class="mediatekst-beeld">${img}</div>` : ''}
      <div class="mediatekst-tekst">
        ${eyebrow(c.eyebrow, ctx.k('eyebrow'))}
        ${kop(2, c.titel, id, '', ctx.k('titel'))}
        ${alineas.map((a) => `<p${a.klik}>${t(a.tekst)}</p>`).join('')}
        ${punten.length ? `<ul class="punten">${punten.map((p) => `<li${p.klik}>${t(p.tekst)}</li>`).join('')}</ul>` : ''}
        ${knop(c.knop, c.knoptekst) ? `<div class="knoppen">${metKlik(knop(c.knop, c.knoptekst), ctx.k('knoptekst'))}</div>` : ''}
      </div>
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ kaarten (Kaartenrij)
// Eén CMS-bloktype, vier presentaties via het bouwer-eigen veld `weergave`:
//   (leeg)       → tekstkaarten (Werkwijze, USP's) — zonder iconen
//   actiebalk    → de Actiebalk: exact drie tekstlinks (label = titel, link, volgorde = lijstvolgorde)
//   collectie    → beeldkaarten (Collectie behandelingen) met `maximaal`, `knop`, `knoptekst`
//   kenmerken    → tekstuele kenmerkenstrook
//   keuzehulp    → patiënt-/afspraakkeuzehulp; elke kaart = situatie + instructie + optionele route
function kaarten(blok, ctx) {
  const c = blok.content
  const w = txt(c.weergave)
  if (w === 'actiebalk') return actiebalk(blok, ctx)
  if (w === 'collectie') return collectie(blok, ctx)
  if (w === 'kenmerken') return kenmerken(blok, ctx)
  if (w === 'keuzehulp') return keuzehulp(blok, ctx)
  const id = `kop-${ctx.index}`
  const items = lijst(c.items, 12)
  const kol = c.kolommen === '4' ? 4 : 3
  return sectie(
    blok,
    ctx,
    'kaarten',
    `<div class="binnen">
      <div class="sectie-kop">${eyebrow(c.eyebrow, ctx.k('eyebrow'))}${kop(2, c.titel, id, '', ctx.k('titel'))}${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}</div>
      ${items.length ? `<ul class="kaart-raster kol-${kol}">${items
        .map((i) => {
          const h = veiligeHref(i.link)
          return `<li class="tekstkaart">
            ${beeld(i.beeld, i.beeld_alt, { klasse: 'tekstkaart-beeld' })}
            ${kop(3, i.titel, undefined, '', ctx.ki('items', i, 'titel'))}
            ${txt(i.tekst) ? `<p${ctx.ki('items', i, 'tekst')}>${t(i.tekst)}</p>` : ''}
            ${h ? metKlik(knop(h, txt(i.knoptekst) || 'Lees meer', { klasse: 'tekstlink' }), txt(i.knoptekst) ? ctx.ki('items', i, 'knoptekst') : '') : ''}
          </li>`
        })
        .join('')}</ul>` : ''}
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

function actiebalk(blok, ctx) {
  const c = blok.content
  const items = lijst(c.items, 3)
    .map((i) => ({ label: txt(i.titel, 60), href: veiligeHref(i.link), klik: ctx.ki('items', i, 'titel') }))
    .filter((i) => i.label && i.href)
  if (!items.length) return ''
  const label = txt(c.titel, 80) || 'Snel regelen'
  return `<nav${ctx.anker ? ` id="${attr(ctx.anker)}"` : ''} class="blok actiebalk schema-${schemaVoor(blok)}" data-blok="kaarten" aria-label="${attr(label)}"${ctx.k()}>
    ${txt(c.intro) ? `<p class="binnen actiebalk-intro"${ctx.k('intro')}>${t(c.intro, 200)}</p>` : ''}
    <ul class="binnen actiebalk-lijst">${items
      .map((i) => {
        const ext = isExtern(i.href) ? ' target="_blank" rel="noopener noreferrer"' : ''
        return `<li><a href="${attr(i.href)}"${ext}${i.klik}>${t(i.label)}</a></li>`
      })
      .join('')}</ul>
  </nav>`
}

function collectie(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const max = Math.min(24, Math.max(1, Number(c.maximaal) || 24))
  const items = lijst(c.items, 24).filter((i) => txt(i.titel)).slice(0, max)
  const kol = c.kolommen === '4' ? 4 : 3
  const alles = metKlik(knop(c.knop, c.knoptekst, { klasse: 'tekstlink tekstlink-onderstreept' }), ctx.k('knoptekst'))
  return sectie(
    blok,
    ctx,
    'collectie',
    `<div class="binnen">
      <div class="sectie-kop sectie-kop-rij">
        <div>${eyebrow(c.eyebrow, ctx.k('eyebrow'))}${kop(2, c.titel, id, '', ctx.k('titel'))}${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}</div>
        ${alles}
      </div>
      ${
        items.length
          ? `<ul class="kaart-raster kol-${kol}">${items
              .map((i) => {
                const h = veiligeHref(i.link)
                const img = beeld(i.beeld, i.beeld_alt, { klasse: 'collectie-beeld' })
                const binnen = `${img || '<span class="collectie-vlak" aria-hidden="true"></span>'}
                  <span class="collectie-tekst">
                    <span class="collectie-titel"${ctx.ki('items', i, 'titel')}>${t(i.titel, 120)}</span>
                    ${txt(i.tekst) ? `<span class="collectie-intro"${ctx.ki('items', i, 'tekst')}>${t(i.tekst, 300)}</span>` : ''}
                  </span>
                  ${h ? `<span class="collectie-pijl" aria-hidden="true">${PIJL}</span>` : ''}`
                return `<li class="collectie-item">${h ? `<a class="collectie-kaart" href="${attr(h)}">${binnen}</a>` : `<div class="collectie-kaart">${binnen}</div>`}</li>`
              })
              .join('')}</ul>`
          : `<p class="lege-stand">Er zijn op dit moment geen items om te tonen.</p>`
      }
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

function kenmerken(blok, ctx) {
  const c = blok.content
  const items = lijst(c.items, 6).map((i) => ({ titel: txt(i.titel, 120), klik: ctx.ki('items', i, 'titel') })).filter((i) => i.titel)
  if (!items.length) return ''
  const id = `kop-${ctx.index}`
  return sectie(
    blok,
    ctx,
    'kenmerken',
    `<div class="binnen">
      ${txt(c.titel) ? `<h2 id="${id}" class="sr-only">${t(c.titel)}</h2>` : ''}
      <ul class="kenmerken-lijst">${items.map((i) => `<li${i.klik}>${t(i.titel)}</li>`).join('')}</ul>
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// Keuzehulp: zonder JavaScript zijn álle situaties leesbaar (progressive enhancement). Met JS
// (src/site.js) kiest de bezoeker één situatie en ziet hij alleen die instructie.
function keuzehulp(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const items = lijst(c.items, 12).filter((i) => txt(i.titel))
  const naam = `keuze-${ctx.index}`
  return sectie(
    blok,
    ctx,
    'keuzehulp',
    `<div class="binnen" data-keuzehulp>
      <div class="sectie-kop">${eyebrow(c.eyebrow, ctx.k('eyebrow'))}${kop(2, c.titel, id, '', ctx.k('titel'))}${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}</div>
      <fieldset class="keuze-opties" hidden>
        <legend>${t(txt(c.keuze_label) || 'Maak een keuze')}</legend>
        ${items
          .map(
            (i, n) => `<label class="keuze-optie"><input type="radio" name="${naam}" value="${n}"><span>${t(i.titel, 120)}</span></label>`,
          )
          .join('')}
      </fieldset>
      <div class="keuze-uitkomsten" aria-live="polite">
        ${items
          .map(
            (i, n) => `<article class="keuze-uitkomst" data-keuze="${n}">
              <h3${ctx.ki('items', i, 'titel')}>${t(i.titel, 120)}</h3>
              <div class="rijk"${ctx.ki('items', i, 'tekst')}>${rijkeTekst(txt(i.tekst, 4000))}</div>
              ${veiligeHref(i.link) ? `<div class="knoppen">${knop(i.link, txt(i.knoptekst) || 'Verder')}</div>` : ''}
            </article>`,
          )
          .join('')}
      </div>
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ faq
function faq(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const vragen = lijst(c.vragen, 40).filter((v) => txt(v.vraag))
  if (!vragen.length && !txt(c.titel)) return ''
  return sectie(
    blok,
    ctx,
    'faq',
    `<div class="binnen smal">
      ${kop(2, c.titel || 'Veelgestelde vragen', id, '', txt(c.titel) ? ctx.k('titel') : '')}
      <div class="faq-lijst">${vragen
        .map((v) => `<details class="faq-item"><summary><span${ctx.ki('vragen', v, 'vraag')}>${t(v.vraag, 300)}</span></summary><div class="rijk"${ctx.ki('vragen', v, 'antwoord')}>${rijkeTekst(txt(v.antwoord, 4000))}</div></details>`)
        .join('')}</div>
    </div>`,
    { label: id },
  )
}

// ------------------------------------------------------------------ reeks (Reeks stappen)
function reeks(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const stappen = lijst(c.stappen, 12).filter((s) => txt(s.titel) || txt(s.tekst))
  if (!stappen.length) return ''
  const variant = txt(c._variant) || 'genummerd'
  return sectie(
    blok,
    ctx,
    `reeks reeks-${variant === 'genummerd' ? 'genummerd' : 'lijst'}`,
    `<div class="binnen">
      <div class="sectie-kop">${eyebrow(c.eyebrow, ctx.k('eyebrow'))}${kop(2, c.titel, id, '', ctx.k('titel'))}${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}</div>
      <ol class="stappen">${stappen
        .map((s, n) => `<li class="stap"><span class="stap-nummer" aria-hidden="true">${esc(txt(s.nummer, 4) || String(n + 1))}</span>${kop(3, s.titel || s.label, undefined, '', ctx.ki('stappen', s, txt(s.titel) ? 'titel' : 'label'))}${txt(s.tekst) ? `<p${ctx.ki('stappen', s, 'tekst')}>${t(s.tekst)}</p>` : ''}</li>`)
        .join('')}</ol>
      ${txt(c.slotregel) ? `<p class="slotregel"${ctx.k('slotregel')}>${t(c.slotregel)}</p>` : ''}
      ${knop(c.knop, c.knoptekst_reeks) ? `<div class="knoppen">${metKlik(knop(c.knop, c.knoptekst_reeks), ctx.k('knoptekst_reeks'))}</div>` : ''}
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ feiten
function telLink(waarde) {
  // Telefoonnummers in feiten klikbaar maken (FO §4.6: "Telefoonnummers klikbaar").
  const s = txt(waarde)
  if (/^(0\d{2,3}[\s-]*[\d\s-]{6,}|0900[\s-]*\d{4})$/.test(s)) {
    const cijfers = s.replace(/[^\d]/g, '')
    const href = cijfers.startsWith('0900') ? `tel:${cijfers}` : `tel:+31${cijfers.slice(1)}`
    return `<a href="${href}">${esc(s)}</a>`
  }
  return t(s, 300)
}

function feiten(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const rijen = lijst(c.feiten, 30).filter((f) => txt(f.label) || txt(f.waarde))
  const img = beeld(c.media_afbeelding, c.media_alt, { klasse: 'feiten-beeld' })
  return sectie(
    blok,
    ctx,
    `feiten${img ? ' met-beeld' : ''}`,
    `<div class="binnen feiten-grid">
      <div>
        ${kop(2, c.titel, id, '', ctx.k('titel'))}
        ${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}
        ${rijen.length ? `<dl class="feiten-lijst">${rijen.map((f) => `<div class="feit"><dt${ctx.ki('feiten', f, 'label')}>${t(f.label, 120)}</dt><dd${ctx.ki('feiten', f, 'waarde')}>${telLink(f.waarde)}</dd></div>`).join('')}</dl>` : ''}
      </div>
      ${img}
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ kaart (Kaart & locatie)
// Bewust GEEN externe kaart-widget bij het laden (privacy/FO §4.5): een statische illustratie +
// routeknop naar de externe routeplanner.
function kaart(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const adres = txt(c.adres, 500).split('\n').map((r) => t(r)).join('<br>')
  const tel = txt(c.telefoon)
  const mail = txt(c.email)
  return sectie(
    blok,
    ctx,
    'locatie',
    `<div class="binnen locatie-grid">
      <div class="kaart-illustratie" role="img" aria-label="Schematische kaart van de omgeving van de praktijk">
        <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="400" height="240" fill="var(--kaart-grond)"/>
          <path d="M-10 170 C80 150 120 190 210 160 S330 120 410 140" stroke="var(--kaart-weg)" stroke-width="16" fill="none"/>
          <path d="M120 -10 C130 60 110 120 140 250" stroke="var(--kaart-weg)" stroke-width="10" fill="none"/>
          <path d="M260 -10 L300 250" stroke="var(--kaart-weg)" stroke-width="8" fill="none"/>
          <path d="M-10 70 L410 90" stroke="var(--kaart-weg)" stroke-width="6" fill="none"/>
          <circle cx="205" cy="118" r="13" fill="var(--kaart-pin)"/><circle cx="205" cy="118" r="5" fill="var(--kaart-grond)"/>
        </svg>
      </div>
      <div class="locatie-tekst">
        ${eyebrow(c.eyebrow, ctx.k('eyebrow'))}
        ${kop(2, c.titel, id, '', ctx.k('titel'))}
        ${txt(c.intro) ? `<p${ctx.k('intro')}>${t(c.intro)}</p>` : ''}
        <dl class="feiten-lijst compact">
          ${adres ? `<div class="feit"><dt>Adres</dt><dd>${adres}</dd></div>` : ''}
          ${tel ? `<div class="feit"><dt>Telefoon</dt><dd>${telLink(tel)}</dd></div>` : ''}
          ${mail ? `<div class="feit"><dt>E-mail</dt><dd><a href="mailto:${attr(mail)}">${esc(mail)}</a></dd></div>` : ''}
        </dl>
        ${knop(c.knop, c.knoptekst) ? `<div class="knoppen">${knop(c.knop, c.knoptekst)}</div>` : ''}
      </div>
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ formulier_bouwer
// Velden uit het CMS (label, type, opties, verplicht). E-mail is er altijd (CMS-contract).
// Verzending: via de Link & Lead lead-SDK (cms-client.js → /api/cms/lead). Flow (FO §4.5):
// invullen → valideren → samenvatting → bevestigen → verzenden → succesbericht. Zie src/site.js.
const VELDTYPE = {
  tekst: { tag: 'input', type: 'text', auto: '' },
  telefoon: { tag: 'input', type: 'tel', auto: 'tel' },
  bedrijf: { tag: 'input', type: 'text', auto: 'organization' },
  tekstvak: { tag: 'textarea' },
  keuze: { tag: 'select' },
}

function sleutelVoor(label, n) {
  const s = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return s || `veld-${n}`
}

function autoVoor(label) {
  const l = label.toLowerCase()
  if (l.includes('voornaam')) return 'given-name'
  if (l.includes('achternaam')) return 'family-name'
  if (l === 'naam') return 'name'
  return ''
}

function formulierBouwer(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const fid = `form-${ctx.index}`
  const velden = lijst(c.velden, 20).filter((v) => txt(v.label))
  const veldHtml = (v, n) => {
    const label = txt(v.label, 80)
    const def = VELDTYPE[v.type] ?? VELDTYPE.tekst
    const naam = sleutelVoor(label, n)
    const vid = `${fid}-${naam}`
    const verplicht = v.verplicht === 'ja'
    const req = verplicht ? ' required aria-required="true"' : ''
    const auto = def.auto ?? autoVoor(label)
    const autoAttr = auto || autoVoor(label) ? ` autocomplete="${auto || autoVoor(label)}"` : ''
    const fout = `<p class="veld-fout" id="${vid}-fout" hidden></p>`
    const lbl = `<label for="${vid}">${t(label)}${verplicht ? '' : ' <span class="optioneel">(optioneel)</span>'}</label>`
    const desc = ` aria-describedby="${vid}-fout"`
    let invoer
    if (def.tag === 'textarea') invoer = `<textarea id="${vid}" name="${attr(naam)}" rows="6" maxlength="2000"${req}${desc}></textarea>`
    else if (def.tag === 'select') {
      const opties = txt(v.opties, 1000).split(',').map((o) => o.trim()).filter(Boolean)
      invoer = `<select id="${vid}" name="${attr(naam)}"${req}${desc}><option value="">Maak een keuze</option>${opties.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`
    } else invoer = `<input id="${vid}" name="${attr(naam)}" type="${def.type}"${autoAttr} maxlength="200"${req}${desc}>`
    return `<div class="veld${def.tag === 'textarea' ? ' veld-breed' : ''}" data-label="${attr(label)}">${lbl}${invoer}${fout}</div>`
  }
  const emailVeld = `<div class="veld" data-label="E-mailadres"><label for="${fid}-email">E-mailadres</label><input id="${fid}-email" name="email" type="email" autocomplete="email" maxlength="200" required aria-required="true" aria-describedby="${fid}-email-fout"><p class="veld-fout" id="${fid}-email-fout" hidden></p></div>`
  const alle = velden.map(veldHtml)
  alle.splice(Math.min(2, alle.length), 0, emailVeld) // e-mail na voor- en achternaam
  const bevestiging = txt(c.bevestigingstekst) || 'Bedankt voor uw bericht. Wij nemen zo snel mogelijk contact met u op.'
  return sectie(
    blok,
    ctx,
    'formulier',
    `<div class="binnen smal">
      ${eyebrow(c.eyebrow, ctx.k('eyebrow'))}
      ${kop(2, c.titel, id, '', ctx.k('titel'))}
      ${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}
      <form class="ll-formulier" id="${fid}" novalidate data-formulier data-herkomst="${attr(ctx.slug)}" data-bevestiging="${attr(bevestiging)}">
        <div class="formulier-stap" data-stap="invullen">
          <p class="formulier-melding fout" role="alert" hidden data-foutsamenvatting></p>
          <div class="velden">${alle.join('')}</div>
          <div class="veld veld-breed veld-akkoord">
            <label class="vinkje"><input type="checkbox" name="akkoord" required aria-required="true" aria-describedby="${fid}-akkoord-fout"><span>Ik ga akkoord met de verwerking van mijn gegevens volgens de <a href="/privacyverklaring">privacyverklaring</a>.</span></label>
            <p class="veld-fout" id="${fid}-akkoord-fout" hidden></p>
          </div>
          <div class="hp" aria-hidden="true"><label>Laat dit veld leeg<input type="text" name="_website" tabindex="-1" autocomplete="off"></label></div>
          <div class="knoppen"><button type="submit" class="knop">${esc(txt(c.knoptekst) || 'Controleren en versturen')}${PIJL}</button></div>
        </div>
        <div class="formulier-stap" data-stap="controleren" hidden>
          <h3 tabindex="-1">Controleer uw gegevens</h3>
          <dl class="feiten-lijst compact" data-samenvatting></dl>
          <p class="formulier-melding fout" role="alert" hidden data-verzendfout></p>
          <div class="knoppen">
            <button type="button" class="knop" data-verstuur>Bericht versturen${PIJL}</button>
            <button type="button" class="knop knop-secundair" data-terug>Gegevens aanpassen</button>
          </div>
        </div>
        <div class="formulier-stap" data-stap="klaar" hidden>
          <h3 tabindex="-1">Bericht verstuurd</h3>
          <p class="formulier-melding succes" role="status" data-succes></p>
        </div>
        <noscript><p class="formulier-melding fout">Voor dit formulier is JavaScript nodig. U kunt ons ook bellen.</p></noscript>
      </form>
      ${txt(c.voetnoot) ? `<p class="voetnoot">${t(c.voetnoot)}</p>` : ''}
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

// ------------------------------------------------------------------ mensen (Team, live collectie)
function mensen(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const max = Math.min(48, Math.max(1, Number(c.maximaal) || 48))
  const leden = lijst(ctx.records?.teamleden, 48).filter((l) => txt(l.naam)).slice(0, max)
  const anker = ctx.anker || 'team'
  return `<section id="${attr(anker)}" class="blok team schema-${schemaVoor(blok)}" data-blok="mensen" aria-labelledby="${id}"${ctx.k()}>
    <div class="binnen">
      <div class="sectie-kop">${kop(2, c.titel || 'Ons team', id, '', txt(c.titel) ? ctx.k('titel') : '')}${txt(c.intro) ? `<p class="intro"${ctx.k('intro')}>${t(c.intro)}</p>` : ''}</div>
      ${
        leden.length
          ? `<ul class="kaart-raster kol-4 team-raster">${leden
              .map(
                (l) => `<li class="teamlid">
                  ${veiligeHref(l.foto) ? `<div class="teamlid-foto">${beeld(l.foto, 'Portret van ' + txt(l.naam))}</div>` : ''}
                  <h3>${t(l.naam, 120)}</h3>
                  ${txt(l.functie) ? `<p class="teamlid-functie">${t(l.functie, 120)}</p>` : ''}
                  ${txt(l.tekst) ? `<p>${t(l.tekst, 600)}</p>` : ''}
                </li>`,
              )
              .join('')}</ul>`
          : `<p class="lege-stand">Het teamoverzicht wordt binnenkort aangevuld. <mark class="placeholder">[te bevestigen: actuele medewerkers, functies en portretfoto's in het CMS]</mark></p>`
      }
    </div>
  </section>`
}

// ------------------------------------------------------------------ cta (Afsluitende oproep)
function cta(blok, ctx) {
  const c = blok.content
  const id = `kop-${ctx.index}`
  const meta = lijst(c.meta, 6).map((m) => ({ tekst: txt(m.tekst, 200), klik: ctx.ki('meta', m, 'tekst') })).filter((m) => m.tekst)
  const img = beeld(c.media_afbeelding, c.media_alt, { klasse: 'cta-beeld' })
  return sectie(
    blok,
    ctx,
    `cta${img ? ' met-beeld' : ''}`,
    `<div class="binnen cta-grid">
      ${img}
      <div class="cta-tekst">
        ${eyebrow(c.eyebrow, ctx.k('eyebrow'))}
        ${kop(2, c.titel, id, '', ctx.k('titel'))}
        ${txt(c.tekst) ? `<p${ctx.k('tekst')}>${t(c.tekst)}</p>` : ''}
        ${meta.length ? `<ul class="cta-meta">${meta.map((m) => `<li${m.klik}>${telInTekst(m.tekst)}</li>`).join('')}</ul>` : ''}
      </div>
      ${knop(c.knop, c.knoptekst) ? `<div class="cta-knop">${metKlik(knop(c.knop, c.knoptekst), ctx.k('knoptekst'))}</div>` : ''}
    </div>`,
    { label: txt(c.titel) ? id : undefined },
  )
}

function telInTekst(s) {
  return t(s).replace(/(0\d{2})\s(\d{3})\s(\d{2})\s(\d{2})/g, (m, a, b, c2, d) => `<a href="tel:+31${(a + b + c2 + d).slice(1)}">${m}</a>`)
}

export const RENDERERS = {
  header,
  tekst: tekstBlok,
  mediatekst,
  kaarten,
  faq,
  reeks,
  feiten,
  kaart,
  formulier_bouwer: formulierBouwer,
  mensen,
  cta,
  artikelen_grid: (blok, ctx) =>
    metKlik(artikelenGridBlok(blok.content, sorteerArtikelenVoorBlok(ctx), { id: `kop-${ctx.index}`, schema: schemaVoor(blok), anker: ctx.anker }), ctx.k()),
}

// ctx.klikken: alleen in de voorvertoning in de CMS-editor (&ingesloten=1). Dan krijgt elke sectie
// data-cms-sectie="<blok.id>" en elk getoond tekstveld data-cms-veld="<pad>" (klik-om-te-bewerken, CMS B-115):
// ctx.k('veld') voor een veld van het blok, ctx.ki('lijst', item, 'veld') voor een veld van een item (het pad
// gebruikt de plek van het item in de lijst uit het CMS). Anders geven beide altijd '' en blijft de HTML gelijk.
export function renderBlok(blok, ctx) {
  const r = RENDERERS[blok?.type]
  if (!r) return ''
  const content = blok.content && typeof blok.content === 'object' && !Array.isArray(blok.content) ? blok.content : {}
  const k = klikMaker(blok.id, ctx.klikken === true)
  const ki = (naam, item, veld) => {
    const n = Array.isArray(content[naam]) ? content[naam].indexOf(item) : -1
    return n < 0 ? '' : k([naam, n, veld])
  }
  return r({ ...blok, content }, { ...ctx, k, ki })
}
