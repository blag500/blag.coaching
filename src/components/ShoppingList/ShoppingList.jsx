import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ShoppingList.module.css'

const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Week strip showing last 14 days with shopping activity dots ─────────────
function WeekStrip({ history }) {
  const activityDays = new Set(
    history.map(l => new Date(l.archived_at).toDateString())
  )
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 13 + i)
    return d
  })

  return (
    <div className={styles.strip}>
      {days.map((d, i) => {
        const isToday = d.toDateString() === new Date().toDateString()
        const active = activityDays.has(d.toDateString())
        return (
          <div key={i} className={`${styles.stripDay} ${isToday ? styles.stripToday : ''}`}>
            <span className={styles.stripLabel}>{DAY_NAMES[d.getDay()]}</span>
            <div className={`${styles.stripDot} ${active ? styles.stripDotActive : ''}`} />
            <span className={styles.stripNum}>{d.getDate()}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Past shopping session card ───────────────────────────────────────────────
function HistoryCard({ session }) {
  const [open, setOpen] = useState(false)
  const total   = session.items.length
  const checked = session.items.filter(i => i.checked).length
  const pct     = total > 0 ? Math.round((checked / total) * 100) : 0

  return (
    <div className={styles.histCard}>
      <button
        className={styles.histHeader}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <div className={styles.histLeft}>
          <span className={styles.histDate}>{formatDate(session.archived_at)}</span>
          <span className={styles.histSummary}>{total} артикула · {pct}% отметнати</span>
        </div>
        <div className={styles.histRight}>
          <div className={styles.progressRing}>
            <svg viewBox="0 0 36 36" width="36" height="36">
              <circle cx="18" cy="18" r="14" className={styles.ringBg} />
              <circle
                cx="18" cy="18" r="14"
                className={styles.ringFill}
                strokeDasharray={`${pct * 0.879} 87.9`}
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span className={styles.ringPct}>{pct}%</span>
          </div>
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
        </div>
      </button>

      {open && (
        <ul className={styles.histItems}>
          {session.items.map(item => (
            <li key={item.id} className={`${styles.histItem} ${item.checked ? styles.histItemDone : ''}`}>
              <span className={styles.histCheck}>{item.checked ? '✓' : '○'}</span>
              <span className={styles.histItemName}>{item.name}</span>
              {item.quantity && <span className={styles.histQty}>{item.quantity}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ShoppingList({ onBack }) {
  const { user } = useAuth()
  const [tab, setTab]           = useState('list')
  const [activeList, setActiveList] = useState(null)
  const [items, setItems]       = useState([])
  const [history, setHistory]   = useState([])
  const [histLoaded, setHistLoaded] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [nameInput, setNameInput] = useState('')
  const [qtyInput, setQtyInput]   = useState('')
  const [archiving, setArchiving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (user) loadActive() }, [user?.id])

  useEffect(() => {
    if (tab === 'history' && !histLoaded) loadHistory()
  }, [tab])

  async function loadActive() {
    const { data: list } = await supabase
      .from('shopping_lists')
      .select('id, created_at')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let current = list
    if (!current) {
      const { data } = await supabase
        .from('shopping_lists')
        .insert({ user_id: user.id })
        .select()
        .single()
      current = data
    }
    setActiveList(current)

    if (current) {
      const { data: its } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', current.id)
        .order('created_at')
      setItems(its || [])
    }
    setLoading(false)
  }

  async function loadHistory() {
    const { data: lists } = await supabase
      .from('shopping_lists')
      .select('id, created_at, archived_at')
      .eq('user_id', user.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
      .limit(30)
    if (!lists?.length) { setHistLoaded(true); return }

    const { data: allItems } = await supabase
      .from('shopping_items')
      .select('*')
      .in('list_id', lists.map(l => l.id))
      .order('created_at')

    const byList = {}
    ;(allItems || []).forEach(item => {
      if (!byList[item.list_id]) byList[item.list_id] = []
      byList[item.list_id].push(item)
    })
    setHistory(lists.map(l => ({ ...l, items: byList[l.id] || [] })))
    setHistLoaded(true)
  }

  async function addItem() {
    if (!nameInput.trim() || !activeList) return
    const payload = {
      list_id:  activeList.id,
      name:     nameInput.trim(),
      quantity: qtyInput.trim() || null,
    }
    const { data } = await supabase.from('shopping_items').insert(payload).select().single()
    if (data) setItems(prev => [...prev, data])
    setNameInput('')
    setQtyInput('')
    inputRef.current?.focus()
  }

  async function toggleItem(id, checked) {
    await supabase.from('shopping_items').update({ checked: !checked }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  async function deleteItem(id) {
    await supabase.from('shopping_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function archiveList() {
    if (!activeList || items.length === 0 || archiving) return
    setArchiving(true)
    await supabase
      .from('shopping_lists')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', activeList.id)
    const { data: newList } = await supabase
      .from('shopping_lists')
      .insert({ user_id: user.id })
      .select()
      .single()
    setActiveList(newList)
    setItems([])
    setHistory([])
    setHistLoaded(false)
    setArchiving(false)
  }

  const checked = items.filter(i => i.checked).length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">← ОТКРИЙ</button>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>СПИСЪК</h1>
          {items.length > 0 && (
            <span className={styles.progress}>{checked}/{items.length}</span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[{ id: 'list', label: 'ТЕКУЩ' }, { id: 'history', label: 'ИСТОРИЯ' }].map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <>
          {loading ? (
            <p className={styles.empty}>Зарежда...</p>
          ) : (
            <>
              {items.length === 0 && (
                <p className={styles.empty}>Списъкът е празен. Добави артикули по-долу.</p>
              )}

              <ul className={styles.itemList}>
                {items.map(item => (
                  <li
                    key={item.id}
                    className={`${styles.item} ${item.checked ? styles.itemDone : ''}`}
                  >
                    <button
                      className={`${styles.checkbox} ${item.checked ? styles.checkboxDone : ''}`}
                      onClick={() => toggleItem(item.id, item.checked)}
                      type="button"
                      aria-label={item.checked ? 'Отмаркирай' : 'Маркирай'}
                    >
                      {item.checked && (
                        <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="10">
                          <polyline points="1 5 4.5 9 11 1" />
                        </svg>
                      )}
                    </button>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.quantity && <span className={styles.itemQty}>{item.quantity}</span>}
                    <button
                      className={styles.deleteItemBtn}
                      onClick={() => deleteItem(item.id)}
                      type="button"
                      aria-label="Изтрий"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add item input */}
              <div className={styles.addWrap}>
                <input
                  ref={inputRef}
                  className={styles.addInput}
                  type="text"
                  placeholder="Артикул..."
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <input
                  className={styles.qtyInput}
                  type="text"
                  placeholder="Кол."
                  value={qtyInput}
                  onChange={e => setQtyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <button
                  className={styles.addBtn}
                  onClick={addItem}
                  disabled={!nameInput.trim()}
                  type="button"
                >
                  +
                </button>
              </div>

              {/* Archive button */}
              {items.length > 0 && (
                <button
                  className={styles.archiveBtn}
                  onClick={archiveList}
                  disabled={archiving}
                  type="button"
                >
                  {archiving ? 'Запазва...' : 'Завърши пазаруването →'}
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <>
          {!histLoaded ? (
            <p className={styles.empty}>Зарежда...</p>
          ) : (
            <>
              {history.length > 0 && <WeekStrip history={history} />}
              {history.length === 0 ? (
                <p className={styles.empty}>Все още няма архивирани списъци.</p>
              ) : (
                <div className={styles.histList}>
                  {history.map(session => (
                    <HistoryCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
