/**
 * One reading of a weight typed by a person.
 *
 * Lives apart because three screens ask for the same number — the card on Днес,
 * the profile, and the goal beside it — and each had been parsing it slightly
 * differently. The comma is the point: parseFloat stops at it, so "86,4" became
 * 86 and the decimal, which is the whole reason for weighing daily, was thrown
 * away by the parser rather than by the scale.
 */

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
