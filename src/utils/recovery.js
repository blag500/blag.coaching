/**
 * How recovered each muscle group is, from what has actually been trained.
 *
 * Shared, because two screens need the same answer: the readiness card reports
 * it, and the training screen now chooses the session with it. Two copies of a
 * rule like this drift within a month.
 */

// Hours to full recovery. Legs take longest, which is why a lower day and an
// upper day are not interchangeable when deciding what is owed.
// Forearms, traps and neck take small loads and recover fastest, which is why
// they can be trained beside anything else — that is the point of an accessory
// day, and a 48-hour window would have kept locking it out.
export const RECOVERY_H = { upper: 48, lower: 72, pull: 48, extra: 36 }

export const GROUP_LABEL_KEYS = {
  upper: 'group.upper', lower: 'group.lower', pull: 'group.pull', extra: 'group.extra',
}

/**
 * Fine-grained muscle vocabulary used by the exercise tagger — the pencil at
 * the row lets the user say "this is гърди" rather than "this is ГОРНА",
 * which is what people actually think in. Each fine muscle carries the broad
 * group it belongs to; recovery and the mannequin still work on the 4-group
 * axis, so tagging fine translates to broad without the rest of the app
 * needing to know.
 */
export const FINE_MUSCLES = [
  { id: 'chest',      labelKey: 'muscle.chest',      broad: 'upper' },
  { id: 'shoulders',  labelKey: 'muscle.shoulders',  broad: 'upper' },
  { id: 'triceps',    labelKey: 'muscle.triceps',    broad: 'upper' },
  { id: 'back',       labelKey: 'muscle.back',       broad: 'pull'  },
  { id: 'biceps',     labelKey: 'muscle.biceps',     broad: 'pull'  },
  { id: 'reardelts',  labelKey: 'muscle.reardelts',  broad: 'upper' },
  { id: 'quads',      labelKey: 'muscle.quads',      broad: 'lower' },
  { id: 'hamstrings', labelKey: 'muscle.hamstrings', broad: 'lower' },
  { id: 'glutes',     labelKey: 'muscle.glutes',     broad: 'lower' },
  { id: 'adductors',  labelKey: 'muscle.adductors',  broad: 'lower' },
  { id: 'abductors',  labelKey: 'muscle.abductors',  broad: 'lower' },
  { id: 'calves',     labelKey: 'muscle.calves',     broad: 'extra' },
  { id: 'abs',        labelKey: 'muscle.abs',        broad: 'extra' },
  { id: 'obliques',   labelKey: 'muscle.obliques',   broad: 'extra' },
  { id: 'lowerback',  labelKey: 'muscle.lowerback',  broad: 'extra' },
  { id: 'forearms',   labelKey: 'muscle.forearms',   broad: 'extra' },
  { id: 'traps',      labelKey: 'muscle.traps',      broad: 'extra' },
  { id: 'neck',       labelKey: 'muscle.neck',       broad: 'extra' },
]

const FINE_TO_BROAD = Object.fromEntries(FINE_MUSCLES.map(m => [m.id, m.broad]))

/** Translate a stored tag (fine muscle id, or a legacy broad group id) into
 *  the broad-group axis the rest of the app runs on. */
export function tagToBroad(tag) {
  if (!tag) return null
  if (tag in RECOVERY_H) return tag        // legacy broad tag
  return FINE_TO_BROAD[tag] ?? null
}

export const GROUP_COLORS = {
  upper: 'var(--accent)',
  lower: 'var(--macro-carbs)',
  pull:  'var(--macro-protein)',
  extra: 'var(--macro-fat)',
}

// Nothing here is exhaustive and it cannot be. A label is free text a coach
// typed, so the honest position is that some will not be recognised — see
// blockReadiness for what happens then.
// Order matters: the accessory patterns are checked first, because "предмишница"
// contains nothing the others match but "врат" and "корем" would otherwise fall
// through to nothing at all.
/* Списък, а не речник: една група се появява два пъти, и редът между двете
   ѝ появи е това, което върши работата.
   Приводящите и отвеждащите се хващат преди всичко останало — „отвеждащо
   бедро" иначе минава за бедро, което е вярно, но по-грубо от нужното.
   Долният гръб е в „екстра", а не в „дърпане", защото манекенът рисува
   еректорите там: една дума на две места значи цветът да пали друго място,
   а не онова, което човекът е тренирал. */
const PATTERNS = [
  ['lower', /аддукт|adduct|абдукт|abduct|привежд|отвежд/],
  ['extra', /екстра|extra|аксесо|accessor|предмишн|forearm|трапец|trap|врат|neck|корем|abs|коремни|коси|oblique|долен гръб|поясн|еректор|erector|lower ?back|прасц|калф|calf/],
  ['upper', /горн|upper|гърди|гръден|chest|пуш|push|бутан|рам|shoulder|делт|delt|трицеп|tricep/],
  ['lower', /долн|lower|крак|leg|бедр|глутеу|седалищ|прасец|quad|ham|клек|squat/],
  ['pull',  /пул|pull|дърпан|гръб|back|бицеп|bicep|ръц|arm|лат/],
]

/** Which group a block label belongs to, or null if it names nothing known. */
export function classifyMuscle(label = '') {
  const l = label.toLowerCase()
  // Full body is every group at once, which is not a group — the caller has to
  // decide what to do with that, and pretending it is "upper" would be worse.
  if (/цяло тяло|full ?body|фул ?боди/.test(l)) return 'full'
  for (const [group, re] of PATTERNS) {
    if (re.test(l)) return group
  }
  return null
}

/**
 * The muscle groups a block touches, in one place.
 *
 * If the editor has stored explicit groups on the block, those win — a user
 * calling their block "Ден 1" and ticking ГРЪБ and ЕКСТРА is unambiguous, and
 * the label-based classifier would have returned null for that name and left
 * the mannequin dark. When no explicit groups are set (older plans), fall
 * back to what the label and any free-text muscle notes suggest.
 */
export function resolveGroups(block, exerciseMap = null) {
  if (!block) return []
  const out = new Set()

  // Explicit groups still lead — the coach ticked them on purpose. Fine muscle
  // ids (chest, biceps, quads…) are translated to the broad axis the recovery
  // clock runs on, so a block tagged „Гърди + Трицепс" lights up ГОРНА even
  // though neither of those two chips names the broad group directly.
  if (Array.isArray(block.groups) && block.groups.length) {
    for (const g of block.groups) {
      const broad = tagToBroad(g)
      if (broad) out.add(broad)
    }
  }

  // Label — "Upper A" catches upper, but an old plan without explicit groups
  // needs more than a single classification. Kept as a hint, not the sole
  // source: an Upper A that actually holds pull-ups touches pull whether the
  // label says so or not.
  const fromLabel = classifyMuscle(block.label)
  if (fromLabel === 'full') for (const g of Object.keys(RECOVERY_H)) out.add(g)
  else if (fromLabel) out.add(fromLabel)

  // Free-text muscle notes on the block, if any.
  for (const m of block.muscles ?? []) {
    const g = classifyMuscle(m)
    if (g && g !== 'full') out.add(g)
  }

  // Union in whatever the exercises themselves imply. Explicit user tags from
  // the exerciseMap win over the regex classifier — a lift the user has
  // labelled "belongs to гърди" (fine) trumps a name the classifier does not
  // recognise. Fine tags are translated to the broad group they belong to.
  for (const ex of block.exercises ?? []) {
    const name = ex.name || ''
    const broad = tagToBroad(exerciseMap?.[name])
    if (broad) { out.add(broad); continue }
    const g = classifyMuscle(name)
    if (g && g !== 'full') out.add(g)
  }

  return [...out]
}

/**
 * How much the day's soreness holds everything back.
 *
 * Soreness is reported for the body, not per muscle, so it cannot slow one
 * group and not another — but it can say the whole body is not ready. Hours
 * since training is a clock; this is the person. A clock that ignores someone
 * saying they are wrecked is the reason people stop trusting these numbers.
 *
 * 1 and 2 out of 5 change nothing: mild stiffness is training, not damage.
 */
export function sorenessDamping(soreness) {
  if (!soreness || soreness <= 2) return 1
  if (soreness === 3) return 0.9
  if (soreness === 4) return 0.75
  return 0.6
}

/**
 * Recovery per group from a list of { block_label, completed_date }.
 * A group never trained counts as fully recovered — there is nothing to wait for.
 *
 * `soreness` is today's check-in answer, if there is one.
 */
/** Parse a plain YYYY-MM-DD string as local noon of that day, in ms since
 *  epoch. `new Date('YYYY-MM-DD')` parses as UTC midnight — for a client in
 *  UTC+3 that meant "yesterday" started 3 hours before local midnight plus
 *  all of today's hours, and Upper A logged yesterday morning read as ~35h
 *  ago, so 75% recovered when it should have been ~50%. Local noon is a fair
 *  midpoint for a workout on that date. */
function dateNoonMs(dateStr) {
  if (!dateStr) return 0
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0).getTime()
}

export function muscleRecovery(workouts = [], now = Date.now(), soreness = null, groupsByLabel = null) {
  const lastMs = {}
  for (const w of workouts) {
    let groups
    if (groupsByLabel && groupsByLabel[w.block_label]?.length) {
      groups = groupsByLabel[w.block_label]
    } else {
      const g = classifyMuscle(w.block_label)
      groups = g && g !== 'full' ? [g] : []
    }
    const ms = dateNoonMs(w.completed_date)
    for (const g of groups) {
      if (!lastMs[g] || ms > lastMs[g]) lastMs[g] = ms
    }
  }

  const damp = sorenessDamping(soreness)

  const out = {}
  for (const g of Object.keys(RECOVERY_H)) {
    if (!lastMs[g]) {
      // Nothing to recover from, but a wrecked body is still a wrecked body.
      out[g] = { pct: Math.round(100 * damp), hours: null, trained: false, damped: damp < 1 }
      continue
    }
    const hours = (now - lastMs[g]) / 3_600_000
    const clock = Math.min(100, (hours / RECOVERY_H[g]) * 100)
    out[g] = {
      pct: Math.round(clock * damp),
      hours: Math.round(hours),
      trained: true,
      damped: damp < 1,
    }
  }
  return out
}

// When a label names no group the app knows, the block is still judged — just
// on itself rather than on muscles. Two days is a defensible default for any
// session, and it is the same figure upper and back already use.
const UNKNOWN_H = 48

/**
 * How ready a block is to be trained.
 *
 * Normally: the state of its own muscle group, and a block covering several is
 * held back by the least recovered of them, since that is the one that gives
 * out first.
 *
 * When nothing in the label is recognised — a bro split with "Ръце", a full
 * body day, a coach writing "Бутане" — it falls back to how long since this
 * exact block was last done. That is always knowable and never wrong; the
 * alternative was returning 100%, which quietly told everyone on a split the
 * app does not understand that they were fully recovered, every single day.
 */
export function blockReadiness(block, recovery, lastDoneByLabel = {}, now = Date.now()) {
  const groups = new Set(resolveGroups(block))
  // Full-body ден е задържан от най-невъзстановената група — там наистина
  // всичко влиза в основната работа.
  if (!groups.size && classifyMuscle(block.label) === 'full') {
    for (const g of Object.keys(RECOVERY_H)) groups.add(g)
    let worst = { pct: 101, group: null }
    for (const g of groups) {
      const pct = recovery[g]?.pct ?? 100
      if (pct < worst.pct) worst = { pct, group: g, basis: 'muscle' }
    }
    return worst
  }

  if (groups.size) {
    /* Използваме основната група (primary), не най-слабо възстановената.
       Причина: Upper A има ['upper', 'pull', 'extra'] по default — ако extra
       е тренуван вчера (примерно Прасци в Lower A), Upper A показваше 37%
       възстановен, въпреки че upper е 100%. Това лъже: тренировката на
       гърди/рамене/трицепс не се компромисва от изморените прасци.

       Primary се дефинира по label-а — 'Upper A' → upper. Ако label-ът не
       се разпознае, взимаме първата от block.groups (accessoy-и обикновено
       се записват накрая), а иначе — първата от resolveGroups. */
    const fromLabel = classifyMuscle(block.label)
    const primary =
      (fromLabel && fromLabel !== 'full' && groups.has(fromLabel)) ? fromLabel :
      (Array.isArray(block.groups) && block.groups.length)
        ? (tagToBroad(block.groups[0]) || [...groups][0])
        : [...groups][0]
    const pct = recovery[primary]?.pct ?? 100
    return { pct, group: primary, basis: 'muscle' }
  }

  const last = lastDoneByLabel[block.label]
  if (!last) return { pct: 100, group: null, basis: 'never' }
  const hours = (now - dateNoonMs(last)) / 3_600_000
  return {
    pct: Math.min(100, Math.round((hours / UNKNOWN_H) * 100)),
    group: null,
    basis: 'block',
    hours: Math.round(hours),
  }
}
