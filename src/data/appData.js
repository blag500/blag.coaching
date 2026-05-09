export const NUTRITION_CARDS = [
  {
    id: 'protein',
    front: { label: 'PROTEIN', value: '180g', unit: 'на ден', color: '#C8F135' },
    back: {
      headline: 'Защо протеин?',
      body: 'Гради и възстановява мускулна тъкан. Цел: 2g на кг телесно тегло.',
      sources: 'Пилешко, яйца, суроватка, гръцки йогурт',
      tip: '4 ккал / грам',
    },
  },
  {
    id: 'carbs',
    front: { label: 'CARBS', value: '250g', unit: 'на ден', color: '#4FC3F7' },
    back: {
      headline: 'Защо въглехидрати?',
      body: 'Основно гориво за тренировка. Времирай ги около тренировките.',
      sources: 'Ориз, овес, картофи, плодове',
      tip: '4 ккал / грам',
    },
  },
  {
    id: 'fat',
    front: { label: 'FAT', value: '70g', unit: 'на ден', color: '#FFB74D' },
    back: {
      headline: 'Защо мазнини?',
      body: 'Хормонална продукция, ставно здраве, мастноразтворими витамини.',
      sources: 'Авокадо, зехтин, ядки, мазна риба',
      tip: '9 ккал / грам',
    },
  },
  {
    id: 'calories',
    front: { label: 'CALORIES', value: '2450', unit: 'ккал / ден', color: '#F06292' },
    back: {
      headline: 'Обща енергия',
      body: 'Поддържащи калории базирани на TDEE. Коригирай ±200 ккал за дефицит/излишък.',
      sources: 'Следи седмичните средни стойности',
      tip: 'Протеин + Въглехидрати + Мазнини × 9',
    },
  },
]

export const HABITS = [
  { id: 'water',    emoji: '💧', label: 'Вода 2.5L' },
  { id: 'protein',  emoji: '🥩', label: 'Протеин 180g' },
  { id: 'training', emoji: '🏋️', label: 'Тренировка' },
  { id: 'sleep',    emoji: '😴', label: 'Сън 7ч+' },
  { id: 'steps',    emoji: '👟', label: 'Стъпки 8000' },
  { id: 'nosugar',  emoji: '🚫', label: 'Без захар' },
]

export const TRAINING_SPLIT = [
  {
    day: 'Понеделник',
    dayEn: 'Monday',
    label: 'UPPER',
    muscles: ['Гърди', 'Гръб', 'Рамене', 'Ръце'],
    exercises: [
      { name: 'Лежанка с щанга', sets: '4', reps: '6–8' },
      { name: 'Наклонена лежанка с дъмбели', sets: '3', reps: '10–12' },
      { name: 'Набирания с тежест', sets: '4', reps: '6–8' },
      { name: 'Гребане с щанга', sets: '3', reps: '8–10' },
      { name: 'Вдигане на рамене (машина)', sets: '4', reps: '12–15' },
      { name: 'Прес с дъмбели за рамене', sets: '3', reps: '10–12' },
      { name: 'Curl с лост', sets: '3', reps: '10–12' },
      { name: 'Трицепс с въже', sets: '3', reps: '12–15' },
    ],
  },
  {
    day: 'Вторник',
    dayEn: 'Tuesday',
    label: 'LOWER',
    muscles: ['Квадрицепси', 'Задно бедро', 'Глутеус', 'Прасци'],
    exercises: [
      { name: 'Клек с щанга', sets: '4', reps: '6–8' },
      { name: 'Румънска мъртва тяга', sets: '4', reps: '8–10' },
      { name: 'Лег прес', sets: '3', reps: '10–12' },
      { name: 'Лег curl (машина)', sets: '3', reps: '12–15' },
      { name: 'Хак клек', sets: '3', reps: '10–12' },
      { name: 'Прасци прав', sets: '4', reps: '15–20' },
    ],
  },
  {
    day: 'Сряда',
    dayEn: 'Wednesday',
    label: 'REST',
    muscles: [],
    exercises: [],
  },
  {
    day: 'Четвъртък',
    dayEn: 'Thursday',
    label: 'UPPER',
    muscles: ['Гърди', 'Гръб', 'Рамене', 'Ръце'],
    exercises: [
      { name: 'Прес с дъмбели за рамене', sets: '4', reps: '8–10' },
      { name: 'Кабелна флай', sets: '3', reps: '12–15' },
      { name: 'Лат пулдаун', sets: '4', reps: '10–12' },
      { name: 'Странично вдигане (кабел)', sets: '4', reps: '15–20' },
      { name: 'Затегляне с лост тясно', sets: '3', reps: '8–10' },
      { name: 'Hammer curl', sets: '3', reps: '12–15' },
    ],
  },
  {
    day: 'Петък',
    dayEn: 'Friday',
    label: 'LOWER',
    muscles: ['Квадрицепси', 'Задно бедро', 'Глутеус', 'Прасци'],
    exercises: [
      { name: 'Мъртва тяга', sets: '4', reps: '4–6' },
      { name: 'Bulgarian split squat', sets: '3', reps: '10–12 (всеки крак)' },
      { name: 'Leg extension (машина)', sets: '3', reps: '12–15' },
      { name: 'Seated leg curl', sets: '3', reps: '12–15' },
      { name: 'Прасци седнал', sets: '4', reps: '15–20' },
    ],
  },
  {
    day: 'Събота',
    dayEn: 'Saturday',
    label: 'CARDIO',
    muscles: ['Сърдечносъдова система'],
    exercises: [
      { name: 'Бягане / Колело / Плуване', sets: '1', reps: '30–45 мин' },
      { name: 'Мобилити и стречинг', sets: '1', reps: '15 мин' },
    ],
  },
  {
    day: 'Неделя',
    dayEn: 'Sunday',
    label: 'REST',
    muscles: [],
    exercises: [],
  },
]

export const DAYS_BG_TO_EN = {
  'Sunday':    'Неделя',
  'Monday':    'Понеделник',
  'Tuesday':   'Вторник',
  'Wednesday': 'Сряда',
  'Thursday':  'Четвъртък',
  'Friday':    'Петък',
  'Saturday':  'Събота',
}

export const COACH_WHATSAPP = '359XXXXXXXXX'
