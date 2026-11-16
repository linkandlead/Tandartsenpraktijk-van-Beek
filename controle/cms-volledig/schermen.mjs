// Schermafbeeldingen (volledige pagina) op 1440 en 390 van een lokaal draaiende site.
//   node schermen.mjs <basis-url> <uitmap>
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const [basis, uit] = process.argv.slice(2)
mkdirSync(uit, { recursive: true })
const paden = ['/', '/de-praktijk', '/behandelingen', '/behandelingen/preventie', '/behandelingen/vullingen-en-kronen', '/behandelingen/orthodontie', '/behandelingen/slaapgeneeskunde', '/behandelingen/kindertandheelkunde', '/nieuwe-patienten', '/afspraak-maken-of-wijzigen', '/spoed', '/contact', '/praktische-informatie', '/privacyverklaring', '/artikelen', '/artikelen/voorbeeldartikel-gezond-tandvlees', '/bestaat-niet']
let browser
try { browser = await chromium.launch() } catch { browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }) }
for (const breedte of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: breedte, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  for (const p of paden) {
    await page.goto(basis + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(async (img) => { img.loading = 'eager'; if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r }); await img.decode().catch(() => {}) })) }); await page.waitForTimeout(150)
    const naam = (p === '/' ? 'home' : p.slice(1).replace(/\//g, '__')) + `-${breedte}.png`
    await page.screenshot({ path: `${uit}/${naam}`, fullPage: true, animations: 'disabled' })
  }
  await ctx.close()
}
await browser.close()
console.log('klaar', uit)
