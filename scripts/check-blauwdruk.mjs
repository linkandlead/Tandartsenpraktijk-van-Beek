// Controleert cms/blauwdruk.mjs tegen het CMS-contract: alleen bestaande bloktypen en velden,
// geldige achtergronden, precies één Header bovenaan elke pagina.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { controleerBlok } from './lib/cms-contract.mjs'

const bestand = process.argv[2] || 'cms/blauwdruk.mjs'
const bd = (await import(pathToFileURL(path.resolve(bestand)).href)).default
const fouten = []
const slugs = new Set()
for (const p of bd.paginas ?? []) {
  if (slugs.has(p.slug)) fouten.push(`Dubbele slug ${p.slug}.`)
  slugs.add(p.slug)
  const blokken = p.blokken ?? []
  if (blokken[0]?.type !== 'header') fouten.push(`${p.slug}: eerste blok moet een Header zijn (de h1).`)
  if (blokken.length > 30) fouten.push(`${p.slug}: meer dan 30 blokken (CMS-limiet).`)
  blokken.forEach((b, i) => fouten.push(...controleerBlok(b, `${p.slug} #${i} (${b.type})`)))
}
// Interne links moeten naar een bestaande pagina (of anker daarop) wijzen.
const tekst = JSON.stringify(bd)
for (const m of tekst.matchAll(/"(?:link|knop|href|cta_primair_link|cta_secundair_link)":"(\/[^"#]*)/g)) {
  if (!slugs.has(m[1].replace(/\/$/, '') || '/')) fouten.push(`Interne link naar onbekende pagina: ${m[1]}`)
}
if (fouten.length) {
  console.error(fouten.map((f) => '✗ ' + f).join('\n'))
  process.exit(1)
}
console.log(`✓ Blauwdruk in orde: ${slugs.size} pagina's, alleen bestaande CMS-blokken en -velden.`)
