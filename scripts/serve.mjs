// Lokale preview van dist/ met dezelfde routeregels als op Vercel (redirects, nette URL's, 404).
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const UIT = path.resolve('dist')
const poort = Number(process.env.PORT) || 4321
const config = JSON.parse(await readFile(path.join(UIT, '_routes.json'), 'utf8'))
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' }

async function bestand(p) {
  const vol = path.join(UIT, p)
  if (!vol.startsWith(UIT)) return null
  try { const s = await stat(vol); return s.isFile() ? vol : null } catch { return null }
}

http.createServer(async (req, res) => {
  const pad = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  for (const r of config.routes) {
    if (r.status && r.headers?.Location && new RegExp(r.src).test(pad)) {
      res.writeHead(r.status, { Location: r.headers.Location }); return res.end()
    }
  }
  const kandidaat = (await bestand(pad)) || (await bestand(path.join(pad, 'index.html')))
  const doel = kandidaat || path.join(UIT, '404.html')
  res.writeHead(kandidaat ? 200 : 404, { 'content-type': TYPES[path.extname(doel)] || 'application/octet-stream' })
  res.end(await readFile(doel))
}).listen(poort, () => console.log(`Preview: http://localhost:${poort}`))
