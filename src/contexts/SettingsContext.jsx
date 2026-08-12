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
    'nav.supplements':  'СУПЛЕМЕНТИ',
    'nav.shop':         'МАГАЗИН',
    'nav.orders':       'ПОРЪЧКИ',
    'today.shop':       'МАГАЗИН',
    'today.shopSub':    'Бърза доставка · Макроси включени',
    'today.shopRec':    'ДОПЪЛНИ ДЕНЯ',
    'today.shopRecSub': 'Дефицит:',
    'today.shopOrder':  'ПОРЪЧАЙ',
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
    'today.suppTaken':          'взети',
    'today.suppEmpty':          'Настрой стека →',

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
    'readiness.partial':   'БЕЗ ЧЕК-ИН',
    'readiness.coverage':  'по {n} от 5 показателя',
    'readiness.building':  'изгражда база — {n} от 5 чек-ина',
    'readiness.personal':  'спрямо твоята норма',
    'readiness.checkinBtn': 'Попълни чек-ин · 30 сек',
    'readiness.details':    'Подробно →',
    'readiness.verdict.checkin':   'Попълни чек-ина, за да е точно.',
    'readiness.verdict.recovery':  'Възстановяването е под нормата ти. Днес по-леко.',
    'readiness.verdict.recoveryWhy': 'Причина: {why}. Днес по-леко.',
    'readiness.footnote':  'храненето, навиците и хидратацията са за вчера',
    'readiness.factor.quality':  'лош сън',
    'readiness.factor.energy':   'ниска енергия',
    'readiness.factor.stress':   'висок стрес',
    'readiness.factor.soreness': 'крепатура',
    'readiness.factor.mood':     'ниско настроение',
    'readiness.verdict.nutrition': 'Вчера си под целта по храна.',
    'readiness.verdict.habits':    'Вчера навиците са пропуснати.',
    'readiness.verdict.hydration': 'Вчера си пил малко вода.',
    'readiness.verdict.training':  'Малко тренировки тази седмица.',
    'readiness.verdict.muscle':    '{g} е на {p}%. Днес друга група.',
    'readiness.verdict.ok':        'Всичко е в норма. Давай.',
    'readiness.component.recovery':  'ВЪЗСТАНОВЯВАНЕ',
    'readiness.component.nutrition': 'ХРАНЕНЕ',
    'readiness.component.habits':    'НАВИЦИ',
    'readiness.component.hydration': 'ХИДРАТАЦИЯ',
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
    'nav.supplements':  'SUPPLEMENTS',
    'nav.shop':         'SHOP',
    'nav.orders':       'ORDERS',
    'today.shop':       'SHOP',
    'today.shopSub':    'Fast delivery · Macros included',
    'today.shopRec':    'COMPLETE YOUR DAY',
    'today.shopRecSub': 'Deficit:',
    'today.shopOrder':  'ORDER',
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
    'today.suppTaken':          'taken',
    'today.suppEmpty':          'Set up stack →',

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
    'readiness.partial':   'NO CHECK-IN',
    'readiness.coverage':  'from {n} of 5 signals',
    'readiness.building':  'building a baseline — {n} of 5 check-ins',
    'readiness.personal':  'against your own normal',
    'readiness.checkinBtn': 'Check in · 30 sec',
    'readiness.details':    'Details →',
    'readiness.verdict.checkin':   'Check in so this means something.',
    'readiness.verdict.recovery':  'Recovery is below your normal. Go lighter today.',
    'readiness.verdict.recoveryWhy': 'Because of {why}. Go lighter today.',
    'readiness.footnote':  'nutrition, habits and hydration are yesterday',
    'readiness.factor.quality':  'poor sleep',
    'readiness.factor.energy':   'low energy',
    'readiness.factor.stress':   'high stress',
    'readiness.factor.soreness': 'soreness',
    'readiness.factor.mood':     'low mood',
    'readiness.verdict.nutrition': 'You ate under target yesterday.',
    'readiness.verdict.habits':    'Habits were missed yesterday.',
    'readiness.verdict.hydration': 'You drank little water yesterday.',
    'readiness.verdict.training':  'Few sessions this week.',
    'readiness.verdict.muscle':    '{g} is at {p}%. Train something else today.',
    'readiness.verdict.ok':        'All in range. Go.',
    'readiness.component.recovery':  'RECOVERY',
    'readiness.component.nutrition': 'NUTRITION',
    'readiness.component.habits':    'HABITS',
    'readiness.component.hydration': 'HYDRATION',
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
