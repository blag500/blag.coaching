import { useSettings } from '../../contexts/SettingsContext'
import { useRewards } from '../../contexts/RewardsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './AppHeader.module.css'

/**
 * Sticky top bar shared by every tab page.
 *
 * Two glass pills over the page, the way Reddit does it: navigation and the
 * page name on the left, the page's actions and the avatar on the right.
 * There is no bar behind them: the pills float over the content, at the top of
 * the page and while scrolling alike.
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
  const lead = onBack ?? onMenuOpen
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {/* Лявото хапче е навигацията и името на мястото, в едно — като
            „u/Blagiya ⌄" в Reddit. Натискането където и да е по него прави
            същото като иконката: меню или назад. */}
        <div className={styles.pill} onClick={lead}>
          {onBack ? (
            <button className={styles.menuBtn} onClick={e => { e.stopPropagation(); onBack() }} type="button" aria-label={t('header.back')}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
          ) : (
            <button className={styles.menuBtn} onClick={e => { e.stopPropagation(); onMenuOpen?.() }} type="button" aria-label={t('header.menu')}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" aria-hidden="true">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <div className={styles.center}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1 className={styles.title}>{title}</h1>
          </div>
        </div>

        {(action || onAvatarClick) && <div className={`${styles.pill} ${styles.right}`}>
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
        </div>}
      </div>
    </header>
  )
}
