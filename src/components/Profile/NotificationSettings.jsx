import { useState, useEffect } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useAuth } from '../../contexts/AuthContext'
import { registerPushSubscription } from '../../hooks/usePushNotifications'
import { useReminderSettings } from '../../hooks/useReminderSettings'
import styles from './NotificationSettings.module.css'
import { useSettings } from '../../contexts/SettingsContext'

const DEFAULT = { enabled: false, morningTime: '08:00', eveningTime: '21:00' }

function scheduleNotifications(t, settings) {
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
    new Notification('Blag ☀️', { body: t('ns.morningBody'), icon: '/icon-192.png' })
  }, msUntil(settings.morningTime))
  setTimeout(() => {
    new Notification('Blag 🌙', { body: t('ns.eveningBody'), icon: '/icon-192.png' })
  }, msUntil(settings.eveningTime))
}

export const EMAIL_REMINDERS = [
  { key: 'checkin_email',     emoji: '🌅', labelKey: 'ns.checkin',     time: '07:00' },
  { key: 'weight_email',      emoji: '⚖️', labelKey: 'ns.weight',      time: '07:30' },
  { key: 'habits_email',      emoji: '✅', labelKey: 'ns.habits',      time: '08:00' },
  { key: 'supplements_email', emoji: '💊', labelKey: 'ns.supplements', time: '08:30' },
  { key: 'water_email',       emoji: '💧', labelKey: 'ns.water',       time: '14:00' },
  { key: 'food_email',        emoji: '🍽', labelKey: 'ns.food',        time: '16:00' },
  { key: 'training_email',    emoji: '💪', labelKey: 'ns.training',    time: '19:00' },
]

export default function NotificationSettings() {
  const { t } = useSettings()
  const { user } = useAuth()
  const [settings, setSettings] = useLocalStorage('blag_notif_v1', DEFAULT)
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [feedback, setFeedback] = useState('')
  const { settings: email, toggle, toggleAll, loading, saving } = useReminderSettings()

  useEffect(() => {
    if (settings.enabled && permission === 'granted') scheduleNotifications(t, settings)
  }, [])

  async function handlePushToggle() {
    if (!('Notification' in window)) return
    if (!settings.enabled) {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        const next = { ...settings, enabled: true }
        setSettings(next)
        scheduleNotifications(t, next)
        registerPushSubscription(user?.id).catch(console.error)
        setFeedback(t('ns.enabled'))
      } else {
        setFeedback(t('ns.blocked'))
      }
    } else {
      setSettings(s => ({ ...s, enabled: false }))
      setFeedback(t('ns.disabled'))
    }
    setTimeout(() => setFeedback(''), 3000)
  }

  function handleTimeChange(field, value) {
    const next = { ...settings, [field]: value }
    setSettings(next)
    if (next.enabled && permission === 'granted') scheduleNotifications(t, next)
  }

  return (
    <>
      {/* ── Push notifications ── */}
      {permission !== 'unsupported' && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>{t('ns.pushTitle')}</h2>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>{settings.enabled ? t('ns.on') : t('ns.off')}</span>
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
                <label className={styles.timeLabel} htmlFor="morning-time">{t('ns.morning')}</label>
                <input id="morning-time" type="time" className={styles.timeInput}
                  value={settings.morningTime} onChange={e => handleTimeChange('morningTime', e.target.value)} />
              </div>
              <div className={styles.timeField}>
                <label className={styles.timeLabel} htmlFor="evening-time">{t('ns.evening')}</label>
                <input id="evening-time" type="time" className={styles.timeInput}
                  value={settings.eveningTime} onChange={e => handleTimeChange('eveningTime', e.target.value)} />
              </div>
            </div>
          )}
          {feedback && <p className={styles.feedback}>{feedback}</p>}
          <p className={styles.note}>
            {permission === 'denied'
              ? t('ns.blockedHint')
              : t('ns.iosHint')}
          </p>
        </section>
      )}

      {/* ── Email reminders ── */}
      <EmailRemindersCard email={email} toggle={toggle} toggleAll={toggleAll} loading={loading} saving={saving} />
    </>
  )
}

export function EmailRemindersCard({ email, toggle, toggleAll, loading, saving }) {
  const { t } = useSettings()
  return (
    <section className={styles.card}>
      <div className={styles.emailHeader}>
        <h2 className={styles.sectionTitle}>
          {t('ns.emailTitle')}
          {saving && <span className={styles.savingDot} />}
        </h2>
        <button
          className={`${styles.toggle} ${email.email_enabled ? styles.on : ''}`}
          onClick={() => toggleAll(!email.email_enabled)}
          aria-pressed={email.email_enabled}
          aria-label={t('ns.allAria')}
        >
          <span className={styles.thumb} />
        </button>
      </div>

      <p className={styles.note} style={{ marginBottom: 14 }}>
        {t('ns.emailNote')}
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
              <span className={styles.emailLabel}>{t(r.labelKey)}</span>
              <span className={styles.emailTime}>{r.time}</span>
              <button
                className={`${styles.toggle} ${email[r.key] && email.email_enabled ? styles.on : ''}`}
                onClick={() => toggle(r.key)}
                disabled={!email.email_enabled}
                aria-pressed={email[r.key]}
                aria-label={t('ns.rowAria', { label: t(r.labelKey) })}
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
