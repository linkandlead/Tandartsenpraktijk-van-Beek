// Koppeling met Link & Lead One via de lees-API v1 (contract: linkandlead-cms
// packages/site-kit/src/contract.ts en docs/bouwwijze.md §6.2).
//
//   GET {CMS_URL}/api/v1/site                       merk, navigatie, huisstijl, redirects
//   GET {CMS_URL}/api/v1/paginas?inhoud=1           alle gepubliceerde pagina's met blokken
//   GET {CMS_URL}/api/v1/collecties/artikelen       gepubliceerde artikelen
//   GET {CMS_URL}/api/v1/pagina?pad=/x&voorvertoning=<token>   concept voor "Voorbeeld op de site"
//   Header: Authorization: Bearer {CMS_TOKEN} + X-CMS-API-Versie: v1 (zo meldt de site zich als v1)
//
// Alleen serverkant: het token komt nooit in de browser en wordt nooit gelogd. Antwoorden zijn
// onvertrouwde JSON en worden hier gevalideerd tot de vorm die de renderers verwachten.

const TIME_OUT_MS = 6000

const isObj = (w) => !!w && typeof w === 'object' && !Array.isArray(w)
const str = (w) => (typeof w === 'string' ? w : '')

export class CmsFout extends Error {
  constructor(melding, status = 0) {
    super(melding)
    this.status = status
  }
}

async function haal(cfg, pad, { cache = true } = {}) {
  const doFetch = cfg.fetch ?? fetch
  let res
  try {
    res = await doFetch(`${cfg.cmsUrl}/api/v1/${pad}`, {
      headers: { authorization: `Bearer ${cfg.token}`, accept: 'application/json', 'x-cms-api-versie': 'v1' },
      signal: AbortSignal.timeout(cfg.timeoutMs ?? TIME_OUT_MS),
      redirect: 'error',
      ...(cache ? {} : { cache: 'no-store' }),
    })
  } catch {
    throw new CmsFout('CMS niet bereikbaar')
  }
  const json = res.status === 200 ? await res.json().catch(() => null) : null
  return { status: res.status, json }
}

// ------------------------------------------------------------------ normaliseren

// id: het id van het blok (alleen gebruikt in de voorvertoning in de CMS-editor, voor klik-om-te-bewerken).
function normaliseerBlok(b) {
  return { ...(typeof b.id === 'string' && b.id ? { id: b.id } : {}), type: str(b.type), bg: typeof b.bg === 'string' ? b.bg : null, content: isObj(b.inhoud) ? b.inhoud : {} }
}

export function normaliseerPagina(p) {
  if (!isObj(p) || typeof p.slug !== 'string' || !p.slug.startsWith('/') || p.slug.includes('..') || p.slug.includes(':slug')) return null
  const seo = isObj(p.seo) ? p.seo : {}
  return {
    slug: p.slug.length > 1 ? p.slug.replace(/\/+$/, '') : '/',
    titel: str(p.titel) || p.slug,
    beschrijving: str(seo.beschrijving) || str(p.beschrijving),
    seoTitel: str(seo.titel),
    noindex: seo.noindex === true,
    canonical: typeof seo.canonical === 'string' && seo.canonical.trim() ? seo.canonical.trim() : null,
    og_beeld: typeof seo.social_beeld === 'string' ? seo.social_beeld : null,
    blokken: (Array.isArray(p.blokken) ? p.blokken : []).filter(isObj).map(normaliseerBlok).filter((b) => b.type),
    records: isObj(p.records) ? p.records : {},
  }
}

const TEKST_SLEUTEL = /^[a-z0-9][a-z0-9_.-]{0,79}$/

// Site > Teksten: alleen geldige sleutels met een niet-lege tekst.
function normaliseerTeksten(w) {
  if (!isObj(w)) return {}
  return Object.fromEntries(Object.entries(w).filter(([k, v]) => TEKST_SLEUTEL.test(k) && typeof v === 'string' && v.trim() && v.length <= 2000))
}

export function normaliseerSite(s) {
  if (!isObj(s) || s.versie !== 'v1' || !isObj(s.site)) return null
  const seo = isObj(s.seo) ? s.seo : {}
  const consent = isObj(s.consent) ? s.consent : {}
  return {
    id: str(s.site.id),
    naam: str(s.site.naam),
    domein: str(s.site.domein),
    merk: isObj(s.merk) ? s.merk : {},
    navigatie: isObj(s.navigatie) ? s.navigatie : {},
    design_tokens: isObj(s.design_tokens) ? s.design_tokens : {},
    redirects: Array.isArray(s.redirects) ? s.redirects : [],
    // Standaard-SEO van de site (Site > Navigatie > Standaard-SEO): terugval als een pagina zelf niets heeft.
    seo: {
      titel_suffix: str(seo.titel_suffix),
      beschrijving: str(seo.beschrijving),
      social_beeld: str(seo.social_beeld),
      noindex: seo.noindex === true,
      google_verificatie: str(seo.google_verificatie),
      bing_verificatie: str(seo.bing_verificatie),
    },
    // Organisatie voor de JSON-LD (Site > Navigatie > Organisatie). null = niet meegegeven.
    organisatie: isObj(s.organisatie) ? s.organisatie : null,
    // Alleen `analytics: 'uit'` doet iets: dan wordt er niet gemeten (meet.js vervalt).
    consent: { analytics: consent.analytics === 'uit' ? 'uit' : 'eigen' },
    teksten: normaliseerTeksten(s.teksten),
  }
}

// Artikel uit een collectie-record (records-API) of uit pagina.records.artikelen (platte rij).
export function normaliseerArtikel(r) {
  if (!isObj(r)) return null
  const d = isObj(r.data) ? r.data : r
  const slug = str(r.slug) || str(d.slug)
  const titel = str(d.titel) || str(r.titel)
  if (!/^[a-z0-9][a-z0-9-]{0,150}$/.test(slug) || !titel) return null
  const datum = str(d.gepubliceerd_op) || str(r.gepubliceerd_op)
  return {
    slug,
    titel,
    rubriek: str(d.rubriek),
    auteur: str(d.auteur),
    datum: /^\d{4}-\d{2}-\d{2}/.test(datum) ? datum : '',
    samenvatting: str(d.samenvatting),
    antwoordblok: str(d.antwoordblok),
    foto: str(d.foto),
    foto_alt: str(d.foto_alt),
    hoofdtekst: str(d.hoofdtekst),
  }
}

// Nieuwste eerst; artikelen zonder datum achteraan.
export function sorteerArtikelen(lijst) {
  return [...lijst].sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
}

// ------------------------------------------------------------------ ophalen

// Alle gepubliceerde inhoud in één keer: site, pagina's (met blokken) en artikelen.
export async function laadAlles(cfg) {
  const [siteRes, paginasRes, artikelen] = await Promise.all([haal(cfg, 'site'), haalAllePaginas(cfg), haalArtikelen(cfg)])
  if (siteRes.status !== 200) throw new CmsFout(`CMS antwoordde met status ${siteRes.status} op /site`, siteRes.status)
  const site = normaliseerSite(siteRes.json)
  if (!site) throw new CmsFout('Onverwacht antwoord van /api/v1/site')
  return { site, paginas: paginasRes, artikelen, opgehaald: new Date().toISOString() }
}

async function haalAllePaginas(cfg) {
  const uit = []
  let vanaf = 0
  for (let i = 0; i < 20; i++) {
    const { status, json } = await haal(cfg, `paginas?inhoud=1${vanaf ? `&vanaf=${vanaf}` : ''}`)
    if (status !== 200 || !isObj(json) || !Array.isArray(json.paginas)) throw new CmsFout(`CMS antwoordde met status ${status} op /paginas`, status)
    uit.push(...json.paginas.map(normaliseerPagina).filter(Boolean))
    if (typeof json.volgende !== 'number') break
    vanaf = json.volgende
  }
  return uit
}

async function haalArtikelen(cfg) {
  const uit = []
  let vanaf = 0
  for (let i = 0; i < 20; i++) {
    const { status, json } = await haal(cfg, `collecties/artikelen?limiet=200${vanaf ? `&vanaf=${vanaf}` : ''}`)
    if (status === 404) return [] // de site heeft (nog) geen artikelen
    if (status !== 200 || !isObj(json) || !Array.isArray(json.records)) throw new CmsFout(`CMS antwoordde met status ${status} op /collecties/artikelen`, status)
    uit.push(...json.records.map(normaliseerArtikel).filter(Boolean))
    if (typeof json.volgende !== 'number') break
    vanaf = json.volgende
  }
  return sorteerArtikelen(uit)
}

// Concept voor "Voorbeeld op de site". Alleen `concept: true` telt als geldig concept.
//   { soort: 'concept', pagina } | { soort: 'geweigerd' } | { soort: 'niet-gevonden' } | { soort: 'fout' }
export async function haalConcept(cfg, pad, token) {
  try {
    const q = new URLSearchParams({ pad, voorvertoning: token })
    const { status, json } = await haal(cfg, `pagina?${q}`, { cache: false })
    if (status === 404) return { soort: 'niet-gevonden' }
    if (status === 401 || status === 403) return { soort: 'geweigerd' }
    if (status !== 200 || !isObj(json) || typeof json.concept !== 'boolean') return { soort: 'fout' }
    const pagina = normaliseerPagina(json.pagina)
    if (!pagina) return { soort: 'fout' }
    return json.concept ? { soort: 'concept', pagina } : { soort: 'geweigerd' }
  } catch {
    return { soort: 'fout' }
  }
}
