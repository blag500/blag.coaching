import { useEffect, useRef, useState } from 'react'

/**
 * Дума като спусък — допълнение към пляскането, не замяна.
 *
 * Разпознавателят е на браузъра. На Android слуша на български; на iPhone
 * български няма (виж BlagBot/useDictation.js), затова там слуша на английски
 * и думите са английски. Човекът вижда на екрана коя дума работи при него.
 *
 * Разпознаването свършва само след тишина, а сесията с позите е дълга —
 * затова при край се пуска наново, докато страницата е отворена.
 * Междинните резултати се гледат нарочно: „снимай" трябва да стреля, докато
 * човекът още стои в позата, не секунда по-късно, когато фразата се затвори.
 */

const WORDS = {
  'bg-BG': ['снимай', 'снимка', 'щрак', 'сега'],
  'en-US': ['cheese', 'snap', 'shoot', 'go'],
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function engine() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function wordTriggerSupported() { return !!engine() }

/** Езикът и думите, които се слушат на този телефон. */
export function wordSetup(appLang = 'bg') {
  const lang = isIOS() || appLang === 'en' ? 'en-US' : 'bg-BG'
  return { lang, words: WORDS[lang] }
}

/**
 * @param {object} opts
 * @param {boolean} opts.enabled
 * @param {string} opts.appLang          'bg' | 'en' от настройките
 * @param {() => void} opts.onWord
 * @param {{current: number}} opts.deafUntil
 */
export function useWordTrigger({ enabled, appLang, onWord, deafUntil }) {
  const [state, setState] = useState('off') // 'off' | 'on' | 'failed'
  const wordRef = useRef(onWord)
  wordRef.current = onWord

  useEffect(() => {
    const Engine = engine()
    if (!enabled || !Engine) { setState('off'); return }
    const { lang, words } = wordSetup(appLang)

    let alive = true
    let rec = null
    let lastFire = 0
    let startedAt = 0
    let quickEnds = 0
    let retry = 0
    // Една и съща фраза идва няколко пъти като междинен резултат; брои се
    // само първият път.
    let firedIdx = -1

    const start = () => {
      if (!alive) return
      rec = new Engine()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const said = (e.results[i][0]?.transcript ?? '').toLowerCase()
          if (i === firedIdx) continue
          if (!words.some(w => said.includes(w))) continue
          const now = performance.now()
          if (now < (deafUntil?.current ?? 0) || now - lastFire < 1200) continue
          lastFire = now
          firedIdx = i
          wordRef.current?.()
        }
      }
      rec.onerror = e => {
        const code = String(e?.error ?? '')
        // Отказ или липсващ език — повторът няма да помогне.
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'language-not-supported') {
          alive = false
          setState('failed')
        }
      }
      /* Сесия, която свършва веднага след пускане, не е тишина — разпознавателят
         не може да слуша (на iPhone микрофонът е зает от камерата). Безкрайното
         пускане наново на всеки 250 ms задушаваше страницата и екранът спираше
         да отговаря на докосване. Затова: все по-дълга пауза и отказ след три. */
      rec.onend = () => {
        firedIdx = -1
        if (!alive) return
        quickEnds = performance.now() - startedAt < 2000 ? quickEnds + 1 : 0
        if (quickEnds >= 3) { alive = false; setState('failed'); return }
        retry = setTimeout(start, 250 * 2 ** quickEnds)
      }
      try { startedAt = performance.now(); rec.start(); setState('on') } catch { setState('failed') }
    }
    start()

    return () => {
      alive = false
      clearTimeout(retry)
      try { rec?.abort() } catch { /* вече спрян */ }
    }
  }, [enabled, appLang, deafUntil])

  return { state }
}
