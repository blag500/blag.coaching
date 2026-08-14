/**
 * A weight typed before there was an account to put it in.
 *
 * The landing page asks for one number, because one number is a thing a
 * stranger will actually do — the button above it asks them to commit to an
 * application they have never heard of. But the number has nowhere to go yet:
 * there is no user, no row, no table. So it waits here until onboarding, where
 * it replaces the 80 kg placeholder and drives the macro calculation.
 *
 * If it did not survive the trip, the visitor would type their weight, register,
 * and be asked for their weight again — which is worse than never asking, since
 * it says the first answer was for nothing.
 *
 * A week, not a month like the traffic source: a weight from three weeks ago is
 * a wrong weight, and wrong is worse here than missing.
 */
const KEY = 'blag.pendingWeight'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000

// Anything outside this is a typo or a joke, and a typo that reaches the macro
// formula produces a calorie target nobody can spot as wrong.
const MIN_KG = 30
const MAX_KG = 300

/** Accepts "82,5" as readily as "82.5" — the comma is the Bulgarian decimal. */
export function parseWeight(text) {
  const n = parseFloat(String(text).replace(',', '.').trim())
  if (!Number.isFinite(n) || n < MIN_KG || n > MAX_KG) return null
  return Math.round(n * 10) / 10
}

export function savePendingWeight(text) {
  const kg = parseWeight(text)
  if (kg === null) return null
  try {
    localStorage.setItem(KEY, JSON.stringify({ kg, at: Date.now() }))
  } catch { /* private mode: the number is lost, the visit is not */ }
  return kg
}

export function readPendingWeight() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { kg, at } = JSON.parse(raw)
    if (!kg || Date.now() - at > MAX_AGE) return null
    return kg
  } catch { return null }
}

/** Called once it has been written to a real row, so it cannot be used twice. */
export function clearPendingWeight() {
  try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}
