// Beveiligingsheaders van de site (Vercel-routes in scripts/build.mjs en de antwoorden van app.mjs).
//
// Overal geldt frame-ancestors 'none': de site mag nergens in een frame. Eén uitzondering (B-110): de
// voorvertoning (/__voorvertoning en alles daaronder) mag ingesloten worden door de editor van het CMS,
// en alleen door die origin. Die antwoorden zijn altijd noindex en no-store.

export const VOORVERTONING_PAD = /^\/__voorvertoning(?:\/|$)/

// Origin van het CMS (alleen https), standaard https://cms.linkandlead.nl.
export function cmsOrigin(cmsUrl) {
  try {
    const u = new URL(cmsUrl)
    if (u.protocol === 'https:') return u.origin
  } catch {
    /* terugval hieronder */
  }
  return 'https://cms.linkandlead.nl'
}

export function csp(cmsUrl, { frameAncestors = "'none'" } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${cmsUrl}`,
    `connect-src 'self' ${cmsUrl}`,
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

// De CSP voor de voorvertoning: alleen de site zelf en het CMS mogen hem in een frame tonen (handboek §6.3).
export function voorvertoningCsp(cmsUrl) {
  return csp(cmsUrl, { frameAncestors: `'self' ${cmsOrigin(cmsUrl)}` })
}

export const VOORVERTONING_KOPPEN = { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'private, no-store' }

const ALGEMEEN = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
}

// Vercel-routes met de headers: de voorvertoning en de rest van de site sluiten elkaar uit, zodat een
// antwoord nooit twee CSP's krijgt (twee frame-ancestors zouden samen weer 'none' betekenen).
export function headerRoutes(cmsUrl) {
  return [
    {
      src: '^/__voorvertoning(?:/.*)?$',
      headers: { 'Content-Security-Policy': voorvertoningCsp(cmsUrl), 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store', ...ALGEMEEN },
      continue: true,
    },
    {
      src: '^/(?!__voorvertoning(?:/|$)).*$',
      headers: { 'Content-Security-Policy': csp(cmsUrl), ...ALGEMEEN },
      continue: true,
    },
  ]
}
