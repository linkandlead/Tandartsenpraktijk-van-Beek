// Overgenomen uit @linkandlead/site-kit 1.20.0 (CMS B-115): linkandlead/linkandlead-cms
// packages/site-kit/src/voorvertoningklikken.ts, met de TypeScript-typen weggelaten en verder ongewijzigd. Deze site
// heeft geen dependencies (en dus de kit niet); bij een nieuwe kitversie deze twee helpers opnieuw overnemen.
// Daaronder twee kleine hulpjes van deze site: de attributen als HTML-tekst, en het script voor de pagina.
//
// Klik-om-te-bewerken in de pagina-editor (vanaf 1.20, B-115; opt-in). De editor van het CMS toont het ontwerp van de
// site in een iframe op /__voorvertoning?…&ingesloten=1 (B-110). Met deze helper kiest een klik in dat iframe het blok
// (en, als dat eenduidig is, het veld) in de editor, net als in de standaardopmaak.
//
// Markeer in de voorvertoning de onderdelen met dezelfde attributen als de gedeelde renderer van het CMS:
//   - de sectie: `data-cms-sectie="<blok.id>"` (of `data-sectie`, zoals de renderer), met `blok.id` uit de lees-API;
//   - een veld daarbinnen: `data-cms-veld="titel"` of `data-cms-veld="items.0.titel"` (het pad in `blok.inhoud`).
// `klikAttributen(blok.id, ['titel'])` geeft die attributen. Zet ze alleen in de voorvertoning, niet voor bezoekers.
//
// Roep `voorvertoningKlikken({ cmsUrl: CMS_URL })` in de browser aan. Hij doet alleen iets als de pagina in een iframe
// staat én in de editor is ingesloten (`?ingesloten=1` in het adres, of `ingesloten: true`). Een klik op een gemarkeerd
// onderdeel opent dan geen link, maar stuurt via postMessage, alleen naar de origin van het CMS (nooit '*'), het
// bericht `{ bron: 'cms-voorbeeld', soort: 'kies', sectieId, pad, item: null, typbaar: false }`.

// De attributen voor één sectie (en eventueel één veld). Het pad wordt een tekst met punten, zoals in de renderer.
export function klikAttributen(sectieId, veld) {
  const pad = Array.isArray(veld) ? veld.join('.') : (veld ?? '')
  return pad ? { 'data-cms-sectie': sectieId, 'data-cms-veld': pad } : { 'data-cms-sectie': sectieId }
}

// Zelfstandig (geen verwijzingen naar iets buiten de functie), zodat hij ook als losse code te gebruiken is.
export function voorvertoningKlikken(o) {
  const niets = () => {}
  const w = o.venster ?? (typeof window === 'undefined' ? null : window)
  if (!w || w.parent === w || !w.parent) return niets
  let doel
  try {
    const u = new URL(o.cmsUrl)
    const lokaal = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    if (!(u.protocol === 'https:' || (lokaal && u.protocol === 'http:')) || u.username || u.password) return niets
    doel = u.origin
  } catch {
    return niets
  }
  const ingesloten = o.ingesloten ?? new URLSearchParams(w.location.search).get('ingesloten') === '1'
  if (!ingesloten) return niets
  const SECTIE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  const DEEL = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
  const klik = (e) => {
    const ev = e
    if (ev.button !== undefined && ev.button !== 0) return
    const start = ev.target && typeof ev.target.closest === 'function' ? ev.target : null
    const sectie = start?.closest?.('[data-cms-sectie],[data-sectie]') ?? null
    if (!sectie) return
    const sectieId = sectie.getAttribute('data-cms-sectie') ?? sectie.getAttribute('data-sectie') ?? ''
    if (!SECTIE.test(sectieId)) return
    const veldEl = start?.closest?.('[data-cms-veld]') ?? null
    let pad = null
    if (veldEl && (!veldEl.contains || sectie.contains?.(veldEl) !== false)) {
      const t = veldEl.getAttribute('data-cms-veld') ?? ''
      const delen = t.length <= 300 ? t.split('.').map((d) => (/^\d+$/.test(d) ? Number(d) : d)) : []
      const geldig = delen.length > 0 && delen.length <= 8 && delen.every((d) => (typeof d === 'number' ? d < 2000 : DEEL.test(d) && d !== '__proto__' && d !== 'constructor' && d !== 'prototype'))
      pad = geldig ? delen : null
    }
    // In de editor kiest een klik een onderdeel; een link of knop volgen hoort daar niet bij.
    ev.preventDefault()
    ev.stopPropagation()
    const bericht = { bron: 'cms-voorbeeld', soort: 'kies', sectieId, pad, item: null, typbaar: false }
    w.parent.postMessage(bericht, doel)
  }
  w.document.addEventListener('click', klik, true)
  return () => w.document.removeEventListener('click', klik, true)
}

// ------------------------------------------------------------------ eigen hulpjes van deze site

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Een functie k(veld) die de attributen als HTML-tekst geeft (met een spatie ervoor), alleen als klikken aan staat en
// het blok een geldig id (uuid uit de lees-API) heeft; anders altijd ''. k() = alleen de sectie.
export function klikMaker(blokId, aan) {
  if (!aan || typeof blokId !== 'string' || !UUID.test(blokId)) return () => ''
  return (veld) => Object.entries(klikAttributen(blokId, veld)).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')
}

// Het script voor de ingesloten voorvertoning: de helper hierboven als losse code (hij is zelfstandig), aangeroepen met
// de origin van het CMS. Inline, zodat er geen extra bestand of CSP-bron nodig is (script-src staat 'unsafe-inline'
// al toe). Een onveilig CMS-adres geeft geen script.
export function klikScript(cmsUrl) {
  let origin
  try {
    const u = new URL(String(cmsUrl))
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))) return ''
    if (u.username || u.password) return ''
    origin = u.origin
  } catch {
    return ''
  }
  const arg = JSON.stringify({ cmsUrl: origin, ingesloten: true }).replace(/</g, '\\u003c')
  return `<script>(${voorvertoningKlikken.toString()})(${arg})</script>`
}
