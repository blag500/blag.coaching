import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import LangToggle from '../LangToggle/LangToggle'
import { Sheet, LESSON_KEYS } from './Lessons'
import FrameSheet from './FrameSheet'
import InstallDemo from './InstallDemo'
import AppShowcase from './AppShowcase'
import styles from './Landing.module.css'

/**
 * The top of the funnel, drawn after dsgnbyhl.com (25.11): a quiet dark page,
 * a grotesque set large and plain, one accent line in italic gold, hairlines
 * instead of boxes, and the two asks as a filled pill and a plain link.
 *
 * Order: the stage in Varna (the picture says who this is before any
 * sentence does) → the road there → what he teaches → the free app → the
 * questions → write to him. Two offers, never mixed: write to him, or take
 * the app for free.
 *
 * The old landing's styles stay in LandingPage.module.css — CoachOffer
 * still borrows them.
 */

const DM = 'https://ig.me/m/niki.blggg'
const IG = 'https://www.instagram.com/niki.blggg/'
const TT = 'https://www.tiktok.com/@blag.coaching'

const PATH = [
  { src: '/hero-poster.jpg', pos: '50% 40%', capKey: 'story.f1' },
  { src: '/coach-bg.jpg',    pos: '50% 35%', capKey: 'story.f2' },
]

const FAQ_KEYS = [
  { qKey: 'landing.faq.q1', aKey: 'landing.faq.a1' },
  { qKey: 'landing.faq.q2', aKey: 'landing.faq.a2' },
  { qKey: 'landing.faq.q3', aKey: 'landing.faq.a3' },
  { qKey: 'landing.faq.q4', demo: true },
]

const NAV = [
  { id: 'path',    key: 'lp.nav.path' },
  { id: 'lessons', key: 'lp.nav.lessons' },
  { id: 'app',     key: 'lp.nav.app' },
  { id: 'faq',     key: 'lp.nav.faq' },
]

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const Out = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

export default function LandingPage({ onContinue, onLogin }) {
  const { t } = useSettings()
  const [openQ, setOpenQ] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [installOpen, setInstallOpen] = useState(false)

  const go = id => e => {
    e?.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>

      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <header className={styles.bar}>
        <a className={styles.logo} href="#top" onClick={go('top')}>
          <span className={styles.logoBox} aria-hidden="true" />
          BLAG COACHING
        </a>
        <nav className={styles.nav}>
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`} onClick={go(n.id)}>{t(n.key)}</a>
          ))}
        </nav>
        <LangToggle variant="inline" />
      </header>

      {/* ── The stage ───────────────────────────────────────────────────── */}
      <section className={styles.hero} id="top">
        <figure className={styles.heroPhoto}>
          <img src="/story/varna.webp" alt={t('landing.stageAlt')} fetchpriority="high" />
          <figcaption>{t('story.f3')}</figcaption>
        </figure>

        <div className={styles.heroText}>
          <h1 className={styles.display}>
            Blag Coaching
            <em className={styles.accentLine}>&amp; Blag app</em>
          </h1>
          <p className={styles.lead}>{t('lp.lead')}</p>
          <div className={styles.actions}>
            <a className={styles.pill} href={DM} target="_blank" rel="noopener noreferrer">
              {t('lp.write')}
              <span className={styles.pillDot}><Arrow /></span>
            </a>
            <a className={styles.textLink} href="#app" onClick={go('app')}>
              {t('lp.appFree')} <Arrow />
            </a>
          </div>
          <p className={styles.meta}>
            <a href={IG} target="_blank" rel="noopener noreferrer">Instagram <Out /></a>
            <span aria-hidden="true">·</span>
            <a href={TT} target="_blank" rel="noopener noreferrer">TikTok <Out /></a>
          </p>
        </div>
      </section>

      {/* ── The road ────────────────────────────────────────────────────── */}
      <section className={styles.section} id="path">
        <div className={styles.split}>
          <h2 className={styles.h2}>{t('lp.pathHead')}</h2>
          <div className={styles.stat}>
            <span className={styles.statBig}>{t('lp.statBig')}</span>
            <span className={styles.statCap}>{t('lp.statCap')}</span>
          </div>
        </div>
        <div className={styles.cards}>
          {PATH.map((f, i) => (
            <figure key={f.src} className={styles.card}>
              <img src={f.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: f.pos }} />
              <figcaption>
                <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                {t(f.capKey)}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.bridge}>{t('story.bridge')}</p>
      </section>

      {/* ── Lessons ─────────────────────────────────────────────────────── */}
      <section className={styles.section} id="lessons">
        <div className={styles.split}>
          <h2 className={styles.h2}>{t('lp.lessonsHead')}</h2>
          <p className={styles.side}>{t('lp.lessonsSide')}</p>
        </div>
        <ol className={styles.rows}>
          {LESSON_KEYS.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                className={styles.row}
                onClick={() => l.app ? go('app')() : setLesson(l)}
              >
                <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.rowWord}>
                  {t(l.wordKey)}
                  {l.app && <em className={styles.rowAccent}>{t('lp.withApp')}</em>}
                </span>
                <span className={styles.rowGo}><Arrow /></span>
              </button>
            </li>
          ))}
        </ol>
        <a className={styles.outline} href={DM} target="_blank" rel="noopener noreferrer">
          {t('lp.lessonsCta')} <Arrow />
        </a>
      </section>

      {/* ── The app ─────────────────────────────────────────────────────── */}
      <section className={styles.section} id="app">
        <div className={styles.panel}>
          <div className={styles.panelText}>
            <p className={styles.kicker}>{t('lessons.appEyebrow')}</p>
            <h2 className={styles.h2}>
              Blag app
              <em className={styles.accentLine}>{t('lp.appAccent')}</em>
            </h2>
            <p className={styles.lead}>{t('lessons.appLead1')} {t('lessons.appLead2')}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.outline} onClick={() => onContinue?.()}>
                {t('lp.register')} <Arrow />
              </button>
              <button type="button" className={styles.quiet} onClick={() => setInstallOpen(true)}>
                {t('lp.install')}
              </button>
            </div>
          </div>
          <div className={styles.panelShow}><AppShowcase /></div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className={styles.section} id="faq">
        <h2 className={`${styles.h2} ${styles.faqHead}`}>{t('lp.faqHead')}</h2>
        <div className={styles.rows}>
          {FAQ_KEYS.map((item, i) => (
            <div key={item.qKey} className={styles.faqItem}>
              <button
                type="button"
                className={styles.row}
                onClick={() => item.demo ? setInstallOpen(true) : setOpenQ(openQ === i ? null : i)}
                aria-expanded={item.demo ? undefined : openQ === i}
              >
                <span className={styles.faqQ}>{t(item.qKey)}</span>
                <span className={`${styles.plus} ${openQ === i ? styles.plusOpen : ''}`} aria-hidden="true">
                  {item.demo ? <Arrow /> : null}
                </span>
              </button>
              {!item.demo && openQ === i && <p className={styles.faqA}>{t(item.aKey)}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Write to me ─────────────────────────────────────────────────── */}
      <footer className={styles.talk}>
        <div>
          <h2 className={styles.display}>{t('lp.talkHead')}</h2>
          <p className={styles.lead}>{t('lp.talkLead')}</p>
        </div>
        <div className={styles.talkSide}>
          <span className={styles.kickerMuted}>{t('lp.talkSmall')}</span>
          <a className={styles.handle} href={DM} target="_blank" rel="noopener noreferrer">
            @niki.blggg <Out />
          </a>
          <p className={styles.meta}>
            <a href={IG} target="_blank" rel="noopener noreferrer">Instagram <Out /></a>
            <a href={TT} target="_blank" rel="noopener noreferrer">TikTok <Out /></a>
            <button type="button" onClick={() => onContinue?.()}>{t('lp.register')} <Arrow /></button>
          </p>
          <button type="button" className={styles.login} onClick={onLogin}>
            {t('lp.login')} <Arrow />
          </button>
        </div>
      </footer>

      {lesson && (
        <Sheet lesson={lesson} word={t(lesson.wordKey)} closeLabel={t('landing.close')}
               onClose={() => setLesson(null)} />
      )}

      {installOpen && (
        <FrameSheet
          label={t('landing.installLabel')}
          lead={t('landing.installLead')}
          onClose={() => setInstallOpen(false)}
        >
          <InstallDemo />
        </FrameSheet>
      )}
    </div>
  )
}
