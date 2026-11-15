// Omgevingsvariabelen en de offline-stand (testdata in dezelfde vorm als laadAlles uit de lees-API).
import { readFileSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export function leesEnv(bestand = '.env') {
  const o = {}
  if (existsSync(bestand))
    for (const r of readFileSync(bestand, 'utf8').split('\n')) {
      const m = r.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  return { ...o, ...process.env }
}

// CMS_URL en CMS_TOKEN (zoals bij NOVA). CMS_BASE is de oude naam en werkt nog als terugval.
export function cmsConfig(env) {
  const cmsUrl = (env.CMS_URL || env.CMS_BASE || 'https://cms.linkandlead.nl').trim().replace(/\/$/, '')
  return { cmsUrl, token: (env.CMS_TOKEN || '').trim() }
}

export function siteUrl(env) {
  return (env.SITE_URL || 'https://tandartsenpraktijk-van-beek.vercel.app').trim().replace(/\/$/, '')
}

const VOORBEELD_ARTIKELEN = [
  {
    slug: 'voorbeeldartikel-gezond-tandvlees',
    titel: 'Voorbeeldartikel: gezond tandvlees',
    rubriek: 'Mondgezondheid',
    auteur: 'Tandarts Van Beek',
    datum: '2026-11-15',
    samenvatting: 'Testinhoud voor lokaal werken: zo ziet een artikel eruit.',
    antwoordblok: 'Dit is het korte antwoord bovenaan het artikel.',
    foto: '',
    foto_alt: '',
    hoofdtekst: 'Eerste alinea van het artikel.\n\nGezond tandvlees bloedt niet\n\nTweede alinea met **vet** en een [link](/contact).\n\n## Een kop met hekjes\n\nLaatste alinea.',
  },
]

export async function blauwdrukAlsInhoud(bestand = 'tests/fixtures/blauwdruk.mjs') {
  const bd = (await import(pathToFileURL(path.resolve(bestand)).href)).default
  const m = bd.merk ?? {}
  return {
    site: {
      id: '',
      naam: m.naam ?? '',
      domein: '',
      merk: { naam: m.naam, logo: m.logo, favicon: m.favicon, tagline: m.tagline, contact: m.contact ?? {} },
      navigatie: { hoofd: m.hoofd_nav ?? [], footer: m.footer_kolommen ?? [], juridisch: m.juridische_links ?? [], actie: m.primaire_actie ?? null },
      design_tokens: bd.design_tokens ?? {},
      redirects: bd.redirects ?? [],
      seo: { titel_suffix: '', beschrijving: '', social_beeld: '', noindex: false, google_verificatie: '', bing_verificatie: '' },
      organisatie: null,
      consent: { analytics: 'eigen' },
      teksten: {},
    },
    paginas: (bd.paginas ?? []).map((p) => ({
      slug: p.slug,
      titel: p.titel,
      beschrijving: p.beschrijving ?? '',
      seoTitel: '',
      noindex: false,
      canonical: null,
      og_beeld: null,
      blokken: (p.blokken ?? []).map((b) => ({ type: b.type, bg: b.bg ?? null, content: b.content ?? {} })),
      records: {},
    })),
    artikelen: VOORBEELD_ARTIKELEN,
    opgehaald: 'offline',
  }
}
