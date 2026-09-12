/**
 * Снимката, дошла отвън.
 *
 * Service worker-ът хваща споделянето, оставя файла в cache и праща браузъра
 * на /?share=1. Тук е другият край: приложението го взима веднъж и го маха.
 *
 * Взима се точно веднъж. Ако остане в cache-а, следващото отваряне на
 * приложението би започнало с разпознаване на снимка отпреди три дни —
 * затова изтриването е част от взимането, а не отделна стъпка, която някой
 * ден ще се пропусне.
 */

const SHARE_CACHE = 'blag-shared'
const SHARE_KEY   = '/__shared-photo'

/** Дошли ли сме тук през листа за споделяне. */
export function arrivedFromShare() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('share') === '1'
}

/**
 * Оставената снимка, или null. Махва я от cache-а веднага щом я върне.
 */
export async function takeSharedPhoto() {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(SHARE_CACHE)
    const res   = await cache.match(SHARE_KEY)
    if (!res) return null
    await cache.delete(SHARE_KEY)

    const blob = await res.blob()
    if (!blob.size) return null

    let name = 'shared.jpg'
    try {
      const raw = res.headers.get('x-blag-name')
      if (raw) name = decodeURIComponent(raw)
    } catch { /* името е удобство, не условие */ }

    return new File([blob], name, { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}

/**
 * Маха ?share=1 от адреса.
 *
 * Иначе презареждане или „добави към началния екран" от тази страница носи
 * параметъра със себе си и приложението всеки път тръгва в очакване на
 * снимка, каквато отдавна няма.
 */
export function clearShareParam() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('share')) return
  url.searchParams.delete('share')
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}
