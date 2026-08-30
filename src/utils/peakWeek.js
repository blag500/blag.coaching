/**
 * Пиковата седмица като сметка.
 *
 * Осем дни: от седем дни преди сцената до самия ден. Всеки от тях има фаза, а
 * фазата определя храната, тренировката и стъпките. Числата идват от J3
 * University (John Jewett, Contest Prep Series) и са записани тук на едно
 * място, за да могат да се сменят, когато школата се смени — а не да се търсят
 * из три компонента.
 *
 * Три неща от източника определят цялата форма на този файл:
 *
 * 1. Няма деплеция дни. Ядеш до поддръжка чак до зареждането. Деплецията само
 *    добавя променливи и умора, а после иска да се запълни дупка, за която
 *    няма време.
 * 2. Зареждането е 2–3 дни, и последният му ден (един ден преди) е ден за
 *    преценка, не поредният ден по план. Затова `adjust` е отделна фаза.
 * 3. Водата и натрият НЕ се пипат. Това не е число, а забрана — стои в
 *    правилата, не в макросите.
 */

export const PHASE = {
  taper:  'taper',   // сваляне на умората: делоуд, кардио → стъпки, храна до поддръжка
  load:   'load',    // зареждане с въглехидрати
  adjust: 'adjust',  // един ден преди: продължаваш, задържаш или дърпаш назад
  show:   'show',    // денят
}

/** Границите от източника: 3–10 г/кг, практически 4–6. */
export const CARB_MIN = 3
export const CARB_MAX = 10
export const CARB_DEFAULT = 5

/* Протеин и мазнини по време на зареждането. Протеинът пада, защото
   въглехидратите и излишъкът вече пестят мускул; мазнините пречат на приема. */
const LOAD_PROTEIN_PER_KG = 1.6
const LOAD_FAT_PER_KG     = 0.4

/* Извън зареждането: обичайните числа за подготовка. */
const BASE_PROTEIN_PER_KG = 2.2
const BASE_FAT_PER_KG     = 0.8

/** Курсът за превръщане на кардио в стъпки: 10 минути умерено ≈ 2000 стъпки. */
export const STEPS_PER_10MIN = 2000
export const STEPS_FLOOR = 7000
export const STEPS_CEIL  = 10000

/** Свалянето на обем в тренировките през цялата седмица. */
export const VOLUME_CUT = 0.3

/** Изборите за деня преди сцената. */
export const ADJUST = { keep: 'keep', hold: 'hold', pull: 'pull' }

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fromIso(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function shift(isoStr, n) {
  const d = fromIso(isoStr)
  d.setDate(d.getDate() + n)
  return iso(d)
}

const r0 = v => Math.round(v)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * Колко въглехидрати да предложим, ако човек не е избрал сам.
 *
 * Ако знаем колко е карал на подготовка, източникът казва да удвоим това — то е
 * по-добра отправна точка от средата на диапазона, защото носи неговата
 * поносимост. Иначе 5 г/кг.
 */
export function suggestCarbPerKg(weightKg, baseCarbG) {
  if (!weightKg || !baseCarbG) return CARB_DEFAULT
  const perKg = (baseCarbG * 2) / weightKg
  return Math.round(clamp(perKg, CARB_MIN, CARB_MAX) * 10) / 10
}

/**
 * Кардиото се превръща в стъпки, не се маха.
 *
 * Целта е същият разход при по-малко умора — степърът и елипсовидният уред
 * трупат умора, ходенето навън почти не. Резултатът се свежда до 7–10 хиляди:
 * под това не си струва, над това вече е кардио с друго име.
 */
export function stepsTargetFor(cardioMinPerDay) {
  const converted = (Number(cardioMinPerDay) || 0) / 10 * STEPS_PER_10MIN
  return clamp(Math.round(converted / 500) * 500, STEPS_FLOOR, STEPS_CEIL)
}

function macrosFor(phase, kg, carbPerKg, tdee, adjustChoice) {
  if (phase === PHASE.taper) {
    const protein = r0(kg * BASE_PROTEIN_PER_KG)
    const fat     = r0(kg * BASE_FAT_PER_KG)
    /* Храната се качва до поддръжка. Ако не знаем поддръжката, оставяме
       въглехидратите неизвестни, вместо да измислим число. */
    const carbs = tdee ? Math.max(0, r0((tdee - protein * 4 - fat * 9) / 4)) : null
    return { protein, fat, carbs, kcal: tdee ?? null }
  }

  const loadCarbs = r0(kg * carbPerKg)
  const protein   = r0(kg * LOAD_PROTEIN_PER_KG)
  const fat       = r0(kg * LOAD_FAT_PER_KG)

  let carbs = loadCarbs
  if (phase === PHASE.adjust || phase === PHASE.show) {
    /* Денят преди не е поредният ден по план — той е преценка. „Задръж" е
       средата между зареждане и връщане назад, и е разумното по подразбиране. */
    if (adjustChoice === ADJUST.hold) carbs = r0(loadCarbs * 0.6)
    else if (adjustChoice === ADJUST.pull) carbs = r0(loadCarbs * 0.4)
  }

  return { protein, fat, carbs, kcal: r0(carbs * 4 + protein * 4 + fat * 9) }
}

/**
 * Правилата на деня — ключове за превод, не текст.
 *
 * Част от тях са забрани и се повтарят всеки ден нарочно: човек, който чете
 * „без диуретици" само веднъж в понеделник, го е забравил в петък, а точно в
 * петък изкушението идва.
 */
function rulesFor(phase, isFirst) {
  const common = ['pw.rule.sodium', 'pw.rule.water']
  if (phase === PHASE.taper) {
    const r = ['pw.rule.eatUp', 'pw.rule.noDeplete', ...common]
    if (isFirst) r.unshift('pw.rule.deloadStart')
    return r
  }
  if (phase === PHASE.load) {
    return ['pw.rule.easyCarbs', 'pw.rule.lessVeg', 'pw.rule.potassium', 'pw.rule.groundMeat', ...common]
  }
  if (phase === PHASE.adjust) {
    return ['pw.rule.assess', 'pw.rule.fullRest', 'pw.rule.sleepAgents', ...common]
  }
  return ['pw.rule.hitWeight', 'pw.rule.fluidWindow', 'pw.rule.noDiuretics']
}

/**
 * Осемте дни.
 *
 * @param {object} cfg
 * @param {string} cfg.showDate            YYYY-MM-DD
 * @param {number} cfg.weightKg            текущото тегло — макросите се смятат на него
 * @param {number} [cfg.tdee]              поддръжка, за дните преди зареждането
 * @param {number} [cfg.carbPerKg]         г/кг за дните на зареждане
 * @param {2|3}    [cfg.loadDays]          от колко дни преди тръгва зареждането
 * @param {number} [cfg.cardioMinPerDay]   умерено кардио на ден, за курса към стъпки
 * @param {string} [cfg.adjust]            изборът за деня преди: keep | hold | pull
 */
export function buildPeakWeek({
  showDate,
  weightKg,
  tdee = null,
  carbPerKg = CARB_DEFAULT,
  loadDays = 3,
  cardioMinPerDay = 0,
  adjust = ADJUST.hold,
} = {}) {
  if (!showDate || !weightKg) return null

  const kg    = Number(weightKg)
  const gkg   = clamp(Number(carbPerKg) || CARB_DEFAULT, CARB_MIN, CARB_MAX)
  const load  = clamp(Number(loadDays) || 3, 2, 3)
  const steps = stepsTargetFor(cardioMinPerDay)

  const days = []
  for (let daysOut = 7; daysOut >= 0; daysOut--) {
    const phase = daysOut === 0 ? PHASE.show
      : daysOut === 1 ? PHASE.adjust
      : daysOut <= load ? PHASE.load
      : PHASE.taper

    const resting = phase === PHASE.adjust || phase === PHASE.show

    days.push({
      date:     shift(showDate, -daysOut),
      daysOut,
      phase,
      ...macrosFor(phase, kg, gkg, tdee, adjust),
      /* Тренировката е най-силният лост върху умората, а умората задържа вода.
         Затова обемът пада от първия ден, а не от последния. */
      training:  resting ? 'rest' : 'deload',
      volumeCut: resting ? null : VOLUME_CUT,
      steps:     resting ? null : steps,
      rules:     rulesFor(phase, daysOut === 7),
    })
  }

  /* Зареждане, което излиза под поддръжката, не е зареждане.
     Протеинът пада от 2.2 на 1.6 г/кг, мазнините от 0.8 на 0.4 — това само по
     себе си маха стотици калории, и при ниско г/кг въглехидратите не ги
     покриват. Резултатът изглежда като план, а е скрит дефицит точно в дните,
     в които човек трябва да се напълни. Не го нагласяме мълчаливо: числото си
     стои, а екранът казва колко трябва да е г/кг, за да излезе на плюс. */
  const loadDay  = days.find(d => d.phase === PHASE.load)
  const loadKcal = loadDay?.kcal ?? null
  let carbPerKgForSurplus = null
  if (tdee && loadKcal != null && loadKcal < tdee) {
    const needCarbs = (tdee - r0(kg * LOAD_PROTEIN_PER_KG) * 4 - r0(kg * LOAD_FAT_PER_KG) * 9) / 4
    carbPerKgForSurplus = Math.min(CARB_MAX, Math.ceil((needCarbs / kg) * 10) / 10)
  }

  return {
    showDate,
    startDate: shift(showDate, -7),
    loadDays: load,
    carbPerKg: gkg,
    stepsTarget: steps,
    loadKcal,
    /** Само когато знаем поддръжката и зареждането пада под нея. */
    lowLoad: carbPerKgForSurplus != null ? { tdee, loadKcal, needPerKg: carbPerKgForSurplus } : null,
    days,
  }
}

/** Денят от плана, който отговаря на дадена дата — null, ако е извън седмицата. */
export function dayFor(plan, isoDate) {
  return plan?.days.find(d => d.date === isoDate) ?? null
}

export { iso as isoOf, shift as addDays }
