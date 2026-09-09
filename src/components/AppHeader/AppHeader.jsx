import { useSettings } from '../../contexts/SettingsContext'
import { useRewards } from '../../contexts/RewardsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './AppHeader.module.css'

/**
 * Sticky top bar shared by every tab page.
 *
 * Layout is a 1fr / auto / 1fr grid so the title stays optically centred
 * no matter how wide the action slot on the right grows.
 */
export default function AppHeader({
  onMenuOpen,
  onBack,
  eyebrow,
  title,
  avatarUrl,
  avatarInitial,
  onAvatarClick,
  avatarEditable = false,
  avatarBusy = false,
  action = null,
}) {
  const { t } = useSettings()
  /* Низът стои на снимката, защото лентата е единственото, което го има на
     всеки екран. Значка, която се вижда само на едно място, не отчита нищо —
     тя просто седи там. */
  const { streak } = useRewards()
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <div className={styles.left}>
          {onBack ? (
            <button className={styles.menuBtn} onClick={onBack} type="button" aria-label={t('header.back')}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
          ) : (
            <button className={styles.menuBtn} onClick={onMenuOpen} type="button" aria-label={t('header.menu')}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" aria-hidden="true">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className={`${styles.center} ${eyebrow ? '' : styles.centerSolo}`}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 className={styles.title}>{title}</h1>
        </div>

        <div className={styles.right}>
          {action}
          {onAvatarClick && (
            /* Обвивка, защото самият бутон е с overflow: hidden — кръглата
               снимка го иска, а значката трябва да излиза извън кръга. */
            <span className={styles.avatarWrap}>
              <button
                className={styles.avatarBtn}
                onClick={onAvatarClick}
                type="button"
                aria-label={avatarEditable ? t('header.changePhoto') : t('header.profile')}
              >
                {avatarUrl
                  ? <img src={avatarUrl} className={styles.avatarImg} alt="" />
                  : <span className={styles.avatarInitial}>{avatarInitial}</span>
                }
                {avatarEditable && (
                  <span className={styles.avatarOverlay}>{avatarBusy ? '…' : '✎'}</span>
                )}
              </button>
              {/* Един ден не е низ. Значката се появява на втория — иначе
                  всеки, който е отворил приложението веднъж, носи горд знак
                  за нищо. */}
              {streak > 1 && (
                /* Знакът, който показва низа, води до страницата за него.
                   Съобщение, а не проп: лентата се рисува от двайсетина
                   екрана и всеки от тях щеше да трябва да знае как се
                   навигира, за да стигне числото дотук. */
                <button
                  type="button"
                  className={styles.streak}
                  aria-label={t('streak.title', { n: streak })}
                  onClick={e => {
                    e.stopPropagation()
                    window.dispatchEvent(new CustomEvent('blag:open-rewards'))
                  }}
                >
                  <Pictogram name="flame" size={11} />
                  {streak}
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
