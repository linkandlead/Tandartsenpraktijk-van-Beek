// Eén CMS-pagina → volledige HTML (server-side, leesbaar zonder JavaScript).
import { esc, attr, txt, veiligeHref } from './html.mjs'
import { renderBlok, RENDERERS } from './blokken.mjs'
import { siteHeader, siteFooter, kruimelpad, head } from './schil.mjs'

const ANKERS = { formulier_bouwer: 'bericht', mensen: 'team', kaart: 'route' }

export function renderPagina(p, { site, records, titels, SITE_URL, CMS_BASE, SITE_ID, meldingen = [], noindex = false }) {
  const isHome = p.slug === '/'
  const kruimel = kruimelpad(p.slug, titels)
  let headerGezien = false
  let heeftFormulier = false
  const gebruikteAnkers = new Set()
  const secties = p.blokken
    .map((blok, index) => {
      if (!RENDERERS[blok.type]) {
        meldingen.push(`${p.slug}: bloktype "${blok.type}" heeft (nog) geen renderer in deze frontend — overgeslagen.`)
        return ''
      }
      const isEersteHeader = blok.type === 'header' && !headerGezien
      if (blok.type === 'header') headerGezien = true
      if (blok.type === 'formulier_bouwer') heeftFormulier = true
      let anker = ANKERS[blok.type]
      if (blok.type === 'kaarten' && blok.content?.weergave === 'keuzehulp') anker = 'keuzehulp'
      if (anker && gebruikteAnkers.has(anker)) anker = undefined
      if (anker) gebruikteAnkers.add(anker)
      return renderBlok(blok, { index, isEersteHeader, isHome, kruimelpad: kruimel, paginaTitel: p.titel, records, slug: p.slug, anker })
    })
    .filter(Boolean)

  // Precies één h1 per pagina, uit de eerste Header. Ontbreekt die, dan een visueel verborgen h1.
  if (!headerGezien) {
    meldingen.push(`${p.slug}: geen Header-blok — er wordt een verborgen h1 met de paginatitel gebruikt.`)
    secties.unshift(`<h1 class="sr-only">${esc(p.titel)}</h1>`)
  } else if (p.blokken[0]?.type !== 'header') {
    meldingen.push(`${p.slug}: de pagina begint niet met een Header-blok.`)
  }

  const naam = txt(site.merk?.naam) || txt(site.naam) || 'Tandarts Van Beek'
  const titel = isHome ? txt(p.titel) || naam : `${txt(p.titel)} | ${naam}`
  const eersteBeeld = p.blokken.find((b) => b.type === 'header')?.content?.media_afbeelding
  const og = veiligeHref(p.og_beeld) || veiligeHref(eersteBeeld)
  const ogAbs = og ? (og.startsWith('/') ? SITE_URL + og : og) : ''
  const canonical = SITE_URL + (isHome ? '/' : p.slug)
  const c = site.merk?.contact ?? {}
  const jsonld = isHome
    ? {
        '@context': 'https://schema.org',
        '@type': 'Dentist',
        name: naam,
        url: SITE_URL + '/',
        ...(txt(c.telefoon) ? { telephone: txt(c.telefoon) } : {}),
        address: { '@type': 'PostalAddress', addressLocality: 'Honselersdijk', addressCountry: 'NL' },
      }
    : null

  return `<!doctype html>
<html lang="nl">
<head>
${head({ titel, beschrijving: txt(p.beschrijving, 300) || naam, canonical, ogBeeld: ogAbs, siteNaam: naam, favicon: veiligeHref(site.merk?.favicon), jsonld, cmsBase: CMS_BASE, siteId: SITE_ID })}
${noindex ? '<meta name="robots" content="noindex">' : ''}
${heeftFormulier && SITE_ID ? `<script defer src="${attr(CMS_BASE)}/cms-client.js" data-site="${attr(SITE_ID)}"></script>` : ''}
</head>
<body>
<a class="skiplink" href="#inhoud">Direct naar de inhoud</a>
${siteHeader(site, p.slug)}
<main id="inhoud" tabindex="-1">
${secties.join('\n')}
</main>
${siteFooter(site)}
</body>
</html>
`
}
