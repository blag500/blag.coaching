import { useReminderSettings } from '../../hooks/useReminderSettings'
import { EmailRemindersCard } from '../Profile/NotificationSettings'
import styles from '../Profile/NotificationSettings.module.css'

export default function ClientReminderSettings({ clientId, clientName }) {
  const { settings, toggle, toggleAll, loading, saving } = useReminderSettings(clientId)

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        Управляваш имейл напомнянията за <strong style={{ color: 'var(--text)' }}>{clientName}</strong>.
        Имейлите се пращат само ако нещото не е логнато за деня.
      </p>
      <EmailRemindersCard
        email={settings}
        toggle={toggle}
        toggleAll={toggleAll}
        loading={loading}
        saving={saving}
      />
    </div>
  )
}
