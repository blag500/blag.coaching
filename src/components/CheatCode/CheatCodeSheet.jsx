import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './CheatCodeSheet.module.css'

/**
 * Чийт Код в прозорец над приложението.
 *
 * Страницата е отделна (`public/cheatcode/index.html`) и остава такава — тук
 * само се показва в рамка. Така се пише и гледа на едно място, а приложението
 * не носи копие, което да изостане. Рамката се сглобява едва при отваряне:
 * снимките на ястията не се теглят, докато никой не ги е поискал.
 */
export default function CheatCodeSheet({ open, onClose }) {
  const { t } = useSettings()
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef(null)

  function close() {
    if (closing) return
    haptic('tap')
    setClosing(true)
    closeTimer.current = setTimeout(() => { setClosing(false); onClose() }, 240)
  }

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  if (!open) return null

  return createPortal(
    <div
      className={`${styles.layer} ${closing ? styles.closing : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.cheatcode')}
    >
      <div className={styles.scrim} onClick={close} aria-hidden="true" />
      <div className={styles.sheet}>
        <iframe
          className={styles.frame}
          src="/cheatcode/index.html"
          title={t('nav.cheatcode')}
        />
        <button
          className={styles.close}
          onClick={close}
          aria-label={t('nav.cheatcodeClose')}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}
