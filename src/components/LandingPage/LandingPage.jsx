import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import LangToggle from '../LangToggle/LangToggle'
import Lessons from './Lessons'
import Story from './Story'
import DotNav from './DotNav'
import FrameSheet from './FrameSheet'
import InstallDemo from './InstallDemo'
import AppShowcase from './AppShowcase'
import styles from './LandingPage.module.css'

/**
 * The top of the funnel. Someone arrives from a video knowing a name and
 * nothing else. The page opens on the stage in Varna (25.11) — the picture
 * says who this is before any sentence does — and then goes, in order: the
 * road there, what he can teach you, the free app, and the questions.
 * Two offers, never mixed: write to him, or take the app for free.
 */

const DM = 'https://ig.me/m/niki.blggg'

const FAQ_KEYS = [
  { qKey: 'landing.faq.q1', aKey: 'landing.faq.a1' },
  { qKey: 'landing.faq.q2', aKey: 'landing.faq.a2' },
  { qKey: 'landing.faq.q3', aKey: 'landing.faq.a3' },
  { qKey: 'landing.faq.q4', demo: true },
]

const SECTION_IDS = [
  { id: 'top',     labelKey: 'landing.nav.top'     },
  { id: 'story',   labelKey: 'landing.nav.story'   },
  { id: 'lessons', labelKey: 'landing.nav.lessons' },
  { id: 'app',     labelKey: 'landing.nav.app'     },
  { id: 'faq',     labelKey: 'landing.nav.faq'     },
]

export default function LandingPage({ onContinue, onLogin }) {
  const { t } = useSettings()
  const [openQ, setOpenQ] = useState(null)
  const [installOpen, setInstallOpen] = useState(false)

  const sections = SECTION_IDS.map(s => ({ id: s.id, label: t(s.labelKey) }))

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
          <a href="#app"     onClick={go('app')}>{t('landing.nav.app')}</a>
          <a href="#faq"     onClick={go('faq')}>{t('landing.nav.faq')}</a>
        </nav>
        <LangToggle variant="inline" />
      </header>

      {/* Езиков превключвател за телефони — bar-ът е скрит под 860px, така
          че посетителят от мобилно устройство иначе няма как да го намери
          преди да види логин формата. */}
      <div className={styles.mobileLang}>
        <LangToggle variant="pill" />
      </div>

      {/* ── The stage: the cover is the photograph from Varna ──────────── */}
      <section className={styles.stage} id="top">
        <img
          className={styles.stageImg}
          src="/story/varna.webp"
          alt={t('landing.stageAlt')}
          fetchpriority="high"
        />
        <div className={styles.stageText}>
          <p className={styles.stageEyebrow}>{t('story.f3')}</p>
          <h1 className={styles.stageName}>
            <span>Blag Coaching</span>
            <span className={styles.stageAmp}>&amp;</span>
            <span>Blag app</span>
          </h1>
          <p className={styles.stageLine}>{t('story.f3sub')}</p>

          <div className={styles.stageActions}>
            <a className={styles.heroCta} href={DM} target="_blank" rel="noopener noreferrer">
              {t('landing.writeCta')}
            </a>
            <a className={`${styles.heroCta} ${styles.altCta}`} href="#app" onClick={go('app')}>
              {t('landing.appCta')}
            </a>
          </div>

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
        </div>

        <span className={styles.scrollHint} aria-hidden="true" />
      </section>

      {/* ── The story: pictures first, one line under each ──────────────── */}
      <Story />

      {/* ── What he teaches ────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.lessonsSection}`} id="lessons">
        <div className={styles.lessonsBg} aria-hidden="true" />
        <div className={styles.lessonsWash} aria-hidden="true" />
        <span className={styles.markLink}>
          <span className={styles.markText}>THE BLAG COACH</span>
        </span>
        <h2 className={styles.h2}>{t('landing.lessonsHead')}</h2>
        <Lessons />

        <a className={`${styles.heroCta} ${styles.lessonsCta}`} href={DM}
           target="_blank" rel="noopener noreferrer">
          {t('landing.lessonsCta')}
        </a>

      </section>

      {/* ── The app, on its own: the offer that costs nothing ───────────── */}
      <section className={`${styles.section} ${styles.appSection}`} id="app">
        <div className={styles.ruled} aria-hidden="true" />
        <div className={styles.appGlow} aria-hidden="true" />
        <p className={styles.appEyebrow}>{t('lessons.appEyebrow')}</p>
        <h2 className={styles.h2}>Blag app</h2>
        <p className={styles.appLead}>{t('lessons.appLead1')}<br />{t('lessons.appLead2')}</p>
        <div className={styles.appShow}><AppShowcase /></div>
        <div className={styles.stageActions}>
          <button className={styles.heroCta} onClick={() => onContinue?.()} type="button">
            {t('landing.registerCta')}
          </button>
          <button className={`${styles.heroCta} ${styles.altCta}`} onClick={() => setInstallOpen(true)} type="button">
            {t('landing.installCta')}
          </button>
        </div>
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

        {/* Пътят за създаване на акаунт, изнесен в дъното на FAQ секцията.
            Първо за нови (по-топъл CTA), после квайет линкът за връщащи се
            потребители — това следва естествения обем на трафика. */}
        <div className={styles.faqCtaRow}>
          <p className={styles.faqCtaLead}>{t('landing.registerLead')}</p>
          <button
            className={`${styles.heroCta} ${styles.altCta} ${styles.registerCta}`}
            onClick={() => onContinue?.()}
            type="button"
          >
            {t('landing.registerCta')}
          </button>
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

    </div>
  )
}
