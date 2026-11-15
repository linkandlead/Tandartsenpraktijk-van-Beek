// Artikelen (CMS-collectie "artikelen"): kaarten, overzicht en detail, in de bestaande vormgeving.
import { esc, attr, txt, veiligeHref, t, knop, PIJL } from './html.mjs'
import { rijkeTekst } from './rijk.mjs'
import { normaliseerArtikel, sorteerArtikelen } from './cms-v1.mjs'

export const ARTIKEL_BASIS = '/artikelen'
export const artikelPad = (a) => `${ARTIKEL_BASIS}/${a.slug}`

export function datumNl(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return ''
  return new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Hoofdtekst = platte tekst. Alinea's worden gescheiden door een witregel. Een alinea is een tussenkop als:
//   - hij begint met "## " (aanbevolen, zoals bij NOVA), of
//   - hij uit één korte regel bestaat (max. 80 tekens), niet op . ! : ; of , eindigt, geen opsomming
//     is en niet de eerste of laatste alinea is (zo werken de bestaande artikelen zonder "## ").
export function deelHoofdtekst(tekst) {
  const alineas = String(tekst ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean)
  return alineas.map((a, i) => {
    if (a.startsWith('## ')) return { soort: 'kop', tekst: a.slice(3).trim() }
    const losseRegel = !a.includes('\n') && a.length <= 80 && !/[.!:;,]$/.test(a) && !a.startsWith('- ')
    if (losseRegel && i > 0 && i < alineas.length - 1) return { soort: 'kop', tekst: a }
    return { soort: 'alinea', tekst: a }
  })
}

export function hoofdtekstHtml(tekst) {
  return deelHoofdtekst(tekst)
    .map((d) => (d.soort === 'kop' ? `<h2>${t(d.tekst, 200)}</h2>` : rijkeTekst(d.tekst)))
    .join('\n')
}

function meta(a) {
  const delen = [a.auteur ? `Door ${esc(a.auteur)}` : '', a.datum ? `<time datetime="${attr(a.datum.slice(0, 10))}">${esc(datumNl(a.datum))}</time>` : ''].filter(Boolean)
  return delen.length ? `<p class="artikel-meta">${delen.join(' · ')}</p>` : ''
}

// Pexels levert op verzoek kleinere, gecomprimeerde versies (?w=); andere adressen blijven ongemoeid.
export function fotoMaat(src, breedte) {
  try {
    const u = new URL(src)
    if (u.hostname !== 'images.pexels.com') return src
    u.searchParams.set('auto', 'compress')
    u.searchParams.set('cs', 'tinysrgb')
    u.searchParams.set('w', String(breedte))
    // Een vaste hoogte (h=…) uit het CMS-adres zou bij een kleinere breedte een staande uitsnede geven.
    u.searchParams.delete('h')
    u.searchParams.delete('dpr')
    return u.toString()
  } catch {
    return src
  }
}

function foto(a, klasse, laden = 'lazy') {
  const src = veiligeHref(a.foto)
  if (!src) return `<span class="${klasse} artikel-foto-leeg" aria-hidden="true"></span>`
  const srcset = src.includes('images.pexels.com') ? ` srcset="${attr(fotoMaat(src, 480))} 480w, ${attr(fotoMaat(src, 960))} 960w" sizes="(max-width: 560px) 100vw, (max-width: 1020px) 50vw, 400px"` : ''
  return `<img class="${klasse}" src="${attr(fotoMaat(src, 960))}"${srcset} alt="${attr(a.foto_alt)}" loading="${laden}" decoding="async" referrerpolicy="no-referrer">`
}

export function artikelKaarten(lijst, niveau = 3) {
  return `<ul class="kaart-raster artikel-raster">${lijst
    .map(
      (a) => `<li class="artikel-kaart">
        <a href="${attr(artikelPad(a))}">
          <div class="artikel-kaart-beeld">${foto(a, 'artikel-kaart-foto')}</div>
          <div class="artikel-kaart-tekst">
            ${a.rubriek ? `<p class="eyebrow">${t(a.rubriek, 80)}</p>` : ''}
            <h${niveau} class="artikel-kaart-titel">${t(a.titel, 200)}</h${niveau}>
            ${a.samenvatting ? `<p>${t(a.samenvatting, 300)}</p>` : ''}
            ${a.datum ? `<p class="artikel-meta"><time datetime="${attr(a.datum.slice(0, 10))}">${esc(datumNl(a.datum))}</time></p>` : ''}
          </div>
        </a>
      </li>`,
    )
    .join('')}</ul>`
}

// Sectie met het complete overzicht (onder de paginakop van /artikelen).
export function overzichtSectie(artikelen) {
  return `<section class="blok artikel-overzicht schema-licht" aria-label="Alle artikelen">
    <div class="binnen">
      ${artikelen.length ? artikelKaarten(artikelen, 2) : '<p class="lege-stand">Er zijn nog geen artikelen gepubliceerd.</p>'}
    </div>
  </section>`
}

// Inhoud van een artikelpagina (onder de paginakop met titel, rubriek en foto).
export function detailSectie(a) {
  return `<article class="blok artikel schema-licht" aria-labelledby="kop-0">
    <div class="binnen smal">
      ${meta(a)}
      ${a.antwoordblok ? `<aside class="artikel-antwoord" aria-label="Kort antwoord"><p class="eyebrow">Kort antwoord</p><p>${t(a.antwoordblok, 1000)}</p></aside>` : ''}
      <div class="rijk artikel-tekst">${hoofdtekstHtml(a.hoofdtekst)}</div>
      <p class="artikel-terug">${knop(ARTIKEL_BASIS, 'Alle artikelen', { klasse: 'tekstlink tekstlink-onderstreept' })}</p>
    </div>
  </article>`
}

// Kopblok (CMS-bloktype header) voor de detailpagina: hergebruikt de bestaande hero.
export function detailKop(a) {
  return {
    type: 'header',
    bg: 'diep',
    content: {
      layout: 'split-rechts',
      hoogte: 'compact',
      eyebrow: a.rubriek || 'Artikel',
      heading: a.titel,
      subheading: a.samenvatting,
      media_type: veiligeHref(a.foto) ? 'afbeelding' : 'geen',
      media_afbeelding: veiligeHref(a.foto) ? fotoMaat(a.foto, 1400) : '',
      media_alt: a.foto_alt,
    },
  }
}

// Blok `artikelen_grid` (kernblok "Artikelen"): eyebrow, titel, maximaal.
export function artikelenGridBlok(c, artikelen, { id, schema, anker }) {
  const max = Math.min(24, Math.max(1, Number(c.maximaal) || 6))
  const lijst = artikelen.slice(0, max)
  return `<section${anker ? ` id="${attr(anker)}"` : ''} class="blok artikelen-blok schema-${schema}" data-blok="artikelen_grid"${txt(c.titel) ? ` aria-labelledby="${id}"` : ''}>
    <div class="binnen">
      <div class="sectie-kop sectie-kop-rij">
        <div>${txt(c.eyebrow) ? `<p class="eyebrow">${t(c.eyebrow, 120)}</p>` : ''}${txt(c.titel) ? `<h2 id="${id}">${t(c.titel, 300)}</h2>` : ''}</div>
        <a class="tekstlink tekstlink-onderstreept" href="${ARTIKEL_BASIS}"><span>Alle artikelen</span>${PIJL}</a>
      </div>
      ${lijst.length ? artikelKaarten(lijst) : '<p class="lege-stand">Er zijn nog geen artikelen gepubliceerd.</p>'}
    </div>
  </section>`
}

// Artikelen voor het blok: de records van de pagina zelf (lees-API v1: pagina.records.artikelen),
// anders de volledige gepubliceerde lijst. Altijd nieuwste eerst.
export function sorteerArtikelenVoorBlok(ctx) {
  const eigen = Array.isArray(ctx.records?.artikelen) ? ctx.records.artikelen.map(normaliseerArtikel).filter(Boolean) : []
  return sorteerArtikelen(eigen.length ? eigen : (ctx.artikelen ?? []))
}

export function artikelJsonLd(a, { siteUrl, naam }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.titel,
    ...(a.samenvatting ? { description: a.samenvatting } : {}),
    ...(a.datum ? { datePublished: a.datum.slice(0, 10) } : {}),
    ...(veiligeHref(a.foto) ? { image: a.foto } : {}),
    author: a.auteur ? { '@type': 'Person', name: a.auteur } : { '@type': 'Organization', name: naam },
    publisher: { '@type': 'Organization', name: naam },
    mainEntityOfPage: siteUrl + artikelPad(a),
  }
}
