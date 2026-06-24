import { createContext, useContext, useState, useEffect } from 'react'

const TRANSLATIONS = {
  bg: {
    'nav.today':        'ДНЕС',
    'nav.nutrition':    'ХРАНЕНЕ',
    'nav.training':     'ТРЕНИРОВКА',
    'nav.training_long':'ТРЕНИРОВКА',
    'nav.profile':      'ПРОФИЛ',
    'nav.menu':         'МЕНЮ',
    'nav.habits':       'НАВИЦИ',
    'nav.clients':      'КЛИЕНТИ',
    'nav.chat':         'ЧАТ',
    'nav.recovery':     'ВЪЗСТАНОВЯВАНЕ',
    'nav.schedule':     'ГРАФИК',
    'nav.explore':      'ОТКРИЙ',
    'nav.learn':        'ЗНАНИЯ',
    'nav.budget':       'БЮДЖЕТ',
    'nav.myDay':        'МОЙ ДЕН',
    'settings.appearance': 'ИЗГЛЕД',
    'settings.theme':      'Тема',
    'settings.theme.dark':  'ТЪМЕН',
    'settings.theme.light': 'СВЕТЪЛ',
    'settings.theme.glass': 'КРИСТАЛ',
    'settings.language':   'Език',
  },
  en: {
    'nav.today':        'TODAY',
    'nav.nutrition':    'NUTRITION',
    'nav.training':     'TRAINING',
    'nav.training_long':'TRAINING',
    'nav.profile':      'PROFILE',
    'nav.menu':         'MENU',
    'nav.habits':       'HABITS',
    'nav.clients':      'CLIENTS',
    'nav.chat':         'CHAT',
    'nav.recovery':     'RECOVERY',
    'nav.schedule':     'SCHEDULE',
    'nav.explore':      'EXPLORE',
    'nav.learn':        'LEARN',
    'nav.budget':       'BUDGET',
    'nav.myDay':        'MY DAY',
    'settings.appearance': 'APPEARANCE',
    'settings.theme':      'Theme',
    'settings.theme.dark':  'DARK',
    'settings.theme.light': 'LIGHT',
    'settings.theme.glass': 'CRYSTAL',
    'settings.language':   'Language',
  },
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('blag_theme') || 'dark')
  const [lang,  setLangState]  = useState(() => localStorage.getItem('blag_lang')  || 'bg')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('blag_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('blag_lang', lang)
  }, [lang])

  function setTheme(v) { setThemeState(v) }
  function setLang(v)  { setLangState(v) }

  function t(key) {
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.bg[key] ?? key
  }

  return (
    <SettingsContext.Provider value={{ theme, setTheme, lang, setLang, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
