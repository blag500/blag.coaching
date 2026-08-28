import { useState } from 'react'
import styles from './Profile.module.css'

/**
 * Сгъваема секция.
 *
 * Профилът пое и таблото, и прогреса, и настройките — а човек, който влиза да
 * смени една тема, не иска да мине покрай дневника за тегло, за да стигне до
 * нея. Сгъването не крие нищо: заглавието остава на екрана и казва какво има
 * вътре.
 *
 * Състоянието се помни в localStorage, не в базата: това е как изглежда
 * страницата на този телефон, а не факт за човека. Втори телефон има право на
 * свое подреждане, и синхронизирането му би било повече работа, отколкото
 * едно щракване.
 */
const KEY = 'blag_folds_v1'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

function write(id, open) {
  try {
    const all = read()
    all[id] = open
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* пълно хранилище — подредбата не си струва грешка */ }
}

export default function Fold({ id, title, sub, defaultOpen = true, children }) {
  /* Записаното бие подразбирането, но само ако наистина има запис: false е
     валиден избор и не бива да пада обратно на отворено. */
  const [open, setOpen] = useState(() => {
    const saved = read()[id]
    return typeof saved === 'boolean' ? saved : defaultOpen
  })

  function toggle() {
    setOpen(v => { write(id, !v); return !v })
  }

  return (
    <section className={styles.card}>
      <button
        type="button"
        className={styles.foldHead}
        onClick={toggle}
        aria-expanded={open}
      >
        <h2 className={`${styles.sectionTitle} ${styles.foldTitle}`}>{title}</h2>
        <svg
          className={`${styles.foldChevron} ${open ? styles.foldChevronOpen : ''}`}
          viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.foldBody}>
          {sub && <p className={styles.sectionSub}>{sub}</p>}
          {children}
        </div>
      )}
    </section>
  )
}
