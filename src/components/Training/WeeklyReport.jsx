import { useMemo, useState } from 'react'
import { iso, bigNum, monthsShort } from '../../utils/training'
import { useSettings } from '../../contexts/SettingsContext'
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
  const { t } = useSettings()
  const MS = monthsShort(t)
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

    const trained = sessions.filter(s => s.setCount > 0 || !s.isRest)
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
        { key: 'consistency', label: t('wr.consistency'), letter: grade(consist),
          note: t('wr.consistencyNote', { n: thisWk.length, goal }) },
        { key: 'volume', label: t('wr.volume'), letter: grade(vol),
          note: prevVol > 0
            ? t('wr.volumeDelta', { sign: volDelta >= 0 ? '+' : '', pct: volDelta })
            : thisVol > 0 ? t('wr.volumeTotal', { kg: bigNum(thisVol) }) : t('wr.volumeNone') },
        { key: 'intensity', label: t('wr.intensity'), letter: grade(intens),
          note: prs === 0 ? t('wr.prNone') : prs === 1 ? t('wr.prOne') : t('wr.prMany', { n: prs }) },
        { key: 'recovery', label: t('wr.recovery'), letter: grade(recov),
          note: earlyHits === 0
            ? t('wr.recoveryClean')
            : earlyHits === 1 ? t('wr.recoveryEarly.one') : t('wr.recoveryEarly.other', { n: earlyHits }) },
      ],
      dateLabel: `${thisStart.getDate()} ${MS[thisStart.getMonth()].toUpperCase()} → ${today.getDate()} ${MS[today.getMonth()].toUpperCase()}`,
    }
  }, [sessions, goal, now])

  if (!report.overallLetter) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>{t('wr.empty')}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${styles.card} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(f => !f)}
      aria-label={flipped ? t('wr.flipBack') : t('wr.flipOpen')}
    >
      {/* ── Front ── */}
      <div className={`${styles.face} ${styles.front}`}>
        <div className={styles.topRow}>
          <span className={styles.eyebrow}>{t('wr.last7')}</span>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{report.prs}</span>
              <span className={styles.statLabel}>{t('wr.records')}</span>
            </div>
            {report.volDelta != null && (
              <div className={styles.stat}>
                <span
                  className={styles.statVal}
                  style={{ color: report.volDelta >= 0 ? '#81C784' : '#ef5350' }}
                >
                  {report.volDelta >= 0 ? '+' : ''}{report.volDelta}%
                </span>
                <span className={styles.statLabel}>{t('wr.volumeStat')}</span>
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
              <li className={styles.noLifts}>{t('wr.noLifts')}</li>
            )}
          </ul>
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>{t('wr.hintOpen')}</span>
          <span className={styles.date}>{report.dateLabel}</span>
        </div>
      </div>

      {/* ── Back ── */}
      <div className={`${styles.face} ${styles.back}`}>
        <div className={styles.topRow}>
          <span className={styles.eyebrow}>{t('wr.breakdown')}</span>
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
          <span className={styles.hint}>{t('wr.hintBack')}</span>
          <span className={styles.date}>{report.dateLabel}</span>
        </div>
      </div>
    </button>
  )
}
