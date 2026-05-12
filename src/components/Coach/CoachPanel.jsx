import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CoachPanel.module.css'

export default function CoachPanel() {
  const { fetchClients, updateClientProfile } = useAuth()
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(null)
  const [edits, setEdits]         = useState({})
  const [saving, setSaving]       = useState(null)
  const [saved, setSaved]         = useState(null)

  useEffect(() => {
    fetchClients().then(({ data }) => {
      if (data) {
        setClients(data)
        // init edits map with current values
        const map = {}
        data.forEach(c => {
          map[c.id] = { name: c.name, calories: c.calories, protein: c.protein, carbs: c.carbs, fat: c.fat }
        })
        setEdits(map)
      }
      setLoading(false)
    })
  }, [])

  function setField(clientId, field, value) {
    setEdits(prev => ({ ...prev, [clientId]: { ...prev[clientId], [field]: value } }))
  }

  async function handleSave(clientId) {
    setSaving(clientId)
    const { calories, protein, carbs, fat, name } = edits[clientId]
    await updateClientProfile(clientId, {
      name,
      calories: parseInt(calories) || 2450,
      protein:  parseInt(protein)  || 180,
      carbs:    parseInt(carbs)    || 250,
      fat:      parseInt(fat)      || 70,
    })
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, ...edits[clientId] } : c
    ))
    setSaving(null)
    setSaved(clientId)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>КЛИЕНТИ</h1>
        </header>
        <p className={styles.empty}>Зарежда...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>КЛИЕНТИ</h1>
        <p className={styles.subtitle}>{clients.length} регистрирани</p>
      </header>

      {clients.length === 0 ? (
        <p className={styles.empty}>Все още няма клиенти.</p>
      ) : (
        <div className={styles.list}>
          {clients.map(client => {
            const isOpen = expanded === client.id
            const e = edits[client.id] || {}
            return (
              <div key={client.id} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
                <button
                  className={styles.cardHeader}
                  onClick={() => setExpanded(isOpen ? null : client.id)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.clientInfo}>
                    <span className={styles.clientName}>{client.name || '—'}</span>
                    <span className={styles.clientEmail}>{client.email}</span>
                  </div>
                  <div className={styles.macroSnippet}>
                    <span>{client.calories} ккал</span>
                    <span>{client.protein}g П</span>
                  </div>
                  <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className={styles.editor}>
                    <div className={styles.editorField}>
                      <label className={styles.editorLabel}>Име</label>
                      <input
                        className={styles.editorInput}
                        type="text"
                        value={e.name ?? ''}
                        onChange={ev => setField(client.id, 'name', ev.target.value)}
                      />
                    </div>

                    <div className={styles.editorGrid}>
                      {[
                        { key: 'calories', label: 'Калории', unit: 'ккал' },
                        { key: 'protein',  label: 'Протеин',  unit: 'g'    },
                        { key: 'carbs',    label: 'Въглехидрати', unit: 'g' },
                        { key: 'fat',      label: 'Мазнини',  unit: 'g'    },
                      ].map(({ key, label, unit }) => (
                        <div key={key} className={styles.editorField}>
                          <label className={styles.editorLabel}>{label}</label>
                          <div className={styles.inputWrap}>
                            <input
                              className={styles.editorInput}
                              type="number"
                              min="0"
                              value={e[key] ?? ''}
                              onChange={ev => setField(client.id, key, ev.target.value)}
                            />
                            <span className={styles.unit}>{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className={`${styles.saveBtn} ${saved === client.id ? styles.saveBtnDone : ''}`}
                      onClick={() => handleSave(client.id)}
                      disabled={saving === client.id}
                    >
                      {saving === client.id ? '...' : saved === client.id ? '✓ Запазено' : 'Запази целите'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
