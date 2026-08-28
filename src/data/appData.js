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
