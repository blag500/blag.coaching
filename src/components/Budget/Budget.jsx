import { useState, useRef } from 'react'
import { useBudget } from '../../hooks/useBudget'
import styles from './Budget.module.css'

const RATE = 1.95583  // official fixed rate: 1 EUR = 1.95583 BGN

function fmt(n) {
  return Math.abs(Number(n)).toLocaleString('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function localISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayISO() {
  return localISO()
}

// ── Setup view ────────────────────────────────────────────────────

function SetupView({ existing, onSave, onBack, currency, sym, disp, toBGN }) {
  const [budgetAmt, setBudgetAmt] = useState(
    existing ? String(Math.round(disp(existing.budget_amount) * 100) / 100) : ''
  )
  const [bufferPct, setBufferPct] = useState(existing ? existing.buffer_pct * 100 : 10)
  const [expenses, setExpenses]   = useState(
    existing?.planned_expenses?.length
      ? existing.planned_expenses.map(e => ({ name: e.name, amount: String(Math.round(disp(e.amount) * 100) / 100) }))
      : [{ name: '', amount: '' }]
  )
  const [saving, setSaving] = useState(false)

  function addExpense()       { setExpenses(p => [...p, { name: '', amount: '' }]) }
  function removeExpense(i)   { setExpenses(p => p.filter((_, j) => j !== i)) }
  function setField(i, k, v)  { setExpenses(p => p.map((e, j) => j === i ? { ...e, [k]: v } : e)) }

  const budgetNum  = parseFloat(budgetAmt) || 0
  const bufferNum  = parseFloat(bufferPct) || 0
  const bufferDisp = budgetNum * bufferNum / 100
  const totalPlan  = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  async function handleSave() {
    if (!budgetAmt) return
    setSaving(true)
    await onSave({
      budget_amount:    toBGN(parseFloat(budgetAmt)),
      buffer_pct:       bufferNum / 100,
      planned_expenses: expenses
        .filter(e => Number(e.amount) > 0)
        .map(e => ({ name: e.name || 'Разход', amount: toBGN(parseFloat(e.amount)) })),
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
        <span className={styles.currencyBadge}>{sym}</span>
      </div>

      <div className={styles.card}>
        <label className={styles.label}>Оставащ бюджет за месеца ({sym})</label>
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
        <p className={styles.hint}>Резервирани: {fmt(bufferDisp)} {sym}</p>
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
          <p className={styles.hint}>Общо планирани: {fmt(totalPlan)} {sym}</p>
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

function AddForm({ onAdd, sym, toBGN }) {
  const [date,   setDate]   = useState(todayISO())
  const [desc,   setDesc]   = useState('')
  const [amount, setAmount] = useState('')
  const amtRef = useRef(null)

  async function handleAdd() {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    await onAdd({ date, description: desc.trim() || null, amount: toBGN(parsed) })
    setDesc('')
    setAmount('')
    setDate(todayISO())
    amtRef.current?.focus()
  }

  return (
    <div className={styles.addForm}>
      <input
        className={styles.input}
        type="text"
        placeholder="Кафе, обяд, транспорт..."
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && amtRef.current?.focus()}
      />
      <div className={styles.addRow}>
        <input
          ref={amtRef}
          className={`${styles.input} ${styles.inputFlex}`}
          type="number" inputMode="decimal" step="0.01" min="0"
          placeholder={`0,00 ${sym}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
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
      <input
        className={`${styles.input} ${styles.dateInput}`}
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
    </div>
  )
}

// ── Monthly calendar ──────────────────────────────────────────────

function MonthCalendar({ transactions, dailyQuota, disp, sym }) {
  const today      = new Date()
  const todayStr   = todayISO()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const paydayStr  = localISO(endOfMonth)

  const days = []
  const d = new Date(today)
  while (d <= endOfMonth) {
    const ds    = localISO(d)
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
            {day.isPayday ? '—' : day.spent > 0 ? `${fmt(disp(day.spent))} ${sym}` : '—'}
          </span>
          <span className={`${styles.calRem} ${day.remaining !== null && day.remaining < 0 ? styles.calRemNeg : ''}`}>
            {day.isPayday
              ? <span className={styles.salary}>ЗАПЛАТА ↑</span>
              : `${day.remaining >= 0 ? '' : '−'}${fmt(disp(day.remaining))} ${sym}`
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Spending bar chart ────────────────────────────────────────────

function SpendingChart({ transactions, dailyQuota, disp, sym }) {
  const today    = new Date()
  const todayStr = localISO(today)
  const first    = new Date(today.getFullYear(), today.getMonth(), 1)

  // One entry per day from 1st to today
  const days = []
  const d = new Date(first)
  while (d <= today) {
    const ds    = localISO(d)
    const spent = transactions.filter(t => t.date === ds).reduce((s, t) => s + +t.amount, 0)
    days.push({ ds, spent, day: d.getDate(), isToday: ds === todayStr })
    d.setDate(d.getDate() + 1)
  }

  if (!days.length || dailyQuota <= 0) return null

  const W = 320, H = 110
  const PAD = { top: 8, right: 10, bottom: 20, left: 38 }
  const cW  = W - PAD.left - PAD.right
  const cH  = H - PAD.top  - PAD.bottom

  const maxVal  = Math.max(...days.map(d => d.spent), dailyQuota) * 1.25
  const step    = cW / days.length
  const barW    = Math.max(step * 0.6, 1.5)
  const toY     = v => PAD.top + cH * (1 - v / maxVal)
  const quotaY  = toY(dailyQuota)

  // Y-axis reference labels: 0 and quota
  const yLabels = [
    { v: dailyQuota, label: fmt(disp(dailyQuota)) },
  ]

  // X label strategy: always show 1st, last (today), and evenly spaced
  const labelEvery = Math.ceil(days.length / 7)

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartTitle}>Разходи по дни • {sym}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>

        {/* Zero baseline */}
        <line
          x1={PAD.left} y1={PAD.top + cH}
          x2={PAD.left + cW} y2={PAD.top + cH}
          stroke="rgba(242,232,207,0.08)" strokeWidth="1"
        />

        {/* Quota reference line */}
        <line
          x1={PAD.left} y1={quotaY}
          x2={PAD.left + cW} y2={quotaY}
          stroke="rgba(255,183,77,0.4)" strokeWidth="1" strokeDasharray="4,3"
        />
        {/* Quota y-label */}
        <text
          x={PAD.left - 4} y={quotaY + 3}
          textAnchor="end" fontSize="7" fill="rgba(255,183,77,0.6)"
          fontFamily="monospace"
        >
          {fmt(disp(dailyQuota))}
        </text>

        {/* Bars */}
        {days.map((day, i) => {
          const cx   = PAD.left + i * step + step / 2
          const bx   = cx - barW / 2
          const bH   = (day.spent / maxVal) * cH
          const by   = PAD.top + cH - bH
          const fill = day.isToday
            ? 'var(--accent)'
            : day.spent === 0
              ? 'rgba(242,232,207,0.06)'
              : day.spent > dailyQuota
                ? '#ef5350'
                : '#4CAF50'
          const showLabel = i === 0 || i === days.length - 1 || day.isToday || i % labelEvery === 0

          return (
            <g key={day.ds}>
              {/* ghost bar when no spend — shows the grid */}
              {day.spent === 0 && (
                <rect
                  x={bx} y={PAD.top} width={barW} height={cH}
                  fill="rgba(242,232,207,0.04)" rx="2"
                />
              )}
              {/* actual spend bar */}
              <rect
                x={bx}
                y={bH > 0 ? by : PAD.top + cH - 1}
                width={barW}
                height={Math.max(bH, 1)}
                rx="2"
                fill={fill}
                opacity={day.isToday ? 1 : 0.82}
              />
              {/* x-axis label */}
              {showLabel && (
                <text
                  x={cx} y={H - 4}
                  textAnchor="middle" fontSize="7" fontFamily="monospace"
                  fill={day.isToday ? 'var(--accent)' : 'rgba(242,232,207,0.28)'}
                >
                  {day.day}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Main Budget page ──────────────────────────────────────────────

export default function Budget() {
  const { config, transactions, loading, upsertConfig, addTransaction, deleteTransaction } = useBudget()
  const [view,         setView]         = useState('dashboard')
  const [showCalendar, setShowCalendar] = useState(false)
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('budget_currency') || 'BGN'
  )

  // All stored values are in BGN. These helpers convert for display/input.
  const sym  = currency === 'EUR' ? '€' : 'лв.'
  const disp = (bgn) => currency === 'EUR' ? bgn / RATE : bgn
  const toBGN = (n)  => currency === 'EUR' ? n * RATE   : n

  function toggleCurrency() {
    const next = currency === 'BGN' ? 'EUR' : 'BGN'
    setCurrency(next)
    localStorage.setItem('budget_currency', next)
  }

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
        currency={currency} sym={sym} disp={disp} toBGN={toBGN}
      />
    )
  }

  // ── Calculations (all in BGN) ──
  const today      = new Date()
  const todayStr   = todayISO()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysToEnd  = endOfMonth.getDate() - today.getDate()

  const totalPlan  = (config.planned_expenses ?? []).reduce((s, e) => s + +e.amount, 0)
  const bufferAmt  = config.budget_amount * config.buffer_pct
  const available  = config.budget_amount - totalPlan - bufferAmt
  const dailyQuota = daysToEnd > 0 ? available / daysToEnd : available

  const spentToday = transactions.filter(t => t.date === todayStr).reduce((s, t) => s + +t.amount, 0)
  const remaining  = dailyQuota - spentToday

  const byDate = {}
  transactions.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  const monthName   = today.toLocaleString('bg-BG', { month: 'long' })

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>БЮДЖЕТ</h1>
        <div className={styles.headerActions}>
          {/* Currency toggle pill */}
          <button className={styles.currencyToggle} onClick={toggleCurrency} type="button" aria-label="Смяна на валута">
            <span className={currency === 'BGN' ? styles.currActive : styles.currInactive}>лв.</span>
            <span className={styles.currSep}>⇄</span>
            <span className={currency === 'EUR' ? styles.currActive : styles.currInactive}>€</span>
          </button>
          <button className={styles.settingsBtn} onClick={() => setView('setup')} type="button" aria-label="Настройки">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className={`${styles.hero} ${remaining < 0 ? styles.heroNeg : ''}`}>
        <div className={styles.heroAmt}>
          {remaining < 0 ? '−' : ''}{fmt(disp(remaining))}
          <span className={styles.heroCurrency}> {sym}</span>
        </div>
        <div className={styles.heroLabel}>остават за днес</div>
      </div>

      {/* Stats strip */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statAmt}>{fmt(disp(dailyQuota))}</span>
          <span className={styles.statLbl}>квота / ден</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statAmt}>{fmt(disp(spentToday))}</span>
          <span className={styles.statLbl}>похарчено</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statAmt}>{daysToEnd}</span>
          <span className={styles.statLbl}>дни до края</span>
        </div>
      </div>

      {/* Spending chart */}
      <SpendingChart
        transactions={transactions}
        dailyQuota={dailyQuota}
        disp={disp}
        sym={sym}
      />

      {/* Add transaction */}
      <AddForm onAdd={addTransaction} sym={sym} toBGN={toBGN} />

      {/* Monthly plan toggle */}
      <div
        className={styles.calToggle}
        onClick={() => setShowCalendar(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowCalendar(v => !v)}
      >
        <span>{showCalendar ? '↑ Скрий плана' : '↓ Месечен план'}</span>
        <span className={styles.calToggleMonth}>{monthName.toUpperCase()}</span>
      </div>

      {showCalendar && (
        <MonthCalendar
          transactions={transactions}
          dailyQuota={dailyQuota}
          disp={disp}
          sym={sym}
        />
      )}

      {/* Transaction list */}
      {sortedDates.length > 0 ? (
        <div className={styles.txnList}>
          {sortedDates.map(date => {
            const isToday   = date === todayStr
            const dateLabel = isToday
              ? 'ДНЕС'
              : new Date(date + 'T12:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' }).toUpperCase()
            const dayTotal  = byDate[date].reduce((s, t) => s + +t.amount, 0)
            return (
              <div key={date} className={styles.txnGroup}>
                <div className={styles.txnGroupHdr}>
                  <span className={styles.txnDate}>{dateLabel}</span>
                  <span className={styles.txnDayTotal}>{fmt(disp(dayTotal))} {sym}</span>
                </div>
                {byDate[date].map(txn => (
                  <div key={txn.id} className={styles.txnRow}>
                    <span className={styles.txnDesc}>{txn.description || '—'}</span>
                    <span className={styles.txnAmt}>{fmt(disp(txn.amount))} {sym}</span>
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
