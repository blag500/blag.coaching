import { useMemo, useState } from 'react'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'
import { useExerciseAliases } from '../../hooks/useExerciseAliases'
import { useSettings } from '../../contexts/SettingsContext'
import { FINE_MUSCLES, guessMuscle } from '../../utils/recovery'
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
  const { merge } = useExerciseAliases()

  const [filter, setFilter]   = useState('all')   // 'all' | muscle id | 'none'
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [scheme, setScheme]   = useState('')
  const [muscle, setMuscle]   = useState('')
  // Избран ли е мускулът от човека — докато не е, се досеща от името.
  const [muscleSet, setMuscleSet] = useState(false)
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
    const fromFilter = filter !== 'all' && filter !== 'none'
    setMuscle(fromFilter ? filter : '')
    setMuscleSet(fromFilter)
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

  /* Поправката на ред. Името се пише на ръка и в залата, затова грешките
     са честа работа, а махане и добавяне наново губи мускула и схемата. */
  const [edit, setEdit]       = useState(null)   // { id, name, scheme, muscle, was }
  const [editErr, setEditErr] = useState(null)

  function startEdit(it) {
    setEditErr(null)
    setEdit({ id: it.id, name: it.name, scheme: it.scheme ?? '', muscle: it.muscle ?? '', was: it.name })
  }

  async function saveEdit() {
    if (!edit || !edit.name.trim() || busy) return
    setBusy(true)
    setEditErr(null)
    const name = edit.name.trim()
    const { error } = await update(edit.id, {
      name,
      scheme: edit.scheme.trim() || null,
      muscle: edit.muscle || null,
    })
    if (error) {
      setBusy(false)
      setEditErr(error === 'duplicate' ? t('lib.err.duplicate') : t('lib.err.save'))
      haptic('reject')
      return
    }
    /* Сериите, вече записани под старото име, остават каквито са били в деня.
       Обединяване ги държи на една крива с новото — иначе поправената буква
       разцепва историята на две. Ако старото име вече се влива някъде,
       обединяването го отказва и това е наред. */
    if (edit.was.trim().toLowerCase() !== name.toLowerCase()) await merge(edit.was.trim(), name)
    setBusy(false)
    haptic('success')
    setEdit(null)
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
          {g.list.map(it => edit?.id === it.id ? (
            <div key={it.id} className={styles.form}>
              <input
                className={styles.input}
                value={edit.name}
                onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                placeholder={t('lib.namePh')}
                aria-label={t('lib.namePh')}
                autoFocus
              />
              <select
                className={styles.input}
                value={edit.muscle}
                onChange={e => setEdit(p => ({ ...p, muscle: e.target.value }))}
                aria-label={t('lib.musclePh')}
              >
                <option value="">{t('lib.noMuscle')}</option>
                {FINE_MUSCLES.map(m => (
                  <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
                ))}
              </select>
              <input
                className={styles.input}
                value={edit.scheme}
                onChange={e => setEdit(p => ({ ...p, scheme: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                placeholder={t('lib.schemePh')}
                aria-label={t('lib.schemePh')}
              />
              {editErr && <p className={styles.err}>{editErr}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEdit(null)}>
                  {t('lib.cancel')}
                </button>
                <button type="button" className={styles.saveBtn} onClick={saveEdit} disabled={busy || !edit.name.trim()}>
                  {busy ? '...' : t('lib.save')}
                </button>
              </div>
            </div>
          ) : (
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
                className={styles.rowEdit}
                onClick={() => { haptic('tap'); startEdit(it) }}
                aria-label={t('lib.edit', { name: it.name })}
              >✎</button>
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
          <input
            className={styles.input}
            value={name}
            onChange={e => {
              setName(e.target.value)
              if (!muscleSet) setMuscle(guessMuscle(e.target.value) ?? '')
            }}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder={t('lib.namePh')}
            autoFocus
          />
          <select
            className={styles.input}
            value={muscle}
            onChange={e => { setMuscle(e.target.value); setMuscleSet(true) }}
            aria-label={t('lib.musclePh')}
          >
            <option value="" disabled>{t('lib.musclePh')}</option>
            {FINE_MUSCLES.map(m => (
              <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
            ))}
          </select>
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
