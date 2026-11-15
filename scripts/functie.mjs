// Vercel-functie "render" (Build Output API): elke pagina, artikelen, sitemap en /__voorvertoning.
// De build kopieert dit bestand naar .vercel/output/functions/render.func/index.mjs, met scripts/lib
// ernaast als lib/ en de momentopname inhoud.json.
import { readFileSync } from 'node:fs'
import { verwerk, maakInhoudsbron } from './lib/app.mjs'
import { cmsConfig, siteUrl } from './lib/omgeving.mjs'
import { leesCookies } from './lib/voorvertoning.mjs'

const cfg = cmsConfig(process.env)
const momentopname = JSON.parse(readFileSync(new URL('./inhoud.json', import.meta.url), 'utf8'))
const bron = maakInhoudsbron({ cfg, momentopname })
const opties = { bron, cfg, siteUrl: siteUrl(process.env), cmsUrl: cfg.cmsUrl }

export default async function render(req, res) {
  const url = new URL(req.url, 'https://site.invalid')
  try {
    const r = await verwerk({ pad: decodeURIComponent(url.pathname), zoek: url.searchParams, cookies: leesCookies(req.headers.cookie) }, opties)
    res.statusCode = r.status
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v)
    res.end(r.body)
  } catch {
    // Nooit details van de fout naar buiten (en nooit het token loggen).
    res.statusCode = 500
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end('Er ging iets mis. Probeer het opnieuw.')
  }
}
