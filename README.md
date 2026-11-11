# Tandarts Van Beek — website

Eigen frontend (CMS-model A) voor Tandarts Van Beek in Honselersdijk, gekoppeld aan het
**Link & Lead CMS**. Het CMS is de bron voor teksten, beelden, links, FAQ, team en navigatie; deze
repo bepaalt alleen het ontwerp en de koppeling. Er zit geen CMS-code in deze repo.

- Functioneel ontwerp 2.0 = werking · goedgekeurde homepage = vormgeving · CMS-handleiding = contentstructuur.
- Hoe de handoff-blokken op het CMS zijn gemapt (en waar de site is aangepast omdat het CMS iets niet
  kent): [`docs/CMS-MAPPING.md`](docs/CMS-MAPPING.md).

## De drie koppelpunten

| Koppelpunt | Waar | Wat |
|---|---|---|
| Content | `scripts/build.mjs` | `GET {CMS_BASE}/api/cms/content` met `Authorization: Bearer $CMS_TOKEN` (build-time) |
| Leads | contactformulier + `cms-client.js` | berichten naar `/api/cms/lead` met `site_id`, honeypot en tijdmeting |
| Tracking | `meet.js` in elke pagina | cookieloze bezoekerscijfers in het CMS-dashboard |

## Werken

```bash
cp .env.example .env      # vul CMS_TOKEN in (opvragen bij de CMS-beheerder)
npm run build             # haalt content uit het CMS en rendert dist/
npm run serve             # lokale preview op http://localhost:4321
npm run build:offline     # preview uit cms/blauwdruk.mjs, zonder token
npm test                  # acceptatietests (h1, lege velden, 1/12/0 items, 5 schema's, XSS)
npm run check:cms         # blauwdruk tegen het CMS-contract
npm run cms:push          # blauwdruk naar het CMS (overschrijft de pagina's die erin staan!)
```

Geen dependencies; Node ≥ 20.

## Inhoud wijzigen
In het CMS (`/admin`, site "Tandarts Van Beek") → publiceren → nieuwe build (Vercel Deploy Hook of
redeploy). `cms/blauwdruk.mjs` is alleen de startinhoud; draai `cms:push` niet meer zodra
redacteuren in `/admin` werken, anders gaan hun wijzigingen op die pagina's verloren.

## Deploy (Vercel)
Build-command `node scripts/build.mjs`; de build schrijft een Vercel Build Output
(`.vercel/output`) met redirects uit het CMS, beveiligingsheaders en een 404. Zet in Vercel de
environment variables `CMS_TOKEN`, `SITE_ID`, `CMS_BASE` en `SITE_URL`. Het lead-endpoint accepteert
alleen berichten vanaf het domein dat in het CMS bij de site staat
(`tandartsenpraktijk-van-beek.vercel.app`); pas dat in het CMS aan bij het koppelen van het eigen domein.

## Nog aan te leveren door de praktijk
Alles wat nog niet bevestigd is, staat in de inhoud als **[te bevestigen: …]** en is op de site geel
gemarkeerd. De ontwikkelaar heeft geen praktijkregels verzonnen.

1. Openingstijden per dag, telefonische bereikbaarheid, parkeren.
2. Annuleringstermijn/-kosten, verwijsroute snurk-/apneubeugel, duur van een controle.
3. Teamleden (naam, functie, foto) in het CMS onder Team; korte geschiedenis van de praktijk.
4. Behandelaanbod en medische teksten (nu concepttekst); BIG-registraties en klachtenregeling.
5. Privacyverklaring, praktische informatie, lijst van bestaande URL's voor redirects.
6. Of het oude inschrijfformulier vervangen mag worden door het contactformulier (nu: onderwerp
   *Inschrijven*, *Wachtlijst* of *Snurk- of apneubeugel*).
7. Een eventueel nieuwsoverzicht (op de huidige site aanwezig; nu niet overgenomen).

Wél verwerkt uit de huidige site: adres (Groenelaan 128, 2675 RS Honselersdijk), praktijknummer
0174-622373, spoednummer 085-2221388 met spoeduren, Dental 365 (0900-1515), online controleafspraak
via e-maillink, inschrijfbeleid en wachtlijst, KNMT-lidmaatschap.
8. **Definitieve fotografie en logo.** De huidige beelden zijn uitsneden uit de goedgekeurde
   homepage-afbeelding en het logo is een benadering; vervang ze door de originele assets.
