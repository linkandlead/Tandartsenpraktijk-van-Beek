// Blauwdruk van de site Tandarts Van Beek voor het Link & Lead CMS (model A, headless).
//
// Dit bestand is de BRON die met `npm run cms:push` naar het CMS wordt gestuurd. Daarna is het CMS
// leidend: redacteuren wijzigen teksten, beelden en links in /admin, en de frontend haalt bij elke
// build de gepubliceerde versie op via /api/cms/content. Draai cms:push alleen opnieuw als je de
// startinhoud bewust wilt terugzetten (de sync overschrijft de pagina's die hierin staan).
//
// Regels (CMS-handleiding + functioneel ontwerp 2.0):
// - Alleen BESTAANDE kernbloktypen (zie docs/CMS-MAPPING.md). Geen verouderde of Link & Lead-blokken.
// - Sitespecifieke presentatie gaat via 'bouwer-eigen' top-level velden (GOVERNANCE.md): het CMS
//   bewaart die ongemoeid. We gebruiken er alleen deze: `weergave`, `knop`, `knoptekst`, `maximaal`,
//   `keuze_label` op het blok `kaarten`, en `beeldvorm` op `mediatekst`. Geen extra velden binnen
//   lijstitems.
// - Achtergrond per sectie via `bg`: wit=Licht, mist=Zacht, limoenlicht=Accent, diep=Donker, nacht=Diepst.
// - Onbevestigde praktijkgegevens staan als "[te bevestigen: …]" in de tekst en worden in de
//   frontend zichtbaar gemarkeerd. De ontwikkelaar verzint geen praktijkregels (FO §10).

const TEL_SPOED = '085 222 13 88'
const TEL_SPOED_HREF = 'tel:+31852221388'
const TEL_DIENST = '0900 - 1515'
const TEL_PRAKTIJK = '0174 622 373'
const TEL_PRAKTIJK_HREF = 'tel:+31174622373'
const ADRES = 'Groenelaan 128'
const POSTCODE_PLAATS = '2675 RS Honselersdijk'
const TEL_DIENST_HREF = 'tel:09001515'

// --- Gedeelde inhoud (één bron; op elke pagina identiek, FO §6 "Afsluiter — gedeeld") ---
const AFSLUITER = {
  type: 'cta',
  bg: 'diep',
  content: {
    eyebrow: 'Contact',
    titel: 'Heeft u een vraag?',
    tekst: 'Neem gerust contact met ons op. Wij helpen u graag verder.',
    knoptekst: 'Neem contact op',
    knop: '/contact',
    meta: [{ tekst: 'Spoed? Bel tijdens spoeduren ' + TEL_SPOED }],
  },
}

// --- Collectie behandelingen (één lijst; home toont er maximaal 4) ---
const BEHANDELINGEN = [
  { titel: 'Preventie', tekst: 'Voorkomen is beter dan genezen.', beeld: '/img/preventie.webp', beeld_alt: 'Tandheelkundige instrumenten op een blauw behandelblad', link: '/behandelingen/preventie', icoon: 'geen' },
  { titel: 'Vullingen en kronen', tekst: 'Herstel van uw gebit, met oog voor een natuurlijk resultaat.', beeld: '/img/vullingen-en-kronen.webp', beeld_alt: 'Glimlach met een verzorgd gebit', link: '/behandelingen/vullingen-en-kronen', icoon: 'geen' },
  { titel: 'Orthodontie', tekst: 'Voor een gezonde en rechte glimlach.', beeld: '/img/orthodontie.webp', beeld_alt: 'Doorzichtige beugel tussen twee vingers', link: '/behandelingen/orthodontie', icoon: 'geen' },
  { titel: 'Slaapgeneeskunde', tekst: 'Behandeling van snurken en slaapapneu.', beeld: '/img/slaapgeneeskunde.webp', beeld_alt: 'Slapende vrouw met een slaapmasker', link: '/behandelingen/slaapgeneeskunde', icoon: 'geen' },
  { titel: 'Kindertandheelkunde', tekst: 'Rustige, vertrouwde zorg voor de jongste patiënten.', beeld: '', beeld_alt: '', link: '/behandelingen/kindertandheelkunde', icoon: 'geen' },
]

function paginaHeader({ eyebrow, heading, subheading, beeld, alt, cta, hoogte = 'normaal' }) {
  return {
    type: 'header',
    bg: 'diep',
    content: {
      layout: 'split-rechts',
      hoogte,
      eyebrow,
      heading,
      subheading,
      ...(cta ? { cta_primair_label: cta[0], cta_primair_link: cta[1] } : {}),
      media_type: beeld ? 'afbeelding' : 'geen',
      ...(beeld ? { media_afbeelding: beeld, media_alt: alt, overlay: 'geen' } : {}),
      extras: 'geen',
      auto_kruimelpad: 'aan',
    },
  }
}

function behandelDetail({ slug, titel, intro, beeld, alt, uitleg, stappen, faq }) {
  return {
    slug: '/behandelingen/' + slug,
    titel,
    beschrijving: intro,
    page_type: 'detail',
    blokken: [
      paginaHeader({ eyebrow: 'Behandelingen', heading: titel, subheading: intro, beeld, alt, hoogte: 'compact' }),
      { type: 'tekst', bg: 'wit', content: { eyebrow: 'Uitleg', titel: 'Wat houdt het in?', tekst: uitleg } },
      ...(stappen
        ? [{ type: 'reeks', bg: 'mist', content: { _variant: 'genummerd', eyebrow: 'Zo werkt het', titel: 'De behandeling in stappen', intro: 'Het verloop kan per situatie verschillen. Uw tandarts bespreekt vooraf wat voor u van toepassing is.', stappen } }]
        : []),
      ...(faq ? [{ type: 'faq', bg: 'wit', content: { titel: 'Veelgestelde vragen', vragen: faq } }] : []),
      AFSLUITER,
    ],
  }
}

const CONCEPT = '*Concepttekst — de medische inhoud wordt vóór publicatie door de praktijk gecontroleerd.*'

export default {
  // De 12 CMS-kleursleutels (voorstel uit de handoff, afgestemd op de goedgekeurde homepage).
  design_tokens: {
    wit: '#fbfbf8',
    mist: '#e8f0e9',
    limoenlicht: '#f1f5eb',
    diep: '#064b3c',
    nacht: '#073b32',
    limoen: '#dcebd3',
    limoendonker: '#08765a',
    tekst: '#233b36',
    steen: '#5b6c66',
    mistdof: '#c5d6ce',
    fout: '#b6382d',
    foutlicht: '#fff0ed',
  },

  // Merk + navigatie (sites.config.merk). Centraal beheerd; header en footer lezen dit.
  merk: {
    naam: 'Tandarts Van Beek',
    logo: '/img/logo-beeldmerk.svg',
    favicon: '/favicon.svg',
    tagline: 'Persoonlijke tandheelkunde voor het hele gezin in Honselersdijk.',
    contact: {
      bedrijf: 'Tandarts Van Beek',
      telefoon: TEL_PRAKTIJK,
      adres: ADRES,
      postcode_plaats: POSTCODE_PLAATS,
    },
    hoofd_nav: [
      { titel: 'De praktijk', href: '/de-praktijk' },
      { titel: 'Behandelingen', href: '/behandelingen' },
      { titel: 'Nieuwe patiënten', href: '/nieuwe-patienten' },
      { titel: 'Contact', href: '/contact' },
    ],
    primaire_actie: { titel: 'Bel de praktijk', href: TEL_PRAKTIJK_HREF },
    footer_kolommen: [
      { kop: 'Praktijk', links: [
        { titel: 'De praktijk', href: '/de-praktijk' },
        { titel: 'Behandelingen', href: '/behandelingen' },
        { titel: 'Nieuwe patiënten', href: '/nieuwe-patienten' },
        { titel: 'Praktische informatie', href: '/praktische-informatie' },
      ] },
      { kop: 'Direct regelen', links: [
        { titel: 'Afspraak maken of wijzigen', href: '/afspraak-maken-of-wijzigen' },
        { titel: 'Spoed', href: '/spoed' },
        { titel: 'Contact', href: '/contact' },
      ] },
    ],
    juridische_links: [{ titel: 'Privacyverklaring', href: '/privacyverklaring' }],
  },

  // Oude URL's → nieuwe (FO §3.2, T14). Aanvullen met de echte inventarisatie van de huidige site.
  redirects: [
    { van: '/home', naar: '/', status: 301 },
    { van: '/spoedgevallen', naar: '/spoed', status: 301 },
    { van: '/inschrijven', naar: '/nieuwe-patienten', status: 301 },
    { van: '/afspraak', naar: '/afspraak-maken-of-wijzigen', status: 301 },
  ],

  paginas: [
    // ---------------------------------------------------------------- Home
    {
      slug: '/',
      titel: 'Tandarts Van Beek in Honselersdijk',
      beschrijving: 'Persoonlijke tandheelkunde voor het hele gezin in Honselersdijk. Afspraak maken of wijzigen, spoed en informatie voor nieuwe patiënten.',
      page_type: 'home',
      blokken: [
        {
          type: 'header',
          bg: 'wit',
          content: {
            layout: 'split-rechts',
            hoogte: 'normaal',
            eyebrow: 'Tandartsenpraktijk in Honselersdijk',
            heading: 'Persoonlijke tandheelkunde voor het hele gezin',
            subheading: 'Een gezonde mond, een stralende lach en zorg die bij u past.',
            cta_primair_label: 'Afspraak maken of wijzigen',
            cta_primair_link: '/afspraak-maken-of-wijzigen',
            media_type: 'afbeelding',
            media_afbeelding: '/img/hero-medewerker.webp',
            media_alt: 'Glimlachende medewerker van Tandarts Van Beek in de behandelkamer',
            focal_x: 55,
            focal_y: 40,
            overlay: 'geen',
            extras: 'geen',
            auto_kruimelpad: 'uit',
          },
        },
        {
          // Actiebalk: exact drie tekstacties, geen iconen, geen tweede afspraakknop (FO §4.1).
          type: 'kaarten',
          bg: 'mist',
          content: {
            weergave: 'actiebalk',
            titel: 'Snel regelen',
            kolommen: '3',
            items: [
              { titel: 'Spoedgeval', link: '/spoed', icoon: 'geen' },
              { titel: 'Nieuwe patiënt worden', link: '/nieuwe-patienten', icoon: 'geen' },
              { titel: 'Veilig bericht sturen', link: '/contact#bericht', icoon: 'geen' },
            ],
          },
        },
        {
          type: 'mediatekst',
          bg: 'wit',
          content: {
            eyebrow: 'Onze zorg',
            titel: 'Kwalitatieve en betrokken mondzorg',
            alineas: [{ tekst: 'Van preventie tot specialistische behandelingen. Bij Tandarts Van Beek staat een gezonde mond, vertrouwen en duidelijke uitleg centraal.' }],
            beeld: '/img/behandelkamer.webp',
            beeld_alt: 'Lichte behandelkamer met tandartsstoel bij het raam',
            beeldzijde: 'links',
            knop: '/de-praktijk',
            knoptekst: 'Over de praktijk',
          },
        },
        {
          type: 'kaarten',
          bg: 'mist',
          content: {
            weergave: 'collectie',
            eyebrow: 'Onze behandelingen',
            titel: 'Waarmee kunnen we u helpen?',
            kolommen: '4',
            maximaal: 4,
            knop: '/behandelingen',
            knoptekst: 'Alle behandelingen bekijken',
            items: BEHANDELINGEN,
          },
        },
        {
          type: 'mediatekst',
          bg: 'wit',
          content: {
            eyebrow: 'In Honselersdijk',
            titel: 'Een moderne praktijk met een vertrouwd team',
            alineas: [{ tekst: 'Een vertrouwd adres in Honselersdijk, waar kwaliteit, persoonlijke aandacht en een ontspannen sfeer samenkomen.' }],
            beeld: '/img/praktijkgebouw.webp',
            beeld_alt: 'Gevel van de praktijk Tandarts Van Beek met groen ervoor',
            beeldzijde: 'links',
            beeldvorm: 'organisch',
            knop: '/de-praktijk#team',
            knoptekst: 'Maak kennis met ons team',
          },
        },
        {
          // Tekstuele kenmerkenstrook uit de goedgekeurde homepage — zonder iconen en zonder
          // (niet-geverifieerde) waardering.
          type: 'kaarten',
          bg: 'wit',
          content: {
            weergave: 'kenmerken',
            titel: 'Waar wij voor staan',
            kolommen: '3',
            items: [
              { titel: 'Een hecht en ervaren team', icoon: 'geen' },
              { titel: 'Moderne apparatuur', icoon: 'geen' },
              { titel: 'Aandacht voor preventie', icoon: 'geen' },
            ],
          },
        },
        AFSLUITER,
      ],
    },

    // ---------------------------------------------------------------- De praktijk
    {
      slug: '/de-praktijk',
      titel: 'De praktijk',
      beschrijving: 'Maak kennis met Tandarts Van Beek in Honselersdijk: onze visie, werkwijze en ons team.',
      blokken: [
        paginaHeader({
          eyebrow: 'De praktijk',
          heading: 'Een vertrouwd adres voor uw mondzorg',
          subheading: 'Persoonlijke aandacht, heldere uitleg en zorg die past bij u en uw gezin.',
          beeld: '/img/praktijkgebouw.webp',
          alt: 'Gevel van de praktijk Tandarts Van Beek',
        }),
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            eyebrow: 'Geschiedenis en visie',
            titel: 'Onze visie',
            tekst: 'Wij geloven in persoonlijke aandacht, duidelijke communicatie en mondzorg van hoge kwaliteit. Samen met u kijken we naar een passende behandeling, afgestemd op uw wensen en situatie.\n\n[te bevestigen: korte geschiedenis van de praktijk, aan te leveren door de praktijk]',
          },
        },
        {
          type: 'kaarten',
          bg: 'mist',
          content: {
            eyebrow: 'Werkwijze',
            titel: 'Zo werken wij',
            kolommen: '3',
            items: [
              { titel: 'Preventie eerst', tekst: 'Regelmatige controle en goede uitleg helpen problemen te voorkomen.', icoon: 'geen' },
              { titel: 'Heldere uitleg', tekst: 'U weet vooraf wat een behandeling inhoudt en welke keuzes er zijn.', icoon: 'geen' },
              { titel: 'Zorg op maat', tekst: 'Wij stemmen de behandeling af op uw situatie, voor jong en oud.', icoon: 'geen' },
            ],
          },
        },
        {
          type: 'mediatekst',
          bg: 'wit',
          content: {
            eyebrow: 'De behandelkamer',
            titel: 'Rust, licht en moderne apparatuur',
            alineas: [{ tekst: 'Onze behandelkamers zijn licht en rustig ingericht, zodat u zich op uw gemak voelt tijdens de behandeling.' }],
            beeld: '/img/behandelkamer.webp',
            beeld_alt: 'Behandelkamer met tandartsstoel',
            beeldzijde: 'links',
          },
        },
        {
          // Live collectie uit het CMS (tabel teamleden). Alleen gepubliceerde medewerkers; zolang de
          // praktijk geen teamleden heeft aangeleverd toont de frontend een nette lege stand.
          type: 'mensen',
          bg: 'mist',
          content: { titel: 'Ons team', intro: 'Maak kennis met de mensen achter de praktijk.', maximaal: 12 },
        },
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            eyebrow: 'Kwaliteit',
            titel: 'Kwaliteit en registraties',
            tekst: 'Tandarts Van Beek is aangesloten bij de KNMT, de Koninklijke Nederlandse Maatschappij tot bevordering der Tandheelkunde.\n\n[te bevestigen: BIG-registraties en klachtenregeling]',
          },
        },
        AFSLUITER,
      ],
    },

    // ---------------------------------------------------------------- Behandelingen
    {
      slug: '/behandelingen',
      titel: 'Behandelingen',
      beschrijving: 'Overzicht van de tandheelkundige behandelingen bij Tandarts Van Beek in Honselersdijk.',
      blokken: [
        paginaHeader({
          eyebrow: 'Behandelingen',
          heading: 'Onze tandheelkundige behandelingen',
          subheading: 'Complete en persoonlijke mondzorg voor jong en oud.',
          beeld: '/img/preventie.webp',
          alt: 'Tandheelkundige instrumenten op een behandelblad',
        }),
        {
          type: 'kaarten',
          bg: 'wit',
          content: { weergave: 'collectie', eyebrow: 'Overzicht', titel: 'Alle behandelingen', kolommen: '3', items: BEHANDELINGEN },
        },
        {
          type: 'mediatekst',
          bg: 'mist',
          content: {
            eyebrow: 'Persoonlijke zorg',
            titel: 'Altijd eerst een goed gesprek',
            alineas: [{ tekst: 'Voor elke behandeling bespreken we uw situatie, de mogelijkheden en wat u kunt verwachten. Zo kiest u samen met ons wat bij u past.' }],
            beeld: '/img/behandelkamer.webp',
            beeld_alt: 'Behandelkamer met tandartsstoel',
            beeldzijde: 'links',
            knop: '/contact',
            knoptekst: 'Stel uw vraag',
          },
        },
        {
          type: 'faq',
          bg: 'wit',
          content: {
            titel: 'Veelgestelde vragen',
            vragen: [
              { vraag: 'Hoe vaak moet ik op controle komen?', antwoord: 'Dat verschilt per persoon. Uw tandarts adviseert u over de controlefrequentie die bij uw mondgezondheid past.' },
              { vraag: 'Worden behandelingen vergoed?', antwoord: 'Dat hangt af van uw zorgverzekering en de behandeling. Controleer uw polis of vraag ons om een begroting.' },
              { vraag: 'Wat moet ik doen bij kiespijn?', antwoord: 'Bel ons tijdens de spoeduren. Buiten openingstijden kunt u terecht bij de tandartsendienst. Zie de pagina [Spoed](/spoed).' },
            ],
          },
        },
        AFSLUITER,
      ],
    },

    behandelDetail({
      slug: 'preventie',
      titel: 'Preventie',
      intro: 'Voorkomen is beter dan genezen. Met regelmatige controle en goede uitleg houden we uw gebit gezond.',
      beeld: '/img/preventie.webp',
      alt: 'Tandheelkundige instrumenten op een behandelblad',
      uitleg: 'Bij preventie draait het om het voorkomen van gaatjes, tandvleesproblemen en slijtage. Tijdens een controle kijken we naar uw tanden, kiezen en tandvlees en geven we advies over poetsen en ragen.\n\n- Periodieke controle\n- Gebitsreiniging en verwijderen van tandsteen\n- Advies over mondverzorging thuis\n\n' + CONCEPT,
      stappen: [
        { nummer: '1', titel: 'Controle', tekst: 'We bekijken uw gebit en tandvlees.' },
        { nummer: '2', titel: 'Reiniging', tekst: 'Indien nodig verwijderen we tandsteen en aanslag.' },
        { nummer: '3', titel: 'Advies', tekst: 'U krijgt persoonlijk advies voor de verzorging thuis.' },
      ],
      faq: [
        { vraag: 'Hoe lang duurt een controle?', antwoord: '[te bevestigen: gebruikelijke duur van een controleafspraak]' },
        { vraag: 'Moet ik iets voorbereiden?', antwoord: 'Neem uw legitimatie en verzekeringsgegevens mee als er iets is veranderd.' },
      ],
    }),
    behandelDetail({
      slug: 'vullingen-en-kronen',
      titel: 'Vullingen en kronen',
      intro: 'Herstel van uw gebit, met oog voor een natuurlijk resultaat.',
      beeld: '/img/vullingen-en-kronen.webp',
      alt: 'Glimlach met een verzorgd gebit',
      uitleg: 'Een gaatje of beschadigde tand herstellen we met een vulling. Is er meer nodig, dan kan een kroon of brug de functie en het uiterlijk van uw gebit herstellen.\n\n' + CONCEPT,
    }),
    behandelDetail({
      slug: 'orthodontie',
      titel: 'Orthodontie',
      intro: 'Voor een gezonde en rechte glimlach.',
      beeld: '/img/orthodontie.webp',
      alt: 'Doorzichtige beugel tussen twee vingers',
      uitleg: 'Orthodontie corrigeert de stand van tanden en kiezen. We bespreken met u welke mogelijkheden er zijn en of een verwijzing nodig is.\n\n' + CONCEPT,
    }),
    behandelDetail({
      slug: 'slaapgeneeskunde',
      titel: 'Slaapgeneeskunde',
      intro: 'Behandeling van snurken en slaapapneu met een op maat gemaakte beugel.',
      beeld: '/img/slaapgeneeskunde.webp',
      alt: 'Slapende vrouw',
      uitleg: 'Snurken of slaapapneu kan uw nachtrust en gezondheid flink beïnvloeden. Een snurk- of apneubeugel (MRA) kan helpen. Voor een snurkbeugel of apneubeugel is er geen wachtlijst, ook niet als u nog geen patiënt bij ons bent.\n\n[Meld u aan via het formulier](/contact#bericht)\n\n' + CONCEPT,
      stappen: [
        { nummer: '1', titel: 'Verwijzing', tekst: '[te bevestigen: verwijzing via huisarts, KNO-arts of slaapcentrum]' },
        { nummer: '2', titel: 'Intake', tekst: 'We onderzoeken uw gebit en bespreken de mogelijkheden.' },
        { nummer: '3', titel: 'Beugel op maat', tekst: 'Uw beugel wordt gemaakt, geplaatst en gecontroleerd.' },
      ],
    }),
    behandelDetail({
      slug: 'kindertandheelkunde',
      titel: 'Kindertandheelkunde',
      intro: 'Rustige, vertrouwde zorg voor de jongste patiënten.',
      uitleg: 'Een goede start begint jong. We nemen de tijd om kinderen op hun gemak te stellen en geven ouders praktisch advies over poetsen en voeding.\n\n' + CONCEPT,
    }),

    // ---------------------------------------------------------------- Nieuwe patiënten
    {
      slug: '/nieuwe-patienten',
      titel: 'Nieuwe patiënten',
      beschrijving: 'Lees het inschrijfbeleid van Tandarts Van Beek en zie welke aanmeldroute voor uw situatie geldt.',
      blokken: [
        paginaHeader({
          eyebrow: 'Nieuwe patiënten',
          heading: 'Inschrijven bij Tandarts Van Beek',
          subheading: 'Lees eerst ons inschrijfbeleid en kies daarna uw situatie. U ziet dan direct wat voor u van toepassing is.',
          hoogte: 'compact',
        }),
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            eyebrow: 'Inschrijfbeleid',
            titel: 'Ons huidige beleid',
            tekst: 'Wij zijn op dit moment gesloten voor nieuwe patiënten boven de 12 jaar. Kinderen van 0 tot en met 12 jaar kunnen nog wel ingeschreven worden.\n\nPartners en kinderen van patiënten die al bij ons onder behandeling zijn, kunnen zich op de wachtlijst laten zetten.\n\nVoor een snurkbeugel of apneubeugel is er géén wachtlijst: u kunt zich direct aanmelden.',
            bijgewerkt: '2026-11-11',
          },
        },
        {
          // Patiëntkeuzehulp: de regels staan als CMS-inhoud (per situatie), niet in de frontend.
          type: 'kaarten',
          bg: 'mist',
          content: {
            weergave: 'keuzehulp',
            eyebrow: 'Keuzehulp',
            titel: 'Wat is uw situatie?',
            keuze_label: 'Kies uw situatie',
            kolommen: '4',
            items: [
              { titel: 'Kind van 0 t/m 12 jaar', tekst: 'Kinderen van 0 tot en met 12 jaar kunnen nog worden ingeschreven. Vul het formulier in met als onderwerp *Inschrijven*, of bel de praktijk. Wij nemen daarna contact met u op.', link: '/contact#bericht', knoptekst: 'Kind aanmelden', icoon: 'geen' },
              { titel: 'Nieuwe patiënt ouder dan 12 jaar', tekst: 'Wij zijn op dit moment gesloten voor nieuwe patiënten boven de 12 jaar en kunnen u helaas niet inschrijven. Bent u partner of kind van een patiënt die al bij ons onder behandeling is? Dan kunt u op de wachtlijst.', icoon: 'geen' },
              { titel: 'Partner of kind van een bestaande patiënt', tekst: 'Partners en kinderen van patiënten die al bij ons onder behandeling zijn, kunnen zich op de wachtlijst laten zetten. Vul het formulier in met als onderwerp *Wachtlijst*.', link: '/contact#bericht', knoptekst: 'Op de wachtlijst', icoon: 'geen' },
              { titel: 'Snurkbeugel of apneubeugel', tekst: 'Voor een snurkbeugel of apneubeugel is er geen wachtlijst, ook niet als u nog geen patiënt bij ons bent. Vul het formulier in met als onderwerp *Snurk- of apneubeugel*; wij nemen daarna contact met u op.', link: '/contact#bericht', knoptekst: 'Aanmelden', icoon: 'geen' },
            ],
          },
        },
        {
          type: 'faq',
          bg: 'wit',
          content: {
            titel: 'Vragen over inschrijven',
            vragen: [
              { vraag: 'Is er een wachtlijst?', antwoord: 'Alleen voor partners en kinderen van patiënten die al bij ons onder behandeling zijn. Voor een snurk- of apneubeugel is er geen wachtlijst.' },
              { vraag: 'Wat neem ik mee naar de eerste afspraak?', antwoord: 'Een geldig legitimatiebewijs en uw verzekeringsgegevens. Voor kinderen het BSN van uw kind.' },
            ],
          },
        },
        AFSLUITER,
      ],
    },

    // ---------------------------------------------------------------- Afspraken
    {
      slug: '/afspraak-maken-of-wijzigen',
      titel: 'Afspraak maken of wijzigen',
      beschrijving: 'Zo maakt, wijzigt of annuleert u een afspraak bij Tandarts Van Beek.',
      blokken: [
        paginaHeader({
          eyebrow: 'Afspraken',
          heading: 'Afspraak maken of wijzigen',
          subheading: 'Kies wat u wilt regelen. U ziet direct de juiste werkwijze.',
          hoogte: 'compact',
        }),
        {
          type: 'kaarten',
          bg: 'wit',
          content: {
            weergave: 'keuzehulp',
            eyebrow: 'Keuzehulp',
            titel: 'Wat wilt u regelen?',
            keuze_label: 'Kies wat u wilt regelen',
            kolommen: '4',
            items: [
              { titel: 'Controleafspraak maken', tekst: 'U kunt uw controleafspraak online maken. Wanneer het tijd is voor de halfjaarlijkse controle, krijgt u hiervoor een link per e-mail toegestuurd. Geen e-mail ontvangen? Bel de praktijk.', link: TEL_PRAKTIJK_HREF, knoptekst: 'Bel de praktijk', icoon: 'geen' },
              { titel: 'Afspraak wijzigen', tekst: 'Wilt u een afspraak verzetten? Bel de praktijk, dan zoeken we samen een nieuw moment.', link: TEL_PRAKTIJK_HREF, knoptekst: 'Bel de praktijk', icoon: 'geen' },
              { titel: 'Afspraak afzeggen', tekst: 'Afzeggen doet u telefonisch via ' + TEL_PRAKTIJK + '. Wilt u buiten de gewone afspraaktijden (8.50 tot 12.00 uur) een afspraak op korte termijn afzeggen? Bel dan [' + TEL_SPOED + '](' + TEL_SPOED_HREF + ').\n\n[te bevestigen: annuleringstermijn en eventuele kosten bij niet tijdig afzeggen]', link: TEL_PRAKTIJK_HREF, knoptekst: 'Bel de praktijk', icoon: 'geen' },
              { titel: 'Andere afspraak', tekst: 'Voor alle overige afspraken, zoals een behandeling of consult, plant u telefonisch in.', link: TEL_PRAKTIJK_HREF, knoptekst: 'Bel de praktijk', icoon: 'geen' },
            ],
          },
        },
        {
          type: 'tekst',
          bg: 'mist',
          content: {
            eyebrow: 'Goed om te weten',
            titel: 'Geen online agenda',
            tekst: 'Wij werken niet met een algemene online agenda. Zo kunnen we iedere afspraak goed afstemmen op de behandeling die u nodig heeft.\n\nHeeft u pijn of een ongeluk gehad? Ga dan direct naar [Spoed](/spoed).',
          },
        },
        AFSLUITER,
      ],
    },

    // ---------------------------------------------------------------- Spoed
    {
      slug: '/spoed',
      titel: 'Spoed',
      beschrijving: 'Spoedeisende tandheelkundige hulp bij Tandarts Van Beek: telefoonnummers en bereikbaarheid, ook buiten openingstijden.',
      blokken: [
        paginaHeader({
          eyebrow: 'Spoed',
          heading: 'Direct hulp bij spoed',
          subheading: 'Ongeval of acute klachten? Maandag t/m donderdag 8.50 tot 17.00 uur en vrijdag tot 12.00 uur belt u ons. Daarna, in het weekend en op feestdagen belt u Dental 365.',
          cta: ['Bel ' + TEL_SPOED, TEL_SPOED_HREF],
          hoogte: 'compact',
        }),
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            eyebrow: 'Wat te doen',
            titel: 'Zo handelt u bij spoed',
            tekst: '- Ongeval of acute klachten op maandag t/m donderdag van 8.50 tot 17.00 uur en op vrijdag tot 12.00 uur: bel [' + TEL_SPOED + '](' + TEL_SPOED_HREF + ').\n- Vanaf 17.00 uur op werkdagen en in het weekend en op feestdagen: bel Dental 365 op [' + TEL_DIENST + '](' + TEL_DIENST_HREF + ').\n- Bereikt u ons niet op ' + TEL_SPOED + '? Bel dan ' + TEL_PRAKTIJK + ' en luister de tekst op het antwoordapparaat helemaal af: daar hoort u wanneer de dienstdoende of waarnemende tandarts bereikbaar is.\n- Bij ernstig letsel aan het gezicht of hevige zwelling met koorts: bel 112.\n\nBeschrijf uw klachten aan de telefoon. Wij beoordelen samen met u hoe snel u gezien moet worden.',
          },
        },
        {
          type: 'feiten',
          bg: 'limoenlicht',
          content: {
            titel: 'Telefoonnummers en bereikbaarheid',
            intro: 'Beide routes zijn altijd zichtbaar. Kies het nummer dat past bij het moment.',
            feiten: [
              { label: 'Tijdens spoeduren', waarde: TEL_SPOED },
              { label: 'Spoeduren', waarde: 'Maandag t/m donderdag 8.50 tot 17.00 uur, vrijdag 8.50 tot 12.00 uur' },
              { label: 'Na 17.00 uur, weekend en feestdagen (Dental 365)', waarde: TEL_DIENST },
            ],
          },
        },
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            eyebrow: 'Buiten openingstijden',
            titel: 'Wat is een spoedgeval?',
            tekst: 'Bijvoorbeeld hevige pijn die niet overgaat met pijnstillers, een flinke zwelling, een nabloeding of een afgebroken of uitgeslagen tand na een ongeluk. Twijfelt u? Bel dan gerust: wij of de dienstdoende tandarts denken met u mee. Deze informatie is geen medische diagnose.',
          },
        },
        {
          type: 'faq',
          bg: 'mist',
          content: {
            titel: 'Vragen over spoed',
            vragen: [
              { vraag: 'Wat doe ik met een uitgeslagen tand?', antwoord: 'Pak de tand vast aan de kroon, niet aan de wortel. Bewaar hem in melk of in de mond (wangzak) en bel direct.' },
              { vraag: 'Wordt spoedhulp vergoed?', antwoord: 'Dat hangt af van uw zorgverzekering. De dienstdoende tandarts kan kosten in rekening brengen.' },
            ],
          },
        },
      ],
    },

    // ---------------------------------------------------------------- Contact
    {
      slug: '/contact',
      titel: 'Contact',
      beschrijving: 'Contactgegevens, openingstijden en route van Tandarts Van Beek in Honselersdijk. Stuur ons veilig een bericht.',
      blokken: [
        paginaHeader({
          eyebrow: 'Contact',
          heading: 'Contact en bereikbaarheid',
          subheading: 'Bel ons, kom langs of stuur een bericht. Wij helpen u graag verder.',
          beeld: '/img/praktijkgebouw.webp',
          alt: 'Gevel van de praktijk Tandarts Van Beek',
          hoogte: 'compact',
        }),
        {
          type: 'feiten',
          bg: 'wit',
          content: {
            titel: 'Contactgegevens',
            feiten: [
              { label: 'Praktijk', waarde: 'Tandarts Van Beek' },
              { label: 'Adres', waarde: ADRES + ', ' + POSTCODE_PLAATS },
              { label: 'Telefoon', waarde: TEL_PRAKTIJK },
              { label: 'Spoed (ongeval)', waarde: TEL_SPOED },
              { label: 'Telefonisch bereikbaar', waarde: '[te bevestigen: tijden]' },
            ],
          },
        },
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            eyebrow: 'Bereikbaarheid',
            titel: 'Steeds in gesprek?',
            tekst: 'Zijn wij ’s morgens steeds telefonisch in gesprek? Dat is vervelend; het is dan erg druk. Als u het [contactformulier](#bericht) invult, nemen wij zo spoedig mogelijk contact met u op zodra het wat rustiger is.',
          },
        },
        {
          type: 'feiten',
          bg: 'mist',
          content: {
            titel: 'Openingstijden',
            intro: 'Op feestdagen kunnen afwijkende tijden gelden.',
            feiten: [
              { label: 'Maandag', waarde: '[te bevestigen]' },
              { label: 'Dinsdag', waarde: '[te bevestigen]' },
              { label: 'Woensdag', waarde: '[te bevestigen]' },
              { label: 'Donderdag', waarde: '[te bevestigen]' },
              { label: 'Vrijdag', waarde: '[te bevestigen]' },
              { label: 'Zaterdag en zondag', waarde: 'Gesloten' },
            ],
          },
        },
        {
          type: 'kaart',
          bg: 'wit',
          content: {
            eyebrow: 'Route',
            titel: 'Zo vindt u ons',
            intro: 'Parkeren: [te bevestigen: parkeergelegenheid bij de praktijk].',
            adres: ADRES + '\n' + POSTCODE_PLAATS,
            telefoon: TEL_PRAKTIJK,
            knoptekst: 'Route plannen',
            knop: 'https://www.google.com/maps/search/?api=1&query=Groenelaan+128+2675+RS+Honselersdijk',
          },
        },
        {
          type: 'formulier_bouwer',
          bg: 'mist',
          content: {
            eyebrow: 'Bericht',
            titel: 'Stuur ons een bericht',
            intro: 'Voor algemene vragen. Deel via dit formulier geen medische informatie; die bespreken we telefonisch of via een beveiligde route.',
            velden: [
              { label: 'Voornaam', type: 'tekst', verplicht: 'ja' },
              { label: 'Achternaam', type: 'tekst', verplicht: 'ja' },
              { label: 'Telefoon', type: 'telefoon', verplicht: 'nee' },
              { label: 'Onderwerp', type: 'keuze', opties: 'Algemene vraag,Afspraak,Inschrijven,Wachtlijst,Snurk- of apneubeugel,Factuur,Anders', verplicht: 'ja' },
              { label: 'Bericht', type: 'tekstvak', verplicht: 'ja' },
            ],
            knoptekst: 'Controleren en versturen',
            bevestigingstekst: 'Bedankt voor uw bericht. Wij nemen zo snel mogelijk contact met u op.',
            voetnoot: 'Wij gebruiken uw gegevens alleen om uw vraag te beantwoorden. Lees onze privacyverklaring.',
          },
        },
        AFSLUITER,
      ],
    },

    // ---------------------------------------------------------------- Praktisch / juridisch
    {
      slug: '/praktische-informatie',
      titel: 'Praktische informatie',
      beschrijving: 'Praktische informatie over uw bezoek aan Tandarts Van Beek.',
      blokken: [
        paginaHeader({ eyebrow: 'Praktisch', heading: 'Praktische informatie', subheading: 'Alles wat u moet weten voor uw bezoek.', hoogte: 'compact' }),
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            titel: 'Uw bezoek',
            tekst: '[te bevestigen: tarieven, betalen en declareren, verzekeringen, klachtenregeling en toegankelijkheid van de praktijk]',
            bijgewerkt: '2026-11-11',
          },
        },
        AFSLUITER,
      ],
    },
    {
      slug: '/privacyverklaring',
      titel: 'Privacyverklaring',
      beschrijving: 'Hoe Tandarts Van Beek omgaat met uw persoonsgegevens.',
      blokken: [
        paginaHeader({ eyebrow: 'Juridisch', heading: 'Privacyverklaring', subheading: 'Hoe wij omgaan met uw persoonsgegevens.', hoogte: 'compact' }),
        {
          type: 'tekst',
          bg: 'wit',
          content: {
            titel: 'Privacyverklaring',
            tekst: '[te bevestigen: definitieve privacyverklaring, bewaartermijnen en verwerkers, aan te leveren door de praktijk]\n\nDeze website plaatst geen trackingcookies. Bezoekersstatistieken worden cookieloos en zonder persoonsgegevens gemeten.',
            bijgewerkt: '2026-11-11',
          },
        },
      ],
    },
  ],
}
