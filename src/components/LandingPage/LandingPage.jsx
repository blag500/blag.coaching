import { useState } from 'react'
import Lessons from './Lessons'
import DotNav from './DotNav'
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

const FAQ = [
  { q: 'Мога ли да го ползвам без треньор?',
    a: 'Да, и е безплатно. Логваш, следиш, напредваш. Треньорът е за хората, на които им трябва план по техните конкретни числа, а не само инструмент за записване.' },
  { q: 'Защо ми е?',
    a: 'Ако тренираш сам и планираш сам — вероятно не ти е. Ако работиш с мен — тук е всичко, от което се нуждаем, на едно място.' },
  { q: 'Как изглежда коучингът на практика?',
    a: 'Тренираме заедно. Пишеш ми, гледаме числата от приложението, настройваме плана. Седмичен чек-ин, корекция на макросите и обратна връзка по техника — по реални данни, не по усет.' },
  { q: 'Трябва ли да го свалям от App Store?',
    a: 'Не. Отваряш адреса в браузъра и го добавяш на началния екран — оттам изглежда и работи като приложение. Нищо за сваляне, нищо за одобряване.' },
]

/* One place to write the offer. It travels along the bottom of every screen,
   so whatever it says is the last thing read on the page and the first thing
   remembered about it. */
/* The stops on the page, in order — the dot rail reads this and nothing else,
   so a section added or dropped is one line here. */
const SECTIONS = [
  { id: 'top',     label: 'НАЧАЛО' },
  { id: 'lessons', label: 'УРОЦИ' },
  { id: 'faq',     label: 'ВЪПРОСИ' },
]

const OFFER = '−20% от Blag Coaching през първия месец'
const TICKER = Array.from({ length: 4 }, () => OFFER).join('   ·   ') + '   ·   '

export default function LandingPage({ onContinue, onLogin }) {
  /* The email is asked for here and carried into the form, so the first field
     is already filled when they arrive. A field on a landing page that makes
     you type the same thing again on the next screen is a field that has cost
     the visitor something and bought them nothing. */
  const [email, setEmail] = useState('')

  // Only one answer open at a time — five open at once is the wall of text the
  // accordion exists to prevent.
  const [openQ, setOpenQ] = useState(null)

  const go = id => e => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>

      <DotNav sections={SECTIONS} />

      {/* ── Bar ────────────────────────────────────────────────────────── */}
      <header className={styles.bar}>
        {/* The mark lives here now, small, rather than filling the middle of the
            first screen — the splash has just shown it at full size, and showing
            it again immediately spends the reveal twice. */}
        {/* No mark up here. The splash has just shown it at full size and the
            poster below carries the brand on its own; a third copy in the
            corner was the app talking over itself. */}
        <nav className={styles.barNav}>
          <a href="#lessons" onClick={go('lessons')}>УРОЦИ</a>
          <a href="#faq"     onClick={go('faq')}>ВЪПРОСИ</a>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {/* The poster, whole and full height, with one thing to do on it. A first
          screen that asks a single question gets a straighter answer than one
          that offers a field, two links and three promises at once. */}
      <section className={styles.hero} id="top">
        {/* A sheet with the print's own proportions, sized to cover the phone
            and to stand whole on a desktop. Everything written on it is placed
            in percentages of the sheet, so the words keep their place on the
            paper instead of drifting across it as the window changes. */}
        <div className={styles.sheet}>
          <img
            className={styles.poster}
            src="/poster.webp"
            alt=""
            fetchpriority="high"
          />
          <div className={styles.ink}>
            {/* Two lines, not three. The words are his and stay as they are — only
                the breaks move: alone on a line the Cyrillic в sat between two
                Latin words with nothing to belong to. */}
            <h1 className={styles.inkName}>
              Blag Coaching
              <span className={styles.inkAmp}>&amp;</span>
              Blag app
            </h1>
          </div>
        </div>
        <span className={styles.posterShade} aria-hidden="true" />

        {/* Its own class, not the page's gold slab. On the poster a filled
            block reads as a sticker somebody put on a print; a frame with the
            paper showing through belongs to it. The solid one stays further
            down, where the page has earned the right to ask outright. */}
        <a className={styles.heroCta} href="#lessons" onClick={go('lessons')}>
          ТРЕНИРАЙ С МЕН
        </a>

        <span className={styles.scrollHint} aria-hidden="true" />
      </section>

      {/* ── What he teaches ────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.lessonsSection}`} id="lessons">
        {/* The same print as the poster — screened from a photograph of him at
            the same size of dot, inked with the two colours sampled off that
            sheet, and given its grain. Held far back, because four lines and a
            heading have to stay the brightest thing here. */}
        <div className={styles.lessonsBg} aria-hidden="true" />
        {/* Dark where the words are and nowhere else. Turning the picture down
            until the text was safe turned it down everywhere, including the
            corners where nothing needed protecting. */}
        <div className={styles.lessonsWash} aria-hidden="true" />
        {/* The name, lit from inside by a slow sweep across the letters. No ring
            around it any more and nowhere to press: it stopped being a doorway
            when the section it opened went away, and a frame on something that
            does nothing is a promise the page cannot keep. */}
        <span className={styles.markLink}>
          <span className={styles.markText}>THE BLAG COACH</span>
        </span>
        <h2 className={styles.h2}>ще те научи как да:</h2>
        <Lessons />

        {/* The ask, immediately under what he teaches. The page used to walk on
            through a section about him and a price card before it asked for
            anything; both were saying again, at length, what the five lines
            above have already said. */}
        <a className={`${styles.heroCta} ${styles.lessonsCta}`} href="https://ig.me/m/blag.coaching"
           target="_blank" rel="noopener noreferrer">
          ПИШИ МИ ЗА БЕЗПЛАТНА ТРЕНИРОВКА
        </a>
        <button className={styles.quietCta} onClick={onContinue} type="button">
          Или само приложението — без мен.
        </button>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      {/* The last thing on the page now. It keeps the closing section's bottom
          padding so the ticker never lands on the final answer. */}
      <section className={`${styles.section} ${styles.close}`} id="faq">
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

        {/* The one thing the closing section held that nothing else did. It is
            not an offer and it does not belong beside the ask, so it sits at the
            very bottom, where somebody who already has an account will look. */}
        <button className={styles.loginLink} onClick={onLogin} type="button">
          Вече ползваш приложението? <span className={styles.loginLinkUnder}>Логни се тук.</span>
        </button>
      </section>

      {/* A strip along the bottom, always there, always moving.
          The offer is written once and repeated in the markup only so the loop
          has no seam — the second copy is hidden from screen readers. */}
      <div className={styles.ticker} role="note">
        <div className={styles.tickerTrack}>
          <span className={styles.tickerRun}>{TICKER}</span>
          <span className={styles.tickerRun} aria-hidden="true">{TICKER}</span>
        </div>
      </div>
    </div>
  )
}
