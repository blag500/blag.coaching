import { createContext, useContext, useState, useEffect } from 'react'
import { syncLocale, tr } from '../utils/locale'

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('blag_theme', theme)
  }, [theme])

  /* При рендер, не в useEffect: Intl локалът трябва да е верен още докато
     децата се рисуват, иначе смяната на езика оставя едно рисуване с
     българските дати. */
  syncLocale(lang)

  useEffect(() => {
    localStorage.setItem('blag_lang', lang)
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('blag_rest_timer', restTimer ? '1' : '0')
  }, [restTimer])

  function setTheme(v) { setThemeState(v) }
  function setLang(v)  { setLangState(v) }
  function setRestTimer(v) { setRestTimerState(!!v) }

  /* Делегира на tr(), за да няма две реализации на един и същ превод.
     syncLocale(lang) горе вече е записал езика при този рендер. */
  function t(key, params) {
    return tr(key, params)
  }

  return (
    <SettingsContext.Provider value={{ theme, setTheme, lang, setLang, restTimer, setRestTimer, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
