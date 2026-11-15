# CMS-verzoeken — wat Link & Lead One (nog) niet kan voor deze site

De CMS-kern is voor deze site niet gewijzigd. Wat ontbreekt, staat hier; indienen via `/admin/cms-verzoeken`.
Gecontroleerd tegen `linkandlead-cms` main (27ef6ea, 15-11-2026).

1. **Integraties in de lees-API v1.** `site.integraties` (Google Analytics, Calendly, Salesfeed, cookiemelding;
   B-102) zit alleen in de oude `/api/cms/content`, niet in `/api/v1/site` (contract `SiteV1`). Verzoek: het
   veld additief toevoegen aan v1. (Voor deze site is GA nu niet gewenst: geen trackingcookies.)
2. **`foto_alt` van artikelen in v1.** De database heeft het veld, maar `/api/v1/collecties/artikelen` en
   `pagina.records.artikelen` geven het niet door; artikelfoto's krijgen nu een lege alt. (Stond al in
   `CMS-MAPPING.md`.)
3. **Actiebalk en keuzehulp bewerkbaar.** De vorm van een `kaarten`-blok staat in het bouwer-eigen veld
   `weergave`, dat de editor niet toont. Bestaand alternatief zonder kernwijziging: `kernvarianten:
   { kaarten: [...] }` via blokken:sync (keuzeveld "Variant"); dan moet deze site `inhoud.variant` lezen. Vraag
   aan het CMS: wat de editor als waarde opslaat bij een bestaand blok zonder variant (anders kan een
   actiebalk bij opslaan stil een gewone kaartenrij worden). Pas daarna koppelen.
4. **Keuzehulp als kernblok** (situatie → instructie → route), herbruikbaar voor andere praktijken.
5. **`tel:`-links in rijke tekst** in de CMS-editor/renderer (deze frontend ondersteunt ze al).
6. **Organisatietype `Dentist`** (of `MedicalBusiness`) in de keuzelijst van Site > Navigatie > Organisatie.
   Nu kiest het CMS uit o.a. `LocalBusiness`; de site houdt `Dentist` aan.
7. **Bloktypen per site beperken.** Een redacteur kan elk kernblok plaatsen, ook blokken zonder weergave op
   deze site (die worden overgeslagen). Een instelling "toegestane bloktypen" per site zou dat voorkomen.
