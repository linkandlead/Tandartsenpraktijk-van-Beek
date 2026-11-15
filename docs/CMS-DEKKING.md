# CMS-dekking — wat komt uit Link & Lead One en wat staat in de code

Stand 15-11-2026, branch `claude/cms-volledig` (op `main` 8d5ba98, lees-API v1). Site in het CMS:
**Tandarts Van Beek** (`51943d8c-718c-4000-b599-6339d790883f`, status live, 15 pagina's).

**Zo werkt de verversing:** de site rendert elke pagina in een Vercel-functie met de actuele inhoud uit het
CMS (30 s in het geheugen, CDN `s-maxage=60`). Een gepubliceerde wijziging staat dus binnen ± 1–2 minuten
op de site, **zonder** nieuwe deploy. De build maakt alleen een momentopname (`inhoud.json`) als terugval bij
een CMS-storing; de deploy-hook (README) houdt die terugval actueel.

Legenda: **CMS** = volledig beheerbaar · **CMS (nieuw)** = in deze branch gekoppeld, met de oude tekst als
standaard · **deels** = zie toelichting · **code** = bewust in de code (vormgeving/techniek).

## Per onderdeel

| Onderdeel | Bron | Waar in het CMS | Toelichting |
|---|---|---|---|
| Pagina's (adres, titel, volgorde) | CMS | Pagina's | `/api/v1/paginas?inhoud=1`; nieuwe pagina's verschijnen vanzelf (ook in de sitemap) |
| Blokken en teksten op pagina's | CMS | Pagina-editor | 12 bloktypen met een weergave (zie `CMS-MAPPING.md`); andere bloktypen worden overgeslagen (zie onder) |
| Beelden in blokken | CMS | Pagina-editor / Media | elk https-adres of `/img/…`; de bestanden in `public/img` zijn de startbeelden |
| Hoofdmenu, footerkolommen, juridische links, actieknop | CMS | Site > Navigatie | `site.navigatie` |
| Logo, favicon, merknaam, tagline, contact (adres, tel., e-mail) | CMS | Site > Navigatie / Merk | `site.merk` |
| Slogan (vóór ©) en socials in de footer | CMS (nieuw) | Site > Navigatie / Merk | verschijnen alleen als ze zijn ingevuld; nu leeg, dus geen zichtbare wijziging |
| "Spoed"-link in de kop en het spoedblok in de footer | CMS (nieuw) | Site > Teksten | `spoed.label`, `spoed.link`, `voet.spoed_kop`, `voet.spoed_tekst`, `voet.spoed_knop` |
| Skiplink, "Menu", kruimelpad "Home" | CMS (nieuw) | Site > Teksten | `algemeen.skiplink`, `kop.menu`, `kop.menu_label`, `algemeen.kruimelpad_home` |
| Team | CMS | Collectie Teamleden | blok `mensen`, gepubliceerde records; lege stand: `team.leeg` (nieuw) |
| FAQ | CMS | blok `faq` per pagina | |
| Openingstijden | CMS | blok `feiten` op /contact | de tijden zelf staan nog als [te bevestigen] in de inhoud |
| Behandelingen (overzicht + detail) | CMS | blokken `kaarten` (weergave collectie) + detailpagina's | de lijst staat op home én /behandelingen apart: twee keer bijwerken (of een gedeeld blok maken) |
| Keuzehulp (nieuwe patiënten, afspraken) | CMS | blok `kaarten`, weergave keuzehulp | de situaties en routes zijn inhoud; standaardlabel `keuzehulp.kies` (nieuw) |
| Formulier: velden, titel, knop, bevestiging, voetnoot | CMS | blok `formulier_bouwer` | |
| Formulier: e-mailveld, akkoordregel, stappen, foutmeldingen bij verzenden | CMS (nieuw) | Site > Teksten | `formulier.*` (12 sleutels); de akkoordregel mag een link bevatten (`[tekst](/pad)`) |
| Formulier: validatiemeldingen per veld | code | — | generieke meldingen in `src/site.js` ("Vul … in."); bewust niet per site |
| Lege standen (collectie, artikelen), "Laatst bijgewerkt" | CMS (nieuw) | Site > Teksten | `collectie.leeg`, `artikelen.leeg`, `tekstblok.bijgewerkt` |
| Artikelen (overzicht, detail, blok) | CMS | Collectie Artikelen | kop van `/artikelen`: `artikelen.overzicht_*` (nieuw); of maak een CMS-pagina `/artikelen` |
| 404-pagina | CMS (nieuw) | Site > Teksten | `fout404.*` |
| SEO per pagina (titel, omschrijving, canonical, noindex, deelbeeld) | CMS | Pagina-instellingen > Zoekmachines | was al gekoppeld via `pagina.seo` |
| Standaard-SEO (titelachtervoegsel, omschrijving, deelbeeld, noindex, Search Console/Bing) | CMS (nieuw) | Site > Navigatie > Standaard-SEO | zonder achtervoegsel blijft het `Titel \| Tandarts Van Beek` |
| JSON-LD van de praktijk (homepage) | CMS (nieuw) | Site > Navigatie > Organisatie | adres, telefoon, e-mail, openingstijden, juridische naam; leeg = de contactgegevens (zoals voorheen). Type blijft `Dentist` |
| JSON-LD artikelen | CMS | Collectie Artikelen | |
| Redirects | CMS | Beheer > Redirects + Site-instellingen | direct actief (geen deploy nodig) |
| Sitemap | CMS | — | volgt de gepubliceerde pagina's en artikelen; pagina's met noindex/canonical/redirect vallen eruit |
| robots.txt | code | — | vast (Allow + sitemap). Standaard-SEO noindex zet `noindex` in elke pagina, niet in robots.txt |
| Huisstijlkleuren (12 sleutels) | CMS (nieuw) | Site > Huisstijl (`design_tokens`) | als `--cms-*` over `styles.css` heen; alleen geldige hexkleuren. Zie aandachtspunt onder |
| Lettertypen, maten, layout, organische vormen | code | — | vormgeving (`src/styles.css`) |
| Bezoekersstatistieken (`meet.js`) | CMS | Cookies en bezoekersmeting | cookieloos; staat meten op **uit**, dan laadt de site `meet.js` niet meer (nieuw) |
| Google Analytics, Calendly, Salesfeed, cookiemelding (Integraties) | niet | — | niet in `/api/v1/site` (zie `CMS-VERZOEKEN.md`); GA vraagt bovendien een cookiebanner en een ruimere CSP, terwijl de privacyverklaring "geen trackingcookies" belooft |
| Pop-ups | niet | — | `site.popups` wordt geleverd maar heeft nog geen weergave (vormgeving nodig) |
| Leads | CMS | Leads | `cms-client.js` → `/api/cms/lead` met site-id, honeypot en tijdmeting |
| Voorbeeld op de site | CMS | editor | `/__voorvertoning`; mag alleen door het CMS in een frame (B-110) |
| Beveiligingsheaders (CSP, HSTS, …) | code | — | `scripts/lib/beveiliging.mjs` |

## Bloktypen zonder weergave
De site toont 12 bloktypen: `header`, `tekst`, `mediatekst`, `kaarten`, `faq`, `reeks`, `feiten`, `kaart`,
`formulier_bouwer`, `mensen`, `cta`, `artikelen_grid`. Een ander kernblok dat een redacteur plaatst (bv.
`bewijsstrook` of `formulier` op `/test-landingspagina`) wordt overgeslagen en in de log gemeld. Een weergave
erbij is vormgevingswerk in deze repo, geen CMS-wijziging.

## Bouwer-eigen velden (niet in de editor)
`kaarten.weergave` / `knop` / `knoptekst` / `maximaal` / `keuze_label` en `mediatekst.beeldvorm` staan in de
blokinhoud maar niet in het formulier van de editor. Het CMS kan per site een keuzeveld "Variant" op een
kernblok zetten (`kernvarianten`, via blokken:sync); daarvoor moet de site `inhoud.variant` gaan lezen. Zie
`CMS-VERZOEKEN.md`.

## Site > Teksten: de sleutels
De 35 sleutels en hun standaardtekst staan in `scripts/lib/teksten.mjs`; `cms/teksten.json` meldt ze aan
(blokken:sync), zodat Site > Teksten laat zien welke er nog leeg zijn. Zonder aanmelding kan een redacteur
een sleutel ook zelf toevoegen ("Nieuwe plek"). Een lege tekst = de standaard.

## Wat het CMS nu levert vergeleken met de blauwdruk (15-11-2026)
Gelezen uit de HTML van de live site (geen token gebruikt) en vergeleken met de offline render van
`tests/fixtures/blauwdruk.mjs` (tekst, achtergrond, beelden en links per blok, plus titel, omschrijving,
og-beeld, robots, menu, footer en JSON-LD):

- **13 pagina's gelijk aan de blauwdruk:** /de-praktijk, /behandelingen en de 5 detailpagina's,
  /nieuwe-patienten, /afspraak-maken-of-wijzigen, /spoed, /contact, /praktische-informatie, /privacyverklaring.
  Menu, footer, JSON-LD en de 4 redirects zijn gelijk.
- **Homepage `/` is in het CMS aangepast — niet overschrijven:**
  - kop: "**Gewoon** tandheelkunde voor het hele gezin" (blauwdruk: "Persoonlijke tandheelkunde …");
  - actiebalk: intro "Bekijk hier wat je snel kunt regelen" toegevoegd;
  - blok `artikelen_grid` toegevoegd onderaan ("Onze laatste nieuws" / "Lees hier alles over ons").
  Ter beoordeling door de eigenaar: de kop en "Onze laatste nieuws" lijken proefwijzigingen, en "je" wijkt af
  van de u-vorm van de rest van de site.
- **Extra pagina `/test-landingspagina`** (niet in de blauwdruk): sjablooninhoud ("De belofte van uw aanbod in
  één zin", "Voordeel één"), publiek en in de sitemap, zonder omschrijving.
- **Artikelen:** 14 gepubliceerd, waaronder testinhoud (`/artikelen/test`, `/artikelen/nog-een-artikel`, rubriek
  "Test-rubriek").
- Niet te zien in de HTML (werd tot nu toe niet getoond): Site > Teksten, Standaard-SEO, Organisatie,
  consent en de huisstijlkleuren. Controleer die vóór de deploy van deze branch (zie README).
