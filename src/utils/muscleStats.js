import { classifyMuscle } from './recovery'

const DAY = 86_400_000

/**
 * Per-group readings the muscle map filters ask about — days since last hit,
 * seven-day tonnage, PR count, and volume trend over the last two weeks vs the
 * two before. Sessions carry labels, not per-exercise groups, so a session that
 * touches two groups splits its volume between them; the alternative is
 * counting one workout as two, which reads as twice the work done.
 */
export function muscleStats(sessions = [], completions = [], now = Date.now()) {
  const out = { upper: {}, lower: {}, pull: {}, extra: {} }
  for (const g of Object.keys(out)) {
    out[g] = { daysSince: null, volume7: 0, pr7: 0, recent14: 0, prior14: 0, overload: null }
  }

  const daysAgo = d => Math.round((now - new Date(d + 'T12:00:00').getTime()) / DAY)

  for (const c of completions) {
    const g = classifyMuscle(c.block_label)
    if (!g || g === 'full') continue
    const d = daysAgo(c.completed_date)
    if (out[g].daysSince == null || d < out[g].daysSince) out[g].daysSince = d
  }

  const cut7  = new Date(now - 7  * DAY).toISOString().slice(0, 10)
  const cut14 = new Date(now - 14 * DAY).toISOString().slice(0, 10)
  const cut28 = new Date(now - 28 * DAY).toISOString().slice(0, 10)

  for (const s of sessions) {
    const groups = (s.labels || [])
      .map(classifyMuscle)
      .filter(g => g && g !== 'full')
    if (!groups.length) continue

    const share = 1 / groups.length
    const vShare = (s.volume || 0) * share
    const pShare = (s.prCount || 0) * share

    if (s.date >= cut7) {
      for (const g of groups) {
        out[g].volume7 += vShare
        out[g].pr7    += pShare
      }
    }
    if (s.date >= cut14) {
      for (const g of groups) out[g].recent14 += vShare
    } else if (s.date >= cut28) {
      for (const g of groups) out[g].prior14 += vShare
    }
  }

  for (const g of Object.keys(out)) {
    const r = out[g].recent14
    const p = out[g].prior14
    out[g].overload = p > 0 ? (r - p) / p : (r > 0 ? 1 : null)
    out[g].pr7 = Math.round(out[g].pr7)
    out[g].volume7 = Math.round(out[g].volume7)
  }

  return out
}
