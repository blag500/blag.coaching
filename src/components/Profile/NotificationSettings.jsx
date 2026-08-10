import { useState, useEffect } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useAuth } from '../../contexts/AuthContext'
import { registerPushSubscription } from '../../hooks/usePushNotifications'
import { useReminderSettings } from '../../hooks/useReminderSettings'
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
  setTimeout(() => {
    new Notification('Blag ☀️', { body: 'Не забравяй да маркираш навиците си за днес!', icon: '/icon-192.png' })
  }, msUntil(settings.morningTime))
  setTimeout(() => {
    new Notification('Blag 🌙', { body: 'Логна ли храната за днес?', icon: '/icon-192.png' })
  }, msUntil(settings.eveningTime))
}

export const EMAIL_REMINDERS = [
  { key: 'weight_email',      emoji: '⚖️', label: 'Тегло',      time: '07:30' },
  { key: 'habits_email',      emoji: '✅', label: 'Навици',     time: '08:00' },
  { key: 'supplements_email', emoji: '💊', label: 'Суплементи', time: '08:30' },
  { key: 'water_email',       emoji: '💧', label: 'Вода',       time: '14:00' },
  { key: 'food_email',        emoji: '🍽', label: 'Храна',      time: '16:00' },
  { key: 'training_email',    emoji: '💪', label: 'Тренировка', time: '19:00' },
]

export default function NotificationSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useLocalStorage('blag_notif_v1', DEFAULT)
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [feedback, setFeedback] = useState('')
  const { settings: email, toggle, toggleAll, loading, saving } = useReminderSettings()

  useEffect(() => {
    if (settings.enabled && permission === 'granted') scheduleNotifications(settings)
  }, [])

  async function handlePushToggle() {
    if (!('Notification' in window)) return
    if (!settings.enabled) {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        const next = { ...settings, enabled: true }
        setSettings(next)
        scheduleNotifications(next)
        registerPushSubscription(user?.id).catch(console.error)
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

  return (
    <>
      {/* ── Push notifications ── */}
      {permission !== 'unsupported' && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>PUSH НАПОМНЯНИЯ</h2>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>{settings.enabled ? 'Включени' : 'Изключени'}</span>
            <button
              className={`${styles.toggle} ${settings.enabled ? styles.on : ''}`}
              onClick={handlePushToggle}
              aria-pressed={settings.enabled}
            >
              <span className={styles.thumb} />
            </button>
          </div>
          {settings.enabled && (
            <div className={styles.times}>
              <div className={styles.timeField}>
                <label className={styles.timeLabel} htmlFor="morning-time">☀️ Сутрин</label>
                <input id="morning-time" type="time" className={styles.timeInput}
                  value={settings.morningTime} onChange={e => handleTimeChange('morningTime', e.target.value)} />
              </div>
              <div className={styles.timeField}>
                <label className={styles.timeLabel} htmlFor="evening-time">🌙 Вечер</label>
                <input id="evening-time" type="time" className={styles.timeInput}
                  value={settings.eveningTime} onChange={e => handleTimeChange('eveningTime', e.target.value)} />
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
      )}

      {/* ── Email reminders ── */}
      <EmailRemindersCard email={email} toggle={toggle} toggleAll={toggleAll} loading={loading} saving={saving} />
    </>
  )
}

export function EmailRemindersCard({ email, toggle, toggleAll, loading, saving }) {
  return (
    <section className={styles.card}>
      <div className={styles.emailHeader}>
        <h2 className={styles.sectionTitle}>
          ИМЕЙЛ НАПОМНЯНИЯ
          {saving && <span className={styles.savingDot} />}
        </h2>
        <button
          className={`${styles.toggle} ${email.email_enabled ? styles.on : ''}`}
          onClick={() => toggleAll(!email.email_enabled)}
          aria-pressed={email.email_enabled}
          aria-label="Всички имейл напомняния"
        >
          <span className={styles.thumb} />
        </button>
      </div>

      <p className={styles.note} style={{ marginBottom: 14 }}>
        Изпращат се само ако нещото не е логнато за деня.
      </p>

      {loading ? (
        <div className={styles.skeletonList}>
          {EMAIL_REMINDERS.map(r => <div key={r.key} className={styles.skeletonRow} />)}
        </div>
      ) : (
        <div className={`${styles.emailList} ${!email.email_enabled ? styles.emailListDisabled : ''}`}>
          {EMAIL_REMINDERS.map(r => (
            <div key={r.key} className={styles.emailRow}>
              <span className={styles.emailEmoji}>{r.emoji}</span>
              <span className={styles.emailLabel}>{r.label}</span>
              <span className={styles.emailTime}>{r.time}</span>
              <button
                className={`${styles.toggle} ${email[r.key] && email.email_enabled ? styles.on : ''}`}
                onClick={() => toggle(r.key)}
                disabled={!email.email_enabled}
                aria-pressed={email[r.key]}
                aria-label={`Имейл за ${r.label}`}
              >
                <span className={styles.thumb} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
