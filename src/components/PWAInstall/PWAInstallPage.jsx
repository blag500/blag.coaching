import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './PWAInstallPage.module.css'

export default function PWAInstallPage({ onBack }) {
  const { profile } = useAuth()
  const isCoach = profile?.role === 'coach'

  const [notice,   setNotice]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('update_notice')
      .eq('role', 'coach')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setNotice(data.update_notice ?? false)
        setLoading(false)
      })
  }, [])

  async function toggle() {
    setSaving(true)
    const next = !notice
    await supabase
      .from('profiles')
      .update({ update_notice: next })
      .eq('id', profile.id)
    setNotice(next)
    setSaving(false)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">← НАЗАД</button>
        <h1 className={styles.title}>СТАТУС</h1>
      </header>

      <div className={styles.body}>
        {loading ? null : isCoach ? (
          <div className={styles.doneCard}>
            <div className={styles.doneTitle}>ИЗВЕСТИЕ ЗА АКТУАЛИЗАЦИЯ</div>
            <p className={styles.doneDesc}>
              {notice
                ? 'Активно — клиентите виждат банер с молба да опреснят приложението.'
                : 'Неактивно — никакво известие не се показва на клиентите.'}
            </p>
            <button
              className={styles.installBtn}
              style={{ background: notice ? '#ef5350' : 'var(--accent)' }}
              onClick={toggle}
              disabled={saving}
              type="button"
            >
              {saving ? '...' : notice ? 'ИЗКЛЮЧИ ИЗВЕСТИЕТО' : 'ПУСНИ ИЗВЕСТИЕ ЗА АКТУАЛИЗАЦИЯ'}
            </button>
          </div>
        ) : (
          <div className={styles.doneCard}>
            {notice ? (
              <>
                <div className={styles.doneIcon}>🔄</div>
                <div className={styles.doneTitle}>НАЛИЧНА Е НОВА ВЕРСИЯ</div>
                <p className={styles.doneDesc}>
                  Треньорът е пуснал актуализация. Затвори и отвори приложението отново, за да получиш последната версия.
                </p>
                <button
                  className={styles.installBtn}
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  ОПРЕСНИ СЕГА
                </button>
              </>
            ) : (
              <>
                <div className={styles.doneIcon}>✅</div>
                <div className={styles.doneTitle}>ПРИЛОЖЕНИЕТО Е АКТУАЛНО</div>
                <p className={styles.doneDesc}>Няма налични актуализации в момента.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
