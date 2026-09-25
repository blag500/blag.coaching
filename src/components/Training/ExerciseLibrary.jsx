import { useMemo, useState } from 'react'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { useSettings } from '../../contexts/SettingsContext'
import { FINE_MUSCLES } from '../../utils/recovery'
import { haptic } from '../../lib/haptics'
import AppHeader from '../AppHeader/AppHeader'
import Pictogram from '../Pictogram/Pictogram'
import styles from './ExerciseLibrary.module.css'

/**
 * Заготовките.
 *
 * Списъкът, от който в дневника се избира заместител, вместо да се пише име.
 * Планът си остава на треньора; това е какво слагаш, когато уредът е зает или
 * рамото не иска — и е твое решение, затова списъкът е твой.
 *
 * Подредбата е по мускул, не по папка. Папката беше свободен текст — „за
 * гърди", „Гърди", „заместител на лежанка" — и дневникът не можеше да я
 * свърже с упражнението, което заместваш. Мускулът може: в залата избираш
 * мускула и виждаш всичко за него.
 */
export default function ExerciseLibrary({ onBack, onMenuOpen }) {
  const { t } = useSettings()
  const { items, loading, add, remove, update } = useExerciseLibrary()

  const [filter, setFilter]   = useState('all')   // 'all' | muscle id | 'none'
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [scheme, setScheme]   = useState('')
  const [muscle, setMuscle]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState(null)

  const muscleLabel = id => t(FINE_MUSCLES.find(m => m.id === id)?.labelKey ?? '')

  /* По мускул, в реда на FINE_MUSCLES — същият ред като навсякъде другаде в
     приложението. Без мускул отиват накрая, с начин да им се зададе. */
  const groups = useMemo(() => {
    const out = FINE_MUSCLES
      .map(m => ({ id: m.id, list: items.filter(i => i.muscle === m.id) }))
      .filter(g => g.list.length)
    const loose = items.filter(i => !i.muscle || !FINE_MUSCLES.some(m => m.id === i.muscle))
    if (loose.length) out.push({ id: 'none', list: loose })
    return out
  }, [items])

  const shown = filter === 'all' ? groups : groups.filter(g => g.id === filter)

  function openForm() {
    // Отворено от филтър за мускул — формата вече е на него.
    setMuscle(filter !== 'all' && filter !== 'none' ? filter : '')
    setOpen(true)
  }

  async function save() {
    if (!name.trim() || !muscle || busy) return
    setBusy(true)
    setErr(null)
    const { error } = await add({ name, scheme, muscle })
    setBusy(false)
    if (error) {
      setErr(error === 'duplicate' ? t('lib.err.duplicate') : t('lib.err.save'))
      haptic('reject')
      return
    }
    haptic('success')
    // Мускулът нарочно остава: добавят се по няколко наведнъж за един и същ.
    setName(''); setScheme('')
  }

  const empty = !loading && items.length === 0

  return (
    <div className={styles.page}>
      <AppHeader onBack={onBack} onMenuOpen={onMenuOpen} title={t('lib.title')} />

      <p className={styles.lead}>{t('lib.lead')}</p>

      {empty && (
        <div className={styles.blank}>
          <Pictogram name="training" size={34} className={styles.blankIcon} />
          <p className={styles.blankText}>{t('lib.empty')}</p>
        </div>
      )}

      {groups.length > 1 && (
        <div className={styles.filters} role="tablist" aria-label={t('lib.filterAria')}>
          <button
            type="button" role="tab" aria-selected={filter === 'all'}
            className={`${styles.filter} ${filter === 'all' ? styles.filterOn : ''}`}
            onClick={() => { haptic('toggle'); setFilter('all') }}
          >
            {t('lib.all')} <span className={styles.filterCount}>{items.length}</span>
          </button>
          {groups.map(g => (
            <button
              key={g.id} type="button" role="tab" aria-selected={filter === g.id}
              className={`${styles.filter} ${filter === g.id ? styles.filterOn : ''}`}
              onClick={() => { haptic('toggle'); setFilter(g.id) }}
            >
              {g.id === 'none' ? t('lib.noMuscle') : muscleLabel(g.id)}
              <span className={styles.filterCount}>{g.list.length}</span>
            </button>
          ))}
        </div>
      )}

      {shown.map(g => (
        <section key={g.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {g.id === 'none' ? t('lib.noMuscle') : muscleLabel(g.id)}
            <span className={styles.count}>{g.list.length}</span>
          </h2>
          {g.list.map(it => (
            <div key={it.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowName}>{it.name}</span>
                {it.scheme && <span className={styles.rowMeta}>{it.scheme}</span>}
                {g.id === 'none' && (
                  <select
                    className={styles.rowMuscle}
                    value=""
                    onChange={e => { haptic('success'); update(it.id, { muscle: e.target.value }) }}
                    aria-label={t('lib.setMuscle')}
                  >
                    <option value="" disabled>{t('lib.setMuscle')}</option>
                    {FINE_MUSCLES.map(m => (
                      <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                className={styles.rowDrop}
                onClick={() => { haptic('tap'); remove(it.id) }}
                aria-label={t('lib.remove')}
              >×</button>
            </div>
          ))}
        </section>
      ))}

      {open ? (
        <div className={styles.form}>
          <select
            className={styles.input}
            value={muscle}
            onChange={e => setMuscle(e.target.value)}
            aria-label={t('lib.musclePh')}
          >
            <option value="" disabled>{t('lib.musclePh')}</option>
            {FINE_MUSCLES.map(m => (
              <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
            ))}
          </select>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder={t('lib.namePh')}
            autoFocus
          />
          <input
            className={styles.input}
            value={scheme}
            onChange={e => setScheme(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder={t('lib.schemePh')}
          />

          {err && <p className={styles.err}>{err}</p>}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setOpen(false); setErr(null) }}>
              {t('lib.done')}
            </button>
            <button type="button" className={styles.saveBtn} onClick={save} disabled={busy || !name.trim() || !muscle}>
              {busy ? '...' : t('lib.save')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.addBtn} onClick={openForm}>
          {t('lib.addBtn')}
        </button>
      )}
    </div>
  )
}
