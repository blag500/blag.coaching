import styles from './InstallDemo.module.css'

/**
 * A phone, showing the one thing nobody knows how to do.
 *
 * "Add to home screen" is three taps and every visitor who has never installed
 * a web app has to be told which three. Told in words it is a paragraph nobody
 * reads; shown on a phone that does it by itself, it is over before anyone
 * decides whether to pay attention.
 *
 * Drawn rather than filmed. A screen recording of an iPhone would be a video to
 * download, would be wrong the week iOS moves the button, and would have to be
 * shot again for Android. This is three states on one CSS timeline, and the
 * whole thing weighs nothing.
 */
export default function InstallDemo() {
  return (
    <div className={styles.wrap}>
      <div className={styles.phone} aria-hidden="true">
        <span className={styles.notch} />

        <div className={styles.screen}>
          {/* 1 — the address bar, and the button they are looking for */}
          <div className={`${styles.frame} ${styles.f1}`}>
            <div className={styles.page}>
              <span className={styles.pageMark}>BLAG</span>
              <span className={styles.pageLine} />
              <span className={`${styles.pageLine} ${styles.short}`} />
            </div>
            <div className={styles.omni}>
              <span className={styles.url}>blag-coaching.com</span>
              <span className={styles.share}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
                     stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15V3" /><path d="M8.5 6.5 12 3l3.5 3.5" />
                  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
              </span>
            </div>
          </div>

          {/* 2 — the sheet, with the row that matters lit */}
          <div className={`${styles.frame} ${styles.f2}`}>
            <div className={styles.sheet}>
              <span className={styles.grab} />
              <div className={styles.rowDim}><span /><span className={styles.rowBar} /></div>
              <div className={styles.rowHot}>
                <span className={styles.plus}>+</span>
                <span className={styles.rowText}>Към „Начален екран"</span>
              </div>
              <div className={styles.rowDim}><span /><span className={styles.rowBar} /></div>
            </div>
          </div>

          {/* 3 — where it ends up */}
          <div className={`${styles.frame} ${styles.f3}`}>
            <div className={styles.home}>
              <span className={styles.appIcon} />
              <span className={styles.appIcon} />
              <span className={`${styles.appIcon} ${styles.appNew}`}>BLAG</span>
            </div>
          </div>
        </div>
      </div>

      {/* The captions run on the same clock as the screens, so the words and the
          picture are never describing different moments. */}
      <ol className={styles.captions}>
        <li className={styles.c1}><b>1</b> Отвори blag-coaching.com и натисни бутона за споделяне.</li>
        <li className={styles.c2}><b>2</b> Избери „Към Начален екран".</li>
        <li className={styles.c3}><b>3</b> Готово — BLAG стои до другите приложения.</li>
      </ol>
    </div>
  )
}
