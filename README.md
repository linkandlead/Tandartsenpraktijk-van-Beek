# Tandarts Van Beek — website

Eigen frontend (model A) voor Tandarts Van Beek in Honselersdijk op **Link & Lead One**. Het CMS
(`https://cms.linkandlead.nl`, site "Tandarts Van Beek") is de bron voor alle inhoud: pagina's,
blokken, menu, footer, huisstijl en artikelen. Deze repo bepaalt alleen de vormgeving en de koppeling.

## Hoe het werkt

| Onderdeel | Waar | Wat |
|---|---|---|
| Inhoud | `scripts/lib/cms-v1.mjs` | lees-API **v1**: `/api/v1/site`, `/api/v1/paginas?inhoud=1`, `/api/v1/collecties/artikelen` (header `X-CMS-API-Versie: v1`) |
| Weergave | `scripts/lib/blokken.mjs`, `artikelen.mjs`, `pagina.mjs` | elk CMS-bloktype → het ontwerp (zie `docs/CMS-MAPPING.md`) |
| Serveren | `scripts/lib/app.mjs` via de Vercel-functie `render` (`scripts/functie.mjs`) | elke pagina, `/artikelen`, `/artikelen/<slug>`, `/sitemap.xml`, `/__voorvertoning` |
| Verversing | `app.mjs` | inhoud 30 s in het geheugen + CDN `s-maxage=60, stale-while-revalidate`: gepubliceerde wijzigingen staan binnen ± 1–2 minuten op de site, zoals bij NOVA |
| Terugval | `app.mjs` | CMS onbereikbaar → laatst goede inhoud, anders de momentopname van de laatste build (`inhoud.json`). Mislukt de build zelf, dan blijft de vorige deployment live. |
| Voorbeeld op de site | `/__voorvertoning?pad=/x&token=…` | het CMS controleert het token (`concept: true`); concept met de balk "Voorbeeld, niet gepubliceerd", nooit gecachet, nooit geïndexeerd. Zonder geldig token: door naar de gepubliceerde pagina. |
| Formulieren | `cms-client.js` van het CMS | ongewijzigd: berichten naar het CMS met spambescherming |
| Statistieken | `meet.js` van het CMS | cookieloos; niet in de voorvertoning |

Er is **geen push- of sync-script**: redacteuren werken in het CMS en de site schrijft daar nooit in.

## Werken

```bash
cp .env.example .env      # CMS_URL + CMS_TOKEN (leestoken van de site)
npm run build             # haalt de inhoud op (momentopname) en maakt dist/
npm run serve             # lokaal op http://localhost:4321, met dezelfde verwerking als op Vercel
npm run build:offline     # zonder token, met testdata uit tests/fixtures
npm test                  # tests (nep-CMS, geen netwerk)
```

Geen dependencies; Node ≥ 22.

## Variabelen (Vercel → Environment Variables, nooit in git)

| Naam | Waarde |
|---|---|
| `CMS_URL` | `https://cms.linkandlead.nl` |
| `CMS_TOKEN` | leestoken van de site (**Sensitive**) |
| `SITE_URL` | `https://tandartsenpraktijk-van-beek.vercel.app` (later het eigen domein) |

`CMS_BASE` en `SITE_ID` worden niet meer gebruikt (het site-id komt nu uit `/api/v1/site`).

## Voorbeeld in de CMS-editor

`/__voorvertoning` mag (alleen die route) ingesloten worden door het CMS (`frame-ancestors 'self' CMS_URL`); alle
andere pagina's blijven `frame-ancestors 'none'`. Met `&ingesloten=1` laat de site haar eigen balk weg. De
voorbeeldcookie is `SameSite=None; Partitioned`, zodat doorklikken ook in het editorvenster werkt. Het CMS moet
het insluiten nog bouwen: CMS-verzoek "Editorvoorbeeld in het echte ontwerp van een eigen frontend (model A)".
Tot dan toont het editorvenster de standaardopmaak; het echte ontwerp zie je via "Voorbeeld op de site".

## Siteregister

"Adres voor Voorbeeld op de site": `https://tandartsenpraktijk-van-beek.vercel.app/__voorvertoning`
(dat is ook het standaardadres op basis van het domein).

De voorvertoning mag alleen door het CMS in een frame worden getoond (B-110): `/__voorvertoning` krijgt
`frame-ancestors <origin van CMS_URL>` (standaard `https://cms.linkandlead.nl`), `noindex` en `no-store`; de
rest van de site blijft `frame-ancestors 'none'` (`scripts/lib/beveiliging.mjs`).

## Wat in het CMS te beheren is
Alles behalve de vormgeving. Overzicht per onderdeel: [`docs/CMS-DEKKING.md`](docs/CMS-DEKKING.md); wat het
CMS nog mist: [`docs/CMS-VERZOEKEN.md`](docs/CMS-VERZOEKEN.md).

- **Site > Teksten**: vaste teksten buiten de blokken (Spoed-link, footer, formulierstappen, 404, lege standen,
  kop van `/artikelen`). Sleutels en standaardteksten: `scripts/lib/teksten.mjs`. Aanmelden zodat het beheer
  ze toont: `cms/teksten.json` via blokken:sync (`POST {CMS_URL}/api/v1/blokken/sync` met het **schrijftoken**;
  eerst met `?droog=1`), of per sleutel met "Nieuwe plek".
- **Site > Navigatie**: menu, footer, merk (ook slogan en socials), Standaard-SEO en Organisatie (JSON-LD).
- **Huisstijl**: de 12 kleuren (`design_tokens`) overschrijven `--cms-*` in `src/styles.css`.

## Deploy hook (CMS-wijzigingen automatisch in de build)
Pagina's lezen het CMS al live (± 1–2 minuten). De build bewaart daarnaast een momentopname als terugval
bij een CMS-storing; met een deploy hook bouwt Vercel na elke publicatie opnieuw, zodat ook die terugval
actueel is.

1. **Vercel**: project `tandartsenpraktijk-van-beek` → **Settings > Git > Deploy Hooks**. Naam bijvoorbeeld
   "Link & Lead One", branch `main` → **Create Hook** en kopieer de URL
   (`https://api.vercel.com/v1/integrations/deploy/…`). Behandel die als een wachtwoord: niet in git, chat of
   tickets.
2. **CMS**: site "Tandarts Van Beek" → **Instellingen** → paneel **Deploy-hook (headless frontend)** → plak de
   URL → opslaan.
3. Klik op **Nu testen**. In Vercel verschijnt een nieuwe deployment; in het CMS staat de aanroep met status
   in de lijst eronder.

Daarna start het CMS een build na elke (de)publicatie van een pagina, blok of record en na het opslaan van
instellingen (teksten, navigatie, redirects). Mislukt een build, dan blijft de vorige deployment live.

## Artikelen

- Overzicht `/artikelen`, detail `/artikelen/<slug>`, en het blok "Artikelen" (`artikelen_grid`) op elke
  pagina waar een redacteur het plaatst. Alleen gepubliceerde artikelen, nieuwste eerst.
- Hoofdtekst is platte tekst: alinea's gescheiden door een witregel. Tussenkop: een regel die begint met
  `## ` (aanbevolen), of een losse korte regel (≤ 80 tekens) zonder slotpunt die niet de eerste of
  laatste alinea is.
- Foto's van `images.pexels.com` worden in een passend formaat opgevraagd (`?w=`); andere adressen
  ongewijzigd.

## Nog aan te leveren door de praktijk
Onbevestigde gegevens staan in de inhoud als **[te bevestigen: …]** en zijn op de site geel gemarkeerd:
openingstijden per dag, telefonische bereikbaarheid, parkeren, annuleringsbeleid, teamleden,
behandelteksten (concept), privacyverklaring, definitieve foto's en logo.
