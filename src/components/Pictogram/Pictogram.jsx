import styles from './Pictogram.module.css'

/**
 * One drawn set for the whole app.
 *
 * Emoji were doing this job in the habits row while the macros had drawings,
 * which put two languages on one screen — and emoji bring their own palette and
 * their own house style, so they never sit inside a design, they sit on top of
 * it. Everything here is outlined at the same stroke weight and inherits
 * currentColor, so a row can be one colour from its icon to its number.
 */
const SHAPES = {
  // ── Macros ──
  kcal: (
    <>
      <path d="M12 3s4.6 3.9 4.6 8.3a4.6 4.6 0 0 1-9.2 0C7.4 8.7 9 6.7 12 3z" />
      <path d="M12 12.6s1.9 1.5 1.9 3.1a1.9 1.9 0 0 1-3.8 0c0-1.2.8-2.1 1.9-3.1z" />
    </>
  ),
  /* A drumstick. The first attempt — a cut of meat with the bone as a dot in
     the middle — came out reading as an eye. */
  protein: (
    <>
      <path d="M14 10a4.2 4.2 0 1 1 5.9-5.9A4.2 4.2 0 0 1 14 10z" />
      <path d="M14 10 9.6 14.4" />
      <circle cx="7.9" cy="15.3" r="2.2" />
      <circle cx="6.7" cy="17.7" r="2.2" />
    </>
  ),
  carbs: (
    <>
      <path d="M12 21v-8.2" />
      <path d="M12 12.8c-2.3-.2-3.7-1.7-3.8-4 2.3.2 3.7 1.7 3.8 4z" />
      <path d="M12 12.8c2.3-.2 3.7-1.7 3.8-4-2.3.2-3.7 1.7-3.8 4z" />
      <path d="M12 8.6c-2-.2-3.2-1.6-3.3-3.6 2 .2 3.2 1.6 3.3 3.6z" />
      <path d="M12 8.6c2-.2 3.2-1.6 3.3-3.6-2 .2-3.2 1.6-3.3 3.6z" />
    </>
  ),
  fat: (
    <>
      <path d="M12 3.2c3.5 4.2 5.3 6.7 5.3 9.1a5.3 5.3 0 0 1-10.6 0c0-2.4 1.8-4.9 5.3-9.1z" />
      <path d="M9.5 13.4a2.5 2.5 0 0 0 1.5 2.7" />
    </>
  ),

  // ── Habits ──
  // Water is a glass, not a droplet: the droplet already means fat, and two
  // rows of the same shape in different colours is how a set stops working.
  water: (
    <>
      <path d="M7 3.6h10l-1.2 15.6a1.7 1.7 0 0 1-1.7 1.6H9.9a1.7 1.7 0 0 1-1.7-1.6z" />
      <path d="M7.7 10.6h8.6" />
    </>
  ),
  training: (
    <>
      <path d="M6.6 8.6v6.8M4.2 10.4v3.2M17.4 8.6v6.8M19.8 10.4v3.2" />
      <path d="M6.6 12h10.8" />
    </>
  ),
  sleep: (
    <>
      <path d="M20.2 13.8A8.2 8.2 0 1 1 10.3 3.9a6.6 6.6 0 0 0 9.9 9.9z" />
      <path d="M16.6 4.4v2.2M15.5 5.5h2.2" />
    </>
  ),
  /* Someone walking, not a pair of footprints: two soles at this size are two
     smudges, and a figure in motion is the thing the number is counting. */
  steps: (
    <>
      <circle cx="13.4" cy="4.4" r="2" />
      <path d="M10.6 21.2 13 15.4l-2.5-2.3.9-4.6 3 2.3 2.7 1" />
      <path d="M8.6 12.6 11.4 8.5" />
      <path d="M14.6 15.6 16.3 21.2" />
    </>
  ),
  nosugar: (
    <>
      <rect x="6.4" y="7.6" width="11.2" height="8.8" rx="1.6" />
      <path d="M6.4 10.4h11.2M12 7.6v8.8" />
      <path d="M4.6 19.4 19.4 4.6" />
    </>
  ),

  // Anything a coach invents: still drawn, still the same weight.
  generic: (
    <>
      <circle cx="12" cy="12" r="7.4" />
      <path d="M9 12.2l2.1 2.1 4-4.4" />
    </>
  ),
}

export default function Pictogram({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`${styles.icon} ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name] ?? SHAPES.generic}
    </svg>
  )
}
