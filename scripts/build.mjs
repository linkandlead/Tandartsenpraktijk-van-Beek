// Build van de Tandarts Van Beek-frontend (model A, headless op het Link & Lead CMS).
//
// 1. Haalt de gepubliceerde content op via GET {CMS_BASE}/api/cms/content (Bearer CMS_TOKEN).
// 2. Rendert elke CMS-pagina als statische, server-side gerenderde HTML in het eigen ontwerp.
// 3. Schrijft sitemap, robots.txt, 404 en de Vercel Build Output-config (redirects uit het CMS,
//    beveiligingsheaders).
//
//   npm run build                 → content uit het CMS (CMS_TOKEN vereist)
//   CMS_OFFLINE=1 npm run build   → lokale preview uit cms/blauwdruk.mjs (geen token nodig)
import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { leesEnv, haalCmsContent, blauwdrukAlsContent, normaliseer } from './lib/inhoud.mjs'
import { renderPagina } from './lib/pagina.mjs'
import { resolveRedirects } from './lib/redirects.mjs'

const env = leesEnv()
const CMS_BASE = (env.CMS_BASE || 'https://linkandlead.nl').replace(/\/$/, '')
const SITE_URL = (env.SITE_URL || 'https://tandartsenpraktijk-van-beek.vercel.app').replace(/\/$/, '')
const SITE_ID = env.SITE_ID || ''
const OFFLINE = env.CMS_OFFLINE === '1'

let ruw
if (OFFLINE) {
  console.log('⚠ CMS_OFFLINE=1 — preview uit cms/blauwdruk.mjs (niet voor productie).')
  ruw = await blauwdrukAlsContent()
} else {
  if (!env.CMS_TOKEN) {
    console.error('✗ Zet CMS_TOKEN (zie .env.example), of gebruik CMS_OFFLINE=1 voor een lokale preview.')
    process.exit(1)
  }
  ruw = await haalCmsContent({ base: CMS_BASE, token: env.CMS_TOKEN })
}
const { site, paginas, records } = normaliseer(ruw)
console.log(`✓ Content: site "${site.naam ?? '?'}", ${paginas.length} pagina('s)${OFFLINE ? ' (offline)' : ' uit het CMS'}.`)
if (!paginas.length) {
  console.error('✗ Geen gepubliceerde pagina\'s. Push eerst de blauwdruk: npm run cms:push')
  process.exit(1)
}

const UIT = 'dist'
rmSync(UIT, { recursive: true, force: true })
mkdirSync(UIT, { recursive: true })
cpSync('public', UIT, { recursive: true })
cpSync('src/styles.css', path.join(UIT, 'styles.css'))
cpSync('src/site.js', path.join(UIT, 'site.js'))

const titels = new Map(paginas.map((p) => [p.slug, p.titel]))
const meldingen = []
const opties = { site, records, titels, SITE_URL, CMS_BASE, SITE_ID, meldingen }

for (const p of paginas) {
  const html = renderPagina(p, opties)
  const doel = p.slug === '/' ? path.join(UIT, 'index.html') : path.join(UIT, p.slug.slice(1), 'index.html')
  mkdirSync(path.dirname(doel), { recursive: true })
  writeFileSync(doel, html)
}

// 404-pagina (zelfde schil, geen CMS-pagina nodig).
writeFileSync(
  path.join(UIT, '404.html'),
  renderPagina(
    {
      slug: '/404',
      titel: 'Pagina niet gevonden',
      beschrijving: 'Deze pagina bestaat niet (meer).',
      blokken: [
        { type: 'header', bg: 'wit', content: { layout: 'compact', hoogte: 'compact', eyebrow: 'Foutmelding 404', heading: 'Deze pagina bestaat niet (meer)', subheading: 'Misschien is de pagina verplaatst. Ga naar de homepage of bekijk direct wat u moet doen bij spoed.', cta_primair_label: 'Naar de homepage', cta_primair_link: '/', cta_secundair_label: 'Spoed', cta_secundair_link: '/spoed', auto_kruimelpad: 'uit' } },
      ],
    },
    { ...opties, noindex: true },
  ),
)

// Sitemap + robots.
const nu = new Date().toISOString().slice(0, 10)
writeFileSync(
  path.join(UIT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paginas
    .map((p) => `  <url><loc>${SITE_URL}${p.slug === '/' ? '/' : p.slug}</loc><lastmod>${nu}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync(path.join(UIT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

// Vercel Build Output API v3: redirects uit het CMS (site.redirects) + headers + nette URL's.
const redirects = resolveRedirects(site.redirects)
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CMS_BASE}`,
  `connect-src 'self' ${CMS_BASE}`,
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
const config = {
  version: 3,
  routes: [
    ...redirects.map((r) => ({
      src: '^' + r.van.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?$',
      status: r.status,
      headers: { Location: r.naar },
    })),
    {
      src: '/(.*)',
      headers: {
        'Content-Security-Policy': CSP,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      },
      continue: true,
    },
    { src: '^/(fonts|img)/(.*)$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
    { handle: 'filesystem' },
    { src: '^/(.+?)/?$', dest: '/$1/index.html', check: true },
    { handle: 'miss' },
    { src: '/.*', status: 404, dest: '/404.html' },
  ],
}
if (env.VERCEL === '1' || env.BUILD_OUTPUT === '1') {
  rmSync('.vercel/output', { recursive: true, force: true })
  mkdirSync('.vercel/output', { recursive: true })
  cpSync(UIT, '.vercel/output/static', { recursive: true })
  writeFileSync('.vercel/output/config.json', JSON.stringify(config, null, 2))
  console.log('✓ Vercel Build Output geschreven (.vercel/output).')
}
writeFileSync(path.join(UIT, '_routes.json'), JSON.stringify(config, null, 2)) // gebruikt door npm run serve

for (const m of meldingen) console.warn('⚠ ' + m)
console.log(`✓ Klaar → ${UIT}/ (${paginas.length} pagina's, ${redirects.length} redirects).`)
if (!existsSync(path.join(UIT, 'index.html'))) {
  console.error('✗ Geen homepage (slug "/") in het CMS.')
  process.exit(1)
}
