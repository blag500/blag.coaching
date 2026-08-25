import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import AppShowcase from './AppShowcase'
import FrameSheet from './FrameSheet'
import styles from './Lessons.module.css'

const LESSON_KEYS = [
  { id: 'train',   wordKey: 'lessons.train',    film: '/lessons/5765.mp4', webm: '/lessons/5765.webm' },
  { id: 'pose',    wordKey: 'lessons.pose',     film: '/hero.mp4',         webm: '/hero.webm' },
  { id: 'app',     wordKey: 'lessons.progress', app: true },
  { id: 'eat',     wordKey: 'lessons.eat',      film: '/lessons/eat.mp4',  webm: '/lessons/eat.webm' },
  { id: 'recover', wordKey: 'lessons.recover' },
]

function Sheet({ lesson, word, closeLabel, onClose }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
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

  return createPortal(
    <div className={styles.sheet} onClick={onClose} role="dialog" aria-label={word}>
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

      <span className={styles.sheetWord}>{word}</span>

      <button type="button" className={styles.sheetClose} onClick={onClose} aria-label={closeLabel}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>,
    document.body,
  )
}

function AppSheet({ onClose }) {
  const { t } = useSettings()
  return (
    <FrameSheet
      label="Blag app"
      eyebrow={t('lessons.appEyebrow')}
      lead={<>{t('lessons.appLead1')}<br />{t('lessons.appLead2')}</>}
      onClose={onClose}
    >
      <div className={styles.showcaseScale}><AppShowcase /></div>
    </FrameSheet>
  )
}

export default function Lessons() {
  const { t } = useSettings()
  const [open, setOpen] = useState(null)
  const [appOpen, setAppOpen] = useState(false)

  return (
    <>
      <ul className={styles.list}>
        {LESSON_KEYS.map(l => (
          <li key={l.id}>
            <button type="button" className={styles.line}
                    onClick={() => l.app ? setAppOpen(true) : setOpen(l)}>
              <span className={styles.word}>
                {t(l.wordKey)}
                {l.app && <span className={styles.withApp}>{t('lessons.withApp')}</span>}
              </span>
              <span className={styles.arrow} aria-hidden="true">▶</span>
            </button>
          </li>
        ))}
      </ul>

      {open && <Sheet lesson={open} word={t(open.wordKey)} closeLabel={t('landing.close')} onClose={() => setOpen(null)} />}
      {appOpen && <AppSheet onClose={() => setAppOpen(false)} />}
    </>
  )
}
