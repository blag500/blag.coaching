import { createContext, useContext, useState, useEffect } from 'react'
import bg from '../locales/bg'
import en from '../locales/en'

const TRANSLATIONS = { bg, en }

const SettingsContext = createContext(null)

// Заменя {key} плейсхолдерите с params[key]. Липсваща стойност се
// оставя като {key}, за да е видима в UI-a.
function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
}

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

  function t(key, params) {
    const raw = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.bg[key] ?? key
    return interpolate(raw, params)
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
