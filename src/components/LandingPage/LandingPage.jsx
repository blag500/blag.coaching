import { useState } from 'react'
import Pictogram from '../Pictogram/Pictogram'
import InstallDemo from './InstallDemo'
import AppShowcase from './AppShowcase'
import Lessons from './Lessons'
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

/* Nine names, no sentences.
   Each card carried two lines of description, and nine descriptions is a page
   you scroll through without reading and then feel you have missed something.
   The names are the answer to "what does it track" on their own; anything that
   needs explaining has a section of its own further down. */
const FEATURES = [
  { icon: 'meal',     title: 'Хранене' },
  { icon: 'training', title: 'Тренировка' },
  { icon: 'trend',    title: 'Навици' },
  { icon: 'sleep',    title: 'Възстановяване' },
  { icon: 'capsule',  title: 'Суплементи' },
  { icon: 'water',    title: 'Вода' },
  { icon: 'weight',   title: 'Тегло' },
  { icon: 'chat',     title: 'Чат с треньора' },
  { icon: 'calendar', title: 'График' },
  /* Three more, and the grid comes out square at four rows of three rather
     than nine with a hole in it. All of them are things the app already does —
     padding a list with wishes is how a features section stops being read. */
  { icon: 'bell',     title: 'Известия' },
  { icon: 'book',     title: 'Рецепти' },
  { icon: 'camera',   title: 'Снимки на прогреса' },
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

/* One place to write the offer. It travels along the bottom of every screen,
   so whatever it says is the last thing read on the page and the first thing
   remembered about it. */
const OFFER = '−20% от треньорския план за първия месец'
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

      {/* ── Bar ────────────────────────────────────────────────────────── */}
      <header className={styles.bar}>
        {/* The mark lives here now, small, rather than filling the middle of the
            first screen — the splash has just shown it at full size, and showing
            it again immediately spends the reveal twice. */}
        {/* No mark up here. The splash has just shown it at full size and the
            poster below carries the brand on its own; a third copy in the
            corner was the app talking over itself. */}
        <nav className={styles.barNav}>
          <a href="#features" onClick={go('features')}>ФУНКЦИИ</a>
          <a href="#how"      onClick={go('how')}>КАК РАБОТИ</a>
          <a href="#coach"    onClick={go('coach')}>ТРЕНЬОР</a>
          <a href="#price"    onClick={go('price')}>ЦЕНА</a>
          <a href="#faq"      onClick={go('faq')}>ВЪПРОСИ</a>
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
            <h1 className={styles.inkName}>Blag<br />Coaching<br />в Blag app</h1>
            <span className={styles.inkRule} aria-hidden="true" />
            <p className={styles.inkLine}>
              Приложението, което<br />постига целите ти.
            </p>
          </div>
        </div>
        <span className={styles.posterShade} aria-hidden="true" />

        <a className={styles.cta} href="#lessons" onClick={go('lessons')}>
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
        <span className={styles.eyebrow}>THE BLAG COACH</span>
        <h2 className={styles.h2}>Ще те науча да:</h2>
        <Lessons onProgress={() => document.getElementById('app')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      </section>

      {/* ── The app ────────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.appSection}`} id="app">
        <span className={styles.eyebrow}>ПРИЛОЖЕНИЕТО</span>
        <h2 className={styles.h2}>И всичко се записва</h2>
        {/* The strongest thing about the free half, said plainly: it works on
            its own. An app that only nags while somebody is paying for a coach
            is a trial with a nicer name. */}
        {/* Ruled paper, faintly. The section is about numbers being written
            down, and a grid is the furniture of that without being a picture of
            anything — it holds the black off being a void and asks for nothing.
            Behind it, one warm light, so the phones stand in something. */}
        <div className={styles.ruled} aria-hidden="true" />
        <div className={styles.appGlow} aria-hidden="true" />

        <p className={styles.sectionLead}>
          Твоите числа на едно място. Напомня ти само — с треньор или без.
        </p>
        <AppShowcase />

        <form
          className={styles.capture}
          onSubmit={e => { e.preventDefault(); onContinue(email) }}
        >
          <span className={styles.at} aria-hidden="true">@</span>
          <input
            className={styles.captureInput}
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="go"
            placeholder="Имейлът ти..."
            aria-label="Имейл"
          />
          <button className={styles.captureBtn} type="submit">
            ЗАПОЧНИ
          </button>
        </form>

        <p className={styles.benefits}>
          Приложението е безплатно. Мен ме взимаш, когато решиш.
        </p>
        <a className={styles.note} href="#install" onClick={go('install')}>
          Виж как да го инсталираш
        </a>
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
            <article key={f.title} className={styles.chip}>
              <span className={styles.chipIcon}>
                <Pictogram name={f.icon} size={18} />
              </span>
              <span className={styles.chipTitle}>{f.title}</span>
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

      {/* ── Install ───────────────────────────────────────────────────── */}
      <section className={styles.section} id="install">
        <span className={styles.eyebrow}>ИНСТАЛИРАНЕ</span>
        <h2 className={styles.h2}>Три докосвания</h2>
        <p className={styles.sectionLead}>
          Няма магазин за приложения и няма сваляне. Браузърът го слага на
          екрана ти сам.
        </p>
        <InstallDemo />
      </section>

      {/* ── Coach ──────────────────────────────────────────────────────── */}
      <section className={styles.section} id="coach">
        <h2 className={styles.h2}>Николай Благьов</h2>

        <p className={styles.sectionLead}>
          Направих BLAG, защото ми омръзна да гледам как хората се губят между
          тетрадки, чатове и пет приложения. Ползвам същото приложение с
          клиентите си, за да взимаме решения по реални числа.
        </p>

        <ul className={styles.points}>
          {/* Written plainly on purpose. "В процес" beside a name people have
              heard of is enough to say what it is; anything vaguer invites the
              reader to fill the gap with a finished qualification, and that is
              a sentence he would then have to defend. */}
          <li className={styles.pointPending}>
            <span className={styles.pendingMark} aria-hidden="true" />
            J3University — в процес на обучение.
          </li>
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
            119,99 €<span className={styles.priceUnit}> / месец</span>
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
