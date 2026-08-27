import { useMemo, useRef, useEffect } from 'react'
import { mondayOf, iso, dayDate, monthsShort, bigNum, sessionTitle } from '../../utils/training'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './WorkoutHeatmap.module.css'

/** Five steps, because four shades of gold are already more than the eye
 *  separates reliably and the fifth step is "nothing at all". */
const LEVELS = 5

/**
 * A year of training as a grid: one column per week, one square per day.
 *
 * The month calendar answers "what did I do on the 14th". This answers a
 * different question the calendar cannot — whether the training is *steady* —
 * and it answers it without being read, because a gap in a wall of squares is
 * visible from arm's length.
 *
 * Weight is volume, not attendance. A day of two warm-up sets and a day of
 * twenty working sets are both "trained" on the calendar; here the second one
 * is visibly heavier, which is the whole reason to draw the same data twice.
 */
export default function WorkoutHeatmap({ sessions, weeks = 26 }) {
  const { t, lang } = useSettings()
  const MS = monthsShort(t)
  const DOW = [0, 1, 2, 3, 4, 5, 6].map(i => t(`daysMon.${i}`))
  const longDate = k => dayDate(k).toLocaleDateString(lang === 'en' ? 'en-GB' : 'bg-BG', { day: 'numeric', month: 'long' })
  const scroller = useRef(null)

  const { columns, scale, max } = useMemo(() => {
    const byDate = new Map()
    for (const s of sessions) {
      if (!s.setCount && s.isRest) continue
      byDate.set(s.date, s)
    }

    const start = mondayOf(new Date())
    start.setDate(start.getDate() - (weeks - 1) * 7)

    const columns = []
    for (let w = 0; w < weeks; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(date.getDate() + w * 7 + d)
        const key = iso(date)
        days.push({ key, month: date.getMonth(), dom: date.getDate(), session: byDate.get(key) ?? null })
      }
      columns.push({ days, month: days[0].month })
    }

    // The scale is this person's own range. A fixed "10 000 kg is dark" would
    // paint a beginner's whole year in the palest shade and tell them nothing.
    const vols = [...byDate.values()].map(s => s.volume).filter(v => v > 0).sort((a, b) => a - b)
    const max = vols.length ? vols[Math.floor(vols.length * 0.9)] : 0
    return { columns, scale: max || 1, max }
  }, [sessions, weeks])

  // Opens on this week. The grid is wider than the phone and the interesting
  // end is the right one; starting at January means scrolling every time.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [columns.length])

  const level = s => {
    if (!s) return 0
    if (!s.volume) return 1              // trained, nothing weighed — still a day
    return Math.min(LEVELS - 1, 1 + Math.floor((s.volume / scale) * (LEVELS - 2)))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.body}>
        <div className={styles.dowCol} aria-hidden="true">
          {/* Every other label. Seven three-letter words in a 12px column is a
              wall of text beside a picture that exists to avoid reading. */}
          {DOW.map((d, i) => <span key={d} className={styles.dow}>{i % 2 === 0 ? d : ''}</span>)}
        </div>

        <div className={styles.scroller} ref={scroller}>
          <div className={styles.months}>
            {columns.map((c, i) => (
              /* No label on the first column. The grid is scrolled to the
                 right end, so column zero is normally cut off by the edge of
                 the scroller — labelling it printed half a month name. */
              <span key={i} className={styles.month}>
                {i > 0 && c.month !== columns[i - 1].month ? MS[c.month] : ''}
              </span>
            ))}
          </div>

          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
            {columns.map((c, i) => (
              <div key={i} className={styles.col}>
                {c.days.map(d => (
                  <span
                    key={d.key}
                    className={styles.cell}
                    data-level={level(d.session)}
                    title={d.session
                      ? (d.session.volume
                          ? t('hm.cellVolume', { date: longDate(d.key), title: sessionTitle(t, d.session), kg: bigNum(d.session.volume) })
                          : t('hm.cellTitle',  { date: longDate(d.key), title: sessionTitle(t, d.session) }))
                      : dayDate(d.key).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>{t('hm.less')}</span>
        {[0, 1, 2, 3, 4].map(l => <span key={l} className={styles.cell} data-level={l} />)}
        <span className={styles.legendLabel}>{max ? t('hm.moreVolume') : t('hm.more')}</span>
      </div>
    </div>
  )
}
