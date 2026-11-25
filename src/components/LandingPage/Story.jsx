import { useEffect, useRef } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './Story.module.css'

/**
 * Историята между корицата и уроците. Снимките разказват, думите са надписи
 * под кадър — по един ред, без лозунги (25.11: „външният вид да говори сам за
 * себе си“). Всеки кадър е на цял екран; надписът изплува, когато кадърът
 * влезе в екрана. Сцената във Варна е корицата на страницата (25.11), така
 * че тук остава пътят дотам: залата и храненето.
 */

const FRAMES = [
  { src: '/hero-poster.jpg', pos: '50% 40%', capKey: 'story.f1' },
  { src: '/coach-bg.jpg',    pos: '50% 35%', capKey: 'story.f2' },
]

export default function Story() {
  const { t } = useSettings()
  const root = useRef(null)

  useEffect(() => {
    const els = root.current?.querySelectorAll(`.${styles.frame}`) ?? []
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add(styles.in))
      return
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add(styles.in) })
    }, { threshold: 0.45 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className={styles.story} ref={root} id="story">
      {FRAMES.map((f, i) => (
        <figure key={f.src} className={`${styles.frame} ${f.stage ? styles.stage : ''}`}>
          <img
            className={styles.img}
            src={f.src}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ objectPosition: f.pos }}
          />
          <span className={styles.shade} aria-hidden="true" />
          <figcaption className={styles.cap}>
            <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.line}>{t(f.capKey)}</span>
            {f.subKey && <span className={styles.sub}>{t(f.subKey)}</span>}
          </figcaption>
        </figure>
      ))}
      <p className={styles.bridge}>{t('story.bridge')}</p>
    </div>
  )
}
