/* Tandarts Van Beek — progressive enhancement. Alle inhoud is zonder JavaScript leesbaar;
   dit script voegt alleen het mobiele menu, de keuzehulp en de formulierflow toe. */
(function () {
  'use strict'

  // ---------------------------------------------------------------- Mobiel menu
  var knop = document.querySelector('.menu-knop')
  var nav = document.getElementById('hoofdmenu')
  if (knop && nav) {
    function zet(open) {
      nav.classList.toggle('open', open)
      knop.setAttribute('aria-expanded', open ? 'true' : 'false')
    }
    knop.addEventListener('click', function () {
      var open = knop.getAttribute('aria-expanded') !== 'true'
      zet(open)
      if (open) {
        var eerste = nav.querySelector('a')
        if (eerste) eerste.focus()
      }
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knop.getAttribute('aria-expanded') === 'true') {
        zet(false)
        knop.focus()
      }
    })
  }

  // ---------------------------------------------------------------- Keuzehulp
  Array.prototype.forEach.call(document.querySelectorAll('[data-keuzehulp]'), function (hulp) {
    var opties = hulp.querySelector('.keuze-opties')
    var uitkomsten = hulp.querySelectorAll('.keuze-uitkomst')
    if (!opties || !uitkomsten.length) return
    opties.hidden = false
    Array.prototype.forEach.call(uitkomsten, function (u) { u.hidden = true })
    opties.addEventListener('change', function (e) {
      var waarde = e.target && e.target.value
      hulp.classList.add('keuzehulp-actief')
      Array.prototype.forEach.call(uitkomsten, function (u) {
        u.hidden = u.getAttribute('data-keuze') !== waarde
      })
    })
  })

  // ---------------------------------------------------------------- Formulier
  // Flow (FO §4.5): invullen → valideren → samenvatting → bevestigen → verzenden → succes.
  // Bij een fout blijven alle gegevens behouden en kan de bezoeker opnieuw proberen.
  Array.prototype.forEach.call(document.querySelectorAll('[data-formulier]'), function (form) {
    var geladen = Date.now()
    var stappen = {}
    Array.prototype.forEach.call(form.querySelectorAll('[data-stap]'), function (s) { stappen[s.getAttribute('data-stap')] = s })
    var samenvatting = form.querySelector('[data-samenvatting]')
    var foutSamenvatting = form.querySelector('[data-foutsamenvatting]')
    var verzendFout = form.querySelector('[data-verzendfout]')
    var verstuur = form.querySelector('[data-verstuur]')

    function toon(naam) {
      Object.keys(stappen).forEach(function (k) { stappen[k].hidden = k !== naam })
      var kop = stappen[naam].querySelector('h3')
      if (kop) kop.focus()
    }

    function melding(veld) {
      var v = veld.validity
      var label = (veld.closest('.veld') && veld.closest('.veld').getAttribute('data-label')) || 'Dit veld'
      if (veld.type === 'checkbox' && v.valueMissing) return 'Ga akkoord met de privacyverklaring om verder te gaan.'
      if (v.valueMissing) return veld.tagName === 'SELECT' ? 'Maak een keuze bij ' + label.toLowerCase() + '.' : 'Vul ' + label.toLowerCase() + ' in.'
      if (v.typeMismatch && veld.type === 'email') return 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.'
      if (veld.type === 'tel' && veld.value && !/^[+()\d\s-]{8,20}$/.test(veld.value)) return 'Vul een geldig telefoonnummer in.'
      if (v.tooLong) return 'Deze tekst is te lang.'
      return ''
    }

    function controleer(veld) {
      var tekst = melding(veld)
      var foutEl = document.getElementById(veld.getAttribute('aria-describedby'))
      veld.setAttribute('aria-invalid', tekst ? 'true' : 'false')
      if (foutEl) { foutEl.textContent = tekst; foutEl.hidden = !tekst }
      return !tekst
    }

    var velden = form.querySelectorAll('input:not([name="_website"]), select, textarea')
    Array.prototype.forEach.call(velden, function (veld) {
      // Foutmelding verdwijnt al tijdens het typen/kiezen (niet pas bij blur): anders verspringt de
      // verzendknop precies op het moment van klikken en mist de klik.
      function herstel() { if (veld.getAttribute('aria-invalid') === 'true') controleer(veld) }
      veld.addEventListener('input', herstel)
      veld.addEventListener('change', herstel)
      veld.addEventListener('blur', function () { if (veld.value && veld.getAttribute('aria-invalid') !== 'true') controleer(veld) })
    })

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var fouten = []
      Array.prototype.forEach.call(velden, function (veld) { if (!controleer(veld)) fouten.push(veld) })
      if (fouten.length) {
        foutSamenvatting.textContent = fouten.length === 1 ? 'Er is 1 veld niet goed ingevuld.' : 'Er zijn ' + fouten.length + ' velden niet goed ingevuld.'
        foutSamenvatting.hidden = false
        fouten[0].focus()
        return
      }
      foutSamenvatting.hidden = true
      samenvatting.innerHTML = ''
      Array.prototype.forEach.call(form.querySelectorAll('.velden .veld'), function (blok) {
        var invoer = blok.querySelector('input, select, textarea')
        if (!invoer || !invoer.value.trim()) return
        var rij = document.createElement('div')
        rij.className = 'feit'
        var dt = document.createElement('dt')
        dt.textContent = blok.getAttribute('data-label')
        var dd = document.createElement('dd')
        dd.textContent = invoer.value.trim()
        rij.appendChild(dt); rij.appendChild(dd)
        samenvatting.appendChild(rij)
      })
      verzendFout.hidden = true
      toon('controleren')
    })

    form.querySelector('[data-terug]').addEventListener('click', function () { toon('invullen') })

    verstuur.addEventListener('click', function () {
      if (!window.LLCMS || !window.LLCMS.lead) {
        verzendFout.textContent = 'Versturen is nu niet mogelijk. Probeer het later opnieuw of bel de praktijk.'
        verzendFout.hidden = false
        return
      }
      var data = {}
      Array.prototype.forEach.call(form.querySelectorAll('.velden .veld'), function (blok) {
        var invoer = blok.querySelector('input, select, textarea')
        if (invoer && invoer.value.trim()) data[invoer.name] = invoer.value.trim()
      })
      var naam = [data.voornaam, data.achternaam].filter(Boolean).join(' ')
      var regels = []
      Object.keys(data).forEach(function (k) {
        if (['voornaam', 'achternaam', 'email', 'telefoon', 'bericht'].indexOf(k) === -1) regels.push(k + ': ' + data[k])
      })
      if (data.bericht) regels.push('', data.bericht)
      verstuur.setAttribute('aria-busy', 'true')
      verstuur.disabled = true
      window.LLCMS.lead({
        naam: naam,
        email: data.email,
        telefoon: data.telefoon || '',
        vraag: regels.join('\n'),
        herkomst: 'formulier ' + (form.getAttribute('data-herkomst') || ''),
        bron_pagina: location.pathname,
        _website: (form.querySelector('[name="_website"]') || {}).value || '',
        _ts: geladen,
      }).then(function (r) {
        verstuur.removeAttribute('aria-busy')
        verstuur.disabled = false
        if (r && r.ok) {
          var tekst = form.getAttribute('data-bevestiging')
          if (r.status === 'gebufferd') tekst += ' Uw bericht wordt automatisch verzonden zodra de verbinding hersteld is.'
          form.querySelector('[data-succes]').textContent = tekst
          toon('klaar')
        } else {
          verzendFout.textContent = 'Uw bericht kon niet worden verzonden. Uw gegevens zijn bewaard; controleer ze en probeer het opnieuw, of bel de praktijk.'
          verzendFout.hidden = false
          verzendFout.focus && verzendFout.setAttribute('tabindex', '-1')
          verzendFout.focus()
        }
      })
    })
  })
})()
