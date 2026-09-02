import { useState, useMemo } from 'react'
import { useSupplements } from '../../hooks/useSupplements'
import { useSettings } from '../../contexts/SettingsContext'
import MonthCalendar from '../Training/MonthCalendar'
import styles from './SupplementsPage.module.css'

const TIMING_KEYS = [
  'supp.time.morning', 'supp.time.fasted', 'supp.time.preTrain',
  'supp.time.postTrain', 'supp.time.evening', 'supp.time.sleep',
]

export default function SupplementsPage() {
  /* Година назад, не два месеца: календарът се прелиства и празна клетка,
     която просто не е прочетена, изглежда точно като ден, в който нищо не е
     взето. */
  const { supplements, taken, historyLogs, loading, toggle, addSupplement, removeSupplement, takenCount, totalCount, streak, getSupplementStreak } =
    useSupplements(null, { historyDays: 365 })
  const { t } = useSettings()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDose, setNewDose] = useState('')
  const [newTiming, setNewTiming] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    await addSupplement({ name: newName.trim(), dose: newDose.trim(), timing: newTiming })
    setNewName('')
    setNewDose('')
    setNewTiming('')
    setShowAdd(false)
    setSaving(false)
  }

  /* Календарът е буквално този от тренировките, а не негово копие.
     „Идентичен" се постига най-сигурно, като е същият компонент: две копия на
     една решетка се разминават при първата поправка — и точно това вече се
     беше случило другаде в приложението.
     Той пита за „завършвания" с етикет и дата, така че приетите се превеждат
     на неговия език: една добавка е един етикет, един ден е един ред. Цветът
     идва от името, значи всяка добавка държи своя от месец на месец. */
  const suppName = useMemo(
    () => Object.fromEntries(supplements.map(s => [s.id, s.name])),
    [supplements],
  )

  const calendarCompletions = useMemo(
    () => historyLogs
      .map(l => ({ completed_date: l.date, block_label: suppName[l.supplement_id] }))
      // Изтрита добавка оставя редове без име; те не се рисуват, вместо да
      // добавят точка, за която никой не може да каже каква е била.
      .filter(c => c.block_label),
    [historyLogs, suppName],
  )

  const calendarBlocks = useMemo(
    () => supplements.map(s => ({ label: s.name })),
    [supplements],
  )

  if (loading) return null

  const allDone = totalCount > 0 && takenCount === totalCount

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('supp.title')}</h1>
          <p className={styles.subtitle}>{t('supp.subtitle')}</p>
        </div>
        <div className={styles.headerRight}>
          {streak > 1 && (
            <div className={styles.streakBadge}>
              <span className={styles.streakFire}>🔥</span>
              <span className={styles.streakNum}>{streak}</span>
            </div>
          )}
          {totalCount > 0 && (
            <div className={`${styles.badge} ${allDone ? styles.badgeDone : ''}`}>
              <span className={styles.badgeNum}>{takenCount}</span>
              <span className={styles.badgeOf}>/{totalCount}</span>
            </div>
          )}
        </div>
      </header>

      <div className={styles.list}>
        {supplements.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('supp.emptyMain')}</p>
            <p className={styles.emptyHint}>{t('supp.emptyHint')}</p>
          </div>
        ) : (
          supplements.map(s => {
            const suppStreak = getSupplementStreak(s.id)
            return (
              <div key={s.id} className={`${styles.row} ${taken[s.id] ? styles.rowDone : ''}`}>
                <button
                  className={`${styles.check} ${taken[s.id] ? styles.checkDone : ''}`}
                  onClick={() => toggle(s.id)}
                  type="button"
                  aria-label={taken[s.id] ? t('supp.takenUndo') : t('supp.takenMark')}
                >
                  {taken[s.id] && <span>✓</span>}
                </button>
                <div className={styles.info}>
                  <span className={`${styles.name} ${taken[s.id] ? styles.nameDone : ''}`}>{s.name}</span>
                  <div className={styles.metaRow}>
                    {(s.dose || s.timing) && (
                      <span className={styles.meta}>{[s.dose, s.timing].filter(Boolean).join(' · ')}</span>
                    )}
                    {suppStreak > 1 && (
                      <span className={styles.suppStreak}>🔥 {suppStreak}</span>
                    )}
                  </div>
                </div>
                <button className={styles.del} onClick={() => removeSupplement(s.id)} type="button" aria-label={t('supp.delete')}>
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>

      {showAdd ? (
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder={t('supp.namePh')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            placeholder={t('supp.dosePh')}
            value={newDose}
            onChange={e => setNewDose(e.target.value)}
          />
          <div className={styles.timingChips}>
            {TIMING_KEYS.map(k => {
              const label = t(k)
              return (
                <button
                  key={k}
                  type="button"
                  className={`${styles.chip} ${newTiming === label ? styles.chipActive : ''}`}
                  onClick={() => setNewTiming(prev => prev === label ? '' : label)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className={styles.addActions}>
            <button className={styles.cancelBtn} onClick={() => setShowAdd(false)} type="button">
              {t('supp.cancel')}
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              type="button"
            >
              {saving ? '...' : t('supp.add')}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setShowAdd(true)} type="button">
          {t('supp.addBtn')}
        </button>
      )}

      {/* ── Кога какво е взето ──
          Чете същата таблица, в която пишат чиповете в ДНЕС, така че отметка,
          направена на таблото, се появява тук без нищо помежду им. */}
      {supplements.length > 0 && (
        <section className={styles.calendarSection}>
          <h2 className={styles.calendarTitle}>{t('supp.calendar')}</h2>
          <MonthCalendar completions={calendarCompletions} blocks={calendarBlocks} />
        </section>
      )}
    </div>
  )
}
