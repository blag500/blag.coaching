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
    'nav.tasks':        'ЗАДАЧИ',
    'nav.myDay':        'МОЙ ДЕН',
    'nav.protocol':     'ПРОТОКОЛ',
    'nav.posing':       'ПОУЗИНГ',
    'settings.appearance': 'ИЗГЛЕД',
    'settings.theme':      'Тема',
    'settings.theme.dark':  'ТЪМЕН',
    'settings.theme.light': 'СВЕТЪЛ',
    'settings.theme.glass': 'КРИСТАЛ',
    'settings.language':   'Език',

    // Days of week (short)
    'days.0': 'Нд', 'days.1': 'Пн', 'days.2': 'Вт', 'days.3': 'Ср',
    'days.4': 'Чт', 'days.5': 'Пт', 'days.6': 'Сб',

    // TodayDashboard
    'today.greeting.morning':   'ДОБРО УТРО',
    'today.greeting.afternoon': 'ДОБЪР ДЕН',
    'today.greeting.evening':   'ДОБЪР ВЕЧЕР',
    'today.activity':           'АКТИВНОСТ ДНЕС',
    'today.calories':           'Калории',
    'today.habits':             'Навици',
    'today.training':           'Тренировка',
    'today.protein':            'ПРОТЕИН',
    'today.carbs':              'ВЪГЛЕХИДРАТИ',
    'today.fats':               'МАЗНИНИ',
    'today.remaining':          'ОСТАВАЩИ',
    'today.kcal':               'ккал',
    'today.water':              '💧 ВОДА',
    'today.logFood':            '+ ЛОГНИ ХРАНА',
    'today.recentAdded':        'ПОСЛЕДНО ДОБАВЕНО',
    'today.seeAll':             'Виж всичко →',
    'today.workoutCard':        'ТРЕНИРОВКА',
    'today.streakUnit':         'поред',
    'today.lastWorkout':        'Последно:',
    'today.noWorkouts':         'Все още няма тренировки този месец',
    'today.logBtn':             'ЛОГНИ →',
    'today.checkin':            'СЕДМИЧЕН ЧЕК-ИН',
    'today.checkinSub':         'Снимки · Сън · Прогрес',
    'today.rewards':            'НАГРАДИ И ЗНАЧКИ',
    'today.ago.today':          'днес',
    'today.ago.yesterday':      'вчера',
    'today.ago.days':           'преди {n} дни',

    // BadgePopup
    'badge.calories.label': 'КАЛОРИИ',
    'badge.calories.sub':   'Дневната калорийна цел е постигната!',
    'badge.habits.label':   'НАВИЦИ',
    'badge.habits.sub':     'Всички навици за днес са изпълнени!',
    'badge.training.label': 'ТРЕНИРОВКА',
    'badge.training.sub':   'Тренировката е отчетена за днес!',
    'badge.perfect.label':  'ПЕРФЕКТЕН ДЕН',
    'badge.perfect.sub':    'Постигна всички цели за деня!',

    // ReadinessWidget
    'readiness.title':    'ГОТОВНОСТ',
    'readiness.excellent': 'ОТЛИЧНО',
    'readiness.good':      'ДОБРО',
    'readiness.moderate':  'УМЕРЕНО',
    'readiness.low':       'НИСКО',
    'readiness.cta':       'Попълни чек-ин за по-точен резултат →',
    'readiness.component.recovery':  'ВЪЗСТАНОВЯВАНЕ',
    'readiness.component.nutrition': 'ХРАНЕНЕ (ВЧЕРА)',
    'readiness.component.habits':    'НАВИЦИ',
    'readiness.component.hydration': 'ХИДРАТАЦИЯ (ВЧЕРА)',
    'readiness.component.training':  'ТРЕНИРОВКИ (7д)',
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
    'nav.tasks':        'TASKS',
    'nav.myDay':        'MY DAY',
    'nav.protocol':     'PROTOCOL',
    'nav.posing':       'POSING',
    'settings.appearance': 'APPEARANCE',
    'settings.theme':      'Theme',
    'settings.theme.dark':  'DARK',
    'settings.theme.light': 'LIGHT',
    'settings.theme.glass': 'CRYSTAL',
    'settings.language':   'Language',

    // Days of week (short)
    'days.0': 'Su', 'days.1': 'Mo', 'days.2': 'Tu', 'days.3': 'We',
    'days.4': 'Th', 'days.5': 'Fr', 'days.6': 'Sa',

    // TodayDashboard
    'today.greeting.morning':   'GOOD MORNING',
    'today.greeting.afternoon': 'GOOD AFTERNOON',
    'today.greeting.evening':   'GOOD EVENING',
    'today.activity':           "TODAY'S ACTIVITY",
    'today.calories':           'Calories',
    'today.habits':             'Habits',
    'today.training':           'Training',
    'today.protein':            'PROTEIN',
    'today.carbs':              'CARBS',
    'today.fats':               'FATS',
    'today.remaining':          'REMAINING',
    'today.kcal':               'kcal',
    'today.water':              '💧 WATER',
    'today.logFood':            '+ LOG FOOD',
    'today.recentAdded':        'RECENTLY ADDED',
    'today.seeAll':             'See all →',
    'today.workoutCard':        'TRAINING',
    'today.streakUnit':         'streak',
    'today.lastWorkout':        'Last:',
    'today.noWorkouts':         'No workouts this month yet',
    'today.logBtn':             'LOG →',
    'today.checkin':            'WEEKLY CHECK-IN',
    'today.checkinSub':         'Photos · Sleep · Progress',
    'today.rewards':            'REWARDS & BADGES',
    'today.ago.today':          'today',
    'today.ago.yesterday':      'yesterday',
    'today.ago.days':           '{n} days ago',

    // BadgePopup
    'badge.calories.label': 'CALORIES',
    'badge.calories.sub':   'Daily calorie goal achieved!',
    'badge.habits.label':   'HABITS',
    'badge.habits.sub':     'All habits completed for today!',
    'badge.training.label': 'TRAINING',
    'badge.training.sub':   'Workout logged for today!',
    'badge.perfect.label':  'PERFECT DAY',
    'badge.perfect.sub':    'All daily goals achieved!',

    // ReadinessWidget
    'readiness.title':    'READINESS',
    'readiness.excellent': 'EXCELLENT',
    'readiness.good':      'GOOD',
    'readiness.moderate':  'MODERATE',
    'readiness.low':       'LOW',
    'readiness.cta':       'Fill in check-in for a more accurate result →',
    'readiness.component.recovery':  'RECOVERY',
    'readiness.component.nutrition': 'NUTRITION (YESTERDAY)',
    'readiness.component.habits':    'HABITS',
    'readiness.component.hydration': 'HYDRATION (YESTERDAY)',
    'readiness.component.training':  'TRAINING (7d)',
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
