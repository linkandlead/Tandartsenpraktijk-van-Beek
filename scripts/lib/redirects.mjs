// Redirects uit het CMS (site.redirects) saneren: bron = intern pad, doel = intern pad of https-URL.
export function resolveRedirects(lijst) {
  if (!Array.isArray(lijst)) return []
  const uit = []
  for (const r of lijst.slice(0, 500)) {
    if (!r || typeof r !== 'object') continue
    const van = typeof r.van === 'string' ? r.van.trim() : ''
    const naar = typeof r.naar === 'string' ? r.naar.trim() : ''
    if (!/^\/[A-Za-z0-9\-._~/%]*$/.test(van) || van === '/') continue
    if (!(/^\/[^\s]*$/.test(naar) || /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(naar))) continue
    const status = [301, 302, 307, 308].includes(Number(r.status)) ? Number(r.status) : 301
    uit.push({ van: van.length > 1 ? van.replace(/\/+$/, '') : van, naar, status })
  }
  return uit
}
