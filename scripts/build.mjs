// Build van de Tandarts Van Beek-site (model A, eigen frontend op Link & Lead One).
//
// 1. Haalt alle gepubliceerde inhoud op via de lees-API v1 en bewaart die als momentopname
//    (`inhoud.json`): de terugval als het CMS later even onbereikbaar is.
// 2. Schrijft een Vercel Build Output (v3): statische bestanden (css, js, beelden, fonts) en één
//    serverfunctie die elke pagina rendert met de actuele CMS-inhoud (verversing binnen ±1 minuut),
//    plus /__voorvertoning, /artikelen en /sitemap.xml.
//
//   npm run build                 → inhoud uit het CMS (CMS_URL + CMS_TOKEN vereist)
//   CMS_OFFLINE=1 npm run build   → testdata uit tests/fixtures (geen token nodig, niet voor productie)
//
// Is het CMS tijdens de build onbereikbaar, dan stopt de build met een fout. Vercel laat dan de vorige
// deployment gewoon live staan.
import { mkdirSync, writeFileSync, cpSync, rmSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { laadAlles } from './lib/cms-v1.mjs'
import { leesEnv, cmsConfig, siteUrl, blauwdrukAlsInhoud } from './lib/omgeving.mjs'

const env = leesEnv()
const cfg = cmsConfig(env)
const OFFLINE = env.CMS_OFFLINE === '1'

let inhoud
if (OFFLINE) {
  console.log('⚠ CMS_OFFLINE=1 — testdata uit tests/fixtures (niet voor productie).')
  inhoud = await blauwdrukAlsInhoud()
} else {
  if (!cfg.token) {
    console.error('✗ Zet CMS_URL en CMS_TOKEN (zie .env.example), of gebruik CMS_OFFLINE=1 voor lokaal werken.')
    process.exit(1)
  }
  try {
    inhoud = await laadAlles(cfg)
  } catch (e) {
    console.error(`✗ Inhoud ophalen uit het CMS mislukt: ${e.message}. De vorige deployment blijft live.`)
    process.exit(1)
  }
}
if (!inhoud.paginas.some((p) => p.slug === '/')) {
  console.error('✗ Het CMS heeft geen gepubliceerde homepage (slug "/").')
  process.exit(1)
}
console.log(`✓ Inhoud: "${inhoud.site.naam || '?'}", ${inhoud.paginas.length} pagina's, ${inhoud.artikelen.length} artikelen${OFFLINE ? ' (offline)' : ' uit het CMS (lees-API v1)'}.`)

// --- dist/: statische bestanden + momentopname (ook gebruikt door npm run serve)
const DIST = 'dist'
rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })
cpSync('public', DIST, { recursive: true })
cpSync('src/styles.css', path.join(DIST, 'styles.css'))
cpSync('src/site.js', path.join(DIST, 'site.js'))
writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /__voorvertoning\n\nSitemap: ${siteUrl(env)}/sitemap.xml\n`)
writeFileSync(path.join(DIST, 'inhoud.json'), JSON.stringify(inhoud))

// --- Vercel Build Output API v3
const cspMet = (frameAncestors) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${cfg.cmsUrl}`,
    `connect-src 'self' ${cfg.cmsUrl}`,
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
// Gewone pagina's mogen nergens ingesloten worden. Alleen de voorvertoning mag in het voorbeeldvenster van
// de CMS-editor staan (CMS-verzoek "Editorvoorbeeld in het echte ontwerp van een eigen frontend").
const CSP = cspMet("'none'")
const CSP_VOORVERTONING = cspMet(`'self' ${cfg.cmsUrl}`)
const config = {
  version: 3,
  routes: [
    { src: '^/__voorvertoning(/.*)?$', headers: { 'Content-Security-Policy': CSP_VOORVERTONING }, continue: true },
    {
      src: '^/(?!__voorvertoning)(.*)$',
      headers: {
        'Content-Security-Policy': CSP,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      },
      continue: true,
    },
    {
      src: '^/__voorvertoning(/.*)?$',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      },
      continue: true,
    },
    { src: '^/(fonts|img)/(.*)$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/inhoud\\.json$', status: 404 }, // de momentopname is alleen voor de functie
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/render' },
  ],
}

if (env.VERCEL === '1' || env.BUILD_OUTPUT === '1') {
  const UIT = '.vercel/output'
  rmSync(UIT, { recursive: true, force: true })
  mkdirSync(path.join(UIT, 'static'), { recursive: true })
  cpSync(DIST, path.join(UIT, 'static'), { recursive: true, filter: (bron) => !bron.endsWith('inhoud.json') })

  const FUNC = path.join(UIT, 'functions', 'render.func')
  mkdirSync(path.join(FUNC, 'lib'), { recursive: true })
  for (const f of readdirSync('scripts/lib')) if (f.endsWith('.mjs')) cpSync(path.join('scripts/lib', f), path.join(FUNC, 'lib', f))
  cpSync('scripts/functie.mjs', path.join(FUNC, 'index.mjs'))
  writeFileSync(path.join(FUNC, 'inhoud.json'), JSON.stringify(inhoud))
  writeFileSync(path.join(FUNC, 'package.json'), JSON.stringify({ type: 'module' }))
  writeFileSync(
    path.join(FUNC, '.vc-config.json'),
    JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 15 }, null, 2),
  )
  writeFileSync(path.join(UIT, 'config.json'), JSON.stringify(config, null, 2))
  console.log('✓ Vercel Build Output geschreven (.vercel/output, functie "render").')
}
console.log(`✓ Klaar → ${DIST}/ (statische bestanden + momentopname).`)
