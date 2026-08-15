import styles from './AppShowcase.module.css'

/**
 * Three phones, fanned, showing the thing itself.
 *
 * A landing page for software that never shows the software is asking to be
 * taken on trust. These are the real screens — the dashboard's own cards, the
 * habit chips, the macro tracks — rebuilt at phone scale rather than
 * screenshotted, so they cannot go stale the next time a card changes and they
 * cost nothing to download.
 *
 * The middle one stands upright and forward; the outer two lean away and sit
 * dimmer, which is what makes three rectangles read as a stack rather than as
 * a row of tiles.
 */
export default function AppShowcase() {
  return (
    <div className={styles.fan} aria-hidden="true">
      {/* left — the training log */}
      <div className={`${styles.phone} ${styles.left}`}>
        <div className={styles.screen}>
          <span className={styles.eyebrow}>ТРЕНИРОВКА</span>
          {[['Клек', '80кг × 8'], ['Преса', '60кг × 10'], ['Напади', '24кг × 12']].map(([n, v]) => (
            <div key={n} className={styles.row}>
              <span className={styles.rowName}>{n}</span>
              <span className={styles.rowVal}>{v}</span>
            </div>
          ))}
          <div className={styles.pill}><span style={{ width: '72%' }} /></div>
        </div>
      </div>

      {/* centre — the dashboard */}
      <div className={`${styles.phone} ${styles.mid}`}>
        <div className={styles.screen}>
          <span className={styles.eyebrow}>ДОБРО УТРО</span>
          <span className={styles.name}>НИКОЛАЙ</span>

          <div className={styles.card}>
            <span className={styles.ring} />
            <div className={styles.ringText}>
              <span className={styles.big}>78</span>
              <span className={styles.small}>ГОТОВНОСТ</span>
            </div>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>МАКРОСИ</span>
            {[['var(--accent)', 92], ['#42A5F5', 100], ['#66BB6A', 78], ['#CE93D8', 88]].map(([c, w], i) => (
              <div key={i} className={styles.track}>
                <span style={{ width: `${w}%`, background: c }} />
              </div>
            ))}
          </div>

          <div className={styles.chips}>
            {['#42A5F5', '#EF5350', 'var(--accent)', '#AB47BC', '#66BB6A', '#FF8A65'].map((c, i) => (
              <span key={i} className={styles.chip}
                    style={i < 3 ? { borderColor: c, color: c, background: 'rgba(255,255,255,0.04)' } : null} />
            ))}
          </div>
        </div>
      </div>

      {/* right — the weight trend */}
      <div className={`${styles.phone} ${styles.right}`}>
        <div className={styles.screen}>
          <span className={styles.eyebrow}>ТЕГЛО</span>
          <div className={styles.weight}>
            <span className={styles.big}>75,6</span>
            <span className={styles.small}>−2 кг за 30 дни</span>
          </div>
          <svg viewBox="0 0 120 44" className={styles.spark}>
            <path d="M4 12l14 9 12-4 14 11 12-3 14 9 12-2 14 8"
                  fill="none" stroke="#66BB6A" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className={styles.pill}><span style={{ width: '46%' }} /></div>
          <div className={styles.pill}><span style={{ width: '64%' }} /></div>
        </div>
      </div>
    </div>
  )
}
