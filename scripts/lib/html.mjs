// Kleine, veilige HTML-helpers. Alle CMS-inhoud gaat door esc()/attr(); er komt nooit ruwe HTML
// uit het CMS in de pagina.

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const attr = esc

// Tekstwaarde of '' (CMS-velden zijn optioneel en ongevalideerde JSON → altijd defensief lezen).
export function txt(v, max = 2000) {
  return typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : ''
}

export function lijst(v, max = 50) {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').slice(0, max) : []
}

// Alleen veilige link-vormen; al het andere vervalt (geen javascript:/data:).
export function veiligeHref(v) {
  const s = txt(v, 500)
  if (!s) return ''
  if (s.startsWith('/') || s.startsWith('#')) return s
  if (/^(https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?|mailto:[^\s]+|tel:[+\d\s-]+)$/i.test(s)) return s
  return ''
}

export function isExtern(href) {
  return /^https?:\/\//i.test(href)
}

// Placeholders voor onbevestigde praktijkgegevens zichtbaar markeren: "[te bevestigen: …]".
// Werkt op AL ge-escapete tekst.
export function markeerPlaceholders(veiligeHtml) {
  return veiligeHtml.replace(
    /\[(te bevestigen[^\]]*)\]/gi,
    '<mark class="placeholder" title="Nog te bevestigen door de praktijk">[$1]</mark>',
  )
}

// Ge-escapete tekst met placeholder-markering — voor elk zichtbaar tekstveld.
export function t(v, max) {
  return markeerPlaceholders(esc(txt(v, max)))
}

export function knop(href, tekst, { klasse = 'knop', pijl = true } = {}) {
  const h = veiligeHref(href)
  const l = txt(tekst, 120)
  if (!h || !l) return ''
  const extern = isExtern(h) ? ' target="_blank" rel="noopener noreferrer"' : ''
  const sr = isExtern(h) ? '<span class="sr-only"> (opent in nieuw venster)</span>' : ''
  return `<a class="${klasse}" href="${attr(h)}"${extern}><span>${t(l)}</span>${sr}${pijl ? PIJL : ''}</a>`
}

// Functionele pijl (toegestaan volgens de handoff; geen decoratieve iconen).
export const PIJL =
  '<svg class="pijl" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
