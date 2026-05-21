import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { registerPushSubscription } from '../../hooks/usePushNotifications'
import styles from './NotificationPrompt.module.css'

const STORAGE_KEY  = 'notif_prompt_last_shown'
const REPROMPT_MS  = 3 * 24 * 60 * 60 * 1000 // 3 days

export default function NotificationPrompt() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return

    const lastShown = localStorage.getItem(STORAGE_KEY)
    if (lastShown && Date.now() - Number(lastShown) < REPROMPT_MS) return

    const t = setTimeout(() => setShow(true), 1800)
    return () => clearTimeout(t)
  }, [user?.id])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setShow(false)
  }

  async function allow() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setShow(false)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted' && user) {
        await registerPushSubscription(user.id)
      }
    } catch {
      // browser blocked programmatic request
    }
  }

  if (!show) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.sheet}>
        <div className={styles.iconWrap}>🔔</div>
        <h2 className={styles.title}>Разреши известия</h2>
        <p className={styles.body}>
          Получавай напомняния за добавките си и съобщения от треньора директно на телефона.
        </p>
        <button className={styles.allowBtn} onClick={allow} type="button">
          Разреши известия
        </button>
        <button className={styles.dismissBtn} onClick={dismiss} type="button">
          Не сега
        </button>
      </div>
    </div>
  )
}
