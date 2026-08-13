/**
 * How long a set-to-set cycle takes, read off the clock rather than asked for.
 *
 * Nobody times a set. But since one row per set, every ✓ carries the moment it
 * was tapped, so the gaps between consecutive sets of the same exercise are
 * already recorded — no stopwatch, no field, nothing to remember in the gym.
 *
 * Deliberately not called rest: the interval holds the set itself and the walk
 * to the water bottle as well as the standing around. Naming it "rest" would
 * promise a number this cannot produce.
 *
 * What it is good for is density. Same weight, same reps, gaps down from 3:20
 * to 2:30 means more work in less time — the direction time under tension is
 * reaching for, visible exactly where the load sits still.
 */

/** Below this a gap is not a rest — it is a session typed up afterwards. */
const MIN_GAP_S = 30
/** Above it, something interrupted the session; a real rest is not 8 minutes. */
const MAX_GAP_S = 8 * 60

/** Two gaps is the least that can be called a pace rather than an incident. */
const MIN_SAMPLES = 2

/** The middle value. Not the mean: one long interruption drags a mean and
 *  leaves a median where it was, and interruptions are the common case. */
function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Seconds between consecutive sets, or null when the timings cannot support a
 * figure — which is a better answer than a made-up one.
 *
 * @param {Array<{created_at?: string}>} rows sets of one exercise, one session
 */
export function setPace(rows) {
  const times = (rows ?? [])
    .map(r => (r.created_at ? new Date(r.created_at).getTime() : null))
    .filter(Boolean)
    .sort((a, b) => a - b)

  if (times.length < MIN_SAMPLES + 1) return null

  const gaps = []
  for (let i = 1; i < times.length; i++) {
    const s = (times[i] - times[i - 1]) / 1000
    if (s >= MIN_GAP_S && s <= MAX_GAP_S) gaps.push(s)
  }

  if (gaps.length < MIN_SAMPLES) return null
  return Math.round(median(gaps))
}

/** 150 → "2:30". Seconds padded, because "2:3" reads as two and three. */
export function formatPace(seconds) {
  if (seconds == null) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
