import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { registerPushSubscription } from '../../hooks/usePushNotifications'
import { useSettings } from '../../contexts/SettingsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './NotificationPrompt.module.css'

const STORAGE_KEY  = 'notif_prompt_last_shown'
const REPROMPT_MS  = 5 * 24 * 60 * 60 * 1000

/**
 * Кога да се иска разрешение за известия.
 *
 * Пет от тринайсет клиента го имат. Всяка функция с известия работи на този
 * таван, колкото и добре да е написана, значи работата е в момента на
 * питането, не в съдържанието на напомнянето.
 *
 * Дотук листът излизаше 1,8 секунди след отварянето — човекът още не е видял
 * приложението, не е поискал нищо и вече го прекъсват. Това е най-лошата
 * секунда за питане и „по-късно" се натиска, без да се чете.
 *
 * Сега чака да се затвори награда. Поздравът за новия ден носи низа, значи
 * човекът тъкмо е видял колко дни е събрал — и питането има за какво да се
 * хване: „да ти напомням, за да не го скъсаш" е вярно изречение в този миг и
 * няма никакъв смисъл в който и да е друг.
 *
 * И отказаното разрешение. Браузърът пита веднъж; след „не" requestPermission
 * се връща веднага и нищо не се случва. Дотук бутонът „Разреши" стоеше и не
 * правеше нищо — човекът го натиска, не става нищо, и заключава, че е
 * счупено. Затова отказаното си има свой лист, който казва къде се включва.
 */
export default function NotificationPrompt() {
  const { t } = useSettings()
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [streak, setStreak] = useState(0)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return

    function onCelebrated(e) {
      const last = localStorage.getItem(STORAGE_KEY)
      if (last && Date.now() - Number(last) < REPROMPT_MS) return
      setStreak(e.detail?.streak || 0)
      setBlocked(Notification.permission === 'denied')
      /* Малко след затварянето на наградата, не върху нея: два листа един
         върху друг се четат като един объркан. */
      setTimeout(() => setShow(true), 700)
    }

    window.addEventListener('blag:celebrated', onCelebrated)
    return () => window.removeEventListener('blag:celebrated', onCelebrated)
  }, [user?.id])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setShow(false)
  }

  async function allow() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted' && user) {
        await registerPushSubscription(user.id)
        setShow(false)
        return
      }
      /* Отказано току-що: листът не изчезва, а сменя това, което казва.
         Изчезване след „не" оставя човека без представа какво е станало. */
      setBlocked(true)
    } catch {
      setBlocked(true)
    }
  }

  if (!show) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.sheet}>
        <div className={styles.iconWrap}><Pictogram name="bell" size={26} /></div>

        {blocked ? (
          <>
            <h2 className={styles.title}>{t('np.blockedTitle')}</h2>
            <p className={styles.body}>{t('np.blockedBody')}</p>
            <button className={styles.dismissBtn} onClick={dismiss} type="button">
              {t('np.close')}
            </button>
          </>
        ) : (
          <>
            <h2 className={styles.title}>{t('np.title')}</h2>
            <p className={styles.body}>
              {/* Причината е тази, която човекът тъкмо видя. Без низ зад гърба
                  си остава общото изречение — то поне не обещава нищо. */}
              {streak > 1 ? t('np.bodyStreak', { n: streak }) : t('np.body')}
            </p>
            <button className={styles.allowBtn} onClick={allow} type="button">
              {t('np.allow')}
            </button>
            <button className={styles.dismissBtn} onClick={dismiss} type="button">
              {t('np.later')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
