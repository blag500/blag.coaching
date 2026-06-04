import styles from './WelcomeOverlay.module.css'

const STEPS = [
  { icon: '🥗', label: 'ХРАНЕНЕ',           desc: 'Логвай храненето си всеки ден — с AI разпознаване или баркод.' },
  { icon: '💪', label: 'ТРЕНИРОВКИ',         desc: 'Следи тренировъчния си план и прогресията на упражненията.' },
  { icon: '📊', label: 'ПРОГРЕС',            desc: 'Тегло, форма за чекин и снимки — виж как се променяш.' },
  { icon: '💬', label: 'СЪОБЩЕНИЯ',          desc: 'Пиши на треньора си по всяко време.' },
  { icon: '📸', label: 'СНИМКИ НА ХРАНА',    desc: 'Добавяй снимки към всяко хранене за по-добър контрол.' },
  { icon: '✅', label: 'НАВИЦИ',             desc: 'Отбелязвай дневните си навици и изграждай рутина.' },
]

export default function WelcomeOverlay({ onDone }) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>ДОБРЕ ДОШЪЛ В</p>
        <h1 className={styles.logo}>BLAG COACHING</h1>
        <p className={styles.sub}>Ето какво можеш да правиш в приложението:</p>
        <ul className={styles.steps}>
          {STEPS.map(s => (
            <li key={s.label} className={styles.step}>
              <span className={styles.stepIcon}>{s.icon}</span>
              <div>
                <p className={styles.stepLabel}>{s.label}</p>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <button className={styles.cta} onClick={onDone} type="button">
          НАЧАЛО
        </button>
      </div>
    </div>
  )
}
