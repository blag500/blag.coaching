import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Lessons.module.css'

/**
 * What he teaches, as four words you can open.
 *
 * The page can say "треньор" as often as it likes; a visitor from a video has
 * no way to weigh that. Eleven seconds of him under a machine is the only
 * sentence here that cannot be written by somebody who cannot do it.
 *
 * A line opens onto the whole screen rather than into a card: everything else
 * goes, the word stays in the middle, and the film runs behind it under a
 * blur. The blur is the point — this is not a video to be watched, it is proof
 * that there is one, and the word has to stay the thing being read.
 *
 * Two of the four have no footage yet. They open the same way onto the paper,
 * because a line that does nothing when you press it teaches the visitor that
 * the rest do not either.
 */
const LESSONS = [
  { id: 'train',   word: 'Тренираш',         film: '/lessons/5765.mp4', webm: '/lessons/5765.webm' },
  { id: 'pose',    word: 'Позираш',          film: '/hero.mp4',         webm: '/hero.webm' },
  { id: 'eat',     word: 'Се храниш' },
  { id: 'recover', word: 'Се възстановяваш' },
]

function Sheet({ lesson, onClose }) {
  const videoRef = useRef(null)

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

  useEffect(() => {
    videoRef.current?.play().catch(() => {})
  }, [lesson.id])

  /* To the body, not into the section. A fixed element inside an ancestor that
     carries a transform is positioned against that ancestor rather than the
     window, and this page has several. */
  return createPortal(
    <div className={styles.sheet} onClick={onClose} role="dialog" aria-label={lesson.word}>
      {lesson.film ? (
        <video ref={videoRef} className={styles.sheetFilm}
               muted loop playsInline preload="auto" aria-hidden="true">
          <source src={lesson.webm} type="video/webm" />
          <source src={lesson.film} type="video/mp4" />
        </video>
      ) : (
        <div className={styles.sheetPaper} aria-hidden="true" />
      )}

      <div className={styles.sheetVeil} aria-hidden="true" />

      <span className={styles.sheetWord}>{lesson.word}</span>

      <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Затвори">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>,
    document.body,
  )
}

export default function Lessons({ onProgress }) {
  const [open, setOpen] = useState(null)

  return (
    <>
      <ul className={styles.list}>
        {LESSONS.map(l => (
          <li key={l.id}>
            <button type="button" className={styles.line} onClick={() => setOpen(l)}>
              <span className={styles.word}>{l.word}</span>
              <span className={styles.arrow} aria-hidden="true">▶</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Louder than the four above it, because it is the one that carries on
          down the page rather than opening a screen of its own. */}
      <button type="button" className={styles.progress} onClick={onProgress}>
        Да прогресираш с <span className={styles.progressMark}>BLAG APP</span>
      </button>

      {open && <Sheet lesson={open} onClose={() => setOpen(null)} />}
    </>
  )
}
