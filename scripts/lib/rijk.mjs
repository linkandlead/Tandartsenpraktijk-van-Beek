// Rijke tekst — exact het subset dat het Link & Lead CMS ondersteunt (src/lib/richtekst.ts):
// lege regel = alinea, "- " = opsomming, **vet**, *cursief*, [tekst](url). Nooit HTML uit de invoer.
// Aanvulling voor deze site: tel:-links zijn ook toegestaan (klikbare telefoonnummers, FO T03).
import { esc, markeerPlaceholders, isExtern } from './html.mjs'

const VEILIGE_LINK = /^(https?:\/\/|mailto:|tel:|\/|#)/i

function inline(tekst) {
  let uit = ''
  const patroon = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let laatst = 0
  let m
  while ((m = patroon.exec(tekst)) !== null) {
    if (m.index > laatst) uit += markeerPlaceholders(esc(tekst.slice(laatst, m.index)))
    if (m[1] !== undefined) {
      const url = m[2].trim()
      if (VEILIGE_LINK.test(url)) {
        const ext = isExtern(url) ? ' target="_blank" rel="noopener noreferrer"' : ''
        uit += `<a href="${esc(url)}"${ext}>${esc(m[1])}</a>`
      } else uit += esc(m[1])
    } else if (m[3] !== undefined) uit += `<strong>${esc(m[3])}</strong>`
    else if (m[4] !== undefined) uit += `<em>${esc(m[4])}</em>`
    laatst = patroon.lastIndex
  }
  if (laatst < tekst.length) uit += markeerPlaceholders(esc(tekst.slice(laatst)))
  return uit
}

export function rijkeTekst(tekst) {
  if (typeof tekst !== 'string' || !tekst.trim()) return ''
  const delen = []
  let items = []
  const spoel = () => {
    if (items.length) delen.push(`<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`)
    items = []
  }
  for (const rauw of tekst.split('\n')) {
    const r = rauw.trim()
    if (!r) {
      spoel()
      continue
    }
    if (r.startsWith('- ')) {
      items.push(inline(r.slice(2)))
      continue
    }
    spoel()
    delen.push(`<p>${inline(r)}</p>`)
  }
  spoel()
  return delen.join('\n')
}
