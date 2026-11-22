/* Нова версия без махане и слагане на иконката (22.11).
 *
 * Иконката на началния екран няма бутон за презареждане, а страницата стои
 * отворена дни наред. Тук: при връщане в приложението и на всеки 5 минути
 * се пита сървърът коя е текущата версия (името на скрипта в /belezhki/ —
 * сменя се при всяко качване). Ако е друга, страницата се презарежда —
 * но не докато пишеш или е отворена бележка: тогава чака да свършиш.
 * Обновява се и service worker-ът (известията). */

const current = () => document.querySelector('script[type="module"][src*="/assets/belezhki-"]')?.getAttribute('src')

async function latest() {
  const r = await fetch(`/belezhki/?v=${Date.now()}`, { cache: 'no-store' })
  if (!r.ok) return null
  const m = (await r.text()).match(/\/assets\/belezhki-[^"']+\.js/)
  return m ? m[0] : null
}

const busy = () => {
  const a = document.activeElement
  const typing = a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && a.value
  return typing || /^#notes\/./.test(location.hash)
}

export function setupUpdates() {
  const mine = current()
  if (!mine) return // в разработка (vite dev) няма име с хеш
  let pending = false

  async function check() {
    try {
      navigator.serviceWorker?.getRegistration('/belezhki/').then((r) => r?.update()).catch(() => {})
      if (!pending) {
        const v = await latest()
        if (v && v !== mine) pending = true
      }
      if (pending && !busy()) location.reload()
    } catch { /* без мрежа — следващия път */ }
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  window.addEventListener('focus', check)
  // чакащо обновяване тръгва, щом затвориш бележката или изпратиш записаното
  window.addEventListener('hashchange', () => { if (pending) check() })
  document.addEventListener('focusout', () => { if (pending) setTimeout(check, 300) })
  setInterval(check, 5 * 60 * 1000)
}
