import { useState, useRef, useEffect } from 'react'
import { haptic } from '../../lib/haptics'

/**
 * Диктуване.
 *
 * Питането с думи е бавно на телефон, а най-често се пита точно тогава, когато
 * ръцете не са свободни: между серии, с щанга в другата ръка, пред щанда в
 * магазина. „Изядох двеста грама извара" се казва за две секунди и се пише за
 * двайсет.
 *
 * Разпознаването е на браузъра, не наше: SpeechRecognition работи в Chrome и
 * Samsung Internet на Android — там, където работят и вибрациите, тоест при
 * половината клиенти. Safari на iOS го няма (има го само зад флаг в новите
 * версии), затова бутонът не се показва, ако го няма. Бутон, който не прави
 * нищо, е по-лош от липсващ.
 *
 * Пуска се без сървър и без качване на звук: браузърът прави разпознаването и
 * връща текст. Записът никъде не се пази.
 */

/* Какъв език слуша. Приложението е на български, а разпознавателят иначе
   подразбира езика на системата — телефон с английска подредба щеше да чува
   „из ядох" като нещо съвсем друго. */
const LANGS = { bg: 'bg-BG', en: 'en-US' }

function engine() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/** Има ли го изобщо на този браузър. */
export function dictationSupported() {
  return !!engine()
}

/**
 * @param {(text: string) => void} onText  Какво да прави с чутото.
 * @param {string} lang                    Кодът от настройките: 'bg' или 'en'.
 */
export function useDictation(onText, lang = 'bg') {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const textRef = useRef(onText)
  textRef.current = onText

  /* Спира при затваряне: разпознавател, останал включен, държи микрофона и
     иконата в лентата на телефона свети, след като екранът е сменен. */
  useEffect(() => () => {
    try { recRef.current?.stop() } catch { /* вече спрян */ }
  }, [])

  function stop() {
    try { recRef.current?.stop() } catch { /* вече спрян */ }
    setListening(false)
  }

  function start() {
    const Engine = engine()
    if (!Engine) return

    if (listening) { stop(); return }

    const rec = new Engine()
    rec.lang = LANGS[lang] ?? LANGS.bg
    /* Без междинни резултати: полето, което се пренаписва при всяка сричка,
       кара човека да гледа как текстът му се мени, вместо да говори. */
    rec.interimResults = false
    rec.continuous = false
    rec.maxAlternatives = 1

    rec.onresult = e => {
      const said = Array.from(e.results)
        .map(r => r[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (said) {
        textRef.current?.(said)
        haptic('success')
      }
    }
    /* Свършва и от само себе си — тишина, изтекло време, отказан микрофон. */
    rec.onend   = () => setListening(false)
    rec.onerror = () => { setListening(false); haptic('reject') }

    try {
      rec.start()
      recRef.current = rec
      setListening(true)
      /* Вибрацията казва „слушам" — окото в този момент не е на екрана. */
      haptic('toggle')
    } catch {
      /* Второ пускане, преди първото да е свършило. */
      setListening(false)
    }
  }

  return { listening, toggle: start, stop }
}
