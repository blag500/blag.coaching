import { useMemo, useState } from 'react'
import { iso, bigNum, MONTHS_SHORT } from '../../utils/training'
import { classifyMuscle, RECOVERY_H } from '../../utils/recovery'
import styles from './WeeklyReport.module.css'

/**
 * A letter for a number, on the same four-step curve used everywhere else.
 * A/A- is "kept the promise", B/B+ is "close", C is "showed up but not enough",
 * D/F is "did not". Halves exist so the picture is not flat when three of four
 * things are fine and one is not.
 */
function grade(score) {
  if (score >= 93) return 'A'
  if (score >= 87) return 'A-'
  if (score >= 80) return 'B+'
  if (score >= 73) return 'B'
  if (score >= 65) return 'C+'
  if (score >= 55) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

function gradeColor(letter) {
  if (letter.startsWith('A')) return '#81C784'
  if (letter.startsWith('B')) return '#64B5F6'
  if (letter.startsWith('C')) return '#ffb74d'
  return '#ef5350'
}

/** Average four sub-scores into one letter. */
function overall(scores) {
  const n = scores.filter(s => s != null)
  if (!n.length) return null
  return grade(n.reduce((a, b) => a + b, 0) / n.length)
}

/**
 * The week, told as a report card.
 *
 * Four numbers that already exist on this screen — sessions, volume, PRs, and
 * how recovered each muscle was when it was trained — become a letter each and
 * one overall letter on top. The point is not to invent a new metric; it is to
 * put a shape on the week that can be read at a glance and decided about at a
 * glance. Tap flips to the breakdown, which says *why* the letter is what it
 * is, in one line each.
 */
export default function WeeklyReport({ sessions, goal, now = new Date() }) {
  const [flipped, setFlipped] = useState(false)

  const report = useMemo(() => {
    // Rolling 7-day window ending today. Calendar-week comparisons were
    // punishing Tuesday runs against Sunday-complete last weeks — every mid-
    // week look at the card read F even when the trailing 7 days were
    // actually on pace. A sliding window is always a full seven days on both
    // sides and the score means the same thing every day of the week.
    const today   = new Date(now); today.setHours(0, 0, 0, 0)
    const thisStart = new Date(today); thisStart.setDate(thisStart.getDate() - 6)
    const prevStart = new Date(today); prevStart.setDate(prevStart.getDate() - 13)
    const thisIso = iso(thisStart)
    const prevIso = iso(prevStart)
    const cutIso  = iso(thisStart)
    const todayIso = iso(now)

    const inThis = s => s.date >= thisIso && s.date <= todayIso
    const inPrev = s => s.date >= prevIso && s.date <  cutIso

    const trained = sessions.filter(s => s.setCount > 0 || !/почивк/i.test(s.title))
    const thisWk = trained.filter(inThis)
    const prevWk = trained.filter(inPrev)

    const thisVol = thisWk.reduce((a, s) => a + s.volume, 0)
    const prevVol = prevWk.reduce((a, s) => a + s.volume, 0)
    const prs = thisWk.reduce((a, s) => a + (s.prCount || 0), 0)

    // Recovery: for each session this week, was any muscle group it hit still
    // inside its own window when the session happened. Newest-first sessions
    // means we walk backwards for each group to find the previous one.
    let earlyHits = 0
    for (const s of thisWk) {
      const groups = new Set()
      for (const lbl of s.labels) {
        const g = classifyMuscle(lbl)
        if (g && g !== 'full') groups.add(g)
      }
      const day = new Date(s.date + 'T12:00:00').getTime()
      for (const g of groups) {
        const prev = sessions.find(p =>
          p !== s && p.date < s.date &&
          p.labels.some(l => classifyMuscle(l) === g),
        )
        if (!prev) continue
        const prevDay = new Date(prev.date + 'T12:00:00').getTime()
        const hours = (day - prevDay) / 3_600_000
        if (hours < RECOVERY_H[g]) { earlyHits += 1; break }
      }
    }

    // Per-lift arrows for the front of the card — top 4 exercises by volume
    // this week, marked ↑ / ↓ / — versus their same lift last week.
    const volByLift = {}
    for (const s of thisWk) for (const e of s.exerciseList ?? []) {
      volByLift[e.name] = (volByLift[e.name] ?? 0) + e.volume
    }
    const prevBest = {}
    for (const s of prevWk) for (const e of s.exerciseList ?? []) {
      prevBest[e.name] = Math.max(prevBest[e.name] ?? 0, e.best)
    }
    const thisBest = {}
    for (const s of thisWk) for (const e of s.exerciseList ?? []) {
      thisBest[e.name] = Math.max(thisBest[e.name] ?? 0, e.best)
    }
    const lifts = Object.keys(volByLift)
      .sort((a, b) => volByLift[b] - volByLift[a])
      .slice(0, 4)
      .map(name => {
        const now = thisBest[name] ?? 0
        const then = prevBest[name] ?? 0
        const arrow = then === 0 ? '•' : now > then * 1.02 ? '↑' : now < then * 0.98 ? '↓' : '—'
        return { name, arrow }
      })

    // ── Sub-scores ──
    // Consistency: sessions hit vs goal, capped so a huge week does not carry
    // the whole grade — a promise kept is 100, not extra credit.
    const consist = goal > 0 ? Math.min(100, (thisWk.length / goal) * 100) : 100

    // Volume: 0% change is a B (73). +5% is an A (93). -10% is a C (60).
    const vol = prevVol > 0
      ? Math.max(0, Math.min(100, 73 + ((thisVol - prevVol) / prevVol) * 400))
      : (thisVol > 0 ? 80 : 40)

    // Intensity: PRs. 0 is C+ (65) unless there is no volume at all; each PR
    // is worth ~10 up to a ceiling.
    const intens = thisWk.length === 0 ? 30 : Math.min(100, 65 + prs * 10)

    // Recovery: every early session drops the grade. Zero is an A.
    const recov = Math.max(30, 95 - earlyHits * 20)

    const overallLetter = overall([consist, vol, intens, recov])
    const volDelta = prevVol > 0 ? Math.round(((thisVol - prevVol) / prevVol) * 100) : null

    return {
      overallLetter,
      overallColor: overallLetter ? gradeColor(overallLetter) : '#888',
      prs,
      volDelta,
      lifts,
      subs: [
        { key: 'consistency', label: 'ПОСЛЕДОВАТЕЛНОСТ', letter: grade(consist),
          note: `${thisWk.length} от ${goal} тренировки за 7 дни` },
        { key: 'volume', label: 'ОБЕМ', letter: grade(vol),
          note: prevVol > 0
            ? `${volDelta >= 0 ? '+' : ''}${volDelta}% спрямо предните 7 дни`
            : thisVol > 0 ? `${bigNum(thisVol)} кг за 7 дни` : 'Няма записан обем' },
        { key: 'intensity', label: 'ИНТЕНЗИТЕТ', letter: grade(intens),
          note: prs === 0 ? 'Няма нови рекорди' : `${prs} нови ${prs === 1 ? 'рекорд' : 'рекорда'}` },
        { key: 'recovery', label: 'ВЪЗСТАНОВЯВАНЕ', letter: grade(recov),
          note: earlyHits === 0
            ? 'Всяка група беше готова, когато я тренира'
            : `${earlyHits} ${earlyHits === 1 ? 'тренировка' : 'тренировки'} преди пълно възстановяване` },
      ],
      dateLabel: `${thisStart.getDate()} ${MONTHS_SHORT[thisStart.getMonth()].toUpperCase()} → ${today.getDate()} ${MONTHS_SHORT[today.getMonth()].toUpperCase()}`,
    }
  }, [sessions, goal, now])

  if (!report.overallLetter) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>Логни поне една серия тази седмица, за да получиш оценка.</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${styles.card} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(f => !f)}
      aria-label={flipped ? 'Обърни картата' : 'Виж разбивката'}
    >
      {/* ── Front ── */}
      <div className={`${styles.face} ${styles.front}`}>
        <div className={styles.topRow}>
          <span className={styles.eyebrow}>ПОСЛЕДНИ 7 ДНИ</span>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{report.prs}</span>
              <span className={styles.statLabel}>рекорда</span>
            </div>
            {report.volDelta != null && (
              <div className={styles.stat}>
                <span
                  className={styles.statVal}
                  style={{ color: report.volDelta >= 0 ? '#81C784' : '#ef5350' }}
                >
                  {report.volDelta >= 0 ? '+' : ''}{report.volDelta}%
                </span>
                <span className={styles.statLabel}>обем</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.grade} style={{ color: report.overallColor }}>
            {report.overallLetter}
          </div>
          <ul className={styles.lifts}>
            {report.lifts.map(l => (
              <li key={l.name}>
                <span className={styles.liftName}>{l.name}</span>
                <span className={styles.arrow} data-arrow={l.arrow}>{l.arrow}</span>
              </li>
            ))}
            {report.lifts.length === 0 && (
              <li className={styles.noLifts}>Няма упражнения тази седмица</li>
            )}
          </ul>
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>докосни за разбивка</span>
          <span className={styles.date}>{report.dateLabel}</span>
        </div>
      </div>

      {/* ── Back ── */}
      <div className={`${styles.face} ${styles.back}`}>
        <div className={styles.topRow}>
          <span className={styles.eyebrow}>РАЗБИВКА</span>
          <span className={styles.gradeSmall} style={{ color: report.overallColor }}>
            {report.overallLetter}
          </span>
        </div>

        <ul className={styles.subs}>
          {report.subs.map(s => (
            <li key={s.key} className={styles.sub}>
              <span className={styles.subLetter} style={{ color: gradeColor(s.letter) }}>
                {s.letter}
              </span>
              <span className={styles.subBody}>
                <span className={styles.subLabel}>{s.label}</span>
                <span className={styles.subNote}>{s.note}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <span className={styles.hint}>докосни, за да обърнеш обратно</span>
          <span className={styles.date}>{report.dateLabel}</span>
        </div>
      </div>
    </button>
  )
}
