import { useState, useEffect, useRef } from 'react'
import Pictogram from '../Pictogram/Pictogram'
import styles from './LandingPage.module.css'

/**
 * The top of the funnel.
 *
 * Someone arrives from a video knowing a name and nothing else, so the page
 * answers, in the order a stranger asks: what is this, what does it do, how
 * does it work, who is behind it, what does it cost, and what about the thing
 * I am worried about. Then it asks once.
 *
 * Everything on it is checkable. There are no visitor counts and no logged-meal
 * totals: every account in the database today is a test account, and a number
 * that flatters is the first thing a real prospect goes looking to disprove.
 */

const FEATURES = [
  { icon: 'kcal',     title: 'Хранене',        text: 'Макроси, калории, баркод и въвеждане с описание. История, чернови и рецепти.' },
  { icon: 'training', title: 'Тренировка',     text: 'Серии, повторения и тежести, с историята на всяко упражнение и личните рекорди.' },
  { icon: 'steps',    title: 'Навици',         text: 'Вода, протеин, стъпки, сън и без захар — отмятат се на началния екран.' },
  { icon: 'sleep',    title: 'Възстановяване', text: 'Чек-ин за трийсет секунди и оценка за готовност спрямо твоята норма, не спрямо чужда.' },
  { icon: 'capsule',  title: 'Суплементи',     text: 'Твоят стек, отметнат за деня, с история назад.' },
  { icon: 'water',    title: 'Вода',           text: 'Чаши и дневна цел, добавени с едно докосване.' },
  { icon: 'weight',   title: 'Тегло',          text: 'Ежедневно мерене и тенденцията за месец — посоката, а не шума от вчера.' },
  { icon: 'chat',     title: 'Чат с треньора', text: 'Директна връзка. Въпроси, корекции и обратна връзка по техника.' },
  { icon: 'calendar', title: 'График',         text: 'Записване на часове и планът за седмицата на същото място.' },
]

const STEPS = [
  { n: '01', title: 'Отвори и добави',
    text: 'Влизаш в blag-coaching.com и добавяш BLAG на началния екран. Без App Store, без сваляне.' },
  { n: '02', title: 'Записвай',
    text: 'Хранене, тренировка, тегло, навици и вода. Под две минути на ден, а не водене на тетрадка.' },
  { n: '03', title: 'Коригираме',
    text: 'Гледам реалните ти числа и местя плана според тях — не по усет и не по календар.' },
]

const FAQ = [
  { q: 'Трябва ли да го свалям от App Store?',
    a: 'Не. Отваряш адреса в браузъра и го добавяш на началния екран — оттам изглежда и работи като приложение. Нищо за сваляне и нищо за одобряване.' },
  { q: 'Работи ли без интернет?',
    a: 'Отваря се, но не. Числата ти живеят на сървър, за да ги виждам и аз, така че за записване и четене трябва връзка.' },
  { q: 'Само за бодибилдъри ли е?',
    a: 'Не. Проследяването е същото за всеки, който тренира; разликата е в плана, а той се пише според твоята цел.' },
  { q: 'Мога ли да го ползвам без треньор?',
    a: 'Да. Приложението е безплатно и работи само по себе си. Треньорът е отделно решение, което взимаш когато прецениш.' },
  { q: 'Какво става с данните ми?',
    a: 'Стоят в твоя профил и ги виждаме само ти и аз. Спреш ли, изтриваш профила си и си отиват с него.' },
]

export default function LandingPage({ onContinue, onLogin }) {
  // Respect the setting, and follow it if it changes while the page is open.
  const [stillOnly, setStillOnly] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = e => setStillOnly(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  /* Autoplay is refused more often than it looks: iOS in Low Power Mode blocks
     it outright, and a page that then sits on its poster forever looks broken
     rather than restrained. So the play is asked for, and if it is refused, it
     is asked for again at the first touch — by which point the browser counts
     it as something the visitor started. */
  const videoRef = useRef(null)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const start = () => v.play().catch(() => {})
    start()
    const once = () => { start(); window.removeEventListener('touchstart', once); window.removeEventListener('click', once) }
    window.addEventListener('touchstart', once, { passive: true })
    window.addEventListener('click', once)
    return () => { window.removeEventListener('touchstart', once); window.removeEventListener('click', once) }
  }, [stillOnly])

  // Only one answer open at a time — five open at once is the wall of text the
  // accordion exists to prevent.
  const [openQ, setOpenQ] = useState(null)

  const go = id => e => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>

      {/* ── Bar ────────────────────────────────────────────────────────── */}
      <header className={styles.bar}>
        <a className={styles.barBrand} href="#top" onClick={go('top')}>BLAG</a>
        <nav className={styles.barNav}>
          <a href="#features" onClick={go('features')}>ФУНКЦИИ</a>
          <a href="#how"      onClick={go('how')}>КАК РАБОТИ</a>
          <a href="#coach"    onClick={go('coach')}>ТРЕНЬОР</a>
          <a href="#price"    onClick={go('price')}>ЦЕНА</a>
          <a href="#faq"      onClick={go('faq')}>ВЪПРОСИ</a>
        </nav>
        <button className={styles.barBtn} onClick={onContinue} type="button">
          ОТВОРИ ПРИЛОЖЕНИЕТО
        </button>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className={styles.hero} id="top">
        {/* Held far back, dimmed and masked: a real gym behind the mark does
            more for this than any amount of gradient, but the lockup has to
            stay the brightest thing on the screen.
            Decided in JS rather than hidden in CSS, so someone who has asked
            for less movement does not download five seconds of video in order
            to not watch it. */}
        {stillOnly ? (
          <div className={styles.backdropStill} aria-hidden="true" />
        ) : (
          <video
            ref={videoRef}
            className={styles.backdrop}
            autoPlay muted loop playsInline
            preload="auto"
            poster="/hero-poster.jpg"
            aria-hidden="true"
          >
            <source src="/hero.webm" type="video/webm" />
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        )}
        <div className={styles.grain} aria-hidden="true" />

        {/* The splash lockup, standing still. The same arms in the same
            arrangement — someone arriving from a video has already watched it
            assemble once, so this is recognition rather than a second reveal. */}
        <div className={styles.lockup}>
          <div className={styles.armLeft} aria-hidden="true" />
          <div className={styles.brand}>
            <span className={styles.brandName}>BLAG</span>
            <span className={styles.brandRule} aria-hidden="true" />
            <span className={styles.brandTag}>Be blag,<br />Be better</span>
          </div>
          <div className={styles.armRight} aria-hidden="true" />
        </div>

        <h1 className={styles.headline}>
          Тренировка, хранене и навици<br />
          <span className={styles.headlineGold}>на едно място</span>
        </h1>

        <p className={styles.heroText}>
          BLAG следи тренировките, храненето, теглото, навиците, суплементите,
          възстановяването и водата ти. Добавя се на телефона и работи заедно
          с треньор, който гледа същите числа.
        </p>

        <div className={styles.heroActions}>
          <button className={styles.cta} onClick={onContinue} type="button">
            ЗАПОЧНИ БЕЗПЛАТНО
          </button>
          <a className={styles.ctaGhost} href="#how" onClick={go('how')}>
            Виж как работи
          </a>
        </div>

        <div className={styles.badges}>
          <span className={styles.badge}>БЕЗ APP STORE</span>
          <span className={styles.badge}>ДОБАВЯ СЕ НА ЕКРАНА</span>
        </div>

        <span className={styles.scrollHint} aria-hidden="true" />
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className={styles.section} id="features">
        <span className={styles.eyebrow}>ПРОСЛЕДЯВАНЕ</span>
        <h2 className={styles.h2}>Всичко важно в едно приложение</h2>
        <p className={styles.sectionLead}>
          Без пет различни приложения и тетрадка в чантата.
        </p>

        <div className={styles.grid}>
          {FEATURES.map(f => (
            <article key={f.title} className={styles.card}>
              <span className={styles.cardIcon}>
                <Pictogram name={f.icon} size={20} />
              </span>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardText}>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── How ────────────────────────────────────────────────────────── */}
      <section className={styles.section} id="how">
        <span className={styles.eyebrow}>КАК РАБОТИ</span>
        <h2 className={styles.h2}>Три стъпки</h2>

        <div className={styles.steps}>
          {STEPS.map(s => (
            <article key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardText}>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Coach ──────────────────────────────────────────────────────── */}
      <section className={styles.section} id="coach">
        <span className={styles.eyebrow}>ТРЕНЬОР</span>
        <h2 className={styles.h2}>Николай Благьов</h2>

        <p className={styles.sectionLead}>
          Направих BLAG, защото ми омръзна да гледам как хората се губят между
          тетрадки, чатове и пет приложения. Ползвам същото приложение с
          клиентите си, за да взимаме решения по реални числа.
        </p>

        <ul className={styles.points}>
          <li>Треньор по бодибилдинг, с практика при натурални атлети.</li>
          <li>Планът се мени според твоите логове, не по усет.</li>
          <li>Седмичен чек-ин, обратна връзка по техника и корекция на макросите.</li>
        </ul>

        <div className={styles.social}>
          <a className={styles.socialBtn} href="https://instagram.com/blag.coaching"
             target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
                 stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5.2" />
              <circle cx="12" cy="12" r="4.1" />
              <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a className={styles.socialBtn} href="https://www.tiktok.com/@blag.coaching"
             target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
              <path d="M16.9 2.6c.36 2.06 1.6 3.36 3.6 3.5v2.7c-1.18.06-2.28-.28-3.36-.95v5.86c0 3.6-2.9 6.06-5.98 6.06-3.32 0-5.76-2.66-5.76-5.86 0-3.4 2.86-5.98 6.5-5.62v2.86c-.44-.12-.86-.18-1.28-.18-1.6 0-2.94 1.3-2.94 2.94 0 1.78 1.36 3.02 3.06 3.02s3.06-1.28 3.06-3.06V2.6h3.1z" />
            </svg>
          </a>
          <a className={styles.write} href="https://ig.me/m/blag.coaching"
             target="_blank" rel="noopener noreferrer">
            Питай ме
          </a>
        </div>
      </section>

      {/* ── Price ──────────────────────────────────────────────────────── */}
      <section className={styles.section} id="price">
        <span className={styles.eyebrow}>ЦЕНА</span>
        <h2 className={styles.h2}>Приложението е безплатно</h2>
        <p className={styles.sectionLead}>
          Плаща се само треньорът. Едно нещо, без степени и без пакети.
        </p>

        <div className={styles.priceCard}>
          <span className={styles.priceLabel}>ПРИЛОЖЕНИЕ + ТРЕНЬОР</span>
          <p className={styles.price}>
            100 €<span className={styles.priceUnit}> / месец</span>
          </p>
          <ul className={styles.points}>
            <li>Индивидуална програма, преработвана всеки месец.</li>
            <li>Макроси, настроени според теглото и снимките на прогреса.</li>
            <li>Седмичен чек-ин и обратна връзка по техника.</li>
            <li>Директен чат с мен в приложението.</li>
          </ul>
          <a className={styles.cta} href="https://ig.me/m/blag.coaching"
             target="_blank" rel="noopener noreferrer">
            ПИШИ МИ
          </a>
          <p className={styles.priceNote}>
            Без такса за започване. Спираш когато решиш.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className={styles.section} id="faq">
        <span className={styles.eyebrow}>ВЪПРОСИ</span>
        <h2 className={styles.h2}>Това, което хората питат</h2>

        <div className={styles.faq}>
          {FAQ.map((item, i) => (
            <div key={item.q} className={styles.faqItem}>
              <button
                className={styles.faqQ}
                onClick={() => setOpenQ(openQ === i ? null : i)}
                aria-expanded={openQ === i}
                type="button"
              >
                <span>{item.q}</span>
                <span className={`${styles.faqMark} ${openQ === i ? styles.faqMarkOpen : ''}`} aria-hidden="true" />
              </button>
              {openQ === i && <p className={styles.faqA}>{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Close ──────────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.close}`}>
        <span className={styles.eyebrow}>BE BLAG, BE BETTER</span>
        <h2 className={styles.h2}>Започни да записваш</h2>
        <p className={styles.sectionLead}>
          Приложението е безплатно и се добавя за секунди. Треньор взимаш,
          когато решиш, че искаш план по своите числа.
        </p>
        <button className={styles.cta} onClick={onContinue} type="button">
          ЗАПОЧНИ БЕЗПЛАТНО
        </button>
        <button className={styles.loginLink} onClick={onLogin} type="button">
          Вече ползваш приложението? <span className={styles.loginLinkUnder}>Логни се тук.</span>
        </button>
      </section>
    </div>
  )
}
