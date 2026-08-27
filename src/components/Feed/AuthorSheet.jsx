import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './Feed.module.css'

/**
 * Кой е човекът зад поста.
 *
 * Показва точно това, което feed_authors излага — име, снимка, роля, био — и
 * нищо друго. Един клиент няма работа с калориите и целите на друг, а изгледът
 * в базата така или иначе не му ги дава.
 *
 * През portal към body, а не на място: табовете се движат с transform при
 * суайп, а position: fixed вътре в трансформиран родител се закача за него
 * вместо за екрана и картата тръгва настрани заедно със страницата.
 */
export default function AuthorSheet({ author, onClose, onMessage }) {
  const { profile } = useAuth()
  const { t } = useSettings()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!author) return null

  const isCoach = author.role === 'coach'
  const isMe    = author.id === profile?.id

  return createPortal(
    <div className={styles.sheetBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.sheet}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={author.name || t('feed.someone')}
      >
        <div className={styles.sheetAvatar}>
          {author.avatar_url
            ? <img src={author.avatar_url} alt="" />
            : (author.name || '?')[0].toUpperCase()}
        </div>

        <h2 className={styles.sheetName}>
          {author.name || t('feed.someone')}
          {isCoach && <span className={styles.coachTag}>{t('feed.coachTag')}</span>}
        </h2>

        {author.bio
          ? <p className={styles.sheetBio}>{author.bio}</p>
          : <p className={styles.sheetBioEmpty}>{isMe ? t('feed.bioEmptyMine') : t('feed.bioEmpty')}</p>}

        {/* Бутонът се показва само към треньора. Чатът на клиент събира всички
            негови съобщения в една нишка, защото допуска, че отсрещният е
            само треньорът — докато това е така, „пиши" към друг клиент би
            залепил два разговора един върху друг. */}
        {isCoach && !isMe && (
          <button type="button" className={styles.sheetMessage} onClick={onMessage}>
            {t('feed.message')}
          </button>
        )}

        <button type="button" className={styles.sheetClose} onClick={onClose}>
          {t('feed.close')}
        </button>
      </div>
    </div>,
    document.body
  )
}
