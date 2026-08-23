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

export const GROUP_LABELS = {
  upper: 'ГОРНА', lower: 'ДОЛНА', pull: 'ГРЪБ', extra: 'ЕКСТРА',
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
const PATTERNS = {
  extra: /екстра|extra|аксесо|accessor|предмишн|forearm|трапец|trap|врат|neck|корем|abs|коремни|прасц|калф|calf/,
  upper: /горн|upper|гърди|гръден|chest|пуш|push|бутан|рам|shoulder|делт|трицеп|tricep/,
  lower: /долн|lower|крак|leg|бедр|глутеу|седалищ|прасец|quad|ham|клек|squat/,
  pull:  /пул|pull|дърпан|гръб|back|бицеп|bicep|ръц|arm|лат/,
}

/** Which group a block label belongs to, or null if it names nothing known. */
export function classifyMuscle(label = '') {
  const l = label.toLowerCase()
  // Full body is every group at once, which is not a group — the caller has to
  // decide what to do with that, and pretending it is "upper" would be worse.
  if (/цяло тяло|full ?body|фул ?боди/.test(l)) return 'full'
  for (const [group, re] of Object.entries(PATTERNS)) {
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
export function resolveGroups(block) {
  if (!block) return []
  if (Array.isArray(block.groups) && block.groups.length) {
    return block.groups.filter(g => g in RECOVERY_H)
  }
  const out = new Set()
  const fromLabel = classifyMuscle(block.label)
  if (fromLabel === 'full') for (const g of Object.keys(RECOVERY_H)) out.add(g)
  else if (fromLabel) out.add(fromLabel)
  for (const m of block.muscles ?? []) {
    const g = classifyMuscle(m)
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
    const ms = new Date(w.completed_date).getTime()
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
  // A full-body day is held back by whichever group is furthest from ready.
  if (!groups.size && classifyMuscle(block.label) === 'full') {
    for (const g of Object.keys(RECOVERY_H)) groups.add(g)
  }

  if (groups.size) {
    let worst = { pct: 101, group: null }
    for (const g of groups) {
      const pct = recovery[g]?.pct ?? 100
      if (pct < worst.pct) worst = { pct, group: g, basis: 'muscle' }
    }
    return worst
  }

  const last = lastDoneByLabel[block.label]
  if (!last) return { pct: 100, group: null, basis: 'never' }
  const hours = (now - new Date(last).getTime()) / 3_600_000
  return {
    pct: Math.min(100, Math.round((hours / UNKNOWN_H) * 100)),
    group: null,
    basis: 'block',
    hours: Math.round(hours),
  }
}
