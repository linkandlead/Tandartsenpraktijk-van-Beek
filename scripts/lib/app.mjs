// Verwerkt één verzoek naar de site: dezelfde code draait als Vercel-functie (api/render) en lokaal
// (scripts/serve.mjs). Geen framework, geen dependencies.
//
// Verversing (zoals NOVA): elke pagina wordt hooguit elke 60 seconden opnieuw uit het CMS gelezen.
//   - In deze functie: inhoud uit het CMS wordt 30 s in het geheugen gehouden.
//   - Op de CDN van Vercel: `s-maxage=60, stale-while-revalidate` op elk publiek antwoord.
// Terugval (CMS onbereikbaar): de laatst goede inhoud uit het geheugen, anders de momentopname die bij
// de build is gemaakt (`inhoud.json`). De site gaat dus nooit kapot op een storing van het CMS.
//
// Voorvertoning ("Voorbeeld op de site", protocol linkandlead-cms docs/bouwwijze.md §6.3):
//   /__voorvertoning?pad=/x&token=<token>  → controleert het token bij het CMS (concept: true) en
//   toont het concept met een balk; nooit gecachet en nooit geïndexeerd. Zonder geldig token: door
//   naar de gepubliceerde pagina. Het token gaat in een httpOnly-cookie, zodat doorklikken werkt.
import { laadAlles, haalConcept } from './cms-v1.mjs'
import { renderPagina } from './pagina.mjs'
import { ARTIKEL_BASIS, artikelPad, overzichtSectie, detailSectie, detailKop, artikelJsonLd } from './artikelen.mjs'
import { resolveRedirects } from './redirects.mjs'
import { tekst, tekstLink } from './teksten.mjs'
import { tokenVorm, tokenSecondenGeldig, veiligPad, VOORVERTONING_COOKIE } from './voorvertoning.mjs'
import { voorvertoningCsp, VOORVERTONING_KOPPEN, VOORVERTONING_PAD } from './beveiliging.mjs'

const GEHEUGEN_MS = 30_000
const OPNIEUW_NA_FOUT_MS = 10_000

const PUBLIEK = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
const PUBLIEK_TERUGVAL = 'public, max-age=0, s-maxage=10, stale-while-revalidate=60'
const HTML = 'text/html; charset=utf-8'

// ------------------------------------------------------------------ inhoud met cache en terugval

export function maakInhoudsbron({ cfg, momentopname, nu = () => Date.now() }) {
  let laatsteGoede = null
  let geldigTot = 0
  let bezig = null
  return {
    async lees() {
      if (laatsteGoede && nu() < geldigTot) return { inhoud: laatsteGoede, bron: 'cms' }
      if (cfg?.cmsUrl && cfg?.token) {
        bezig ??= laadAlles(cfg).finally(() => (bezig = null))
        try {
          laatsteGoede = await bezig
          geldigTot = nu() + GEHEUGEN_MS
          return { inhoud: laatsteGoede, bron: 'cms' }
        } catch {
          // CMS onbereikbaar of fout antwoord: laatst goede inhoud, en straks opnieuw proberen.
          if (laatsteGoede) {
            geldigTot = nu() + OPNIEUW_NA_FOUT_MS
            return { inhoud: laatsteGoede, bron: 'terugval' }
          }
        }
      }
      if (!momentopname) throw new Error('Geen inhoud beschikbaar: CMS onbereikbaar en geen momentopname.')
      return { inhoud: momentopname, bron: 'terugval' }
    },
  }
}

// ------------------------------------------------------------------ hulpjes

function antwoord(status, body, headers = {}) {
  return { status, body, headers: { 'content-type': HTML, ...headers } }
}
function doorsturen(status, naar, headers = {}) {
  return { status, body: '', headers: { location: naar, ...headers } }
}
function titelsVan(inhoud) {
  const m = new Map(inhoud.paginas.map((p) => [p.slug, p.titel]))
  if (!m.has(ARTIKEL_BASIS)) m.set(ARTIKEL_BASIS, tekst(inhoud.site, 'artikelen.overzicht_titel'))
  for (const a of inhoud.artikelen) m.set(artikelPad(a), a.titel)
  return m
}
function normaalPad(pad) {
  const p = (pad || '/').replace(/\/{2,}/g, '/')
  return p.length > 1 ? p.replace(/\/+$/, '') : '/'
}

function vindPagina(inhoud, pad) {
  return inhoud.paginas.find((p) => p.slug === pad) ?? null
}

// Een pagina of artikel(overzicht) renderen voor een pad. null = bestaat niet.
function render(inhoud, pad, o, { concept = null, voorvertoning = null } = {}) {
  const gedeeld = { site: inhoud.site, titels: titelsVan(inhoud), siteUrl: o.siteUrl, cmsUrl: o.cmsUrl, artikelen: inhoud.artikelen, voorvertoning }
  const pagina = concept ?? vindPagina(inhoud, pad)
  if (pagina) return renderPagina(pagina, gedeeld)

  if (pad === ARTIKEL_BASIS) {
    return renderPagina(
      {
        slug: ARTIKEL_BASIS,
        titel: tekst(inhoud.site, 'artikelen.overzicht_titel'),
        beschrijving: `Nieuws en uitleg over mondgezondheid van ${inhoud.site.merk?.naam || inhoud.site.naam || 'de praktijk'}.`,
        blokken: [{ type: 'header', bg: 'diep', content: { layout: 'compact', hoogte: 'compact', eyebrow: tekst(inhoud.site, 'artikelen.overzicht_eyebrow'), heading: tekst(inhoud.site, 'artikelen.overzicht_titel'), subheading: tekst(inhoud.site, 'artikelen.overzicht_intro') } }],
        records: {},
      },
      { ...gedeeld, extraSecties: [overzichtSectie(inhoud.artikelen, inhoud.site)] },
    )
  }
  if (pad.startsWith(ARTIKEL_BASIS + '/')) {
    const a = inhoud.artikelen.find((x) => artikelPad(x) === pad)
    if (!a) return null
    const naam = inhoud.site.merk?.naam || inhoud.site.naam || ''
    return renderPagina(
      { slug: pad, titel: a.titel, beschrijving: a.samenvatting, og_beeld: a.foto || null, blokken: [detailKop(a)], records: {} },
      { ...gedeeld, extraSecties: [detailSectie(a, inhoud.site)], jsonld: artikelJsonLd(a, { siteUrl: o.siteUrl, naam }) },
    )
  }
  return null
}

function render404(inhoud, o, extra = {}) {
  const s = inhoud.site
  return renderPagina(
    {
      slug: '/404',
      titel: 'Pagina niet gevonden',
      beschrijving: 'Deze pagina bestaat niet (meer).',
      blokken: [{ type: 'header', bg: 'wit', content: { layout: 'compact', hoogte: 'compact', eyebrow: tekst(s, 'fout404.eyebrow'), heading: tekst(s, 'fout404.titel'), subheading: tekst(s, 'fout404.tekst'), cta_primair_label: tekst(s, 'fout404.knop'), cta_primair_link: '/', cta_secundair_label: tekst(s, 'fout404.knop_spoed'), cta_secundair_link: tekstLink(s, 'spoed.link'), auto_kruimelpad: 'uit' } }],
      records: {},
    },
    { site: inhoud.site, titels: new Map(), siteUrl: o.siteUrl, cmsUrl: o.cmsUrl, artikelen: inhoud.artikelen, noindex: true, ...extra },
  )
}

// Sitemap: alle publieke CMS-pagina's (geen noindex, geen canonical naar elders, geen redirectbron)
// plus het artikeloverzicht en elk gepubliceerd artikel.
export function sitemapXml(inhoud, siteUrl) {
  const bronnen = new Set(resolveRedirects(inhoud.site.redirects).map((r) => r.van))
  const urls = []
  for (const p of inhoud.paginas) {
    if (p.noindex || bronnen.has(p.slug) || (p.canonical && p.canonical !== p.slug)) continue
    urls.push({ loc: siteUrl + (p.slug === '/' ? '/' : p.slug) })
  }
  if (!inhoud.paginas.some((p) => p.slug === ARTIKEL_BASIS)) urls.push({ loc: siteUrl + ARTIKEL_BASIS })
  for (const a of inhoud.artikelen) urls.push({ loc: siteUrl + artikelPad(a), lastmod: a.datum ? a.datum.slice(0, 10) : '' })
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`
}

// SameSite=None + Partitioned: de voorvertoning staat in een frame op cms.linkandlead.nl (B-110). Een Lax-cookie
// gaat in zo'n frame niet mee, waardoor doorklikken het concept kwijtraakte. Partitioned houdt het cookie bij die
// insluitende site (CHIPS); Path blijft /__voorvertoning, dus de gewone site ziet het nooit.
function cookieKop(waarde, maxAge) {
  return `${VOORVERTONING_COOKIE}=${waarde}; Path=/__voorvertoning; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAge}`
}

// ------------------------------------------------------------------ het verzoek

// verzoek: { pad, zoek: URLSearchParams, cookies: Record<string,string> }
// opties: { bron (maakInhoudsbron), cfg (cms-config), siteUrl, cmsUrl, nu? }
export async function verwerk(verzoek, o) {
  const pad = normaalPad(verzoek.pad)

  // --- Voorvertoning
  if (pad === '/__voorvertoning/sluiten') {
    const terug = veiligPad(verzoek.zoek.get('pad') || '/') ?? '/'
    return doorsturen(307, terug, { ...voorvertoningsKoppen(o), 'set-cookie': cookieKop('', 0) })
  }
  if (pad === '/__voorvertoning') return voorvertoning(verzoek, o)
  if (VOORVERTONING_PAD.test(pad)) return antwoord(404, '<!doctype html><html lang="nl"><meta charset="utf-8"><title>Niet gevonden</title><p>Dit adres bestaat niet.</p>', voorvertoningsKoppen(o))

  let gelezen
  try {
    gelezen = await o.bron.lees()
  } catch {
    return antwoord(503, '<!doctype html><html lang="nl"><meta charset="utf-8"><title>Tijdelijk niet beschikbaar</title><p>De website is tijdelijk niet beschikbaar. Probeer het over een paar minuten opnieuw.</p>', { 'cache-control': 'no-store', 'retry-after': '60' })
  }
  const { inhoud, bron } = gelezen
  const cache = bron === 'cms' ? PUBLIEK : PUBLIEK_TERUGVAL

  // --- Redirects uit het CMS gaan vóór pagina's
  const r = resolveRedirects(inhoud.site.redirects).find((x) => x.van === pad)
  if (r) return doorsturen(r.status, r.naar, { 'cache-control': cache })

  if (pad === '/sitemap.xml') return { status: 200, body: sitemapXml(inhoud, o.siteUrl), headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': cache } }

  const html = render(inhoud, pad, o)
  if (html) return antwoord(200, html, { 'cache-control': cache })
  return antwoord(404, render404(inhoud, o), { 'cache-control': cache })
}

// Voorvertoning: noindex, nooit gecachet, en alleen in een frame van het CMS (B-110: de editor sluit hem in).
function voorvertoningsKoppen(o) {
  return { ...VOORVERTONING_KOPPEN, 'content-security-policy': voorvertoningCsp(o.cmsUrl) }
}

async function voorvertoning(verzoek, o) {
  const koppen = voorvertoningsKoppen(o)
  const pad = veiligPad(verzoek.zoek.get('pad') || '/') ?? '/'
  const uitQuery = verzoek.zoek.get('token') ?? verzoek.zoek.get('voorvertoning')
  const token = tokenVorm(uitQuery) ? uitQuery : verzoek.cookies?.[VOORVERTONING_COOKIE]
  const nu = o.nu?.() ?? Date.now()
  const weigeren = () => doorsturen(307, pad, { ...koppen, 'set-cookie': cookieKop('', 0) })
  if (!tokenVorm(token) || tokenSecondenGeldig(token, nu) === 0 || !o.cfg?.cmsUrl || !o.cfg?.token) return weigeren()

  let concept = await haalConcept(o.cfg, pad.split('?')[0], token)
  let conceptPagina = null
  if (concept.soort === 'concept') conceptPagina = concept.pagina
  else if (concept.soort === 'niet-gevonden') {
    // Geen CMS-pagina (bv. een artikel): het token geldt per site, dus controleren met de homepage
    // en daarna de gepubliceerde versie met de balk tonen.
    concept = await haalConcept(o.cfg, '/', token)
    if (concept.soort !== 'concept') return weigeren()
  } else if (concept.soort === 'fout') {
    return antwoord(503, '<!doctype html><html lang="nl"><meta charset="utf-8"><title>Voorbeeld niet beschikbaar</title><p>Het voorbeeld kan nu niet worden opgehaald. Probeer het zo opnieuw.</p>', koppen)
  } else return weigeren()

  let inhoud
  try {
    inhoud = (await o.bron.lees()).inhoud
  } catch {
    return antwoord(503, '<!doctype html><html lang="nl"><meta charset="utf-8"><title>Voorbeeld niet beschikbaar</title><p>Het voorbeeld kan nu niet worden opgehaald.</p>', koppen)
  }
  const kaal = pad.split('?')[0]
  // &ingesloten=1: in het voorbeeldvenster van de CMS-editor; dan geen eigen balk (het CMS toont de context).
  const vv = { pad: kaal, ingesloten: verzoek.zoek.get('ingesloten') === '1' }
  const html = render(inhoud, kaal, o, { concept: conceptPagina, voorvertoning: vv }) ?? render404(inhoud, o, { voorvertoning: vv })
  const extra = tokenVorm(uitQuery) ? { 'set-cookie': cookieKop(token, tokenSecondenGeldig(token, nu)) } : {}
  return antwoord(200, html, { ...koppen, ...extra })
}
