import { useState } from 'react'
import styles from './HelpPage.module.css'

// ── Content ──────────────────────────────────────────────────────────────────

const CONTENT = {
  bg: {
    nav: { openApp: 'Отвори приложението' },
    hero: {
      headline: 'ТВОЯТ ЛИЧЕН ФИТНЕС ТРЕНЬОР В ДЖОБА ТИ',
      sub: 'Проследявай храненето, тренировките и навиците си — или получи пълна треньорска поддръжка.',
    },
    plans: {
      title: 'ПЛАНОВЕ',
      plus: {
        name: 'PLUS',
        price: 'Очаквайте скоро',
        tagline: 'За хора, които искат да проследяват сами',
        features: [
          'AI търсене на храни + баркод скенер',
          'Дневник на хранене с пълен контрол на макроси',
          'Рецепти с калкулатор на порции',
          'Тренировъчен план (зададен от треньора)',
          'Логване на упражнения и графики за прогресия',
          'Дневно проследяване на навици',
          'Лог на тегло с визуален прогрес',
          'Общностни ефективни продукти',
        ],
        notIncluded: [
          'Директен чат с треньора',
          'Насрочване на тренировъчни сесии',
          'Персонализирани корекции',
        ],
        cta: 'Започни с Plus',
      },
      pro: {
        name: 'PRO',
        price: 'Очаквайте скоро',
        tagline: 'Пълна треньорска подкрепа',
        features: [
          'Всичко от Plus',
          'Директен чат с личния ви треньор',
          'Насрочване на тренировъчни сесии',
          'Персонализирани корекции на плана',
          'Седмичен преглед на спазването',
          'Актуализации на тренировъчния план',
          'Пълна треньорска поддръжка',
        ],
        notIncluded: [],
        cta: 'Започни с Pro',
      },
    },
    articles: [
      {
        id: 'what',
        title: 'Какво е Blag Coaching?',
        body: `Blag Coaching е персонализирано фитнес приложение, създадено от треньор Благой за неговите клиенти. Приложението работи като PWA (Progressive Web App) — инсталирате го на телефона си като нормално приложение, без да минавате през App Store.

Основните стълбове на приложението:
• Хранене — проследявайте макроси с AI търсене, баркод скенер и собствени рецепти
• Тренировки — следвайте своя план, логвайте тежести и следете прогресията си
• Навици — отбелязвайте дневните си навици и виждайте колко спазвате
• Тегло — следете как се променя теглото ви с течение на времето
• Комуникация (Pro) — пишете директно на треньора и насрочвайте сесии`,
      },
      {
        id: 'comparison',
        title: 'Сравнение на плановете',
        isTable: true,
        rows: [
          { feature: 'Проследяване на хранене', plus: true, pro: true },
          { feature: 'AI търсене на храни', plus: true, pro: true },
          { feature: 'Баркод скенер', plus: true, pro: true },
          { feature: 'Рецепти с калкулатор', plus: true, pro: true },
          { feature: 'Тренировъчен план', plus: true, pro: true },
          { feature: 'Логване на упражнения', plus: true, pro: true },
          { feature: 'Графики за прогресия', plus: true, pro: true },
          { feature: 'Проследяване на навици', plus: true, pro: true },
          { feature: 'Лог на тегло', plus: true, pro: true },
          { feature: 'Ефективни продукти', plus: true, pro: true },
          { feature: 'Директен чат с треньора', plus: false, pro: true },
          { feature: 'Насрочване на сесии', plus: false, pro: true },
          { feature: 'Персонализирани корекции', plus: false, pro: true },
          { feature: 'Седмичен преглед', plus: false, pro: true },
        ],
      },
      {
        id: 'howto',
        title: 'Как работи?',
        body: `1. Свържете се с треньора и получете покана за приложението
2. Регистрирайте се с имейл и парола — акаунтът ви се активира от треньора
3. Инсталирайте приложението на телефона си (Safari → "Добавяне към началния екран" / Chrome → "Инсталиране")
4. Попълнете профила си — тегло, ръст, цел
5. Треньорът задава макро цели и тренировъчен план
6. Всеки ден проследявате храненето, тренировките и навиците

Приложението работи на всяко устройство — телефон, таблет, компютър.`,
      },
      {
        id: 'faq',
        title: 'Често задавани въпроси',
        faqs: [
          {
            q: 'Трябва ли да изтегля нещо от App Store?',
            a: 'Не. Blag Coaching е уеб приложение — отваряте го в браузъра и го инсталирате директно от там. Не е нужен App Store или Google Play.',
          },
          {
            q: 'Мога ли да използвам приложението без интернет?',
            a: 'Да — основните функции работят офлайн. Синхронизацията с треньора изисква интернет връзка.',
          },
          {
            q: 'Как се различава Plus от Pro?',
            a: 'Plus ви дава всички инструменти за самостоятелно проследяване. Pro добавя директна връзка с треньора — чат, насрочване на сесии и персонализирани корекции на плана.',
          },
          {
            q: 'Как да се свържа с треньора?',
            a: 'Изпратете запитване на blag500@gmail.com или намерете Благой в Instagram.',
          },
        ],
      },
    ],
  },
  en: {
    nav: { openApp: 'Open App' },
    hero: {
      headline: 'YOUR PERSONAL FITNESS COACH IN YOUR POCKET',
      sub: 'Track your nutrition, training and habits — or get full personal coaching support.',
    },
    plans: {
      title: 'PLANS',
      plus: {
        name: 'PLUS',
        price: 'Coming soon',
        tagline: 'For those who want to track independently',
        features: [
          'AI food search + barcode scanner',
          'Daily food log with full macro control',
          'Recipe builder with portion calculator',
          'Training plan (set by your coach)',
          'Exercise logging & progression charts',
          'Daily habit tracking',
          'Weight log with visual progress',
          'Community efficient products',
        ],
        notIncluded: [
          'Direct chat with coach',
          'Training session scheduling',
          'Personalised plan adjustments',
        ],
        cta: 'Get started with Plus',
      },
      pro: {
        name: 'PRO',
        price: 'Coming soon',
        tagline: 'Full personal coaching support',
        features: [
          'Everything in Plus',
          'Direct chat with your personal coach',
          'Training session scheduling',
          'Personalised plan adjustments',
          'Weekly compliance review',
          'Training plan updates',
          'Full coaching relationship',
        ],
        notIncluded: [],
        cta: 'Get started with Pro',
      },
    },
    articles: [
      {
        id: 'what',
        title: 'What is Blag Coaching?',
        body: `Blag Coaching is a personalised fitness app built by coach Blag for his clients. It runs as a PWA (Progressive Web App) — you install it on your phone like a normal app, without going through the App Store.

The four pillars of the app:
• Nutrition — track macros with AI search, barcode scanner and custom recipes
• Training — follow your plan, log weights and track progression over time
• Habits — check off daily habits and see your compliance rate
• Weight — monitor how your weight changes with a visual chart
• Communication (Pro) — message your coach directly and schedule sessions`,
      },
      {
        id: 'comparison',
        title: 'Plan comparison',
        isTable: true,
        rows: [
          { feature: 'Nutrition tracking', plus: true, pro: true },
          { feature: 'AI food search', plus: true, pro: true },
          { feature: 'Barcode scanner', plus: true, pro: true },
          { feature: 'Recipe builder', plus: true, pro: true },
          { feature: 'Training plan', plus: true, pro: true },
          { feature: 'Exercise logging', plus: true, pro: true },
          { feature: 'Progression charts', plus: true, pro: true },
          { feature: 'Habit tracking', plus: true, pro: true },
          { feature: 'Weight log', plus: true, pro: true },
          { feature: 'Efficient products', plus: true, pro: true },
          { feature: 'Direct chat with coach', plus: false, pro: true },
          { feature: 'Session scheduling', plus: false, pro: true },
          { feature: 'Personalised adjustments', plus: false, pro: true },
          { feature: 'Weekly review', plus: false, pro: true },
        ],
      },
      {
        id: 'howto',
        title: 'How does it work?',
        body: `1. Contact your coach and receive an invitation to the app
2. Register with email and password — your account is activated by your coach
3. Install the app on your phone (Safari → "Add to Home Screen" / Chrome → "Install")
4. Fill in your profile — weight, height, goal
5. Your coach sets macro targets and a training plan
6. Every day you track your nutrition, workouts and habits

The app works on any device — phone, tablet, desktop.`,
      },
      {
        id: 'faq',
        title: 'Frequently Asked Questions',
        faqs: [
          {
            q: 'Do I need to download anything from the App Store?',
            a: 'No. Blag Coaching is a web app — you open it in your browser and install it directly from there. No App Store or Google Play needed.',
          },
          {
            q: 'Can I use the app without internet?',
            a: 'Yes — core features work offline. Syncing with your coach requires an internet connection.',
          },
          {
            q: 'What is the difference between Plus and Pro?',
            a: 'Plus gives you all the tools for self-guided tracking. Pro adds a direct connection to your coach — chat, session scheduling and personalised plan adjustments.',
          },
          {
            q: 'How do I get in touch with the coach?',
            a: 'Send an enquiry to blag500@gmail.com or find Blag on Instagram.',
          },
        ],
      },
    ],
  },
}

// ── Components ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="rgba(255,183,77,0.15)" />
      <path d="M6 10l3 3 5-5" stroke="#ffb74d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.05)" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PlanCard({ plan, highlight }) {
  return (
    <div className={`${styles.planCard} ${highlight ? styles.planCardPro : ''}`}>
      {highlight && <div className={styles.planBadge}>POPULAR</div>}
      <div className={styles.planName}>{plan.name}</div>
      <div className={styles.planPrice}>{plan.price}</div>
      <div className={styles.planTagline}>{plan.tagline}</div>
      <div className={styles.planDivider} />
      <ul className={styles.featureList}>
        {plan.features.map((f, i) => (
          <li key={i} className={styles.featureItem}>
            <CheckIcon />
            <span>{f}</span>
          </li>
        ))}
        {plan.notIncluded.map((f, i) => (
          <li key={`n-${i}`} className={`${styles.featureItem} ${styles.featureOff}`}>
            <CrossIcon />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className={`${styles.planCta} ${highlight ? styles.planCtaPro : ''}`} type="button">
        {plan.cta}
      </button>
    </div>
  )
}

function Article({ article, open, onToggle, lang }) {
  return (
    <div className={`${styles.article} ${open ? styles.articleOpen : ''}`}>
      <button className={styles.articleHeader} onClick={onToggle} type="button">
        <span className={styles.articleTitle}>{article.title}</span>
        <span className={styles.articleChevron}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className={styles.articleBody}>
          {article.isTable ? (
            <table className={styles.compTable}>
              <thead>
                <tr>
                  <th className={styles.compTh}>{lang === 'bg' ? 'Функция' : 'Feature'}</th>
                  <th className={`${styles.compTh} ${styles.compThCenter}`}>PLUS</th>
                  <th className={`${styles.compTh} ${styles.compThCenter}`}>PRO</th>
                </tr>
              </thead>
              <tbody>
                {article.rows.map((row, i) => (
                  <tr key={i} className={styles.compRow}>
                    <td className={styles.compTd}>{row.feature}</td>
                    <td className={`${styles.compTd} ${styles.compTdCenter}`}>
                      {row.plus ? <CheckIcon /> : <CrossIcon />}
                    </td>
                    <td className={`${styles.compTd} ${styles.compTdCenter}`}>
                      {row.pro ? <CheckIcon /> : <CrossIcon />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : article.faqs ? (
            <div className={styles.faqList}>
              {article.faqs.map((faq, i) => (
                <div key={i} className={styles.faqItem}>
                  <p className={styles.faqQ}>{faq.q}</p>
                  <p className={styles.faqA}>{faq.a}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.articleText}>{article.body}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [lang, setLang] = useState('bg')
  const [openArticle, setOpenArticle] = useState('what')
  const t = CONTENT[lang]

  function toggleArticle(id) {
    setOpenArticle(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo}>
            <img src="/icon-192.png" className={styles.logoIcon} alt="" />
            <span className={styles.logoText}>BLAG COACHING</span>
          </a>
          <div className={styles.headerRight}>
            <div className={styles.langToggle}>
              <button
                className={`${styles.langBtn} ${lang === 'bg' ? styles.langBtnActive : ''}`}
                onClick={() => setLang('bg')} type="button"
              >БГ</button>
              <button
                className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
                onClick={() => setLang('en')} type="button"
              >EN</button>
            </div>
            <a href="/" className={styles.openAppBtn}>{t.nav.openApp}</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroHeadline}>{t.hero.headline}</h1>
          <p className={styles.heroSub}>{t.hero.sub}</p>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{t.plans.title}</h2>
          <div className={styles.plansGrid}>
            <PlanCard plan={t.plans.plus} highlight={false} />
            <PlanCard plan={t.plans.pro}  highlight={true}  />
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.articleList}>
            {t.articles.map(article => (
              <Article
                key={article.id}
                article={article}
                open={openArticle === article.id}
                onToggle={() => toggleArticle(article.id)}
                lang={lang}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>BLAG COACHING</span>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} All rights reserved</span>
          <a href="/" className={styles.footerLink}>{t.nav.openApp} →</a>
        </div>
      </footer>
    </div>
  )
}
