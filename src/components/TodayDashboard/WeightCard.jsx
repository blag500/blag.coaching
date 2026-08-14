import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useWeightLog } from '../../hooks/useWeightLog'
import { parseWeight } from '../../utils/pendingWeight'
import Pictogram from '../Pictogram/Pictogram'
import styles from './WeightCard.module.css'

/**
 * Today's weigh-in, entered here rather than prompted from here.
 *
 * Weight lived only in the profile, three taps away, behind a tab nobody opens
 * daily — and a number that is asked for once a week is a chart with nothing in
 * it. The habits row on this page already settled the same argument: a nudge
 * that sends you to another tab to spend four seconds is a nudge most people
 * decline.
 *
 * The change is shown against the previous entry with its date, not against a
 * seven-day window: entries are irregular, and "-0.4 kg over 7 days" is a
 * sentence the data often cannot support. Whichever direction it moved is
 * printed plainly, in the same colour either way — down is not progress for
 * someone gaining, and this card does not know which they are.
 */

/** "2026-08-11" → "11.08". The year is noise for a number from this week. */
function shortDate(iso) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

function fmtKg(n) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

export default function WeightCard() {
  const { t } = useSettings()
  const { weights, todayEntry, addWeight } = useWeightLog()

  const [input, setInput]     = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  const asking = !todayEntry || editing

  // The most recent entry that is not today's — what today's number is a change
  // from. Weights arrive sorted by date from the hook.
  const previous = todayEntry
    ? [...weights].reverse().find(w => w.date !== todayEntry.date) ?? null
    : null
  const delta = previous ? Math.round((todayEntry.kg - previous.kg) * 10) / 10 : null

  async function save(e) {
    e.preventDefault()
    const kg = parseWeight(input)
    if (kg === null) { setError(t('today.weightError')); return }
    setError('')
    setBusy(true)
    const { error: err } = await addWeight(kg)
    setBusy(false)
    if (err) { setError(t('today.weightError')); return }
    setInput('')
    setEditing(false)
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>
          <Pictogram name="weight" size={14} />
          {t('today.weight')}
        </span>
        {todayEntry && !editing && (
          <button
            type="button"
            className={styles.edit}
            onClick={() => { setInput(String(todayEntry.kg).replace('.', ',')); setEditing(true) }}
          >
            {t('today.weightEdit')}
          </button>
        )}
      </div>

      {asking ? (
        <form className={styles.form} onSubmit={save}>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              value={input}
              onChange={e => { setInput(e.target.value); if (error) setError('') }}
              /* decimal rather than numeric: the keyboard has to carry a comma,
                 which is how the number is written here — and parseFloat alone
                 turns "86,4" into 86, losing the part that was worth typing. */
              inputMode="decimal"
              enterKeyHint="done"
              placeholder="86,4"
              autoComplete="off"
              maxLength={5}
              aria-label={t('today.weight')}
            />
            <span className={styles.unit}>кг</span>
          </div>
          <button type="submit" className={styles.save} disabled={busy}>
            {t('today.weightSave')}
          </button>
        </form>
      ) : (
        <div className={styles.readout}>
          <span className={styles.kg}>
            {fmtKg(todayEntry.kg)}<span className={styles.kgUnit}>кг</span>
          </span>
          <span className={styles.delta}>
            {delta === null
              ? t('today.weightFirst')
              : `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${fmtKg(Math.abs(delta))} кг ` +
                t('today.weightSince').replace('{date}', shortDate(previous.date))}
          </span>
        </div>
      )}

      {asking && !error && !todayEntry && (
        <p className={styles.hint}>{t('today.weightAsk')}</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
