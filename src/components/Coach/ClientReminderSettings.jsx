import { useReminderSettings } from '../../hooks/useReminderSettings'
import { useSettings } from '../../contexts/SettingsContext'
import { ReminderListCard } from '../Profile/NotificationSettings'
import styles from '../Profile/NotificationSettings.module.css'

export default function ClientReminderSettings({ clientId, clientName }) {
  const { t } = useSettings()
  const { settings, toggle, toggleAll, loading, saving } = useReminderSettings(clientId)

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        {t('crs.intro', { name: clientName })}{' '}{t('crs.note')}
      </p>
      <ReminderListCard
        email={settings}
        toggle={toggle}
        toggleAll={toggleAll}
        loading={loading}
        saving={saving}
      />
    </div>
  )
}
