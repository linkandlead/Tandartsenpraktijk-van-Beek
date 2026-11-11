# CMS-mapping — Tandarts Van Beek op het Link & Lead CMS

Model A: deze repo is de eigen frontend; het Link & Lead CMS (`linkandlead-cms`) is de bron voor
inhoud. De site staat in het CMS als **Tandarts Van Beek** (site-id `51943d8c-718c-4000-b599-6339d790883f`,
domein `tandartsenpraktijk-van-beek.vercel.app`, status `in_bouw`).

## Waar de handoff en het CMS verschillen

De handoff en het FO noemen blokken die het CMS (stand 11-11-2026) niet als zodanig kent. Volgens de
opdracht is in die gevallen **de website aangepast aan het CMS**, niet andersom; de CMS-kern is niet gewijzigd.

| Handoff / FO | Bestaat in CMS? | Oplossing in deze site |
|---|---|---|
| Header (hero) | ja — `header` | layout `split-rechts`; organische overgang is CSS |
| Actiebalk (nieuw sitebloktype) | nee | `kaarten` met bouwer-veld `weergave: "actiebalk"`. Label = `titel`, link = `link`, volgorde = lijstvolgorde, linktype volgt uit de link (`/…` intern, `tel:`, `https://` extern). Max. 3 items, geen iconen (`icoon: "geen"`). |
| Collectie (lijst) behandelingen | nee | `kaarten` met `weergave: "collectie"` (beeld, titel, tekst, link per item) + bouwer-velden `maximaal`, `knop`, `knoptekst` voor de link "Alle behandelingen bekijken". |
| Tekst met beeld | ja — `mediatekst` | `beeldzijde: links`; de organische vorm bij "Praktijk en team" via bouwer-veld `beeldvorm: "organisch"`. "Onze zorg" blijft rechthoekig. |
| Kaartenrij (werkwijze) | ja — `kaarten` | tekstkaarten zonder iconen |
| Kenmerkenstrook onder "Praktijk en team" | nee | `kaarten` met `weergave: "kenmerken"`; de niet-geverifieerde 4,8/5-waardering uit het ontwerp is weggelaten |
| Patiënt- en afspraakkeuzehulp (site-module) | nee | `kaarten` met `weergave: "keuzehulp"`: elke kaart = situatie + instructie + optionele route. De toelatingsregels zijn CMS-inhoud, niet hardcoded. Zonder JS zijn alle situaties leesbaar. |
| Team | ja — `mensen` (live collectie `teamleden`) | leest `records.teamleden` uit de lees-API; lege stand tot de praktijk teamleden publiceert |
| Reeks stappen | ja — `reeks`, variant `genummerd` | |
| Veelgestelde vragen | ja — `faq` | `details/summary`, leesbaar zonder JS |
| Feiten / openingstijden | ja — `feiten` | per dag een label/waarde; geen nieuw `Vestigingen`-type nodig |
| Kaart en locatie | ja — `kaart` | statische illustratie + routeknop, géén externe kaart bij laden |
| Formulierbouwer | ja — `formulier_bouwer` | velden uit het CMS; e-mail altijd aanwezig; verzending via `cms-client.js` naar `/api/cms/lead` |
| Afsluitende oproep | ja — `cta` | identieke inhoud op elke pagina (één bron in de blauwdruk) |
| Tekstblok | ja — `tekst` | rijke tekst (CMS-subset) + `bijgewerkt` |
| Statistieken, testimonials, reviews | ja | **bewust niet gebruikt**: er zijn geen geverifieerde cijfers of reviews |

### Bouwer-eigen velden
Het CMS bewaart onbekende top-level velden in blokcontent ongemoeid (`GOVERNANCE.md`, "Bouwer-eigen
velden"). Deze site gebruikt er alleen: `kaarten.weergave`, `kaarten.knop`, `kaarten.knoptekst`,
`kaarten.maximaal`, `kaarten.keuze_label` en `mediatekst.beeldvorm`. Ze worden **niet getoond** in
`/admin`; redacteuren passen ze aan via de blauwdruk (of een CMS-verzoek als ze bewerkbaar moeten
worden). Er staan geen extra velden binnen lijstitems.

### Mogelijke CMS-verzoeken (`/admin/cms-verzoeken`)
1. **Actiebalk** als echt sitebloktype (velden `items[label, link, linktype]`, max. 3), zodat
   `weergave` niet nodig is en de redacteur het in `/admin` ziet.
2. **Keuzehulp** als kernblok (situatie → instructie → route) — herbruikbaar voor andere praktijken.
3. `tel:`-links in rijke tekst (de CMS-renderer staat nu alleen http(s)/mailto/intern toe; deze
   frontend ondersteunt `tel:` wel, omdat klikbare telefoonnummers een eis zijn).

## Achtergronden
`bg` per sectie: `wit`=Licht, `mist`=Zacht, `limoenlicht`=Accent, `diep`=Donker, `nacht`=Diepst.
Elk blok rendert in alle vijf (getest in `tests/blokken.test.mjs`).

## Kleuren en fonts
De 12 CMS-kleursleutels staan in `design_tokens` (blauwdruk) en als `--cms-*` in `src/styles.css`.
Fonts lokaal als WOFF2 (Outfit 500/600 voor koppen, Instrument Sans 400/600 voor tekst; OFL-licentie,
4 bestanden). Definitieve keuze nog door de designer te bevestigen.
