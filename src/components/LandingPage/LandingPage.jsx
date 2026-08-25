import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import Lessons from './Lessons'
import DotNav from './DotNav'
import FrameSheet from './FrameSheet'
import InstallDemo from './InstallDemo'
import styles from './LandingPage.module.css'

/**
 * The top of the funnel. Someone arrives from a video knowing a name and
 * nothing else, so the page answers, in order: what is this, what does it do,
 * how does it work, who is behind it, what does it cost, and what about the
 * thing I'm worried about. Then it asks once.
 */

const FAQ_KEYS = [
  { qKey: 'landing.faq.q1', aKey: 'landing.faq.a1' },
  { qKey: 'landing.faq.q2', aKey: 'landing.faq.a2' },
  { qKey: 'landing.faq.q3', aKey: 'landing.faq.a3' },
  { qKey: 'landing.faq.q4', demo: true },
]

const SECTION_IDS = [
  { id: 'top',     labelKey: 'landing.nav.top'     },
  { id: 'lessons', labelKey: 'landing.nav.lessons' },
  { id: 'faq',     labelKey: 'landing.nav.faq'     },
]

export default function LandingPage({ onContinue, onLogin }) {
  const { t } = useSettings()
  const [openQ, setOpenQ] = useState(null)
  const [installOpen, setInstallOpen] = useState(false)

  const sections = SECTION_IDS.map(s => ({ id: s.id, label: t(s.labelKey) }))
  const offerLine = t('landing.offer')
  const ticker = Array.from({ length: 4 }, () => offerLine).join('   ·   ') + '   ·   '

  const go = id => e => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>

      <DotNav sections={sections} />

      {/* ── Bar ────────────────────────────────────────────────────────── */}
      <header className={styles.bar}>
        <nav className={styles.barNav}>
          <a href="#lessons" onClick={go('lessons')}>{t('landing.nav.lessons')}</a>
          <a href="#faq"     onClick={go('faq')}>{t('landing.nav.faq')}</a>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className={styles.hero} id="top">
        <div className={styles.sheet}>
          <img
            className={styles.poster}
            src="/poster.webp"
            alt=""
            fetchpriority="high"
          />
          <div className={styles.ink}>
            <h1 className={styles.inkName}>
              Blag Coaching
              <span className={styles.inkAmp}>&amp;</span>
              Blag app
            </h1>
          </div>
        </div>
        <span className={styles.posterShade} aria-hidden="true" />

        <a className={styles.heroCta} href="#lessons" onClick={go('lessons')}>
          {t('landing.heroCta')}
        </a>

        <div className={styles.socials}>
          <a
            className={styles.social}
            href="https://www.instagram.com/niki.blggg/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <svg className={styles.socialIcon} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5"
                fill="none" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="12" r="4.2"
                fill="none" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" />
            </svg>
            <span>Instagram</span>
          </a>
          <a
            className={styles.social}
            href="https://www.tiktok.com/@blag.coaching"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
          >
            <svg className={styles.socialIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M16.5 3.2c.3 2.02 1.53 3.6 3.5 3.9v2.42c-1.2.08-2.35-.23-3.44-.86v5.66c0 2.9-2.13 5.18-4.98 5.18-2.6 0-4.66-1.9-4.66-4.42 0-2.7 2.28-4.66 5.02-4.24v2.5c-.3-.1-.63-.15-.98-.12-1.1.1-1.9.94-1.86 2.02.04 1.06.9 1.86 1.98 1.82 1.1-.04 1.86-.9 1.86-2.06V3.2h2.56Z" />
            </svg>
            <span>TikTok</span>
          </a>
        </div>

        <span className={styles.scrollHint} aria-hidden="true" />
      </section>

      {/* ── What he teaches ────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.lessonsSection}`} id="lessons">
        <div className={styles.lessonsBg} aria-hidden="true" />
        <div className={styles.lessonsWash} aria-hidden="true" />
        <span className={styles.markLink}>
          <span className={styles.markText}>THE BLAG COACH</span>
        </span>
        <h2 className={styles.h2}>{t('landing.lessonsHead')}</h2>
        <Lessons />

        <a className={`${styles.heroCta} ${styles.lessonsCta}`} href="https://ig.me/m/niki.blggg"
           target="_blank" rel="noopener noreferrer">
          {t('landing.lessonsCta')}
        </a>
        <p className={styles.quietRow}>
          <button className={styles.quietCta} onClick={onContinue} type="button">
            {t('landing.appOnly')}
          </button>
          <span className={styles.quietDot} aria-hidden="true">•</span>
          <a className={styles.faqLink} href="#faq" onClick={go('faq')}>{t('landing.nav.faq')}</a>
        </p>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.close}`} id="faq">
        <h2 className={styles.h2}>{t('landing.faqTitle')}</h2>

        <div className={styles.faq}>
          {FAQ_KEYS.map((item, i) => (
            <div key={item.qKey} className={styles.faqItem}>
              <button
                className={styles.faqQ}
                onClick={() => item.demo ? setInstallOpen(true) : setOpenQ(openQ === i ? null : i)}
                aria-expanded={item.demo ? undefined : openQ === i}
                type="button"
              >
                <span>{t(item.qKey)}</span>
                {item.demo
                  ? <span className={styles.faqPlay} aria-hidden="true">▶</span>
                  : <span className={`${styles.faqMark} ${openQ === i ? styles.faqMarkOpen : ''}`} aria-hidden="true" />}
              </button>
              {!item.demo && openQ === i && <p className={styles.faqA}>{t(item.aKey)}</p>}
            </div>
          ))}
        </div>

        <button className={styles.loginLink} onClick={onLogin} type="button">
          {t('landing.loginLead')} <span className={styles.loginLinkUnder}>{t('landing.loginLink')}</span>
        </button>
      </section>

      {installOpen && (
        <FrameSheet
          label={t('landing.installLabel')}
          lead={t('landing.installLead')}
          onClose={() => setInstallOpen(false)}
        >
          <InstallDemo />
        </FrameSheet>
      )}

      <div className={styles.ticker} role="note">
        <div className={styles.tickerTrack}>
          <span className={styles.tickerRun}>{ticker}</span>
          <span className={styles.tickerRun} aria-hidden="true">{ticker}</span>
        </div>
      </div>
    </div>
  )
}
