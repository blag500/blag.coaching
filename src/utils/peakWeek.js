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
  taper:   'taper',    // сваляне на умората: делоуд, кардио → стъпки, храна до поддръжка
  weighin: 'weighin',  // кантарът: при клас по тегло това е обвързващият момент
  load:    'load',     // зареждане с въглехидрати
  adjust:  'adjust',   // един ден преди: продължаваш, задържаш или дърпаш назад
  show:    'show',     // денят
}

/**
 * Часовете, под които прозорецът от кантара до сцената е тесен.
 *
 * Източникът е пряк: при около осемнайсет часа между претеглянето и излизането
 * често просто няма как да се вкара достатъчно храна — стомахът не пропуска
 * толкова. Тогава изборът е между по-малко зареждане и друга категория, и той
 * се прави в понеделник, не в събота.
 */
export const WEIGHIN_TIGHT_HOURS = 18

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

/* Денят преди кантара: храната пада, но не защото се свалят калории — а
   защото обемът в стомаха тежи на кантара сам по себе си. Източникът е
   изричен, че за човек с клас по тегло по-малко храна и по-малко кардио бие
   повече кардио и повече храна. */
const PRE_WEIGHIN_CUT = 0.55

function macrosFor(phase, kg, carbPerKg, tdee, adjustChoice, opts = {}) {
  const { preWeighIn = false, postWeighIn = false } = opts

  if (phase === PHASE.taper) {
    const protein = r0(kg * BASE_PROTEIN_PER_KG)
    const fat     = r0(kg * BASE_FAT_PER_KG)
    /* Храната се качва до поддръжка. Ако не знаем поддръжката, оставяме
       въглехидратите неизвестни, вместо да измислим число. */
    let carbs = tdee ? Math.max(0, r0((tdee - protein * 4 - fat * 9) / 4)) : null
    if (preWeighIn && carbs != null) carbs = r0(carbs * PRE_WEIGHIN_CUT)
    return {
      protein, fat, carbs,
      kcal: carbs != null ? r0(carbs * 4 + protein * 4 + fat * 9) : (tdee ?? null),
    }
  }

  const loadCarbs = r0(kg * carbPerKg)
  const protein   = r0(kg * LOAD_PROTEIN_PER_KG)
  const fat       = r0(kg * LOAD_FAT_PER_KG)

  let carbs = loadCarbs
  /* След кантара свиване няма. „Задръж" е разумно, когато зад гърба ти има
     два-три дни зареждане; когато зад гърба ти има кантар отпреди часове,
     единственото, което върши работа, е да пълниш. */
  if (!postWeighIn && (phase === PHASE.adjust || phase === PHASE.show)) {
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
function rulesFor(phase, isFirst, makingWeight, preWeighIn) {
  const common = ['pw.rule.sodium', 'pw.rule.water']
  if (phase === PHASE.weighin) {
    return ['pw.rule.weighIn', 'pw.rule.afterWeighIn', 'pw.rule.fullRest', ...common]
  }
  if (phase === PHASE.taper) {
    const r = makingWeight
      /* При клас по тегло редът е друг: по-малко храна и по-малко кардио бие
         повече кардио и повече храна. Умората задържа вода, а обемът в стомаха
         тежи на кантара сам по себе си. */
      ? ['pw.rule.lowFoodLowCardio', 'pw.rule.gutVolume', ...common]
      : ['pw.rule.eatUp', 'pw.rule.noDeplete', ...common]
    if (preWeighIn) r.unshift('pw.rule.preWeighIn')
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
 * @param {string} [cfg.weighInDate]       YYYY-MM-DD, ако категорията има таван
 * @param {string} [cfg.weighInTime]       HH:MM
 * @param {string} [cfg.showTime]          HH:MM
 */
export function buildPeakWeek({
  showDate,
  weightKg,
  tdee = null,
  carbPerKg = CARB_DEFAULT,
  loadDays = 3,
  cardioMinPerDay = 0,
  adjust = ADJUST.hold,
  weighInDate = null,
  weighInTime = null,
  showTime = null,
} = {}) {
  if (!showDate || !weightKg) return null

  const kg    = Number(weightKg)
  const gkg   = clamp(Number(carbPerKg) || CARB_DEFAULT, CARB_MIN, CARB_MAX)
  const load  = clamp(Number(loadDays) || 3, 2, 3)
  const steps = stepsTargetFor(cardioMinPerDay)

  /* Кантарът е вторият краен срок, и при клас по тегло той е обвързващият.
     Зареждането качва два-три килограма за три дни — ако то върви преди
     претеглянето, човек прави тегло с натъпкан стомах или изобщо не го прави.
     Затова при обявен кантар зареждането тръгва СЛЕД него, а дните преди са
     ден за правене на тегло: малко храна, малко кардио, малко обем в стомаха. */
  const weighInDaysOut = weighInDate
    ? Math.round((fromIso(showDate) - fromIso(weighInDate)) / 86400000)
    : null
  const hasWeighIn = weighInDaysOut != null && weighInDaysOut >= 0 && weighInDaysOut <= 7

  const days = []
  for (let daysOut = 7; daysOut >= 0; daysOut--) {
    let phase
    if (hasWeighIn) {
      /* Денят на кантара е ден на кантара дори когато съвпада с деня на шоуто —
         тогава той просто е първата половина от него. */
      phase = daysOut === weighInDaysOut ? PHASE.weighin
        : daysOut > weighInDaysOut ? PHASE.taper
        : daysOut === 0 ? PHASE.show
        : PHASE.load
    } else {
      phase = daysOut === 0 ? PHASE.show
        : daysOut === 1 ? PHASE.adjust
        : daysOut <= load ? PHASE.load
        : PHASE.taper
    }

    const resting     = phase === PHASE.adjust || phase === PHASE.show || phase === PHASE.weighin
    const preWeighIn  = hasWeighIn && daysOut === weighInDaysOut + 1
    const postWeighIn = hasWeighIn && daysOut < weighInDaysOut

    days.push({
      date:     shift(showDate, -daysOut),
      daysOut,
      phase,
      ...macrosFor(phase, kg, gkg, tdee, adjust, { preWeighIn, postWeighIn }),
      /* Тренировката е най-силният лост върху умората, а умората задържа вода.
         Затова обемът пада от първия ден, а не от последния. */
      training:  resting ? 'rest' : 'deload',
      volumeCut: resting ? null : VOLUME_CUT,
      steps:     resting ? null : steps,
      rules:     rulesFor(phase, daysOut === 7, hasWeighIn, preWeighIn),
      isWeighIn: hasWeighIn && daysOut === weighInDaysOut,
      preWeighIn,
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

  /* Колко часа остават за пълнене след кантара. Дните не стигат за тази
     сметка: кантар в събота 8:00 при сцена в неделя 11:00 е двайсет и седем
     часа, а кантар в неделя 8:00 при същата сцена е три. */
  let weighIn = null
  if (hasWeighIn) {
    const wi = fromIso(weighInDate)
    const [wh, wm] = String(weighInTime ?? '08:00').split(':').map(Number)
    wi.setHours(wh || 0, wm || 0, 0, 0)

    const sh = fromIso(showDate)
    const [th, tm] = String(showTime ?? '11:00').split(':').map(Number)
    sh.setHours(th || 0, tm || 0, 0, 0)

    const hours = Math.round((sh - wi) / 3600000)
    weighIn = {
      date: weighInDate,
      time: weighInTime ?? null,
      daysOut: weighInDaysOut,
      hoursToShow: hours,
      tight: hours < WEIGHIN_TIGHT_HOURS,
    }
  }

  return {
    showDate,
    startDate: shift(showDate, -7),
    loadDays: load,
    carbPerKg: gkg,
    stepsTarget: steps,
    loadKcal,
    weighIn,
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
