// Stuurt de blauwdruk (design_tokens, merk/navigatie, redirects, pagina's + blokken) naar het
// Link & Lead CMS via POST /api/cms/sync met het site-token. Gebaseerd op scripts/cms-push.mjs
// uit linkandlead-cms; aanvulling: ook `merk` en `redirects` gaan mee (de sync ondersteunt die).
//
//   npm run cms:push          (CMS_BASE + CMS_TOKEN uit .env)
//
// LET OP: de sync overschrijft de pagina's die in de blauwdruk staan (schone hersync per slug).
// Wijzigingen die redacteuren in /admin op díe pagina's deden, gaan dan verloren.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { leesEnv } from './lib/inhoud.mjs'
import { controleerBlok } from './lib/cms-contract.mjs'

const env = leesEnv()
const url = (env.CMS_BASE || env.CMS_URL || '').replace(/\/$/, '')
const token = env.CMS_TOKEN
const bpArg = process.argv[2] || 'cms/blauwdruk.mjs'
if (!url || !token) {
  console.error('Zet CMS_BASE + CMS_TOKEN in .env (zie .env.example).')
  process.exit(1)
}

const bd = (await import(pathToFileURL(path.resolve(bpArg)).href)).default
const paginas = Array.isArray(bd.paginas) ? bd.paginas : []
const fouten = paginas.flatMap((p) => (p.blokken ?? []).flatMap((b, i) => controleerBlok(b, `${p.slug} #${i}`)))
if (fouten.length) {
  console.error('✗ Blauwdruk wijkt af van het CMS-contract:\n' + fouten.join('\n'))
  process.exit(1)
}

const CHUNK = Math.max(1, Number(env.CMS_CHUNK) || 12)
let totP = 0
let totB = 0
let siteId = null
for (let i = 0; i < paginas.length; i += CHUNK) {
  const eerste = i === 0
  const res = await fetch(url + '/api/cms/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({
      design_tokens: eerste ? bd.design_tokens : undefined,
      merk: eerste ? bd.merk : undefined,
      redirects: eerste ? bd.redirects : undefined,
      paginas: paginas.slice(i, i + CHUNK),
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.ok) {
    console.error(`✗ Sync mislukt (pagina's ${i + 1}–${Math.min(i + CHUNK, paginas.length)}):`, j.melding || res.status)
    process.exit(1)
  }
  totP += j.paginas ?? 0
  totB += j.blokken ?? 0
  siteId = j.siteId ?? siteId
}
console.log(`✅ Gesynchroniseerd: ${totP} pagina's, ${totB} blokken (site ${siteId}).`)
