import { useState, useMemo } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import { LIBRARY, LEVELS, DIRS } from './library'
import styles from './PoseLibrary.module.css'

/* Библиотеката: всяка поза е отделен ред, който се разгъва в описание.
   Два филтъра — ниво и посока; редовете са групирани по ниво. */
export default function PoseLibrary({ onBack }) {
  const { t } = useSettings()
  const [level, setLevel] = useState(null)
  const [dir, setDir] = useState(null)
  const [open, setOpen] = useState(null)

  const shown = useMemo(() => LIBRARY.filter(p =>
    (!level || p.level === level) && (!dir || p.filterDir === dir)), [level, dir])

  // Имената на сцената са с главни букви; тук всички са с едно лице.
  const title = p => t(`lib.base.${p.base}.name`)

  function chips(value, set, list, prefix) {
    return (
      <div className={styles.chips}>
        {[null, ...list].map(v => (
          <button
            key={v ?? 'all'}
            type="button"
            aria-pressed={value === v}
            className={`${styles.chip} ${value === v ? styles.chipOn : ''}`}
            onClick={() => { haptic('toggle'); set(v); setOpen(null) }}
          >
            {v ? t(`${prefix}.${v}`) : t('lib.all')}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <button className={styles.back} onClick={onBack} type="button" aria-label={t('pose.backToList')}>←</button>
        <span className={styles.headTitle}>{t('lib.title')}</span>
        <span className={styles.count}>{t('lib.count', { n: shown.length })}</span>
      </header>

      <div className={styles.filters}>
        {chips(level, setLevel, LEVELS, 'lib.level')}
        {chips(dir, setDir, DIRS, 'lib.dir')}
      </div>

      <div className={styles.list}>
        {shown.length === 0 && <p className={styles.empty}>{t('lib.empty')}</p>}
        {shown.map((p, i) => {
          const isOpen = open === p.id
          const newGroup = shown[i - 1]?.level !== p.level
          return (
            <div key={p.id}>
              {newGroup && <div className={styles.group}>{t(`lib.group.${p.level}`)}</div>}
              <button
                type="button"
                className={styles.row}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : p.id)}
              >
                <span className={styles.rowMain}>
                  <span className={styles.name}>{title(p)}</span>
                  <span className={styles.meta}>
                    {t(`lib.dir.${p.dir}`)}
                    {p.ref && <span className={styles.tag}>{t('lib.mandatory')}</span>}
                  </span>
                </span>
                <span className={`${styles.caret} ${isOpen ? styles.caretOpen : ''}`} aria-hidden="true">›</span>
              </button>
              {isOpen && (
                <div className={styles.detail}>
                  <span className={styles.en}>{p.en}</span>
                  <p>{p.ref ? t(`pose.${p.ref}.desc`) : t(`lib.base.${p.base}.desc`)}</p>
                  {!p.ref && p.dir !== 'front' && <p>{t(`lib.dirNote.${p.dir}`)}</p>}
                  {p.level !== 'stand' && <p>{t(`lib.levelNote.${p.level}`)}</p>}
                  {p.ref && (
                    <ul className={styles.cues}>
                      {[1, 2, 3].map(n => <li key={n}>{t(`pose.${p.ref}.cue${n}`)}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
