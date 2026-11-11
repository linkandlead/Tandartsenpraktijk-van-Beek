// Het CMS-contract voor de bloktypen die deze site gebruikt: veldnamen exact overgenomen uit
// linkandlead-cms/src/shared/blokregistry.ts (stand 11-11-2026). Plus de bouwer-eigen top-level
// velden die we bewust gebruiken (GOVERNANCE.md: het CMS bewaart die ongemoeid).
// scripts/check-blauwdruk.mjs controleert de blauwdruk hiertegen, zodat er geen velden verzonnen worden.

export const CMS_VELDEN = {
  header: {
    velden: ['layout', 'hoogte', 'eyebrow', 'heading', 'subheading', 'cta_primair_label', 'cta_primair_link', 'cta_secundair_label', 'cta_secundair_link', 'media_type', 'media_afbeelding', 'media_alt', 'media_video', 'focal_x', 'focal_y', 'overlay', 'extras', 'stats', 'formulier_soort', 'kruimelpad', 'auto_kruimelpad', 'usps'],
  },
  tekst: { velden: ['eyebrow', 'titel', 'tekst', 'bijgewerkt'] },
  mediatekst: {
    velden: ['eyebrow', 'titel', 'alineas', 'punten', 'beeld', 'beeld_alt', 'beeldzijde', 'knop', 'knoptekst'],
    bouwer: ['beeldvorm'],
    items: { alineas: ['tekst'], punten: ['tekst'] },
  },
  kaarten: {
    velden: ['eyebrow', 'titel', 'intro', 'kolommen', 'items'],
    bouwer: ['weergave', 'knop', 'knoptekst', 'maximaal', 'keuze_label'],
    items: { items: ['icoon', 'beeld', 'beeld_alt', 'titel', 'tekst', 'link', 'knoptekst'] },
  },
  faq: { velden: ['titel', 'vragen'], items: { vragen: ['vraag', 'antwoord'] } },
  reeks: {
    velden: ['eyebrow', 'titel', 'intro', 'label_rechts', 'stappen', 'uitkomsten', 'slotregel', 'knop', 'knoptekst_reeks'],
    items: { stappen: ['nummer', 'sleutel', 'icoon', 'label', 'naam', 'titel', 'tekst', 'meta', 'breedte', 'belofte', 'link', 'knoptekst'], uitkomsten: ['label'] },
  },
  feiten: { velden: ['titel', 'intro', 'feiten', 'media_afbeelding', 'media_alt'], items: { feiten: ['label', 'waarde'] } },
  kaart: { velden: ['eyebrow', 'titel', 'intro', 'adres', 'telefoon', 'email', 'knoptekst', 'knop'] },
  formulier_bouwer: {
    velden: ['eyebrow', 'titel', 'intro', 'velden', 'knoptekst', 'bevestigingstekst', 'voetnoot'],
    items: { velden: ['label', 'type', 'opties', 'verplicht', 'toon_als'] },
  },
  mensen: { velden: ['titel', 'intro', 'maximaal'] },
  cta: { velden: ['eyebrow', 'titel', 'tekst', 'knoptekst', 'knop', 'media_afbeelding', 'media_alt', 'meta'], items: { meta: ['tekst'] } },
}

// Meta-sleutels die het CMS zelf op content stempelt (stempelBlokMeta).
export const META = ['_v', '_variant']

export const BG_WAARDEN = ['wit', 'mist', 'limoenlicht', 'diep', 'nacht']

export const KEUZES = {
  header: { layout: ['gecentreerd', 'split-links', 'split-rechts', 'achtergrond', 'compact'], hoogte: ['compact', 'normaal', 'fullscreen'], media_type: ['geen', 'afbeelding', 'video'], overlay: ['geen', 'licht', 'donker', 'sterk'], extras: ['geen', 'logostrip', 'stats', 'formulier'], auto_kruimelpad: ['aan', 'uit'] },
  mediatekst: { beeldzijde: ['links', 'rechts'] },
  kaarten: { kolommen: ['3', '4'] },
}

// Valideert één blok tegen het contract. Geeft een lijst foutmeldingen terug (leeg = in orde).
export function controleerBlok(blok, waar) {
  const fouten = []
  const def = CMS_VELDEN[blok?.type]
  if (!def) return [`${waar}: bloktype "${blok?.type}" wordt niet gebruikt/ondersteund door deze site.`]
  if (blok.bg != null && !BG_WAARDEN.includes(blok.bg)) fouten.push(`${waar}: ongeldige achtergrond "${blok.bg}".`)
  const toegestaan = new Set([...def.velden, ...(def.bouwer ?? []), ...META])
  for (const [k, v] of Object.entries(blok.content ?? {})) {
    if (!toegestaan.has(k)) fouten.push(`${waar}: veld "${k}" bestaat niet in CMS-blok "${blok.type}".`)
    const opties = KEUZES[blok.type]?.[k]
    if (opties && !opties.includes(v)) fouten.push(`${waar}: waarde "${v}" is geen geldige keuze voor ${blok.type}.${k}.`)
    const itemVelden = def.items?.[k]
    if (itemVelden && Array.isArray(v)) {
      v.forEach((item, i) => {
        for (const ik of Object.keys(item ?? {}))
          if (!itemVelden.includes(ik)) fouten.push(`${waar}: ${k}[${i}].${ik} bestaat niet in CMS-blok "${blok.type}".`)
      })
    }
  }
  if (blok.type === 'kaarten' && blok.content?.weergave === 'actiebalk') {
    const n = (blok.content.items ?? []).length
    if (n < 1 || n > 3) fouten.push(`${waar}: de Actiebalk heeft 1 t/m 3 acties nodig (nu ${n}).`)
  }
  return fouten
}
