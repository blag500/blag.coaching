/**
 * How recovered each muscle group is, from what has actually been trained.
 *
 * Shared, because two screens need the same answer: the readiness card reports
 * it, and the training screen now chooses the session with it. Two copies of a
 * rule like this drift within a month.
 */

// Hours to full recovery. Legs take longest, which is why a lower day and an
// upper day are not interchangeable when deciding what is owed.
export const RECOVERY_H = { upper: 48, lower: 72, pull: 48 }

export const GROUP_LABELS = { upper: 'ГОРНА', lower: 'ДОЛНА', pull: 'ГРЪБ' }

export const GROUP_COLORS = {
  upper: 'var(--accent)',
  lower: 'var(--macro-carbs)',
  pull:  'var(--macro-protein)',
}

/** Which group a block label belongs to, or null if it names nothing known. */
export function classifyMuscle(label = '') {
  const l = label.toLowerCase()
  if (/горн|upper|гърди|chest|пуш|push|рам|shoulder|трицеп|tricep/.test(l)) return 'upper'
  if (/долн|lower|крак|leg|бедр|глутеу|quad|ham/.test(l)) return 'lower'
  if (/пул|pull|гръб|back|бицеп|bicep/.test(l)) return 'pull'
  return null
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
export function muscleRecovery(workouts = [], now = Date.now(), soreness = null) {
  const lastMs = {}
  for (const w of workouts) {
    const g = classifyMuscle(w.block_label)
    if (!g) continue
    const ms = new Date(w.completed_date).getTime()
    if (!lastMs[g] || ms > lastMs[g]) lastMs[g] = ms
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

/**
 * How ready a block is to be trained: the state of its own muscle group. A
 * block covering more than one group is held back by the least recovered of
 * them, since that is the one that will give out first.
 */
export function blockReadiness(block, recovery) {
  const groups = new Set()
  const fromLabel = classifyMuscle(block.label)
  if (fromLabel) groups.add(fromLabel)
  for (const m of block.muscles ?? []) {
    const g = classifyMuscle(m)
    if (g) groups.add(g)
  }
  if (!groups.size) return { pct: 100, group: null }

  let worst = { pct: 101, group: null }
  for (const g of groups) {
    const pct = recovery[g]?.pct ?? 100
    if (pct < worst.pct) worst = { pct, group: g }
  }
  return worst
}
