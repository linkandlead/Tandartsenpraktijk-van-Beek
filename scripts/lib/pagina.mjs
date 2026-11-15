// Eén pagina → volledige HTML (server-side, leesbaar zonder JavaScript).
import { esc, attr, txt, veiligeHref } from './html.mjs'
import { renderBlok, RENDERERS } from './blokken.mjs'
import { siteHeader, siteFooter, kruimelpad, head } from './schil.mjs'

const ANKERS = { formulier_bouwer: 'bericht', mensen: 'team', kaart: 'route', artikelen_grid: 'artikelen' }

// Interne links in de voorvertoning laten doorverwijzen naar de voorvertoning van die pagina, zodat
// doorklikken in het concept blijft. Assets (css, js, beelden, fonts) blijven ongemoeid.
export function voorvertoningsLinks(html) {
  return html.replace(/href="(\/(?!\/)[^"#]*)(#[^"]*)?"/g, (heel, pad, hash = '') => {
    if (/^\/(styles\.css|site\.js|img\/|fonts\/|favicon|__voorvertoning)/.test(pad)) return heel
    return `href="/__voorvertoning?pad=${encodeURIComponent(pad)}${hash}"`
  })
}

export function voorvertoningsBalk(pad) {
  return `<div class="voorbeeldbalk" role="region" aria-label="Voorbeeld">
  <p><strong>Voorbeeld, niet gepubliceerd.</strong> <span>Bezoekers zien deze versie niet.</span></p>
  <a class="voorbeeldbalk-sluit" href="/__voorvertoning/sluiten?pad=${attr(encodeURIComponent(pad))}">Voorbeeld sluiten</a>
</div>`
}

export function renderPagina(
  p,
  { site, titels = new Map(), siteUrl, cmsUrl, artikelen = [], meldingen = [], noindex = false, extraSecties = [], jsonld = null, voorvertoning = null },
) {
  const isHome = p.slug === '/'
  const kruimel = kruimelpad(p.slug, titels)
  let headerGezien = false
  let heeftFormulier = false
  const gebruikteAnkers = new Set()
  const secties = p.blokken
    .map((blok, index) => {
      if (!RENDERERS[blok.type]) {
        meldingen.push(`${p.slug}: bloktype "${blok.type}" heeft (nog) geen weergave in deze frontend — overgeslagen.`)
        return ''
      }
      const isEersteHeader = blok.type === 'header' && !headerGezien
      if (blok.type === 'header') headerGezien = true
      if (blok.type === 'formulier_bouwer') heeftFormulier = true
      let anker = ANKERS[blok.type]
      if (blok.type === 'kaarten' && blok.content?.weergave === 'keuzehulp') anker = 'keuzehulp'
      if (anker && gebruikteAnkers.has(anker)) anker = undefined
      if (anker) gebruikteAnkers.add(anker)
      return renderBlok(blok, { index, isEersteHeader, isHome, kruimelpad: kruimel, paginaTitel: p.titel, records: p.records ?? {}, artikelen, slug: p.slug, anker })
    })
    .filter(Boolean)
  secties.push(...extraSecties)

  // Precies één h1 per pagina, uit de eerste Header. Ontbreekt die, dan een visueel verborgen h1.
  if (!headerGezien) {
    meldingen.push(`${p.slug}: geen Header-blok — er wordt een verborgen h1 met de paginatitel gebruikt.`)
    secties.unshift(`<h1 class="sr-only">${esc(p.titel)}</h1>`)
  }

  const naam = txt(site.merk?.naam) || txt(site.naam) || 'Tandarts Van Beek'
  const basisTitel = txt(p.seoTitel) || txt(p.titel)
  const titel = isHome ? basisTitel || naam : `${basisTitel} | ${naam}`
  const eersteBeeld = p.blokken.find((b) => b.type === 'header')?.content?.media_afbeelding
  const og = veiligeHref(p.og_beeld) || veiligeHref(eersteBeeld)
  const ogAbs = og ? (og.startsWith('/') ? siteUrl + og : og) : ''
  const canonical = p.canonical ? (p.canonical.startsWith('/') ? siteUrl + p.canonical : p.canonical) : siteUrl + (isHome ? '/' : p.slug)
  const c = site.merk?.contact ?? {}
  const ld =
    jsonld ??
    (isHome
      ? {
          '@context': 'https://schema.org',
          '@type': 'Dentist',
          name: naam,
          url: siteUrl + '/',
          ...(txt(c.telefoon) ? { telephone: txt(c.telefoon) } : {}),
          address: {
            '@type': 'PostalAddress',
            ...(txt(c.adres) ? { streetAddress: txt(c.adres) } : {}),
            ...(txt(c.postcode_plaats) ? { postalCode: txt(c.postcode_plaats).split(' ').slice(0, 2).join(' '), addressLocality: txt(c.postcode_plaats).split(' ').slice(2).join(' ') || 'Honselersdijk' } : { addressLocality: 'Honselersdijk' }),
            addressCountry: 'NL',
          },
        }
      : null)
  const geenIndex = noindex || p.noindex || !!voorvertoning

  let body = `${siteHeader(site, p.slug)}
<main id="inhoud" tabindex="-1">
${secties.join('\n')}
</main>
${siteFooter(site)}`
  if (voorvertoning) body = voorvertoningsBalk(voorvertoning.pad) + '\n' + voorvertoningsLinks(body)

  return `<!doctype html>
<html lang="nl">
<head>
${head({ titel, beschrijving: txt(p.beschrijving, 300) || naam, canonical, ogBeeld: ogAbs, siteNaam: naam, favicon: veiligeHref(site.merk?.favicon), jsonld: ld, cmsBase: cmsUrl, siteId: voorvertoning ? '' : site.id })}
${geenIndex ? '<meta name="robots" content="noindex, nofollow">' : ''}
${heeftFormulier && site.id ? `<script defer src="${attr(cmsUrl)}/cms-client.js" data-site="${attr(site.id)}"></script>` : ''}
</head>
<body${voorvertoning ? ' class="met-voorbeeldbalk"' : ''}>
<a class="skiplink" href="#inhoud">Direct naar de inhoud</a>
${body}
</body>
</html>
`
}
