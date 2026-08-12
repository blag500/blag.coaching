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
 * Recovery per group from a list of { block_label, completed_date }.
 * A group never trained counts as fully recovered — there is nothing to wait for.
 */
export function muscleRecovery(workouts = [], now = Date.now()) {
  const lastMs = {}
  for (const w of workouts) {
    const g = classifyMuscle(w.block_label)
    if (!g) continue
    const ms = new Date(w.completed_date).getTime()
    if (!lastMs[g] || ms > lastMs[g]) lastMs[g] = ms
  }

  const out = {}
  for (const g of Object.keys(RECOVERY_H)) {
    if (!lastMs[g]) { out[g] = { pct: 100, hours: null, trained: false }; continue }
    const hours = (now - lastMs[g]) / 3_600_000
    out[g] = {
      pct: Math.min(100, Math.round((hours / RECOVERY_H[g]) * 100)),
      hours: Math.round(hours),
      trained: true,
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
