import { useState } from 'react'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import styles from './PWAInstallPage.module.css'

const IOS_STEPS = [
  {
    icon: '⬆️',
    title: 'Натисни "Сподели"',
    desc: 'Бутонът е долу в средата на Safari (квадрат с стрелка нагоре)',
  },
  {
    icon: '➕',
    title: 'Избери "Добави към начален екран"',
    desc: 'Превърти надолу в менюто и намери тази опция',
  },
  {
    icon: '✅',
    title: 'Натисни "Добави"',
    desc: 'Приложението ще се появи на началния ти екран като нативно',
  },
]

export default function PWAInstallPage({ onBack }) {
  const { canInstall, isIOS, isAndroid, isStandalone, install } = usePWAInstall()
  const [installed, setInstalled] = useState(false)

  async function handleInstall() {
    const ok = await install()
    if (ok) setInstalled(true)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">← НАЗАД</button>
        <h1 className={styles.title}>ИНСТАЛИРАЙ ПРИЛОЖЕНИЕТО</h1>
      </header>

      <div className={styles.body}>
        {isStandalone || installed ? (
          <div className={styles.doneCard}>
            <div className={styles.doneIcon}>🎉</div>
            <h2 className={styles.doneTitle}>ВЕЧЕ Е ИНСТАЛИРАНО!</h2>
            <p className={styles.doneDesc}>
              Приложението е добавено на началния ти екран. Можеш да го отвориш директно от там.
            </p>
          </div>
        ) : isIOS ? (
          <>
            <div className={styles.intro}>
              <p className={styles.introText}>
                Добави Blag Coaching на началния си екран за мигновен достъп — работи като нативно приложение, без браузър.
              </p>
              <div className={styles.safariNote}>
                Увери се, че използваш <strong>Safari</strong> на iOS
              </div>
            </div>

            <div className={styles.stepsList}>
              {IOS_STEPS.map((s, i) => (
                <div key={i} className={styles.step}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <div className={styles.stepIcon}>{s.icon}</div>
                  <div className={styles.stepText}>
                    <div className={styles.stepTitle}>{s.title}</div>
                    <div className={styles.stepDesc}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : canInstall ? (
          <>
            <div className={styles.intro}>
              <div className={styles.appIcon}>💪</div>
              <h2 className={styles.appName}>BLAG COACHING</h2>
              <p className={styles.introText}>
                Инсталирай приложението на устройството си за по-бърз достъп и работа без интернет.
              </p>
            </div>
            <button className={styles.installBtn} onClick={handleInstall} type="button">
              ИНСТАЛИРАЙ СЕГА
            </button>
          </>
        ) : (
          <div className={styles.doneCard}>
            <div className={styles.doneIcon}>ℹ️</div>
            <h2 className={styles.doneTitle}>КАК ДА ИНСТАЛИРАШ</h2>
            <p className={styles.doneDesc}>
              На Android: отвори в Chrome → меню (⋮) → "Добави към началния екран".<br /><br />
              На iOS: отвори в Safari → бутон "Сподели" → "Добави към началния екран".
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
