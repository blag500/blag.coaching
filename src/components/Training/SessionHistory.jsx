import { useState, useMemo } from 'react'
import { groupByMonth, kg, bigNum, MONTHS_SHORT, dayDate } from '../../utils/training'
import styles from './SessionHistory.module.css'

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 17l5-6 4 4 6-8" />
    <path d="M18 7h3v3" />
  </svg>
)

/** One exercise inside an opened session: every set, as it was logged. */
function ExerciseBlock({ ex, onOpenExercise }) {
  return (
    <div className={styles.exercise}>
      <div className={styles.exHead}>
        <span className={styles.exName}>
          {ex.name}
          {ex.pr && <span className={styles.prTag} title="Личен рекорд">РЕКОРД</span>}
        </span>
        <button
          type="button"
          className={styles.chartBtn}
          onClick={() => onOpenExercise(ex.name)}
          aria-label={`Графика за ${ex.name}`}
        ><ChartIcon /></button>
      </div>

      {ex.replaces && (
        <span className={styles.swapNote}>вместо {ex.replaces}</span>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thNo}>СЕРИЯ</th>
            <th>ТЕЖЕСТ</th>
            <th>ПОВТ.</th>
          </tr>
        </thead>
        <tbody>
          {ex.sets.map((s, i) => (
            <tr key={s.id ?? i}>
              <td className={styles.tdNo}>{i + 1}</td>
              <td className={styles.tdVal}>{s.weight ? `${kg(s.weight)} кг` : 'собствено'}</td>
              <td className={styles.tdVal}>{s.reps ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The whole log, newest month first.
 *
 * The month calendar it replaces could only ever show one month, and only ever
 * as coloured dots — to read a session you tapped a day, and to compare two
 * sessions you tapped a day, remembered it, and tapped another. This is the
 * same record as a list you scroll: every session names itself, says how much
 * work it was, and opens into the sets exactly as they were entered.
 */
export default function SessionHistory({ sessions, onOpenExercise, onEditDay }) {
  const [open, setOpen] = useState(() => new Set(sessions.slice(0, 1).map(s => s.date)))
  const months = useMemo(() => groupByMonth(sessions), [sessions])

  function toggle(date) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  if (!sessions.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>ДНЕВНИКЪТ Е ПРАЗЕН</p>
        <p className={styles.emptySub}>Първата логната серия го отваря.</p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {months.map(m => (
        <section key={m.key} className={styles.month}>
          <h2 className={styles.monthTitle}>{m.title.toUpperCase()}</h2>

          {m.sessions.map(s => {
            const isOpen = open.has(s.date)
            const d = dayDate(s.date)
            const rest = !s.setCount && /почивк/i.test(s.title)
            return (
              <article key={s.date} className={`${styles.session} ${isOpen ? styles.sessionOpen : ''}`}>
                <button
                  type="button"
                  className={styles.sessionHead}
                  onClick={() => toggle(s.date)}
                  aria-expanded={isOpen}
                >
                  <span className={`${styles.date} ${rest ? styles.dateRest : ''}`}>
                    <span className={styles.dateDay}>{d.getDate()}</span>
                    <span className={styles.dateMon}>{MONTHS_SHORT[d.getMonth()]}</span>
                  </span>

                  <span className={styles.headText}>
                    <span className={styles.title}>{s.title}</span>
                    <span className={styles.meta}>
                      {rest ? (
                        'почивен ден'
                      ) : (
                        <>
                          <span className={styles.metaBit}>{s.exerciseList.length} упр.</span>
                          <span className={styles.metaBit}>{s.setCount} серии</span>
                          {s.volume > 0 && <span className={styles.metaBit}>{bigNum(s.volume)} кг</span>}
                          {s.prCount > 0 && (
                            <span className={`${styles.metaBit} ${styles.metaPr}`}>{s.prCount} рекорд{s.prCount === 1 ? '' : 'а'}</span>
                          )}
                        </>
                      )}
                    </span>
                  </span>

                  <span className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`} aria-hidden="true">⌄</span>
                </button>

                {isOpen && (
                  <div className={styles.body}>
                    {s.exerciseList.length === 0 ? (
                      <p className={styles.noSets}>
                        {rest ? 'Почивка — нищо за записване.' : 'Тренировката е отбелязана, но серии не са логнати.'}
                      </p>
                    ) : (
                      s.exerciseList.map(ex => (
                        <ExerciseBlock key={ex.name} ex={ex} onOpenExercise={onOpenExercise} />
                      ))
                    )}

                    {!rest && (
                      <button type="button" className={styles.editDay} onClick={() => onEditDay(s.date)}>
                        Поправи този ден
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}
