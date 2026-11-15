// "Voorbeeld op de site": pure hulpfuncties (geen I/O), met tests. Gelijk aan NOVA (linkandlead/demo,
// src/lib/cms/voorvertoning.ts) en het CMS-protocol: token = "<verloopt-unix>.<64 hex>", 30 minuten.
// De site kent het geheim niet; alleen het CMS kan het token controleren (concept: true).

export const VOORVERTONING_COOKIE = 'vb_voorvertoning'
const MAX_LEEFTIJD_S = 60 * 60

/** Alleen een intern pad: begint met één "/", geen "//" of "/\" (andere host), geen stuurtekens. */
export function veiligPad(invoer) {
  if (typeof invoer !== 'string') return null
  const p = invoer.trim()
  if (!p.startsWith('/') || p.startsWith('//') || p.startsWith('/\\') || p.length > 300) return null
  if (/[\u0000-\u001f\u007f\\]/.test(p)) return null
  try {
    const basis = 'https://site.invalid'
    const u = new URL(p, basis)
    if (u.origin !== basis) return null
    return u.pathname + u.search
  } catch {
    return null
  }
}

export function tokenVorm(token) {
  return typeof token === 'string' && /^\d{9,12}\.[0-9a-f]{64}$/.test(token)
}

/** Resterende geldigheid in seconden (0 = verlopen of ongeldig van vorm), hooguit een uur. */
export function tokenSecondenGeldig(token, nu = Date.now()) {
  if (!tokenVorm(token)) return 0
  const rest = Number(token.split('.')[0]) - Math.floor(nu / 1000)
  return rest > 0 ? Math.min(rest, MAX_LEEFTIJD_S) : 0
}

export function leesCookies(kop) {
  const uit = {}
  for (const deel of String(kop ?? '').split(';')) {
    const i = deel.indexOf('=')
    if (i > 0) uit[deel.slice(0, i).trim()] = deel.slice(i + 1).trim()
  }
  return uit
}
