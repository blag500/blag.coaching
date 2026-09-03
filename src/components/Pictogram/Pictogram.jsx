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
  /* Ден за кардио и подвижност — не легло.
     Денят носи 30–45 минути кардио и 15 минути подвижност; леглото казваше на
     клиента, че няма какво да прави, и това беше единствената причина да не
     може да си отбележи направеното. Сърце с пулс: работата на този ден е за
     сърцето, а линията казва, че то е било натоварено. */
  cardio: {
    line: (
      <>
        <path d="M12 19.4C7 15.9 4.2 13.2 4.2 10a3.9 3.9 0 0 1 7.8-1.5A3.9 3.9 0 0 1 19.8 10c0 3.2-2.8 5.9-7.8 9.4z" />
        <path d="M6.3 11.5h2.4l1.4-2.7 1.9 5.2 1.5-3.3 1 .8h3" />
      </>
    ),
    solid: <path d="M12 19.4C7 15.9 4.2 13.2 4.2 10a3.9 3.9 0 0 1 7.8-1.5A3.9 3.9 0 0 1 19.8 10c0 3.2-2.8 5.9-7.8 9.4z" />,
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
  // Drawn as muscle rather than as a body: a chest with its two heads and the
  // shoulders above it, a quad with its separation, a back with the lats
  // spread, a forearm braced. At this size an anatomical outline reads faster
  // than a whole figure, because a figure at 15px is a stick.
  upper: {
    line: (
      <>
        <path d="M4.6 8.4c0-1.9 1.6-3.2 3.6-3.2 1.5 0 2.6.6 3.8.6s2.3-.6 3.8-.6c2 0 3.6 1.3 3.6 3.2 0 2.6-2 4.4-4.6 4.4-1.4 0-2.2-.6-2.8-.6s-1.4.6-2.8.6c-2.6 0-4.6-1.8-4.6-4.4z" />
        <path d="M12 5.8v6.4" />
        <path d="M7.6 14.4c.6 2.4 1.9 4.2 4.4 4.2s3.8-1.8 4.4-4.2" />
      </>
    ),
    solid: <path d="M4.6 8.4c0-1.9 1.6-3.2 3.6-3.2 1.5 0 2.6.6 3.8.6v6.8c-1.4 0-2.2.6-2.8.6-2.6 0-4.6-1.8-4.6-4.8z" />,
  },
  lower: {
    line: (
      <>
        <path d="M8.6 3.6h6.8c1 0 1.7.9 1.5 1.9l-1.3 6.6c-.4 2-1.4 3.6-2.4 5.2l-1.2 2 1.4 3.1H9.2l1.2-3.2-1.4-2.2c-1-1.6-1.8-3.1-2.1-4.9L5.8 5.5c-.2-1 .6-1.9 1.6-1.9z" />
        <path d="M11.4 6.4c-.6 2.6-.5 5.2.6 7.8" />
      </>
    ),
    solid: <path d="M8.6 3.6h6.8c1 0 1.7.9 1.5 1.9l-.7 3.4H6.9l-.7-3.4c-.2-1 .5-1.9 1.5-1.9z" />,
  },
  pull: {
    line: (
      <>
        <path d="M12 4.2c-1.3 0-2.3 1-2.3 2.2S10.7 8.6 12 8.6s2.3-1 2.3-2.2S13.3 4.2 12 4.2z" />
        <path d="M12 9.2c3.4 0 6.2 1.4 7.4 3.2-1.4 3-3.4 5.2-5.6 6.6l-1.8-4.6-1.8 4.6c-2.2-1.4-4.2-3.6-5.6-6.6 1.2-1.8 4-3.2 7.4-3.2z" />
      </>
    ),
    solid: <path d="M12 9.2c3.4 0 6.2 1.4 7.4 3.2-1 2.1-2.3 3.9-3.7 5.2L12 14.4l-3.7 3.2C6.9 16.3 5.6 14.5 4.6 12.4c1.2-1.8 4-3.2 7.4-3.2z" />,
  },
  // Forearm, traps and neck — the accessory day. A braced forearm with the
  // fist closed says grip work more directly than a neck ever could.
  extra: {
    line: (
      <>
        <path d="M6.4 3.8c2.4 0 4 1.2 5.2 3 1 1.6 1.8 3.4 3.4 4.6l2.6 2c1 .8 1.2 2.2.4 3.2l-.8 1c-.8 1-2.2 1.2-3.2.4l-2.4-1.9" />
        <path d="M11.6 16.1 8.4 13c-1.6-1.5-2.6-3-3.2-5" />
        <path d="M14.2 18.6c-.8.9-2.1 1-3 .3l-1.5-1.2" />
      </>
    ),
    solid: <path d="M14.2 11.4l2.8 2.2c1 .8 1.2 2.2.4 3.2l-.8 1c-.8 1-2.2 1.2-3.2.4l-2.6-2z" />,
  },

  // A bathroom scale from above: the platform, the dial, and the needle as the
  // filled part. Not a downward arrow and not a scale-with-pans — one says the
  // number should go down, which is wrong for anyone gaining, and the other is
  // a courthouse.
  weight: {
    // The dial is a half disc rather than an arc alone, and it sits low in the
    // platform: an arc drawn across the middle fills the box and reads as a
    // dome. The needle is a stroke on top of the fill, which is the only way it
    // survives — inside the disc it disappears at 16px.
    line: (
      <>
        <rect x="3.6" y="5.2" width="16.8" height="13.6" rx="3" />
        <path d="M7.8 15.4a4.2 4.2 0 0 1 8.4 0" />
        <path d="M12 15.4l2.7-3" />
      </>
    ),
    solid: <path d="M7.8 15.4a4.2 4.2 0 0 1 8.4 0z" />,
  },

  // ── Supplements ──
  // Only two, because only two are honest. A stack is powders and pills in some
  // mixture, and guessing further — softgel for the omega, round tablet for the
  // magnesium — is a taxonomy that will be wrong for half of anyone's shelf.
  // The name on the chip is what tells them apart; the drawing says which
  // gesture it is: scoop it or swallow it.
  capsule: {
    line: (
      <g transform="rotate(-40 12 12)">
        <rect x="3.6" y="8.6" width="16.8" height="6.8" rx="3.4" />
        <line x1="12" y1="8.6" x2="12" y2="15.4" />
      </g>
    ),
    solid: (
      <g transform="rotate(-40 12 12)">
        <path d="M7 8.6h5v6.8H7a3.4 3.4 0 0 1 0-6.8z" />
      </g>
    ),
  },
  powder: {
    line: (
      <>
        <path d="M6.6 8.6h10.8l-1 9.9a1.6 1.6 0 0 1-1.6 1.4H9.2a1.6 1.6 0 0 1-1.6-1.4z" />
        <rect x="5.4" y="4.6" width="13.2" height="4" rx="1.2" />
      </>
    ),
    solid: <path d="M7.2 14.6h9.6l-.4 3.9a1.6 1.6 0 0 1-1.6 1.4H9.2a1.6 1.6 0 0 1-1.6-1.4z" />,
  },

  // ── Elsewhere in the app ──
  // A plate between a fork and a knife. The flame belongs to calories, which is
  // one number inside eating rather than the thing itself.
  meal: {
    line: (
      <>
        <circle cx="12.4" cy="12.6" r="5.2" />
        <path d="M4.4 3.6v4.2a1.7 1.7 0 0 0 3.4 0V3.6M6.1 8.5v11.9" />
        <path d="M19.6 3.6c-1.4 0-2.3 1.6-2.3 3.6s.9 2.9 2.3 2.9zM19.6 3.6v16.8" />
      </>
    ),
    solid: <circle cx="12.4" cy="12.6" r="2.4" />,
  },
  // A line climbing across two axes — the chart, not the walking figure. Habits
  // are not steps; steps are one of them.
  trend: {
    line: (
      <>
        <path d="M3.4 20.4V6.2M3.4 20.4h16.8" />
        <path d="M6.4 16.6l4-4.2 3 2.8 4.8-5.6" />
        <path d="M14.6 9.6h3.8v3.8" />
      </>
    ),
    solid: <path d="M6.4 16.6l4-4.2 3 2.8 4.8-5.6v7H6.4z" />,
  },
  /* Двама души: единият отпред и цял, вторият зад рамото му и по-малък.
     Две еднакви фигури една до друга се четат като „хора изобщо"; едната
     по-назад казва „ти и някой друг", което е точно какво е списъкът. */
  friends: {
    line: (
      <>
        <path d="M2.8 20c0-2.9 2.3-4.7 5.1-4.7s5.1 1.8 5.1 4.7" />
        <circle cx="7.9" cy="8.4" r="3.2" />
        <path d="M15.4 15.6c2.5.2 4.3 2 4.3 4.4" />
        <circle cx="16.2" cy="9.4" r="2.4" />
      </>
    ),
    solid: (
      <>
        <circle cx="7.9" cy="8.4" r="3.2" />
        <circle cx="16.2" cy="9.4" r="2.4" />
      </>
    ),
  },
  // ── Чекинът ──
  // Петте карти горе носеха емоджита, а те влачат собствена палитра и
  // собствен стил, така че никога не седят вътре в дизайн, а върху него.
  // Лицата в самия избор за настроение остават емоджи: там те не са
  // украса на заглавие, а самите стойности — и нищо рисувано не казва
  // „скапан съм" по-бързо от едно лице.
  energy: {
    line: <path d="M13.6 2.8 6.2 13.6h4.7l-1.3 7.6 7.4-10.8h-4.7z" />,
    solid: <path d="M13.6 2.8 6.2 13.6h4.7l-1.3 7.6 7.4-10.8h-4.7z" />,
  },
  /* Натиск от двете страни, а не мозък: човешка глава на 18px е петно,
     а двете стрелки срещу една лента се четат отвсякъде. */
  stress: {
    line: (
      <>
        <path d="M3.2 12h4.4M5.8 9.4 3.2 12l2.6 2.6" />
        <path d="M20.8 12h-4.4M18.2 9.4 20.8 12l-2.6 2.6" />
        <rect x="10.7" y="4.6" width="2.6" height="14.8" rx="1.3" />
      </>
    ),
    solid: <rect x="10.7" y="4.6" width="2.6" height="14.8" rx="1.3" />,
  },
  /* Батерия, не мускул. Знакът тук беше ръка — точно това, което полето
     престана да пита: умората се отчита за цялото тяло, а не за един мускул. */
  fatigue: {
    line: (
      <>
        <rect x="2.4" y="7" width="16.2" height="10" rx="2.6" />
        <path d="M20.9 10.2v3.6" />
      </>
    ),
    solid: <rect x="4.6" y="9.2" width="4.4" height="5.6" rx="1.4" />,
  },
  mood: {
    line: (
      <>
        <circle cx="12" cy="12" r="8.4" />
        <path d="M9.3 10.2v.9M14.7 10.2v.9" />
        <path d="M8.4 14.3c1.1 1.5 6.1 1.5 7.2 0" />
      </>
    ),
    solid: <circle cx="12" cy="12" r="8.4" />,
  },
  note: {
    line: (
      <>
        <path d="M6.2 3.4h7.2l5.2 5.2v12H6.2z" />
        <path d="M13.4 3.4v5.2h5.2" />
        <path d="M9.2 13h6M9.2 16.2h4" />
      </>
    ),
    solid: <path d="M6.2 3.4h7.2l5.2 5.2v12H6.2z" />,
  },
  chat: {
    line: <path d="M20.4 14.6a2 2 0 0 1-2 2H7.6l-4 3.4V5.4a2 2 0 0 1 2-2h12.8a2 2 0 0 1 2 2z" />,
    solid: <path d="M7.2 8.4h9.6v1.6H7.2zM7.2 11.6h6.4v1.6H7.2z" />,
  },
  calendar: {
    line: (
      <>
        <rect x="3.4" y="5" width="17.2" height="15.4" rx="2.6" />
        <path d="M8.2 3v3.6M15.8 3v3.6M3.4 10h17.2" />
      </>
    ),
    solid: <path d="M6.6 12.4h3.4v3.2H6.6zM11.4 12.4h3.4v3.2h-3.4z" />,
  },

  // A bell with its clapper as the filled part. Not a bell with lines coming
  // off it: at sixteen pixels the ringing lines are three specks of dust.
  bell: {
    line: <path d="M6.4 17.4c1.1-1.3 1.6-2.8 1.6-4.6v-2.2a4 4 0 0 1 8 0v2.2c0 1.8.5 3.3 1.6 4.6z" />,
    solid: <path d="M10.2 18.6h3.6a1.8 1.8 0 0 1-3.6 0z" />,
  },
  // An open book, seen from above — the spine down the middle and one page
  // weighted, which is what stops two blank halves reading as a folded sheet.
  book: {
    line: (
      <>
        <path d="M12 6.6c-1.7-1.2-3.6-1.8-5.6-1.8H4.2v12.4h2.2c2 0 3.9.6 5.6 1.8" />
        <path d="M12 6.6c1.7-1.2 3.6-1.8 5.6-1.8h2.2v12.4h-2.2c-2 0-3.9.6-5.6 1.8" />
        <path d="M12 6.6v12.4" />
      </>
    ),
    solid: <path d="M12 8.4c1.4-.9 3-1.4 4.6-1.5v8.8c-1.6.1-3.2.6-4.6 1.5z" />,
  },
  camera: {
    line: (
      <>
        <path d="M3.6 8.6h3.6l1.4-2.2h6.8l1.4 2.2h3.6v10.8H3.6z" />
        <circle cx="12" cy="13.6" r="3.4" />
      </>
    ),
    solid: <circle cx="12" cy="13.6" r="1.6" />,
  },

  // ── Разделите на Профил ──
  // Табло: рамка, разделена на плочки, с една запълнена. Не решетка от
  // четири еднакви квадрата — тя е иконата на „всички приложения" и води
  // окото към друго очакване.
  dashboard: {
    line: (
      <>
        <rect x="3.4" y="4.2" width="17.2" height="15.6" rx="2.4" />
        <path d="M3.4 10.4h17.2M11.4 10.4v9.4" />
      </>
    ),
    solid: <path d="M5.4 12.4h4.2v5.4H5.4z" />,
  },
  // Зъбно колело с шест зъба, не осем: на шестнайсет пиксела осмината се
  // сливат в кръг и остава само дупката в средата.
  gear: {
    line: (
      <>
        <path d="M12 3.4l1.5 2.1 2.5-.6.5 2.5 2.3 1.1-1.1 2.3 1.1 2.3-2.3 1.1-.5 2.5-2.5-.6L12 20.6l-1.5-2.1-2.5.6-.5-2.5-2.3-1.1 1.1-2.3-1.1-2.3 2.3-1.1.5-2.5 2.5.6z" />
        <circle cx="12" cy="12" r="3.1" />
      </>
    ),
    solid: <circle cx="12" cy="12" r="3.1" />,
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
