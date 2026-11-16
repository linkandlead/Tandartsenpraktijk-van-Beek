// Overgenomen uit @linkandlead/site-kit 1.21.0 (CMS B-115 en B-127): linkandlead/linkandlead-cms
// packages/site-kit/src/voorvertoningklikken.ts, met de TypeScript-typen weggelaten (tsc transpileModule) en verder
// ongewijzigd. Deze site heeft geen dependencies (en dus de kit niet); bij een nieuwe kitversie deze helpers opnieuw
// overnemen. Daaronder twee kleine hulpjes van deze site: de attributen als HTML-tekst, en het script voor de pagina.
//
// Velden zonder handwerk (vanaf 1.21, B-127): geef `velden` mee (uit `voorvertoningVelden(pagina.blokken)`) en zet
// alleen `data-cms-sectie` op elke sectie. In de browser krijgt binnen elke sectie het eerste element zonder
// kind-elementen waarvan de tekst precies gelijk is aan een tekstveld, vanzelf `data-cms-veld`. Links openen in het
// editorvenster nooit een andere pagina (die mag daar niet in een frame staan).
//
// Klik-om-te-bewerken in de pagina-editor (vanaf 1.20, B-115; opt-in). De editor van het CMS toont het ontwerp van de
// site in een iframe op /__voorvertoning?…&ingesloten=1 (B-110). Met deze helper kiest een klik in dat iframe het blok
// (en, als dat eenduidig is, het veld) in de editor, net als in de standaardopmaak.
//
// Markeer in de voorvertoning de onderdelen met dezelfde attributen als de gedeelde renderer van het CMS:
//   - de sectie: `data-cms-sectie="<blok.id>"` (of `data-sectie`, zoals de renderer), met `blok.id` uit de lees-API;
//   - een veld daarbinnen: `data-cms-veld="titel"` of `data-cms-veld="items.0.titel"` (het pad in `blok.inhoud`).
// `klikAttributen(blok.id, ['titel'])` geeft die attributen. Zet ze alleen in de voorvertoning, niet voor bezoekers.
//
// Roep `voorvertoningKlikken({ cmsUrl: CMS_URL })` in de browser aan (bv. in een useEffect van de voorvertoning). Hij
// doet alleen iets als de pagina in een iframe staat én in de editor is ingesloten (`?ingesloten=1` in het adres, of
// `ingesloten: true` als de site het token uit het adres haalt en doorverwijst). Een klik op een gemarkeerd onderdeel
// opent dan geen link, maar stuurt via postMessage, alleen naar de origin van het CMS (nooit '*'), hetzelfde bericht als
// de standaardopmaak: `{ bron: 'cms-voorbeeld', soort: 'kies', sectieId, pad, item: null, typbaar: false }`.
// Het CMS accepteert het alleen van de origin van de voorvertoning van de actieve website en controleert elk bericht.
// Geeft een functie terug die de luisteraar weer weghaalt. Geen tokens, geen gegevens van de pagina in het bericht.
//
// Typen in het echte ontwerp (vanaf 1.21, B-127): is het aangeklikte veld een element met alleen platte tekst (geen
// kind-elementen), dan staat in het bericht `typbaar: true`. De editor beslist of er getypt mag worden en antwoordt dan
// met `{ bron: 'cms-editor', soort: 'selectie', geselecteerd, pad, typen }` (typen > 0). Dan wordt dat element
// bewerkbaar en gaat elke wijziging als `{ bron: 'cms-voorbeeld', soort: 'tekst', sectieId, pad, waarde, typen }` naar
// het CMS, dat haar net als het rechterpaneel als concept bewaart. Enter: klaar; Escape: terugzetten. Alleen berichten
// van de origin van het CMS tellen. Een veld kan typen uitzetten met `data-cms-typbaar="nee"` (bijvoorbeeld een tekst
// die de site zelf opmaakt).
const TECHNISCH_VELD = /^(_|id$|slug$|sleutel$|anker$|collectie$|veld$|type$|variant$|kanaal$|formaat$|breedte$|stijl$|layout$|hoogte$|kleur|bg$|icoon$|.*_link$|.*_url$|href$|url$|link$|knop$)/;
// De tekstvelden van de blokken van een pagina (serverkant), per sectie: platte tekst van 1 tot 500 tekens, geen html.
export function voorvertoningVelden(blokken) {
  const uit = {};
  for (const b of blokken.slice(0, 200)) {
    const lijst = [];
    const loop = (w, pad, diepte) => {
      if (diepte > 4 || lijst.length >= 200)
        return;
      if (typeof w === 'string') {
        const naam = String(pad[pad.length - 1] ?? '');
        const t = w.trim();
        if (t && t.length <= 500 && !/[<>\n]/.test(t) && !/^(https?:|\/|#|mailto:|tel:)/i.test(t) && !TECHNISCH_VELD.test(naam))
          lijst.push({ pad, waarde: t });
      }
      else if (Array.isArray(w)) {
        for (const [i, x] of w.slice(0, 50).entries())
          loop(x, [...pad, i], diepte + 1);
      }
      else if (w && typeof w === 'object')
        for (const [k, v] of Object.entries(w))
          loop(v, [...pad, k], diepte + 1);
    };
    if (b.inhoud)
      for (const [k, v] of Object.entries(b.inhoud))
        loop(v, [k], 0);
    if (lijst.length)
      uit[b.id] = lijst;
  }
  return uit;
}
// De attributen voor één sectie (en eventueel één veld). Het pad wordt een tekst met punten, zoals in de renderer.
export function klikAttributen(sectieId, veld) {
  const pad = Array.isArray(veld) ? veld.join('.') : (veld ?? '');
  return pad ? { 'data-cms-sectie': sectieId, 'data-cms-veld': pad } : { 'data-cms-sectie': sectieId };
}
// Zelfstandig (geen verwijzingen naar iets buiten de functie), zodat hij ook als losse code te gebruiken is.
export function voorvertoningKlikken(o) {
  const niets = () => { };
  const w = (o.venster ?? (typeof window === 'undefined' ? null : window));
  if (!w || w.parent === w || !w.parent)
    return niets;
  let doel;
  try {
    const u = new URL(o.cmsUrl);
    const lokaal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (!(u.protocol === 'https:' || (lokaal && u.protocol === 'http:')) || u.username || u.password)
      return niets;
    doel = u.origin;
  }
  catch {
    return niets;
  }
  const ingesloten = o.ingesloten ?? new URLSearchParams(w.location.search).get('ingesloten') === '1';
  if (!ingesloten)
    return niets;
  const SECTIE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const DEEL = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
  const klik = (e) => {
    const ev = e;
    if (ev.button !== undefined && ev.button !== 0)
      return;
    const start = ev.target && typeof ev.target.closest === 'function' ? ev.target : null;
    const sectie = start?.closest?.('[data-cms-sectie],[data-sectie]') ?? null;
    if (!sectie) {
      // Een link buiten een sectie (menu, footer): in het editorvenster niet volgen; een gewone pagina van de site mag
      // daar niet in een frame staan (de browser toont dan een fout).
      if (start?.closest?.('a[href]'))
        ev.preventDefault();
      return;
    }
    const sectieId = sectie.getAttribute('data-cms-sectie') ?? sectie.getAttribute('data-sectie') ?? '';
    if (!SECTIE.test(sectieId))
      return;
    const veldEl = start?.closest?.('[data-cms-veld]') ?? null;
    let pad = null;
    if (veldEl && (!veldEl.contains || sectie.contains?.(veldEl) !== false)) {
      const t = veldEl.getAttribute('data-cms-veld') ?? '';
      const delen = t.length <= 300 ? t.split('.').map((d) => (/^\d+$/.test(d) ? Number(d) : d)) : [];
      const geldig = delen.length > 0 && delen.length <= 8 && delen.every((d) => (typeof d === 'number' ? d < 2000 : DEEL.test(d) && d !== '__proto__' && d !== 'constructor' && d !== 'prototype'));
      pad = geldig ? delen : null;
    }
    // Een klik in het veld dat al getypt wordt, plaatst alleen de cursor; een klik elders stopt het typen.
    if (bezig && veldEl === bezig.el)
      return;
    stopTypen();
    // In de editor kiest een klik een onderdeel; een link of knop volgen hoort daar niet bij.
    ev.preventDefault();
    ev.stopPropagation();
    const v = veldEl;
    const typbaar = !!pad && !!v && v.childElementCount === 0 && typeof v.textContent === 'string' && v.textContent.trim().length > 0 && v.getAttribute('data-cms-typbaar') !== 'nee';
    const bericht = { bron: 'cms-voorbeeld', soort: 'kies', sectieId, pad, item: null, typbaar };
    stuur(bericht);
  };
  const stuur = (b) => w.parent.postMessage(b, doel);
  let bezig = null;
  // Eén regel platte tekst: stuurtekens (regeleinden, tabs) worden spaties, hooguit 500 tekens.
  const plat = (t) => [...t].map((k) => (k.charCodeAt(0) < 32 || k.charCodeAt(0) === 127 ? ' ' : k)).join('').slice(0, 500);
  const stopTypen = () => {
    if (!bezig)
      return;
    const b = bezig;
    bezig = null;
    b.stop();
  };
  const begin = (el, sectieId, pad, typen) => {
    stopTypen();
    const oud = el.textContent ?? '';
    const invoer = () => {
      if (!bezig)
        return;
      const waarde = plat(el.textContent ?? '');
      stuur({ bron: 'cms-voorbeeld', soort: 'tekst', sectieId, pad, waarde, typen });
    };
    const toets = (e) => {
      const k = e;
      if (k.key === 'Enter') {
        k.preventDefault();
        stopTypen();
      }
      else if (k.key === 'Escape') {
        k.preventDefault();
        el.textContent = oud;
        stuur({ bron: 'cms-voorbeeld', soort: 'tekst', sectieId, pad, waarde: plat(oud), typen });
        stopTypen();
      }
    };
    // Niet stoppen bij blur: de editor kan de focus even pakken (selectie, paneel). Stoppen gebeurt bij Enter, Escape,
    // een klik elders in de site of een nieuwe selectie van de editor (typen 0 als het paneel het overneemt).
    el.addEventListener('input', invoer);
    el.addEventListener('keydown', toets);
    try {
      el.contentEditable = 'plaintext-only';
    }
    catch {
      el.contentEditable = 'true';
    }
    if (el.contentEditable !== 'plaintext-only')
      el.contentEditable = 'true';
    bezig = {
      el,
      sectieId,
      pad,
      typen,
      oud,
      stop: () => {
        el.removeEventListener('input', invoer);
        el.removeEventListener('keydown', toets);
        el.contentEditable = 'false';
      },
    };
    el.focus?.();
  };
  const bericht = (e) => {
    const m = e;
    if (m.origin !== doel || !m.data || typeof m.data !== 'object')
      return;
    const d = m.data;
    if (d.bron !== 'cms-editor' || d.soort !== 'selectie')
      return;
    const typen = typeof d.typen === 'number' && Number.isInteger(d.typen) && d.typen > 0 ? d.typen : 0;
    if (!typen || typeof d.geselecteerd !== 'string' || !SECTIE.test(d.geselecteerd) || !Array.isArray(d.pad))
      return stopTypen();
    const padTekst = d.pad.join('.');
    if (bezig && bezig.typen === typen)
      return;
    const alle = w.document.querySelectorAll?.('[data-cms-veld]') ?? [];
    for (let i = 0; i < alle.length; i++) {
      const el = alle[i];
      if (el.getAttribute('data-cms-veld') !== padTekst || el.childElementCount !== 0)
        continue;
      const sectie = el.closest?.('[data-cms-sectie],[data-sectie]') ?? null;
      const id = sectie?.getAttribute('data-cms-sectie') ?? sectie?.getAttribute('data-sectie') ?? '';
      if (id !== d.geselecteerd)
        continue;
      begin(el, id, d.pad, typen);
      return;
    }
  };
  // Velden markeren (B-127): binnen elke sectie het eerste blad-element met precies de tekst van een veld.
  if (o.velden && typeof o.velden === 'object' && w.document.querySelectorAll) {
    const secties = w.document.querySelectorAll('[data-cms-sectie],[data-sectie]');
    for (let i = 0; i < secties.length; i++) {
      const sec = secties[i];
      const id = sec.getAttribute('data-cms-sectie') ?? sec.getAttribute('data-sectie') ?? '';
      const velden = SECTIE.test(id) ? o.velden[id] : undefined;
      if (!Array.isArray(velden) || typeof sec.querySelectorAll !== 'function')
        continue;
      const bladeren = [];
      const alle = sec.querySelectorAll('*');
      for (let j = 0; j < alle.length && j < 5000; j++) {
        const el = alle[j];
        if (el.childElementCount === 0 && typeof el.textContent === 'string' && el.textContent.trim())
          bladeren.push(el);
      }
      for (const v of velden.slice(0, 200)) {
        if (!v || typeof v.waarde !== 'string' || !Array.isArray(v.pad) || !v.pad.length || v.pad.length > 8)
          continue;
        const pad = v.pad.join('.');
        if (!v.pad.every((d) => (typeof d === 'number' ? d >= 0 && d < 2000 : DEEL.test(String(d)) && d !== '__proto__' && d !== 'constructor' && d !== 'prototype')))
          continue;
        const doel = bladeren.find((b) => !b.getAttribute('data-cms-veld') && (b.textContent ?? '').trim() === v.waarde.trim());
        if (doel)
          doel.setAttribute('data-cms-veld', pad);
      }
    }
  }
  w.document.addEventListener('click', klik, true);
  w.addEventListener?.('message', bericht);
  // Het CMS weet zo dat deze pagina klikken en typen ondersteunt.
  stuur({ bron: 'cms-voorbeeld', soort: 'klaar' });
  return () => {
    stopTypen();
    w.document.removeEventListener('click', klik, true);
    w.removeEventListener?.('message', bericht);
  };
}

// ------------------------------------------------------------------ eigen hulpjes van deze site

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Een functie k(veld) die de attributen als HTML-tekst geeft (met een spatie ervoor), alleen als klikken aan staat en
// het blok een geldig id (uuid uit de lees-API) heeft; anders altijd ''. k() = alleen de sectie.
export function klikMaker(blokId, aan) {
  if (!aan || typeof blokId !== 'string' || !UUID.test(blokId)) return () => ''
  return (veld) => Object.entries(klikAttributen(blokId, veld)).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')
}

// Het script voor de ingesloten voorvertoning: de helper hierboven als losse code (hij is zelfstandig), aangeroepen met
// de origin van het CMS en de tekstvelden van de blokken (B-127: velden die de renderer niet zelf markeert, worden in
// de browser gemarkeerd). Inline, zodat er geen extra bestand of CSP-bron nodig is (script-src staat 'unsafe-inline'
// al toe). Gevaarlijke tekens in de JSON worden ontsnapt, zodat de inhoud het script nooit kan afsluiten. Een onveilig
// CMS-adres geeft geen script.
export function klikScript(cmsUrl, blokken = []) {
  let origin
  try {
    const u = new URL(String(cmsUrl))
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))) return ''
    if (u.username || u.password) return ''
    origin = u.origin
  } catch {
    return ''
  }
  const metId = (Array.isArray(blokken) ? blokken : []).filter((b) => b && typeof b.id === 'string' && UUID.test(b.id))
  const velden = voorvertoningVelden(metId.map((b) => ({ id: b.id, inhoud: b.content ?? null })))
  const arg = JSON.stringify({ cmsUrl: origin, ingesloten: true, velden })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `<script>(${voorvertoningKlikken.toString()})(${arg})</script>`
}
