import { useState, useEffect } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import styles from './NotificationSettings.module.css'

const DEFAULT = { enabled: false, morningTime: '08:00', eveningTime: '21:00' }

function scheduleNotifications(settings) {
  if (!settings.enabled || !('Notification' in window) || Notification.permission !== 'granted') return

  const now = new Date()

  function msUntil(timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    const target = new Date(now)
    target.setHours(h, m, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    return target - now
  }

  const morningMs = msUntil(settings.morningTime)
  const eveningMs = msUntil(settings.eveningTime)

  setTimeout(() => {
    new Notification('Blag Coaching ☀️', {
      body: 'Не забравяй да маркираш навиците си за днес!',
      icon: '/icon-192.png',
    })
  }, morningMs)

  setTimeout(() => {
    new Notification('Blag Coaching 🌙', {
      body: 'Логна ли храната за днес?',
      icon: '/icon-192.png',
    })
  }, eveningMs)
}

export default function NotificationSettings() {
  const [settings, setSettings] = useLocalStorage('blag_notif_v1', DEFAULT)
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (settings.enabled && permission === 'granted') {
      scheduleNotifications(settings)
    }
  }, [])

  async function handleToggle() {
    if (!('Notification' in window)) return

    if (!settings.enabled) {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        const next = { ...settings, enabled: true }
        setSettings(next)
        scheduleNotifications(next)
        setFeedback('Напомнянията са включени!')
      } else {
        setFeedback('Позволи нотификациите в настройките на браузъра.')
      }
    } else {
      setSettings(s => ({ ...s, enabled: false }))
      setFeedback('Напомнянията са изключени.')
    }
    setTimeout(() => setFeedback(''), 3000)
  }

  function handleTimeChange(field, value) {
    const next = { ...settings, [field]: value }
    setSettings(next)
    if (next.enabled && permission === 'granted') scheduleNotifications(next)
  }

  if (permission === 'unsupported') return null

  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>НАПОМНЯНИЯ</h2>

      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>
          {settings.enabled ? 'Включени' : 'Изключени'}
        </span>
        <button
          className={`${styles.toggle} ${settings.enabled ? styles.on : ''}`}
          onClick={handleToggle}
          aria-pressed={settings.enabled}
          aria-label="Включи напомняния"
        >
          <span className={styles.thumb} />
        </button>
      </div>

      {settings.enabled && (
        <div className={styles.times}>
          <div className={styles.timeField}>
            <label className={styles.timeLabel} htmlFor="morning-time">☀️ Сутрин</label>
            <input
              id="morning-time"
              type="time"
              className={styles.timeInput}
              value={settings.morningTime}
              onChange={e => handleTimeChange('morningTime', e.target.value)}
            />
          </div>
          <div className={styles.timeField}>
            <label className={styles.timeLabel} htmlFor="evening-time">🌙 Вечер</label>
            <input
              id="evening-time"
              type="time"
              className={styles.timeInput}
              value={settings.eveningTime}
              onChange={e => handleTimeChange('eveningTime', e.target.value)}
            />
          </div>
        </div>
      )}

      {feedback && <p className={styles.feedback}>{feedback}</p>}

      <p className={styles.note}>
        {permission === 'denied'
          ? 'Нотификациите са блокирани. Позволи ги в настройките на браузъра.'
          : 'На iPhone: Safari → нотификациите работят само когато сайтът е инсталиран като app.'}
      </p>
    </section>
  )
}
