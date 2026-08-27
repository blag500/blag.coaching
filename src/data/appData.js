export const NUTRITION_CARDS = [
  {
    id: 'protein',
    front: { label: 'PROTEIN', value: '180g', unit: 'на ден', color: '#66BB6A' },
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
    front: { label: 'FAT', value: '70g', unit: 'на ден', color: 'var(--accent)' },
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
  { id: 'water',    emoji: '💧', labelKey: 'habit.water'    },
  { id: 'protein',  emoji: '🥩', labelKey: 'habit.protein'  },
  { id: 'training', emoji: '🏋️', labelKey: 'habit.training' },
  { id: 'sleep',    emoji: '😴', labelKey: 'habit.sleep'    },
  { id: 'steps',    emoji: '👟', labelKey: 'habit.steps'    },
  { id: 'nosugar',  emoji: '🚫', labelKey: 'habit.nosugar'  },
]

/**
 * Шестте по подразбиране, с разрешени имена.
 *
 * Върнатата форма е тази, която влиза в profiles.habits — с label, не с
 * ключ, защото оттам нататък текстът е на клиента: той го преписва както
 * иска. Езикът се решава в момента на записа, а не при всяко рисуване.
 */
export const defaultHabits = t =>
  HABITS.map(h => ({ id: h.id, emoji: h.emoji, label: t(h.labelKey) }))

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

/**
 * Стартовият сплит — четири дни горна/долна плюс почивен.
 *
 * Функция, а не константа, защото при „приложи стартов план" съдържанието се
 * копира в profiles.training_plan и оттам нататък е данни на клиента. Ако
 * имената се разрешаваха при рисуване, планът на англоговорящ щеше да е
 * записан на български и смяната на езика нямаше да го поправи.
 */
export function defaultTrainingBlocks(t) {
  const m = k => t('muscle.' + k)
  return [
    {
      id: '0',
      label: 'Upper A',
      isRest: false,
      groups: ['upper', 'pull', 'extra'],
      muscles: [m('chest'), m('back'), m('shoulders'), m('arms')],
      exercises: [
        { id: '0-0', name: t('ex.benchPress'),      sets: '4', reps: '6\u20138'   },
        { id: '0-1', name: t('ex.inclineDbPress'),  sets: '3', reps: '10\u201312' },
        { id: '0-2', name: t('ex.weightedPullup'),  sets: '4', reps: '6\u20138'   },
        { id: '0-3', name: t('ex.barbellRow'),      sets: '3', reps: '8\u201310'  },
        { id: '0-4', name: t('ex.barbellCurl'),     sets: '3', reps: '10\u201312' },
        { id: '0-5', name: t('ex.ropePushdown'),    sets: '3', reps: '12\u201315' },
      ],
    },
    {
      id: '1',
      label: 'Lower A',
      isRest: false,
      groups: ['lower', 'extra'],
      muscles: [m('quads'), m('hamstrings'), m('glutes'), m('calves')],
      exercises: [
        { id: '1-0', name: t('ex.backSquat'),       sets: '4', reps: '6\u20138'   },
        { id: '1-1', name: t('ex.rdl'),             sets: '4', reps: '8\u201310'  },
        { id: '1-2', name: t('ex.legPress'),        sets: '3', reps: '10\u201312' },
        { id: '1-3', name: t('ex.lyingLegCurl'),    sets: '3', reps: '12\u201315' },
        { id: '1-4', name: t('ex.standingCalf'),    sets: '4', reps: '15\u201320' },
      ],
    },
    {
      id: '2',
      label: 'Upper B',
      isRest: false,
      groups: ['upper', 'pull', 'extra'],
      muscles: [m('chest'), m('back'), m('shoulders'), m('arms')],
      exercises: [
        { id: '2-0', name: t('ex.dbShoulderPress'), sets: '4', reps: '8\u201310'  },
        { id: '2-1', name: t('ex.cableFly'),        sets: '3', reps: '12\u201315' },
        { id: '2-2', name: t('ex.latPulldown'),     sets: '4', reps: '10\u201312' },
        { id: '2-3', name: t('ex.cableLatRaise'),   sets: '4', reps: '15\u201320' },
        { id: '2-4', name: t('ex.hammerCurl'),      sets: '3', reps: '12\u201315' },
      ],
    },
    {
      id: '3',
      label: 'Lower B',
      isRest: false,
      groups: ['lower', 'extra'],
      muscles: [m('quads'), m('hamstrings'), m('glutes'), m('calves')],
      exercises: [
        { id: '3-0', name: t('ex.deadlift'),        sets: '4', reps: '4\u20136'                                  },
        { id: '3-1', name: t('ex.bulgarianSplit'),  sets: '3', reps: '10\u201312 (' + t('ex.eachLeg') + ')'      },
        { id: '3-2', name: t('ex.legExtension'),    sets: '3', reps: '12\u201315'                                },
        { id: '3-3', name: t('ex.seatedLegCurl'),   sets: '3', reps: '12\u201315'                                },
        { id: '3-4', name: t('ex.seatedCalf'),      sets: '4', reps: '15\u201320'                                },
      ],
    },
    {
      id: '4',
      label: t('tr.block.rest'),
      isRest: true,
      groups: [],
      muscles: [],
      exercises: [
        { id: '4-0', name: t('ex.cardioChoice'),    sets: '1', reps: '30\u201345 ' + t('unit.min') },
        { id: '4-1', name: t('ex.mobility'),        sets: '1', reps: '15 ' + t('unit.min')          },
      ],
    },
  ]
}

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
