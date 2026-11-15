// Vaste interfaceteksten (CMS: Site > Teksten, lees-API v1 `site.teksten`). Elke tekst op de site die
// niet in een blok staat (kop, voettekst, formulierstappen, lege standen, 404, artikeloverzicht) heeft
// hier een sleutel. Staat de sleutel in het CMS, dan wint die tekst; anders geldt de standaard hieronder
// (= de tekst die er vóór de koppeling stond, dus zonder ingevulde teksten verandert er niets).
//
// Een redacteur voegt een sleutel toe in Site > Teksten ("Nieuwe plek") of de bouwer meldt ze allemaal
// in één keer aan met cms/teksten.json (blokken:sync). "Leeg = tekst weg" in het beheer betekent hier:
// terug naar de standaard.
import { veiligeHref } from './html.mjs'

export const STANDAARD_TEKSTEN = {
  'algemeen.skiplink': 'Direct naar de inhoud',
  'algemeen.kruimelpad_home': 'Home',
  'kop.menu': 'Menu',
  'kop.menu_label': 'Hoofdmenu',
  'spoed.label': 'Spoed',
  'spoed.link': '/spoed',
  'voet.spoed_kop': 'Spoed',
  'voet.spoed_tekst': 'Acute klachten? Bekijk direct wat u moet doen.',
  'voet.spoed_knop': 'Naar spoed',
  'tekstblok.bijgewerkt': 'Laatst bijgewerkt:',
  'collectie.leeg': 'Er zijn op dit moment geen items om te tonen.',
  'team.leeg': "Het teamoverzicht wordt binnenkort aangevuld. [te bevestigen: actuele medewerkers, functies en portretfoto's in het CMS]",
  'keuzehulp.kies': 'Maak een keuze',
  'formulier.email': 'E-mailadres',
  'formulier.optioneel': '(optioneel)',
  'formulier.kies': 'Maak een keuze',
  'formulier.akkoord': 'Ik ga akkoord met de verwerking van mijn gegevens volgens de [privacyverklaring](/privacyverklaring).',
  'formulier.controleren_kop': 'Controleer uw gegevens',
  'formulier.versturen': 'Bericht versturen',
  'formulier.aanpassen': 'Gegevens aanpassen',
  'formulier.verstuurd_kop': 'Bericht verstuurd',
  'formulier.noscript': 'Voor dit formulier is JavaScript nodig. U kunt ons ook bellen.',
  'formulier.niet_beschikbaar': 'Versturen is nu niet mogelijk. Probeer het later opnieuw of bel de praktijk.',
  'formulier.fout_versturen': 'Uw bericht kon niet worden verzonden. Uw gegevens zijn bewaard; controleer ze en probeer het opnieuw, of bel de praktijk.',
  'artikelen.alle': 'Alle artikelen',
  'artikelen.leeg': 'Er zijn nog geen artikelen gepubliceerd.',
  'artikelen.kort_antwoord': 'Kort antwoord',
  'artikelen.overzicht_eyebrow': 'Nieuws en uitleg',
  'artikelen.overzicht_titel': 'Artikelen',
  'artikelen.overzicht_intro': 'Praktische uitleg over gezonde tanden, tandvlees en behandelingen.',
  'fout404.eyebrow': 'Foutmelding 404',
  'fout404.titel': 'Deze pagina bestaat niet (meer)',
  'fout404.tekst': 'Misschien is de pagina verplaatst. Ga naar de homepage of bekijk direct wat u moet doen bij spoed.',
  'fout404.knop': 'Naar de homepage',
  'fout404.knop_spoed': 'Spoed',
}

export const TEKST_SLEUTELS = Object.keys(STANDAARD_TEKSTEN)

// De tekst voor een sleutel: uit het CMS als die er is, anders de standaard.
export function tekst(site, sleutel) {
  const w = site?.teksten?.[sleutel]
  return typeof w === 'string' && w.trim() ? w.trim() : (STANDAARD_TEKSTEN[sleutel] ?? '')
}

// Een tekst die een link is (bv. spoed.link): alleen veilige vormen, anders de standaard.
export function tekstLink(site, sleutel) {
  return veiligeHref(tekst(site, sleutel)) || STANDAARD_TEKSTEN[sleutel] || ''
}
