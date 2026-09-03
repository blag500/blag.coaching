import { useState } from 'react'
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
 * Папката е етикет, не действие: „Заместители за гърди" е подредба, а при
 * избиране се взима едно упражнение от нея, не цялата.
 */
export default function ExerciseLibrary({ onBack, onMenuOpen }) {
  const { t } = useSettings()
  const { byFolder, folders, loading, add, remove } = useExerciseLibrary()

  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [folder, setFolder]   = useState('')
  const [scheme, setScheme]   = useState('')
  const [muscle, setMuscle]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState(null)

  async function save() {
    if (!name.trim() || busy) return
    setBusy(true)
    setErr(null)
    const { error } = await add({ name, folder, scheme, muscle })
    setBusy(false)
    if (error) {
      setErr(error === 'duplicate' ? t('lib.err.duplicate') : t('lib.err.save'))
      haptic('reject')
      return
    }
    haptic('success')
    setName(''); setScheme(''); setMuscle('')
    // Папката нарочно остава: добавят се по няколко наведнъж в една и съща.
    setOpen(false)
  }

  const empty = !loading && byFolder.length === 0

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

      {byFolder.map(({ folder: f, list }) => (
        <section key={f ?? '__loose'} className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {f ?? t('lib.noFolder')} <span className={styles.count}>{list.length}</span>
          </h2>
          {list.map(it => (
            <div key={it.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowName}>{it.name}</span>
                {(it.scheme || it.muscle) && (
                  <span className={styles.rowMeta}>
                    {it.scheme}
                    {it.scheme && it.muscle ? ' · ' : ''}
                    {it.muscle ? t(FINE_MUSCLES.find(m => m.id === it.muscle)?.labelKey ?? '') : ''}
                  </span>
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
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('lib.namePh')}
            autoFocus
          />
          <input
            className={styles.input}
            value={scheme}
            onChange={e => setScheme(e.target.value)}
            placeholder={t('lib.schemePh')}
          />

          {/* Папката се пише, но вече съществуващите се предлагат — така
              „Гърди" и „гърди" не стават две папки за едно и също. */}
          <input
            className={styles.input}
            value={folder}
            onChange={e => setFolder(e.target.value)}
            placeholder={t('lib.folderPh')}
            list="lib-folders"
          />
          <datalist id="lib-folders">
            {folders.map(f => <option key={f} value={f} />)}
          </datalist>

          <select
            className={styles.input}
            value={muscle}
            onChange={e => setMuscle(e.target.value)}
            aria-label={t('lib.musclePh')}
          >
            <option value="">{t('lib.musclePh')}</option>
            {FINE_MUSCLES.map(m => (
              <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
            ))}
          </select>

          {err && <p className={styles.err}>{err}</p>}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setOpen(false); setErr(null) }}>
              {t('lib.cancel')}
            </button>
            <button type="button" className={styles.saveBtn} onClick={save} disabled={busy || !name.trim()}>
              {busy ? '...' : t('lib.save')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.addBtn} onClick={() => setOpen(true)}>
          {t('lib.addBtn')}
        </button>
      )}
    </div>
  )
}
