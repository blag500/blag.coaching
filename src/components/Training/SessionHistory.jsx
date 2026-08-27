import { useState, useMemo } from 'react'
import { groupByMonth, kg, bigNum, monthsShort, dayDate, sessionTitle } from '../../utils/training'
import { useSettings } from '../../contexts/SettingsContext'
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
  const { t } = useSettings()
  return (
    <div className={styles.exercise}>
      <div className={styles.exHead}>
        <span className={styles.exName}>
          {ex.name}
          {ex.pr && <span className={styles.prTag} title={t('sh.prTitle')}>{t('sh.prTag')}</span>}
        </span>
        <button
          type="button"
          className={styles.chartBtn}
          onClick={() => onOpenExercise(ex.name)}
          aria-label={t('sh.chartAria', { name: ex.name })}
        ><ChartIcon /></button>
      </div>

      {ex.replaces && (
        <span className={styles.swapNote}>{t('sh.replaces', { name: ex.replaces })}</span>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thNo}>{t('sh.thSet')}</th>
            <th>{t('sh.thWeight')}</th>
            <th>{t('sh.thReps')}</th>
          </tr>
        </thead>
        <tbody>
          {ex.sets.map((s, i) => (
            <tr key={s.id ?? i}>
              <td className={styles.tdNo}>{i + 1}</td>
              <td className={styles.tdVal}>{s.weight ? `${kg(s.weight)} ${t('unit.kg')}` : t('sh.bodyweight')}</td>
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
  const { t } = useSettings()
  const MS = monthsShort(t)
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
        <p className={styles.emptyTitle}>{t('sh.emptyTitle')}</p>
        <p className={styles.emptySub}>{t('sh.emptySub')}</p>
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
            const rest = !s.setCount && s.isRest
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
                    <span className={styles.dateMon}>{MS[d.getMonth()]}</span>
                  </span>

                  <span className={styles.headText}>
                    <span className={styles.title}>{s.title}</span>
                    <span className={styles.meta}>
                      {rest ? (
                        t('sh.restDay')
                      ) : (
                        <>
                          <span className={styles.metaBit}>{t('sh.exCount', { n: s.exerciseList.length })}</span>
                          <span className={styles.metaBit}>{t('sh.setCount', { n: s.setCount })}</span>
                          {s.volume > 0 && <span className={styles.metaBit}>{bigNum(s.volume)} {t('unit.kg')}</span>}
                          {s.prCount > 0 && (
                            <span className={`${styles.metaBit} ${styles.metaPr}`}>{s.prCount === 1 ? t('sh.prCount.one') : t('sh.prCount.other', { n: s.prCount })}</span>
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
                        {rest ? t('sh.restNote') : t('sh.tickedNote')}
                      </p>
                    ) : (
                      s.exerciseList.map(ex => (
                        <ExerciseBlock key={ex.name} ex={ex} onOpenExercise={onOpenExercise} />
                      ))
                    )}

                    {!rest && (
                      <button type="button" className={styles.editDay} onClick={() => onEditDay(s.date)}>
                        {t('sh.fixDay')}
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
