import { createContext, useContext, useState, useEffect } from 'react'
import { syncLocale, tr } from '../utils/locale'
import { hapticsEnabled, setHapticsEnabled } from '../lib/haptics'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('blag_theme') || 'glass')
  const [lang,  setLangState]  = useState(() => {
    // Съхранен избор бие браузърния език. Първо посещение без запис пада на
    // bg само ако браузърът твърди български; иначе английски, за да не
    // посрещаме глобален трафик на кирилица.
    const saved = localStorage.getItem('blag_lang')
    if (saved === 'bg' || saved === 'en') return saved
    const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || ''
    return nav.toLowerCase().startsWith('bg') ? 'bg' : 'en'
  })
  // Rest timer between sets — some people count in their head or just want a
  // quiet log. Default on, opt-out from Profile.
  const [restTimer, setRestTimerState] = useState(() =>
    localStorage.getItem('blag_rest_timer') !== '0'
  )
  /* Вибрацията при докосване. Включена по подразбиране, изключваема оттук —
     на някои телефони моторчето е шумно и в тиха стая се чува повече, отколкото
     се усеща. Истината живее в lib/haptics, защото се чете и извън React;
     тук стои само отражението ѝ, за да може превключвателят да се пренарисува. */
  const [haptics, setHapticsState] = useState(hapticsEnabled)

  /* Цветът на системната лента следва темата.
     Беше закован на #0A0A0F в index.html — тоест в светлата тема телефонът
     държеше почти черна ивица над едно светло приложение. Стойността се чете
     от --bg на живо, за да има един източник: смени се темата в index.css и
     лентата тръгва след нея, без да се пипа тук. */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('blag_theme', theme)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (bg) meta.setAttribute('content', bg)
  }, [theme])

  /* При рендер, не в useEffect: Intl локалът трябва да е верен още докато
     децата се рисуват, иначе смяната на езика оставя едно рисуване с
     българските дати. */
  syncLocale(lang)

  useEffect(() => {
    localStorage.setItem('blag_lang', lang)
    document.documentElement.setAttribute('lang', lang)

    /* Езикът се оставя и на сървъра.
       Ботът вече говори и сам: нощната обиколка отваря разговор, без някой да
       я е питал, и няма кого да пита на какъв език да го напише. Пише се тихо
       и без чакане — това е отражение на вече направен избор, не действие.
       Без сесия няма къде да се пише; следващият път, когато езикът се смени
       или приложението се отвори, ще се запише. */
    supabase.auth.getUser().then(({ data }) => {
      const id = data?.user?.id
      if (!id) return
      supabase.from('profiles').update({ lang }).eq('id', id).then(() => {}, () => {})
    }, () => {})
  }, [lang])

  useEffect(() => {
    localStorage.setItem('blag_rest_timer', restTimer ? '1' : '0')
  }, [restTimer])

  function setTheme(v) { setThemeState(v) }
  function setLang(v)  { setLangState(v) }
  function setRestTimer(v) { setRestTimerState(!!v) }
  function setHaptics(v) { setHapticsEnabled(!!v); setHapticsState(!!v) }

  /* Делегира на tr(), за да няма две реализации на един и същ превод.
     syncLocale(lang) горе вече е записал езика при този рендер. */
  function t(key, params) {
    return tr(key, params)
  }

  return (
    <SettingsContext.Provider value={{ theme, setTheme, lang, setLang, restTimer, setRestTimer, haptics, setHaptics, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
