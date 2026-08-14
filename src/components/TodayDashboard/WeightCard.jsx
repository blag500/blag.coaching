import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useWeightLog } from '../../hooks/useWeightLog'
import { parseWeight } from '../../utils/pendingWeight'
import Pictogram from '../Pictogram/Pictogram'
import WeightSpark from './WeightSpark'
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
 * Built on one line like the water card beside it, and read left to right: what
 * this is, what it says today, and which way it has been going.
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

function signed(kg) {
  const v = Math.round(kg * 10) / 10
  if (v === 0) return `±0 кг`
  return `${v > 0 ? '+' : '−'}${fmtKg(Math.abs(v))} кг`
}

const WINDOW_DAYS = 30

/**
 * One line under the number: how far it has moved, and over what.
 *
 * Returns null when there is nothing honest to say — a single weigh-in is a
 * point, not a direction, and "±0 кг since today" is worse than silence.
 */
function trendSummary(weights, todayEntry) {
  if (!todayEntry || weights.length < 2) return null

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10)
  const inWindow = weights.filter(w => w.date >= cutoff && w.date !== todayEntry.date)

  const earliestInWindow = inWindow[0] ?? null
  const earliestOverall  = weights.find(w => w.date !== todayEntry.date) ?? null
  const base = earliestInWindow ?? earliestOverall
  if (!base) return null

  const spanDays = Math.round(
    (new Date(todayEntry.date) - new Date(base.date)) / 86400000)

  // A window only earns its name once it is nearly full. Below that, the date
  // is the honest label: "−0,4 кг от 13.08" claims nothing about a month.
  return spanDays >= WINDOW_DAYS - 5
    ? `${signed(todayEntry.kg - base.kg)} за ${WINDOW_DAYS} дни`
    : `${signed(todayEntry.kg - base.kg)} от ${shortDate(base.date)}`
}

export default function WeightCard() {
  const { t } = useSettings()
  const { profile } = useAuth()
  const { weights, todayEntry, addWeight } = useWeightLog()

  // profiles.target_weight, not the localStorage copy the profile page keeps:
  // this is the one onboarding writes and the coach can edit, so it is the only
  // target that means the same thing on both sides of the app.
  const target = profile?.target_weight ? Number(profile.target_weight) : null

  const [input, setInput]     = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  const asking = !todayEntry || editing

  /* The caption says what the line beside it draws.
     It used to compare today with the previous entry — but yesterday minus today
     is scale noise, a number that changes sign with a glass of water and tells
     nobody anything. A month is the shortest window in which a real direction
     shows, and if the history is shorter than that the caption says so with the
     date rather than pretending to a month it does not have. */
  const summary = trendSummary(weights, todayEntry)

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
      <div className={styles.row}>
        {/* 22, not the 14 the water label uses: that one sits beside the word
            "ВОДА" and only decorates it, while this one is the only thing
            naming the card. */}
        <Pictogram name="weight" size={22} className={styles.icon} />

        {asking ? (
          <form className={styles.form} onSubmit={save}>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                value={input}
                onChange={e => { setInput(e.target.value); if (error) setError('') }}
                /* decimal rather than numeric: the keyboard has to carry a
                   comma, which is how the number is written here — and
                   parseFloat alone turns "86,4" into 86, losing the part that
                   was worth typing. */
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
          <>
            {/* Takes the slack, so the number sits against the icon and the
                line stays pinned to the right edge however wide the phone. */}
            <button
              type="button"
              className={styles.readout}
              onClick={() => { setInput(String(todayEntry.kg).replace('.', ',')); setEditing(true) }}
              aria-label={t('today.weightEdit')}
            >
              {/* Written as the water card writes its glasses — 0/8 — because
                  it is the same sentence: where you are, out of where you said
                  you were going. The target is dimmed so the eye still lands on
                  today's number first. */}
              <span className={styles.kg}>
                {fmtKg(todayEntry.kg)}
                {target !== null && (
                  <span className={styles.target}>/{fmtKg(target)}</span>
                )}
                <span className={styles.kgUnit}>кг</span>
              </span>
              <span className={styles.delta}>
                {summary ?? t('today.weightFirst')}
              </span>
            </button>

            <WeightSpark weights={weights} />
          </>
        )}
      </div>

      {asking && !error && !todayEntry && (
        <p className={styles.hint}>{t('today.weightAsk')}</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
