import { useSettings } from '../../contexts/SettingsContext'
import styles from './InstallDemo.module.css'

/**
 * A phone, showing the one thing nobody knows how to do.
 * Drawn rather than filmed — three states on one CSS timeline.
 */
export default function InstallDemo() {
  const { t } = useSettings()
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
                <span className={styles.rowText}>{t('install.sheetRow')}</span>
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

      <ol className={styles.captions}>
        <li className={styles.c1}><b>1</b> {t('install.step1')}</li>
        <li className={styles.c2}><b>2</b> {t('install.step2')}</li>
        <li className={styles.c3}><b>3</b> {t('install.step3')}
          <span className={styles.wink}>{t('install.wink')}</span>
        </li>
      </ol>
    </div>
  )
}
