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
  { q: 'Мога ли да го ползвам без треньор?',
    a: 'Да, и е безплатно. Логваш, следиш, напредваш. Треньорът е за хората, на които им трябва план по техните конкретни числа, а не само инструмент за записване.' },
  { q: 'Защо ми е?',
    a: 'Ако тренираш сам и планираш сам — вероятно не ти е. Ако работиш с мен — тук е всичко, от което се нуждаем, на едно място.' },
  { q: 'Как изглежда коучингът на практика?',
    a: 'Пишеш ми, гледаме числата от приложението, настройваме плана. Седмичен чек-ин, корекция на макросите и обратна връзка по техника — по реални данни, не по усет.' },
  { q: 'Трябва ли да го свалям от App Store?',
    a: 'Не. Отваряш адреса в браузъра и го добавяш на началния екран — оттам изглежда и работи като приложение. Нищо за сваляне, нищо за одобряване.' },
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
        <span className={styles.eyebrow}>THE BLAG COACH</span>
        <h2 className={styles.h2}>ще те научи как да:</h2>
        <Lessons onProgress={() => {
                const el = document.getElementById('app')
                if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
              }} />
      </section>

      {/* ── The app ────────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.appSection}`} id="app">
        <span className={styles.eyebrow}>БЛАГОТО ПРИЛОЖЕНИЕ — ЗА БЛАГИТЕ ХОРА</span>
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
          Ти входираш,{' '}
          <span className={styles.leadAnchor}>
            <a className={styles.leadLink} href="#features"
               onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }}>то следи</a>
            <span className={styles.tapHint} aria-hidden="true">☝️</span>
          </span>
          <br />
          и напомня да не кривнеш ;)
        </p>

        <AppShowcase />

        <p className={styles.sectionLead}>
          Ползвам го с всеки клиент.<br />
          Не работиш с мен? Пак е твоето — безплатно.
        </p>

      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.featuresSection}`} id="features">
        <span className={styles.eyebrow}>ПРОСЛЕДЯВАНЕ</span>
        <h2 className={styles.h2}>Всичко важно в едно приложение</h2>

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

        <span id="features-install" />
        <a className={styles.note} href="#install"
           onClick={e => { e.preventDefault(); document.getElementById('install')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
          Инсталиране в три докосвания
        </a>
      </section>

      {/* ── Install ───────────────────────────────────────────────────── */}
      <section className={styles.section} id="install">
        <h2 className={styles.h2}>Инсталирай в три докосвания</h2>
        <p className={styles.sectionLead}>
          Няма магазин за приложения и няма сваляне. Браузърът го слага на
          екрана ти сам.
        </p>
        <InstallDemo />
        <a className={styles.note} href="#coach" onClick={go('coach')}>
          Ами кой е тоя Blag Coach изобщо ;)
        </a>
      </section>

      {/* ── Coach ──────────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.coachSection}`} id="coach">
        <div className={styles.coachBg} aria-hidden="true" />
        <div className={styles.coachWash} aria-hidden="true" />
        <h2 className={styles.h2}>Николай Благьов</h2>
        {/* The splash's own lettering, small — his name and then what he is. */}
        <a className={styles.coachMark} href="#price" onClick={go('price')}>Blag Coach</a>

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
          {/* A bullet like the others; the clock goes at the end, where it
              qualifies the line rather than replacing its mark. */}
          <li>
            J3University — в процес на обучение
            <span className={styles.pendingMark} aria-hidden="true" />
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
        </div>

        <a className={styles.write} href="https://ig.me/m/blag.coaching"
           target="_blank" rel="noopener noreferrer">
          Питай ме, не хапя ;)
        </a>
      </section>

      {/* ── Price ──────────────────────────────────────────────────────── */}
      <section className={styles.section} id="price">
        <span className={styles.eyebrow}>ЦЕНА</span>
        <h2 className={styles.h2}>Работи с мен</h2>
        <p className={styles.sectionLead}>
          Приложението е инструментът. Треньорът е планът.
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

        <div className={`${styles.priceCard} ${styles.freeCard}`}>
          <span className={styles.priceLabel}>САМО ПРИЛОЖЕНИЕТО</span>
          <ul className={styles.freeList}>
            {['Хранене и макроси', 'Тренировки и рекорди', 'Тегло и тенденция',
              'Навици, вода, суплементи', 'Известия'].map(x => (
              <li key={x}>
                <span>{x}</span>
                <b className={styles.freeWord}>безплатно</b>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.wink}>Абе безплатно е бе ;)</p>
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
        <h2 className={styles.h2}>Готов ли си?</h2>
        <p className={styles.sectionLead}>
          Пиши ми — разберем дали си подходящ за програмата и тръгваме.
        </p>
        <a className={styles.cta} href="https://ig.me/m/blag.coaching"
           target="_blank" rel="noopener noreferrer">
          ПИШИ МИ
        </a>
        <button className={styles.loginLink} onClick={onContinue} type="button">
          Или пробвай приложението само — безплатно е.
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
