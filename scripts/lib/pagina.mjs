// Eén pagina → volledige HTML (server-side, leesbaar zonder JavaScript).
import { esc, attr, txt, veiligeHref } from './html.mjs'
import { renderBlok, RENDERERS } from './blokken.mjs'
import { siteHeader, siteFooter, kruimelpad, head } from './schil.mjs'
import { tekst } from './teksten.mjs'

const ANKERS = { formulier_bouwer: 'bericht', mensen: 'team', kaart: 'route', artikelen_grid: 'artikelen' }

// Interne links in de voorvertoning laten doorverwijzen naar de voorvertoning van die pagina, zodat
// doorklikken in het concept blijft. Assets (css, js, beelden, fonts) blijven ongemoeid.
export function voorvertoningsLinks(html, { ingesloten = false } = {}) {
  const extra = ingesloten ? '&amp;ingesloten=1' : ''
  return html.replace(/href="(\/(?!\/)[^"#]*)(#[^"]*)?"/g, (heel, pad, hash = '') => {
    if (/^\/(styles\.css|site\.js|img\/|fonts\/|favicon|__voorvertoning)/.test(pad)) return heel
    return `href="/__voorvertoning?pad=${encodeURIComponent(pad)}${extra}${hash}"`
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
  const kruimel = kruimelpad(p.slug, titels, site)
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
      return renderBlok(blok, { index, isEersteHeader, isHome, kruimelpad: kruimel, paginaTitel: p.titel, records: p.records ?? {}, artikelen, slug: p.slug, anker, site })
    })
    .filter(Boolean)
  secties.push(...extraSecties)

  // Precies één h1 per pagina, uit de eerste Header. Ontbreekt die, dan een visueel verborgen h1.
  if (!headerGezien) {
    meldingen.push(`${p.slug}: geen Header-blok — er wordt een verborgen h1 met de paginatitel gebruikt.`)
    secties.unshift(`<h1 class="sr-only">${esc(p.titel)}</h1>`)
  }

  const naam = txt(site.merk?.naam) || txt(site.naam) || 'Tandarts Van Beek'
  const seo = site.seo ?? {}
  const basisTitel = txt(p.seoTitel) || txt(p.titel)
  // Titelachtervoegsel uit Standaard-SEO (bv. " | Tandarts Van Beek"); leeg = " | <merknaam>".
  const suffix = typeof seo.titel_suffix === 'string' && seo.titel_suffix.trim() ? seo.titel_suffix : ` | ${naam}`
  const titel = isHome ? basisTitel || naam : `${basisTitel}${suffix}`
  const eersteBeeld = p.blokken.find((b) => b.type === 'header')?.content?.media_afbeelding
  const og = veiligeHref(p.og_beeld) || veiligeHref(eersteBeeld) || veiligeHref(seo.social_beeld)
  const ogAbs = og ? (og.startsWith('/') ? siteUrl + og : og) : ''
  const canonical = p.canonical ? (p.canonical.startsWith('/') ? siteUrl + p.canonical : p.canonical) : siteUrl + (isHome ? '/' : p.slug)
  const ld = jsonld ?? (isHome ? organisatieJsonLd(site, naam, siteUrl) : null)
  const geenIndex = noindex || p.noindex || seo.noindex === true || !!voorvertoning

  let body = `${siteHeader(site, p.slug)}
<main id="inhoud" tabindex="-1">
${secties.join('\n')}
</main>
${siteFooter(site)}`
  if (voorvertoning) body = (voorvertoning.ingesloten ? '' : voorvertoningsBalk(voorvertoning.pad) + '\n') + voorvertoningsLinks(body, voorvertoning)

  return `<!doctype html>
<html lang="nl">
<head>
${head({ titel, beschrijving: txt(p.beschrijving, 300) || txt(seo.beschrijving, 300) || naam, canonical, ogBeeld: ogAbs, siteNaam: naam, favicon: veiligeHref(site.merk?.favicon), jsonld: ld, cmsBase: cmsUrl, siteId: voorvertoning || site.consent?.analytics === 'uit' ? '' : site.id, tokens: site.design_tokens, seo })}
${geenIndex ? '<meta name="robots" content="noindex, nofollow">' : ''}
${heeftFormulier && site.id ? `<script defer src="${attr(cmsUrl)}/cms-client.js" data-site="${attr(site.id)}"></script>` : ''}
</head>
<body${voorvertoning && !voorvertoning.ingesloten ? ' class="met-voorbeeldbalk"' : ''}>
<a class="skiplink" href="#inhoud">${esc(tekst(site, 'algemeen.skiplink'))}</a>
${body}
</body>
</html>
`
}

// JSON-LD van de praktijk (homepage). Uit Site > Navigatie > Organisatie als die is ingevuld, anders uit
// de contactgegevens van het merk (zoals voorheen). Type blijft Dentist: specifieker dan wat het CMS kiest.
const DAGEN = { ma: 'Monday', di: 'Tuesday', wo: 'Wednesday', do: 'Thursday', vr: 'Friday', za: 'Saturday', zo: 'Sunday' }
export function organisatieJsonLd(site, naam, siteUrl) {
  const c = site.merk?.contact ?? {}
  const o = site.organisatie && typeof site.organisatie === 'object' ? site.organisatie : {}
  const pp = txt(c.postcode_plaats)
  const adresCms = txt(o.straat) || txt(o.postcode) || txt(o.plaats)
  const adres = adresCms
    ? {
        '@type': 'PostalAddress',
        ...(txt(o.straat) ? { streetAddress: txt(o.straat) } : {}),
        ...(txt(o.postcode) ? { postalCode: txt(o.postcode) } : {}),
        ...(txt(o.plaats) ? { addressLocality: txt(o.plaats) } : {}),
        addressCountry: txt(o.land) || 'NL',
      }
    : {
        '@type': 'PostalAddress',
        ...(txt(c.adres) ? { streetAddress: txt(c.adres) } : {}),
        ...(pp ? { postalCode: pp.split(' ').slice(0, 2).join(' '), addressLocality: pp.split(' ').slice(2).join(' ') || 'Honselersdijk' } : { addressLocality: 'Honselersdijk' }),
        addressCountry: 'NL',
      }
  const tel = txt(o.telefoon) || txt(c.telefoon)
  const tijden = (Array.isArray(o.openingstijden) ? o.openingstijden : [])
    .filter((t) => t && DAGEN[t.dag] && /^\d{2}:\d{2}$/.test(t.open) && /^\d{2}:\d{2}$/.test(t.dicht))
    .map((t) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAGEN[t.dag], opens: t.open, closes: t.dicht }))
  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: txt(o.naam) || naam,
    url: siteUrl + '/',
    ...(tel ? { telephone: tel } : {}),
    ...(txt(o.email) ? { email: txt(o.email) } : {}),
    ...(txt(o.juridische_naam) ? { legalName: txt(o.juridische_naam) } : {}),
    ...(txt(o.prijsklasse) ? { priceRange: txt(o.prijsklasse) } : {}),
    address: adres,
    ...(tijden.length ? { openingHoursSpecification: tijden } : {}),
  }
}
