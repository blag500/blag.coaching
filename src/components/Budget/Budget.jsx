import { useState, useRef } from 'react'
import { useBudget } from '../../hooks/useBudget'
import styles from './Budget.module.css'

function fmt(n) {
  return Math.abs(Number(n)).toLocaleString('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Setup view ────────────────────────────────────────────────────

function SetupView({ existing, onSave, onBack }) {
  const [budgetAmt, setBudgetAmt]   = useState(existing?.budget_amount ?? '')
  const [bufferPct, setBufferPct]   = useState(existing ? existing.buffer_pct * 100 : 10)
  const [expenses, setExpenses]     = useState(
    existing?.planned_expenses?.length ? existing.planned_expenses : [{ name: '', amount: '' }]
  )
  const [saving, setSaving] = useState(false)

  function addExpense()         { setExpenses(p => [...p, { name: '', amount: '' }]) }
  function removeExpense(i)     { setExpenses(p => p.filter((_, j) => j !== i)) }
  function setField(i, k, v)   { setExpenses(p => p.map((e, j) => j === i ? { ...e, [k]: v } : e)) }

  async function handleSave() {
    if (!budgetAmt) return
    setSaving(true)
    await onSave({
      budget_amount:    parseFloat(budgetAmt),
      buffer_pct:       parseFloat(bufferPct) / 100,
      planned_expenses: expenses
        .filter(e => Number(e.amount) > 0)
        .map(e => ({ name: e.name || 'Разход', amount: parseFloat(e.amount) })),
    })
    setSaving(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {onBack && (
          <button className={styles.backBtn} onClick={onBack} type="button">← Назад</button>
        )}
        <h1 className={styles.title}>НАСТРОЙКИ</h1>
      </div>

      <div className={styles.card}>
        <label className={styles.label}>Оставащ бюджет за месеца (лв.)</label>
        <input
          className={styles.input}
          type="number" inputMode="decimal" step="0.01" min="0"
          value={budgetAmt}
          onChange={e => setBudgetAmt(e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </div>

      <div className={styles.card}>
        <label className={styles.label}>Буфер за непредвидени разходи (%)</label>
        <input
          className={styles.input}
          type="number" inputMode="decimal" step="1" min="0" max="50"
          value={bufferPct}
          onChange={e => setBufferPct(e.target.value)}
        />
        <p className={styles.hint}>
          Резервирани: {fmt((parseFloat(budgetAmt) || 0) * (parseFloat(bufferPct) || 0) / 100)} лв.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.label}>Планирани разходи</span>
          <button className={styles.ghostBtn} onClick={addExpense} type="button">+ Добави</button>
        </div>
        {expenses.map((exp, i) => (
          <div key={i} className={styles.expenseRow}>
            <input
              className={`${styles.input} ${styles.inputFlex}`}
              type="text"
              placeholder="Наименование"
              value={exp.name}
              onChange={e => setField(i, 'name', e.target.value)}
            />
            <input
              className={`${styles.input} ${styles.inputAmt}`}
              type="number" inputMode="decimal" step="0.01"
              placeholder="0.00"
              value={exp.amount}
              onChange={e => setField(i, 'amount', e.target.value)}
            />
            <button className={styles.removeBtn} onClick={() => removeExpense(i)} type="button">×</button>
          </div>
        ))}
        {expenses.length > 0 && (
          <p className={styles.hint}>
            Общо планирани: {fmt(expenses.reduce((s,e) => s + (Number(e.amount)||0), 0))} лв.
          </p>
        )}
      </div>

      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!budgetAmt || saving}
        type="button"
      >
        {saving ? 'Записва...' : 'ЗАПАЗИ'}
      </button>
    </div>
  )
}

// ── Add transaction form ──────────────────────────────────────────

function AddForm({ onAdd }) {
  const [date,   setDate]   = useState(todayISO())
  const [desc,   setDesc]   = useState('')
  const [amount, setAmount] = useState('')
  const amtRef = useRef(null)

  async function handleAdd() {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    await onAdd({ date, description: desc.trim() || null, amount: parsed })
    setDesc('')
    setAmount('')
    setDate(todayISO())
    amtRef.current?.focus()
  }

  return (
    <div className={styles.addForm}>
      <div className={styles.addRow}>
        <input
          className={`${styles.input} ${styles.inputFlex}`}
          type="text"
          placeholder="Описание (опционално)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && amtRef.current?.focus()}
        />
        <input
          ref={amtRef}
          className={`${styles.input} ${styles.inputAmt}`}
          type="number" inputMode="decimal" step="0.01" min="0"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </div>
      <div className={styles.addRow}>
        <input
          className={`${styles.input} ${styles.inputFlex}`}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={!amount || parseFloat(amount) <= 0}
          type="button"
        >
          + ДОБАВИ
        </button>
      </div>
    </div>
  )
}

// ── Monthly calendar ──────────────────────────────────────────────

function MonthCalendar({ transactions, dailyQuota }) {
  const today      = new Date()
  const todayStr   = todayISO()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const paydayStr  = endOfMonth.toISOString().slice(0, 10)

  const days = []
  const d = new Date(today)
  while (d <= endOfMonth) {
    const ds    = d.toISOString().slice(0, 10)
    const spent = transactions.filter(t => t.date === ds).reduce((s, t) => s + +t.amount, 0)
    days.push({
      ds,
      label:     `${d.getDate()}/${today.getMonth() + 1}`,
      isToday:   ds === todayStr,
      isPayday:  ds === paydayStr,
      spent,
      remaining: ds === paydayStr ? null : dailyQuota - spent,
    })
    d.setDate(d.getDate() + 1)
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.calHead}>
        <span>Дата</span>
        <span>Похарчено</span>
        <span>Остатък</span>
      </div>
      {days.map(day => (
        <div
          key={day.ds}
          className={[
            styles.calRow,
            day.isToday  ? styles.calToday  : '',
            day.isPayday ? styles.calPayday : '',
          ].join(' ')}
        >
          <span className={styles.calDate}>{day.label}</span>
          <span className={styles.calSpent}>
            {day.isPayday ? '—' : day.spent > 0 ? `${fmt(day.spent)} лв.` : '—'}
          </span>
          <span className={`${styles.calRem} ${day.remaining !== null && day.remaining < 0 ? styles.calRemNeg : ''}`}>
            {day.isPayday
              ? <span className={styles.salary}>ЗАПЛАТА ↑</span>
              : `${day.remaining >= 0 ? '' : '−'}${fmt(day.remaining)} лв.`
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main Budget page ──────────────────────────────────────────────

export default function Budget() {
  const { config, transactions, loading, upsertConfig, addTransaction, deleteTransaction } = useBudget()
  const [view,         setView]         = useState('dashboard')
  const [showCalendar, setShowCalendar] = useState(false)

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <span className={styles.loadingDot} />
      </div>
    )
  }

  if (!config || view === 'setup') {
    return (
      <SetupView
        existing={config}
        onSave={async data => { await upsertConfig(data); setView('dashboard') }}
        onBack={config ? () => setView('dashboard') : null}
      />
    )
  }

  // ── Calculations ──
  const today      = new Date()
  const todayStr   = todayISO()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  // Days to budget: includes today, excludes last day (payday)
  // e.g. today=25 June, last=30 June → 30-25 = 5 days (25,26,27,28,29)
  const daysToEnd   = endOfMonth.getDate() - today.getDate()
  const totalPlan   = (config.planned_expenses ?? []).reduce((s, e) => s + +e.amount, 0)
  const bufferAmt   = config.budget_amount * config.buffer_pct
  const available   = config.budget_amount - totalPlan - bufferAmt
  const dailyQuota  = daysToEnd > 0 ? available / daysToEnd : available

  const spentToday  = transactions.filter(t => t.date === todayStr).reduce((s, t) => s + +t.amount, 0)
  const remaining   = dailyQuota - spentToday

  // Group by date for list
  const byDate = {}
  transactions.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const monthName = today.toLocaleString('bg-BG', { month: 'long' })

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>БЮДЖЕТ</h1>
        <button className={styles.settingsBtn} onClick={() => setView('setup')} type="button" aria-label="Настройки">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Hero — remaining today */}
      <div className={`${styles.hero} ${remaining < 0 ? styles.heroNeg : ''}`}>
        <div className={styles.heroAmt}>
          {remaining < 0 ? '−' : ''}{fmt(remaining)}
          <span className={styles.heroCurrency}> лв.</span>
        </div>
        <div className={styles.heroLabel}>остават за днес</div>
      </div>

      {/* Stats strip */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statAmt}>{fmt(dailyQuota)}</span>
          <span className={styles.statLbl}>квота / ден</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statAmt}>{fmt(spentToday)}</span>
          <span className={styles.statLbl}>похарчено</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statAmt}>{daysToEnd}</span>
          <span className={styles.statLbl}>дни до края</span>
        </div>
      </div>

      {/* Add transaction */}
      <AddForm onAdd={addTransaction} />

      {/* Monthly plan toggle */}
      <button className={styles.calToggle} onClick={() => setShowCalendar(v => !v)} type="button">
        <span>{showCalendar ? '↑ Скрий плана' : '↓ Месечен план'}</span>
        <span className={styles.calToggleMonth}>{monthName.toUpperCase()}</span>
      </button>

      {showCalendar && (
        <MonthCalendar transactions={transactions} dailyQuota={dailyQuota} />
      )}

      {/* Transaction list */}
      {sortedDates.length > 0 ? (
        <div className={styles.txnList}>
          {sortedDates.map(date => {
            const isToday  = date === todayStr
            const dateLabel = isToday
              ? 'ДНЕС'
              : new Date(date + 'T12:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' }).toUpperCase()
            const dayTotal = byDate[date].reduce((s, t) => s + +t.amount, 0)
            return (
              <div key={date} className={styles.txnGroup}>
                <div className={styles.txnGroupHdr}>
                  <span className={styles.txnDate}>{dateLabel}</span>
                  <span className={styles.txnDayTotal}>{fmt(dayTotal)} лв.</span>
                </div>
                {byDate[date].map(txn => (
                  <div key={txn.id} className={styles.txnRow}>
                    <span className={styles.txnDesc}>{txn.description || '—'}</span>
                    <span className={styles.txnAmt}>{fmt(txn.amount)} лв.</span>
                    <button
                      className={styles.txnDel}
                      onClick={() => deleteTransaction(txn.id)}
                      type="button"
                      aria-label="Изтрий"
                    >×</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        <p className={styles.empty}>Няма разходи за {monthName}</p>
      )}
    </div>
  )
}
