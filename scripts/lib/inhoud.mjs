// Content ophalen uit het Link & Lead CMS (koppelpunt 1, build-time, token-gated) en normaliseren.
// Externe JSON = onvertrouwd → defensief valideren tot het vorm-contract dat de renderers verwachten.
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

export async function haalCmsContent({ base, token }) {
  const res = await fetch(`${base}/api/cms/content`, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Content ophalen mislukt (${res.status}). Controleer CMS_TOKEN en CMS_BASE.`)
  const json = await res.json()
  if (!json || json.ok !== true) throw new Error('CMS gaf geen geldige respons: ' + (json?.melding ?? 'onbekend'))
  return json
}

// Offline/preview-stand: de blauwdruk omzetten naar exact de vorm van de lees-API, zodat dezelfde
// renderers draaien. Alleen voor lokaal werken zonder token (CMS_OFFLINE=1); productie leest het CMS.
export async function blauwdrukAlsContent(bestand = 'cms/blauwdruk.mjs') {
  const bd = (await import(pathToFileURL(path.resolve(bestand)).href)).default
  const m = bd.merk ?? {}
  return {
    ok: true,
    site: {
      naam: m.naam ?? null,
      domein: null,
      design_tokens: bd.design_tokens ?? {},
      merk: { naam: m.naam, logo: m.logo, favicon: m.favicon, tagline: m.tagline, contact: m.contact ?? {} },
      navigatie: { hoofd: m.hoofd_nav ?? [], footer: m.footer_kolommen ?? [], juridisch: m.juridische_links ?? [], actie: m.primaire_actie ?? null },
      redirects: bd.redirects ?? [],
      locale: 'nl',
    },
    paginas: (bd.paginas ?? []).filter((p) => p.published !== false).map((p) => ({
      slug: p.slug,
      titel: p.titel,
      beschrijving: p.beschrijving ?? '',
      og_beeld: p.og_beeld ?? null,
      blokken: (p.blokken ?? []).map((b) => ({ type: b.type, bg: b.bg ?? null, content: b.content ?? {} })),
    })),
    records: {},
    popups: [],
  }
}

// Normaliseert de respons tot { site, paginas, records } met gegarandeerde vormen.
export function normaliseer(json) {
  const site = json?.site && typeof json.site === 'object' ? json.site : {}
  const paginas = (Array.isArray(json?.paginas) ? json.paginas : [])
    .filter((p) => p && typeof p.slug === 'string' && p.slug.startsWith('/') && !p.slug.includes('..'))
    .map((p) => ({
      slug: p.slug.length > 1 ? p.slug.replace(/\/+$/, '') : '/',
      titel: typeof p.titel === 'string' ? p.titel : p.slug,
      beschrijving: typeof p.beschrijving === 'string' ? p.beschrijving : '',
      og_beeld: typeof p.og_beeld === 'string' ? p.og_beeld : null,
      blokken: (Array.isArray(p.blokken) ? p.blokken : []).filter((b) => b && typeof b.type === 'string'),
    }))
  const records = json?.records && typeof json.records === 'object' ? json.records : {}
  return { site, paginas, records }
}
