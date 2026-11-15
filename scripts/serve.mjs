// Lokale server: dezelfde verwerking als de Vercel-functie, plus de statische bestanden uit dist/.
//   npm run build && npm run serve            → actuele CMS-inhoud (met .env)
//   npm run build:offline && npm run serve    → testdata
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { verwerk, maakInhoudsbron } from './lib/app.mjs'
import { leesEnv, cmsConfig, siteUrl } from './lib/omgeving.mjs'
import { leesCookies } from './lib/voorvertoning.mjs'

const env = leesEnv()
const DIST = path.resolve('dist')
const poort = Number(env.PORT) || 4321
const momentopname = JSON.parse(await readFile(path.join(DIST, 'inhoud.json'), 'utf8'))
const offline = momentopname.opgehaald === 'offline' || env.CMS_OFFLINE === '1'
const cfg = offline ? null : cmsConfig(env)
const bron = maakInhoudsbron({ cfg, momentopname })
const opties = { bron, cfg, siteUrl: `http://localhost:${poort}`, cmsUrl: cfg?.cmsUrl ?? cmsConfig(env).cmsUrl }
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' }

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const pad = decodeURIComponent(url.pathname)
    const vol = path.join(DIST, pad)
    if (vol.startsWith(DIST) && pad !== '/' && pad !== '/inhoud.json' && (await stat(vol).catch(() => null))?.isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(vol)] || 'application/octet-stream' })
      return res.end(await readFile(vol))
    }
    const r = await verwerk({ pad, zoek: url.searchParams, cookies: leesCookies(req.headers.cookie) }, opties)
    // Lokaal is er geen https: zonder Secure kan de browser de voorvertoningscookie bewaren.
    if (r.headers['set-cookie']) r.headers['set-cookie'] = r.headers['set-cookie'].replace('; Secure', '').replace('SameSite=None; Partitioned', 'SameSite=Lax')
    res.writeHead(r.status, r.headers)
    res.end(r.body)
  })
  .listen(poort, () => console.log(`Site: http://localhost:${poort}${offline ? ' (testdata)' : ' (CMS: ' + cfg.cmsUrl + ')'}`))
