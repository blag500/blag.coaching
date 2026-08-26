import { useSettings } from '../../contexts/SettingsContext'
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
          )}
        </div>
      </div>
    </header>
  )
}
