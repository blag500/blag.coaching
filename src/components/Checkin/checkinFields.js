/**
 * Какво пита чекинът — на едно място.
 *
 * Три екрана се хранят оттук: формулярът, който клиентът попълва, редът по ред
 * сравнението между две седмици, и панелът на треньора. Ако всеки от тях си
 * държи собствен списък, до месец един от тях пита нещо, което другите два не
 * умеят да покажат.
 *
 * `better` е това, което прави сравнението четимо. Разликата сама по себе си е
 * число; смисълът ѝ е в посоката. Стрес нагоре е тревога, енергия надолу е
 * тревога, калипер надолу при сваляне е добре — едно и също „+2" значи различно
 * нещо на два съседни реда, и екранът трябва да го знае, вместо да оставя
 * треньора да си го спомня.
 */

/** Скалите: избор от копчета, защото на телефон плъзгачът лъже с пръст. */
export const CHECKIN_FIELDS = [
  // ── Как се чувстваш ───────────────────────────────────────────────
  {
    key: 'hunger', group: 'feel', type: 'scale', min: 1, max: 5, better: 'down',
    labelKey: 'ck.f.hunger', hintKey: 'ck.f.hungerHint',
  },
  {
    key: 'stress', group: 'feel', type: 'scale', min: 1, max: 10, better: 'down',
    labelKey: 'ck.f.stress', hintKey: 'ck.f.stressHint',
  },
  {
    key: 'energy', group: 'feel', type: 'scale', min: 1, max: 10, better: 'up',
    labelKey: 'ck.f.energy', hintKey: 'ck.f.energyHint',
  },
  {
    key: 'gym_performance', group: 'feel', type: 'trend', better: 'up',
    labelKey: 'ck.f.strength',
  },

  // ── Мереното вкъщи ────────────────────────────────────────────────
  // Нищо тук не е задължително. Клиент без калипер не бива да гледа празно
  // поле всяка седмица като упрек — празното е просто празно.
  {
    key: 'waist_cm', group: 'body', type: 'number', step: '0.1', better: 'down',
    labelKey: 'ck.f.waist', unitKey: 'unit.cm',
  },
  {
    key: 'calipers', group: 'body', type: 'triple', better: 'down',
    parts: ['caliper_1', 'caliper_2', 'caliper_3'], step: '0.5',
    labelKey: 'ck.f.calipers', hintKey: 'ck.f.calipersHint',
  },
  {
    key: 'resting_hr', group: 'body', type: 'number', better: 'down',
    labelKey: 'ck.f.restingHr', unitKey: 'unit.bpm',
  },
  {
    key: 'bp', group: 'body', type: 'pair', better: 'down',
    parts: ['bp_systolic', 'bp_diastolic'], sep: '/',
    labelKey: 'ck.f.bp',
  },
  {
    key: 'glucose', group: 'body', type: 'number', better: null,
    labelKey: 'ck.f.glucose', unitKey: 'unit.mgdl',
  },
  {
    key: 'steps_avg', group: 'body', type: 'number', better: 'up',
    labelKey: 'ck.f.steps',
  },
  {
    key: 'cycle_on', group: 'body', type: 'bool', better: null,
    labelKey: 'ck.f.cycle', femaleOnly: true,
  },

  // ── С думи ────────────────────────────────────────────────────────
  { key: 'strength_note',  group: 'words', type: 'text', labelKey: 'ck.f.strengthNote' },
  { key: 'issues',         group: 'words', type: 'text', labelKey: 'ck.f.issues' },
  { key: 'digestion',      group: 'words', type: 'text', labelKey: 'ck.f.digestion' },
  { key: 'weekly_win',     group: 'words', type: 'text', labelKey: 'ck.f.win' },
  { key: 'weekly_improve', group: 'words', type: 'text', labelKey: 'ck.f.improve' },
  { key: 'notes',          group: 'words', type: 'text', labelKey: 'ck.f.other' },
]

export const CHECKIN_GROUPS = [
  { id: 'feel',  labelKey: 'ck.g.feel'  },
  { id: 'body',  labelKey: 'ck.g.body'  },
  { id: 'words', labelKey: 'ck.g.words' },
]

/**
 * Позите.
 *
 * Фиксирани гнезда, а не албум. Смисълът на снимката в чекина е една-единствена
 * работа: същата поза, две седмици, една до друга. Албум от десет снимки в
 * произволен ред кара треньора да ги подрежда наум всеки път — точно това
 * прави сравнението на образеца ръчно („щракни отляво, после отдясно").
 *
 * Шест, не десет. Задължителните пози от състезание минус повторенията; в
 * събота сутрин с телефон на статив разликата между шест и десет е дали ще се
 * прави изобщо.
 */
export const POSES = [
  { key: 'front_relaxed', labelKey: 'ck.pose.frontRelaxed' },
  { key: 'front_double',  labelKey: 'ck.pose.frontDouble'  },
  { key: 'side_chest',    labelKey: 'ck.pose.sideChest'    },
  { key: 'abs_thigh',     labelKey: 'ck.pose.absThigh'     },
  { key: 'back_relaxed',  labelKey: 'ck.pose.backRelaxed'  },
  { key: 'back_double',   labelKey: 'ck.pose.backDouble'   },
]

/**
 * Онова, което приложението знае само.
 *
 * Стои в същия списък като въпросите и се рисува със същия ред, защото за
 * треньора няма разлика: и двете са числа за седмицата. Разликата е само коя
 * от двете страни ги е дала, и това е работа на приложението, не на клиента.
 *
 * Теглото няма посока нарочно. При сваляне надолу е добре, в междинен период
 * не е — а приложението не бива да боядисва в червено нещо, за което не знае.
 */
export const AUTO_FIELDS = [
  { key: 'weightAvg',    type: 'number', better: null, labelKey: 'ck.a.weight',   unitKey: 'unit.kg' },
  { key: 'trainings',    type: 'number', better: 'up', labelKey: 'ck.a.trainings' },
  { key: 'onTargetDays', type: 'number', better: 'up', labelKey: 'ck.a.onTarget'  },
  { key: 'loggedDays',   type: 'number', better: 'up', labelKey: 'ck.a.logged'    },
  { key: 'sleepAvg',     type: 'number', better: 'up', labelKey: 'ck.a.sleep',    unitKey: 'unit.h' },
  { key: 'habitsPct',    type: 'number', better: 'up', labelKey: 'ck.a.habits',   unitKey: 'unit.pct' },
]

/** Стойността на едно поле от един запис — съставните се сглобяват тук. */
export function valueOf(field, row) {
  if (!row) return null
  if (field.type === 'triple' || field.type === 'pair') {
    const parts = field.parts.map(p => row[p])
    return parts.every(v => v == null) ? null : parts
  }
  return row[field.key] ?? null
}

/**
 * Разликата между два записа, с преценка добре ли е.
 *
 * `verdict` е 'good' | 'bad' | 'flat' | null. Null значи „има промяна, но никой
 * не е казал накъде е добре" — тогава екранът показва числото и си мълчи, което
 * е по-честно от това да боядиса нещо в зелено на своя глава.
 */
export function deltaOf(field, cur, prev) {
  const a = valueOf(field, cur)
  const b = valueOf(field, prev)
  if (a == null || b == null) return null

  // Съставните се сравняват по сбор: три калипера падат заедно или не падат.
  const num = v => (Array.isArray(v) ? v.reduce((s, x) => s + (Number(x) || 0), 0) : Number(v))
  if (field.type === 'bool') return null
  const d = Math.round((num(a) - num(b)) * 10) / 10
  if (!Number.isFinite(d)) return null

  const verdict = d === 0 ? 'flat'
    : !field.better ? null
    : (d > 0) === (field.better === 'up') ? 'good' : 'bad'

  return { d, verdict }
}
