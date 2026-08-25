import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './FrameSheet.module.css'

/**
 * A framed card over the whole screen.
 *
 * Two things on this page are shown rather than described — the app itself and
 * how to install it — and both are shown the same way: the page goes dark, a
 * frame rises, and it closes again where it opened. The frame is what says
 * "this is being shown to you" instead of "you have scrolled into a section".
 *
 * To the body, not into the section that opened it. A fixed element inside an
 * ancestor carrying a transform is positioned against that ancestor rather than
 * the window, and this page has several.
 */
export default function FrameSheet({ label, eyebrow, lead, onClose, children }) {
  const { t } = useSettings()
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // The page must not scroll away underneath an open screen.
    const had = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = had
    }
  }, [onClose])

  return createPortal(
    <div className={styles.sheet} onClick={onClose} role="dialog" aria-label={label}>
      <div className={styles.frame} onClick={e => e.stopPropagation()}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        {lead && <p className={styles.lead}>{lead}</p>}
        <div className={styles.body}>{children}</div>
      </div>

      <button type="button" className={styles.close} onClick={onClose} aria-label={t('landing.close')}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>,
    document.body,
  )
}
