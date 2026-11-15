// Gedeelde siteschil: <head>, SiteHeader, SiteFooter. Inhoud komt uit site.merk / site.navigatie
// van de CMS-lees-API (centraal beheerd in /admin → Merk & branding). Geen fictieve social links.
import { esc, attr, txt, lijst, veiligeHref, t } from './html.mjs'
import { tekst, tekstLink } from './teksten.mjs'

function telHref(nummer) {
  const c = txt(nummer).replace(/[^\d+]/g, '')
  if (!c) return ''
  if (c.startsWith('+')) return 'tel:' + c
  return c.startsWith('0900') ? 'tel:' + c : 'tel:+31' + c.slice(1)
}

function actief(href, pad) {
  if (!href || !href.startsWith('/')) return false
  if (href === '/') return pad === '/'
  return pad === href || pad.startsWith(href + '/')
}

export function siteHeader(site, pad) {
  const merk = site.merk ?? {}
  const nav = lijst(site.navigatie?.hoofd, 12)
  const actie = site.navigatie?.actie
  const naam = txt(merk.naam) || txt(site.naam) || 'Tandarts Van Beek'
  const logo = veiligeHref(merk.logo)
  const items = nav
    .map((i) => {
      const h = veiligeHref(i.href)
      if (!h || !txt(i.titel)) return ''
      const cur = actief(h, pad) ? ' aria-current="page"' : ''
      return `<li><a href="${attr(h)}"${cur}>${t(i.titel, 80)}</a></li>`
    })
    .join('')
  const spoed = tekstLink(site, 'spoed.link')
  const spoedLabel = esc(tekst(site, 'spoed.label'))
  const spoedCur = actief(spoed, pad) ? ' aria-current="page"' : ''
  const actieHtml =
    actie && veiligeHref(actie.href) ? `<a class="knop knop-klein" href="${attr(veiligeHref(actie.href))}">${t(actie.titel, 60)}</a>` : ''
  return `<header class="site-header">
  <div class="binnen site-header-binnen">
    <a class="logo" href="/" aria-label="${attr(naam)} — naar de homepage">${logo ? `<img src="${attr(logo)}" alt="" width="52" height="32">` : ''}<span>${esc(naam)}</span></a>
    <div class="snel-mobiel">
      <a class="spoed-link" href="${attr(spoed)}"${spoedCur}>${spoedLabel}</a>
      <button class="menu-knop" type="button" aria-expanded="false" aria-controls="hoofdmenu"><span class="menu-streepjes" aria-hidden="true"></span>${esc(tekst(site, 'kop.menu'))}</button>
    </div>
    <nav id="hoofdmenu" class="hoofdnav" aria-label="${attr(tekst(site, 'kop.menu_label'))}">
      <ul>${items}</ul>
      <div class="nav-acties">
        <a class="spoed-link spoed-desktop" href="${attr(spoed)}"${spoedCur}>${spoedLabel}</a>
        ${actieHtml}
      </div>
    </nav>
  </div>
</header>`
}

export function siteFooter(site) {
  const merk = site.merk ?? {}
  const c = merk.contact ?? {}
  const naam = txt(merk.naam) || txt(site.naam) || 'Tandarts Van Beek'
  const kolommen = lijst(site.navigatie?.footer, 6)
  const juridisch = lijst(site.navigatie?.juridisch, 12)
  const tel = txt(c.telefoon)
  const jaar = new Date().getFullYear()
  const slogan = txt(merk.slogan, 200)
  // Socials uit het merk (alleen https); de site verzint er geen.
  const SOCIAL_NAMEN = { linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook', x: 'X', youtube: 'YouTube', tiktok: 'TikTok' }
  const socials = Object.entries(SOCIAL_NAMEN)
    .map(([k, naam]) => ({ naam, href: veiligeHref(merk.socials?.[k]) }))
    .filter((s) => s.href.startsWith('https://'))
  return `<footer class="site-footer schema-diepst">
  <div class="binnen footer-grid">
    <div class="footer-merk">
      <p class="footer-naam">${esc(naam)}</p>
      ${txt(merk.tagline) ? `<p>${t(merk.tagline)}</p>` : ''}
      <address>
        ${txt(c.adres) ? `${t(c.adres)}<br>` : ''}${txt(c.postcode_plaats) ? `${t(c.postcode_plaats)}<br>` : ''}
        ${tel ? `<a href="${telHref(tel)}">${esc(tel)}</a><br>` : ''}
        ${txt(c.email) ? `<a href="mailto:${attr(c.email)}">${esc(c.email)}</a>` : ''}
      </address>
      ${socials.length ? `<ul class="footer-socials">${socials.map((s) => `<li><a href="${attr(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.naam)}<span class="sr-only"> (opent in nieuw venster)</span></a></li>`).join('')}</ul>` : ''}
    </div>
    ${kolommen
      .map(
        (k) => `<nav class="footer-kolom" aria-label="${attr(txt(k.kop) || 'Voettekstmenu')}">
      <p class="footer-kop">${t(k.kop, 80)}</p>
      <ul>${lijst(k.links, 20)
        .map((l) => (veiligeHref(l.href) ? `<li><a href="${attr(veiligeHref(l.href))}">${t(l.titel, 80)}</a></li>` : ''))
        .join('')}</ul>
    </nav>`,
      )
      .join('')}
    <div class="footer-spoed">
      <p class="footer-kop">${t(tekst(site, 'voet.spoed_kop'), 80)}</p>
      <p>${t(tekst(site, 'voet.spoed_tekst'), 300)}</p>
      <a class="knop knop-klein" href="${attr(tekstLink(site, 'spoed.link'))}">${t(tekst(site, 'voet.spoed_knop'), 60)}</a>
    </div>
  </div>
  <div class="binnen footer-onder">
    <p>${slogan ? `${t(slogan)} ` : ''}© ${jaar} ${esc(naam)}</p>
    <ul>${juridisch.map((l) => (veiligeHref(l.href) ? `<li><a href="${attr(veiligeHref(l.href))}">${t(l.titel, 80)}</a></li>` : '')).join('')}</ul>
  </div>
</footer>`
}

export function kruimelpad(pad, titels, site = {}) {
  if (pad === '/') return ''
  const delen = pad.split('/').filter(Boolean)
  const stappen = [{ titel: tekst(site, 'algemeen.kruimelpad_home'), href: '/' }]
  let acc = ''
  for (const d of delen) {
    acc += '/' + d
    stappen.push({ titel: titels.get(acc) || d, href: acc })
  }
  return `<nav class="kruimelpad" aria-label="Kruimelpad"><ol>${stappen
    .map((s, i) => (i === stappen.length - 1 ? `<li><span aria-current="page">${esc(s.titel)}</span></li>` : `<li><a href="${attr(s.href)}">${esc(s.titel)}</a></li>`))
    .join('')}</ol></nav>`
}

// Huisstijl uit het CMS (design_tokens): de 12 kleursleutels als --cms-* over de standaardwaarden in
// styles.css heen. Alleen geldige hexkleuren; een onbekende sleutel of waarde doet niets.
export const KLEURSLEUTELS = ['wit', 'mist', 'limoenlicht', 'diep', 'nacht', 'limoen', 'limoendonker', 'tekst', 'steen', 'mistdof', 'fout', 'foutlicht']
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
export function kleurStijl(tokens) {
  const regels = KLEURSLEUTELS.filter((k) => HEX.test(String(tokens?.[k] ?? '').trim())).map((k) => `--cms-${k}:${String(tokens[k]).trim()}`)
  return regels.length ? `<style>:root{${regels.join(';')}}</style>` : ''
}

export function head({ titel, beschrijving, canonical, ogBeeld, siteNaam, favicon, jsonld, cmsBase, siteId, tokens = {}, seo = {} }) {
  const themaKleur = HEX.test(String(tokens?.diep ?? '').trim()) ? String(tokens.diep).trim() : '#064b3c'
  const google = /^[A-Za-z0-9_-]{10,100}$/.test(seo.google_verificatie ?? '') ? seo.google_verificatie : ''
  const bing = /^[A-Za-z0-9]{10,100}$/.test(seo.bing_verificatie ?? '') ? seo.bing_verificatie : ''
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${attr(beschrijving)}">
<link rel="canonical" href="${attr(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="${attr(siteNaam)}">
<meta property="og:title" content="${attr(titel)}">
<meta property="og:description" content="${attr(beschrijving)}">
<meta property="og:url" content="${attr(canonical)}">
${ogBeeld ? `<meta property="og:image" content="${attr(ogBeeld)}">` : ''}
<meta name="theme-color" content="${attr(themaKleur)}">
${google ? `<meta name="google-site-verification" content="${attr(google)}">` : ''}
${bing ? `<meta name="msvalidate.01" content="${attr(bing)}">` : ''}
<link rel="icon" href="${attr(favicon || '/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="/fonts/outfit-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-sans-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
${kleurStijl(tokens)}
<script>document.documentElement.classList.add('js')</script>
<script defer src="/site.js"></script>
${siteId ? `<script defer src="${attr(cmsBase)}/meet.js" data-site="${attr(siteId)}"></script>` : ''}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}`
}
