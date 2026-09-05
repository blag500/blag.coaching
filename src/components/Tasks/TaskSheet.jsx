import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './TaskSheet.module.css'

/**
 * Листът, с който едно изрязано парче от деня получава име.
 *
 * Дотук това беше системният `prompt` — работеше, но е чуждо тяло в дизайна и
 * пита само за едно нещо. Часът и дължината вече са казани с пръста; тук
 * остава само какво е, и — ако трябва — колко важно.
 *
 * Портал към body, както всичко останало, което покрива екрана: закрепен слой
 * вътре в трансформиран предшественик се закача за него вместо за прозореца, а
 * табовете носят трансформация при суайп.
 */
export default function TaskSheet({ open, start, minutes, onCancel, onSave }) {
  const { t } = useSettings()
  const [text, setText] = useState('')
  const [high, setHigh] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setText(''); setHigh(false); setBusy(false)
    // Клавиатурата излиза веднага: листът се отваря, защото човек е на път да
    // напише нещо, а не за да го разгледа.
    const id = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [open, start])

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onCancel?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  async function save() {
    if (!text.trim() || busy) return
    setBusy(true)
    haptic('success')
    await onSave?.({ text: text.trim(), priority: high ? 2 : 1 })
    setBusy(false)
  }

  const hhmm = String(start || '').slice(0, 5)

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <form
        className={styles.sheet}
        onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); save() }}
      >
        {/* Часът и дължината не се въвеждат — те вече са казани с пръста.
            Затова стоят като факт, а не като полета. */}
        <div className={styles.head}>
          <span className={styles.when}>{hhmm}</span>
          <span className={styles.dur}>{minutes} {t('tl.min')}</span>
          <button
            type="button"
            className={styles.close}
            onClick={onCancel}
            aria-label={t('tl.sheetCancel')}
          >×</button>
        </div>

        <input
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('tl.sheetPlaceholder')}
          maxLength={120}
        />

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.flag} ${high ? styles.flagOn : ''}`}
            onClick={() => { haptic('toggle'); setHigh(v => !v) }}
            aria-pressed={high}
          >
            {t('tasks.important')}
          </button>
          <button
            type="submit"
            className={styles.save}
            disabled={busy || !text.trim()}
          >
            {busy ? '...' : t('tl.sheetSave')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
