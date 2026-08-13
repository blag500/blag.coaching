import styles from './Pictogram.module.css'

/**
 * One drawn set for the whole app.
 *
 * Emoji were doing this job in the habits row while the macros had drawings,
 * which put two languages on one screen — and emoji bring their own palette and
 * their own house style, so they never sit inside a design, they sit on top of
 * it.
 *
 * Every icon is an outline plus one filled part. Pure outlines at a single
 * stroke weight came out uniform: six of them side by side read as six scribbles
 * of equal density and the eye had to inspect each one to tell them apart. A
 * solid area gives each shape its own weight and its own centre of gravity,
 * which is what makes a row scannable rather than merely legible.
 */
const SHAPES = {
  // ── Macros ──
  kcal: {
    line: <path d="M12 3s4.6 3.9 4.6 8.3a4.6 4.6 0 0 1-9.2 0C7.4 8.7 9 6.7 12 3z" />,
    solid: <path d="M12 12.4c1.2 1.1 1.9 2.1 1.9 3.3a1.9 1.9 0 0 1-3.8 0c0-1.2.7-2.2 1.9-3.3z" />,
  },
  // A steak: the cut, the bone, the marbling, and a fat cap along the bottom.
  // The fish before it was clear but wrong — nobody thinks "protein" and pictures
  // a fish, they picture the thing on the plate.
  protein: {
    line: (
      <>
        <path d="M5 11.2c0-3.5 3.3-6.1 7.6-6.1 3.9 0 6.7 2.1 6.7 4.9 0 2-1.4 3.4-2.8 4.2-1.7 1-2.2 2.7-4.3 3.1-2.4.5-4.7-.4-5.9-2.1-1-1.4-1.3-2.6-1.3-4z" />
        <circle cx="9.1" cy="10.1" r="1.6" />
        <path d="M12.9 8.7c1.6.2 3 .7 4 1.4" />
      </>
    ),
    solid: <path d="M6.2 14.6c1.4 1.5 3.5 2.2 5.6 1.7.9-.2 1.6-.6 2.2-1.1-.5 1-1.2 1.8-2.5 2.1-2.4.5-4.7-.4-5.9-2.1a6 6 0 0 1-.4-.6z" />,
  },
  carbs: {
    line: (
      <>
        <path d="M12 21v-8.2" />
        <path d="M12 8.6c-2-.2-3.2-1.6-3.3-3.6 2 .2 3.2 1.6 3.3 3.6z" />
        <path d="M12 8.6c2-.2 3.2-1.6 3.3-3.6-2 .2-3.2 1.6-3.3 3.6z" />
      </>
    ),
    solid: (
      <>
        <path d="M12 12.8c-2.3-.2-3.7-1.7-3.8-4 2.3.2 3.7 1.7 3.8 4z" />
        <path d="M12 12.8c2.3-.2 3.7-1.7 3.8-4-2.3.2-3.7 1.7-3.8 4z" />
      </>
    ),
  },
  fat: {
    line: <path d="M12 3.2c3.5 4.2 5.3 6.7 5.3 9.1a5.3 5.3 0 0 1-10.6 0c0-2.4 1.8-4.9 5.3-9.1z" />,
    solid: <path d="M12 10.2c1.9 2.4 2.9 3.8 2.9 5a2.9 2.9 0 0 1-5.8 0c0-1.2 1-2.6 2.9-5z" />,
  },

  // ── Habits ──
  // Water is a glass, not a droplet: the droplet already means fat, and two
  // rows of the same shape in different colours is how a set stops working.
  water: {
    line: <path d="M7 3.6h10l-1.2 15.6a1.7 1.7 0 0 1-1.7 1.6H9.9a1.7 1.7 0 0 1-1.7-1.6z" />,
    solid: <path d="M8.3 11.4h7.4l-.6 7.8a1.2 1.2 0 0 1-1.2 1.1h-3.8a1.2 1.2 0 0 1-1.2-1.1z" />,
  },
  training: {
    line: <path d="M6.6 12h10.8M4.2 10.4v3.2M19.8 10.4v3.2" />,
    solid: (
      <>
        <rect x="5.4" y="8" width="2.6" height="8" rx="1" />
        <rect x="16" y="8" width="2.6" height="8" rx="1" />
      </>
    ),
  },
  sleep: {
    line: <path d="M16.6 4.4v2.4M15.4 5.6h2.4" />,
    solid: <path d="M20.2 13.8A8.2 8.2 0 1 1 10.3 3.9a6.6 6.6 0 0 0 9.9 9.9z" />,
  },
  // Someone walking, not a pair of footprints: two soles at this size are two
  // smudges, and a figure in motion is the thing the number is counting.
  steps: {
    line: (
      <>
        <path d="M10.6 21.2 13 15.4l-2.5-2.3.9-4.6 3 2.3 2.7 1" />
        <path d="M8.6 12.6 11.4 8.5" />
        <path d="M14.6 15.6 16.3 21.2" />
      </>
    ),
    solid: <circle cx="13.4" cy="4.4" r="2.1" />,
  },
  nosugar: {
    line: (
      <>
        <rect x="6.4" y="7.6" width="11.2" height="8.8" rx="1.6" />
        <path d="M4.6 19.4 19.4 4.6" />
      </>
    ),
    solid: <rect x="8.8" y="10" width="6.4" height="4" rx="0.8" />,
  },

  // ── Muscle groups ──
  // A torso seen from the front, a pair of legs, and a back with its wings. At
  // this size the body has to be read from its silhouette, so each one keeps
  // only the outline that no other could be mistaken for.
  upper: {
    line: (
      <>
        <path d="M8.4 4.2 12 6l3.6-1.8 3.2 1.6-1 4.2-1.6-.5v8.3a1 1 0 0 1-1 1H7.8a1 1 0 0 1-1-1V9.5l-1.6.5-1-4.2z" />
        <path d="M12 6v5" />
      </>
    ),
    solid: <path d="M9.3 12.4h5.4v6.4H9.3z" />,
  },
  lower: {
    line: (
      <>
        <path d="M7.6 3.4h8.8l-.7 5.4-1 5.1-.5 6.7h-3l-.6-6.6-.5-3-.5 3-.6 6.6h-3l-.5-6.7-1-5.1z" />
      </>
    ),
    solid: <path d="M7.6 3.4h8.8l-.5 4H8.1z" />,
  },
  pull: {
    line: (
      <>
        <path d="M12 4.4c-1.2 0-2.1.9-2.1 2s.9 2 2.1 2 2.1-.9 2.1-2-.9-2-2.1-2z" />
        <path d="M12 8.8v10.8" />
        <path d="M12 9.6 5.2 12l1.4 4.6L12 14.2z" />
        <path d="M12 9.6 18.8 12l-1.4 4.6L12 14.2z" />
      </>
    ),
    solid: (
      <>
        <path d="M12 9.6 5.2 12l1.4 4.6L12 14.2z" />
        <path d="M12 9.6 18.8 12l-1.4 4.6L12 14.2z" />
      </>
    ),
  },

  // Anything a coach invents: still drawn, still the same construction.
  generic: {
    line: <circle cx="12" cy="12" r="7.4" />,
    solid: <circle cx="12" cy="12" r="3.2" />,
  },
}

export default function Pictogram({ name, size = 18, className = '' }) {
  const shape = SHAPES[name] ?? SHAPES.generic
  return (
    <svg
      className={`${styles.icon} ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* The filled part sits under the outline and at reduced strength, so it
          reads as mass rather than as a second colour. */}
      <g fill="currentColor" stroke="none" opacity="0.32">{shape.solid}</g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shape.line}
      </g>
    </svg>
  )
}
