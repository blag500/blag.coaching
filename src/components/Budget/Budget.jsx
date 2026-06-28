import { useState, useRef } from 'react'
import { useBudget, monthStart, nextMonthStart, prevMonthStart } from '../../hooks/useBudget'
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

function monthLabel(m) {
  return new Date(m + 'T12:00').toLocaleString('bg-BG', { month: 'long', year: 'numeric' }).toUpperCase()
}

// ── Setup view ────────────────────────────────────────────────────

function SetupView({ existing, onSave, onBack, currency, sym, disp, toBGN, selectedMonth }) {
  const [budgetAmt, setBudgetAmt] = useState(
    existing?.budget_amount ? String(Math.round(disp(existing.budget_amount) * 100) / 100) : ''
  )
  const [bufferPct, setBufferPct] = useState(existing ? existing.buffer_pct * 100 : 10)
  const [savingsAmt, setSavingsAmt] = useState(
    existing?.savings_amount ? String(Math.round(disp(existing.savings_amount) * 100) / 100) : ''
  )
  const [expenses, setExpenses] = useState(
    existing?.planned_expenses?.length
      ? existing.planned_expenses.map(e => ({
          name:   e.name,
          amount: String(Math.round(disp(e.amount) * 100) / 100),
          note:   e.note || '',
        }))
      : [{ name: '', amount: '', note: '' }]
  )
  const [saving, setSaving] = useState(false)

  function addExpense()            { setExpenses(p => [...p, { name: '', amount: '', note: '' }]) }
  function removeExpense(i)        { setExpenses(p => p.filter((_, j) => j !== i)) }
  function setField(i, k, v)       { setExpenses(p => p.map((e, j) => j === i ? { ...e, [k]: v } : e)) }

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
      savings_amount:   toBGN(parseFloat(savingsAmt) || 0),
      planned_expenses: expenses
        .filter(e => Number(e.amount) > 0)
        .map(e => ({
          name:   e.name || 'Разход',
          amount: toBGN(parseFloat(e.amount)),
          note:   e.note.trim(),
        })),
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

      <div className={styles.setupMonthLabel}>{monthLabel(selectedMonth)}</div>

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
        <label className={styles.label}>Спестявания / краен резерв ({sym})</label>
        <input
          className={styles.input}
          type="number" inputMode="decimal" step="0.01" min="0"
          value={savingsAmt}
          onChange={e => setSavingsAmt(e.target.value)}
          placeholder="0.00"
        />
        <p className={styles.hint}>Не влиза в дневната квота — показва се само при нужда</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.label}>Планирани разходи</span>
          <button className={styles.ghostBtn} onClick={addExpense} type="button">+ Добави</button>
        </div>
        {expenses.map((exp, i) => (
          <div key={i} className={styles.expenseItem}>
            <div className={styles.expenseRow}>
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
            <input
              className={`${styles.input} ${styles.noteInput}`}
              type="text"
              placeholder="Бележка (незадължително)"
              value={exp.note}
              onChange={e => setField(i, 'note', e.target.value)}
            />
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

function AddForm({ onAdd, sym, toBGN, defaultDate }) {
  const [date,   setDate]   = useState(defaultDate || todayISO())
  const [desc,   setDesc]   = useState('')
  const [amount, setAmount] = useState('')
  const amtRef = useRef(null)

  async function handleAdd() {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    await onAdd({ date, description: desc.trim() || null, amount: toBGN(parsed) })
    setDesc('')
    setAmount('')
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

function MonthCalendar({ transactions, dailyQuota, disp, sym, selectedMonth }) {
  const today       = new Date()
  const todayStr    = todayISO()
  const isCurrentM  = selectedMonth === monthStart()
  const selDate     = new Date(selectedMonth + 'T12:00')
  const endOfMonth  = new Date(selDate.getFullYear(), selDate.getMonth() + 1, 0)
  const paydayStr   = localISO(endOfMonth)

  const days = []
  const startDate = isCurrentM
    ? new Date(today)
    : new Date(selDate.getFullYear(), selDate.getMonth(), 1)
  const d = new Date(startDate)
  while (d <= endOfMonth) {
    const ds    = localISO(d)
    const spent = transactions.filter(t => t.date === ds).reduce((s, t) => s + +t.amount, 0)
    days.push({
      ds,
      label:     `${d.getDate()}/${selDate.getMonth() + 1}`,
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

function SpendingChart({ transactions, dailyQuota, disp, sym, selectedMonth }) {
  const today      = new Date()
  const todayStr   = localISO(today)
  const isCurrentM = selectedMonth === monthStart()
  const selDate    = new Date(selectedMonth + 'T12:00')
  const first      = new Date(selDate.getFullYear(), selDate.getMonth(), 1)
  const endOfMonth = new Date(selDate.getFullYear(), selDate.getMonth() + 1, 0)
  const lastDay    = isCurrentM ? today : endOfMonth

  const days = []
  const d = new Date(first)
  while (d <= lastDay) {
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

  const maxVal     = Math.max(...days.map(d => d.spent), dailyQuota) * 1.25
  const step       = cW / days.length
  const barW       = Math.max(step * 0.6, 1.5)
  const toY        = v => PAD.top + cH * (1 - v / maxVal)
  const quotaY     = toY(dailyQuota)
  const labelEvery = Math.ceil(days.length / 7)

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartTitle}>Разходи по дни • {sym}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <line
          x1={PAD.left} y1={PAD.top + cH}
          x2={PAD.left + cW} y2={PAD.top + cH}
          stroke="rgba(242,232,207,0.08)" strokeWidth="1"
        />
        <line
          x1={PAD.left} y1={quotaY}
          x2={PAD.left + cW} y2={quotaY}
          stroke="rgba(255,183,77,0.4)" strokeWidth="1" strokeDasharray="4,3"
        />
        <text
          x={PAD.left - 4} y={quotaY + 3}
          textAnchor="end" fontSize="7" fill="rgba(255,183,77,0.6)"
          fontFamily="monospace"
        >
          {fmt(disp(dailyQuota))}
        </text>
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
              {day.spent === 0 && (
                <rect x={bx} y={PAD.top} width={barW} height={cH} fill="rgba(242,232,207,0.04)" rx="2" />
              )}
              <rect
                x={bx} y={bH > 0 ? by : PAD.top + cH - 1}
                width={barW} height={Math.max(bH, 1)} rx="2"
                fill={fill} opacity={day.isToday ? 1 : 0.82}
              />
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
  const currentMonthStr = monthStart()
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr)
  const { config, transactions, loading, upsertConfig, addTransaction, deleteTransaction } = useBudget(selectedMonth)
  const [view,         setView]         = useState('dashboard')
  const [showCalendar, setShowCalendar] = useState(false)
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('budget_currency') || 'BGN'
  )

  const sym   = currency === 'EUR' ? '€' : 'лв.'
  const disp  = (bgn) => currency === 'EUR' ? bgn / RATE : bgn
  const toBGN = (n)   => currency === 'EUR' ? n * RATE   : n

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
        selectedMonth={selectedMonth}
      />
    )
  }

  // ── Calculations (all in BGN) ──
  const today          = new Date()
  const todayStr       = todayISO()
  const isCurrentMonth = selectedMonth === currentMonthStr
  const selDate        = new Date(selectedMonth + 'T12:00')
  const endOfMonth     = new Date(selDate.getFullYear(), selDate.getMonth() + 1, 0)
  const totalDays      = endOfMonth.getDate()
  const daysToEnd      = isCurrentMonth
    ? endOfMonth.getDate() - today.getDate()
    : totalDays

  const totalPlan  = (config.planned_expenses ?? []).reduce((s, e) => s + +e.amount, 0)
  const bufferAmt  = config.budget_amount * config.buffer_pct
  const available  = config.budget_amount - totalPlan - bufferAmt
  const dailyQuota = daysToEnd > 0 ? available / daysToEnd : available

  const spentToday = isCurrentMonth
    ? transactions.filter(t => t.date === todayStr).reduce((s, t) => s + +t.amount, 0)
    : 0
  const totalSpent = transactions.reduce((s, t) => s + +t.amount, 0)

  const heroValue = isCurrentMonth ? dailyQuota - spentToday : available - totalSpent
  const heroLabel = isCurrentMonth
    ? 'остават за днес'
    : heroValue >= 0 ? 'остатък за месеца' : 'превишен бюджет'
  const isNeg = heroValue < 0

  const savings = config.savings_amount ?? 0

  const byDate = {}
  transactions.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const sortedDates  = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  const selMonthName = selDate.toLocaleString('bg-BG', { month: 'long' })
  const defaultAddDate = isCurrentMonth ? todayISO() : selectedMonth

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>БЮДЖЕТ</h1>
        <div className={styles.headerActions}>
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

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button className={styles.monthNavBtn} onClick={() => setSelectedMonth(prevMonthStart(selectedMonth))} type="button">←</button>
        <span className={styles.monthNavLabel}>{monthLabel(selectedMonth)}</span>
        <button className={styles.monthNavBtn} onClick={() => setSelectedMonth(nextMonthStart(selectedMonth))} type="button">→</button>
      </div>

      {/* Hero */}
      <div className={`${styles.hero} ${isNeg ? styles.heroNeg : ''}`}>
        <div className={styles.heroAmt}>
          {isNeg ? '−' : ''}{fmt(disp(heroValue))}
          <span className={styles.heroCurrency}> {sym}</span>
        </div>
        <div className={styles.heroLabel}>{heroLabel}</div>
      </div>

      {/* Stats strip */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statAmt}>{fmt(disp(dailyQuota))}</span>
          <span className={styles.statLbl}>квота / ден</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statAmt}>{fmt(disp(isCurrentMonth ? spentToday : totalSpent))}</span>
          <span className={styles.statLbl}>{isCurrentMonth ? 'похарчено' : 'похарчено общо'}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statAmt}>{isCurrentMonth ? daysToEnd : totalDays}</span>
          <span className={styles.statLbl}>{isCurrentMonth ? 'дни до края' : 'дни в месеца'}</span>
        </div>
      </div>

      {/* Planned expenses */}
      {(config.planned_expenses ?? []).length > 0 && (
        <div className={styles.plannedWrap}>
          <div className={styles.plannedHdr}>
            <span className={styles.plannedTitle}>ПЛАНИРАНИ РАЗХОДИ</span>
            <div className={styles.plannedHdrRight}>
              <span className={styles.plannedTotal}>{fmt(disp(totalPlan))} {sym}</span>
              <button className={styles.plannedEditBtn} onClick={() => setView('setup')} type="button">✎</button>
            </div>
          </div>
          {(config.planned_expenses ?? []).map((e, i) => (
            <div key={i} className={styles.plannedRow}>
              <div className={styles.plannedInfo}>
                <span className={styles.plannedName}>{e.name}</span>
                {e.note && <span className={styles.plannedNote}>{e.note}</span>}
              </div>
              <span className={styles.plannedAmt}>{fmt(disp(e.amount))} {sym}</span>
            </div>
          ))}
        </div>
      )}

      {/* Savings / emergency reserve */}
      {savings > 0 && (
        <div className={`${styles.savingsCard} ${isNeg ? styles.savingsAlert : ''}`}>
          <div className={styles.savingsInfo}>
            <span className={styles.savingsLabel}>КРАЕН РЕЗЕРВ</span>
            {isNeg && <span className={styles.savingsHint}>бюджетът е изчерпан</span>}
          </div>
          <span className={styles.savingsAmt}>{fmt(disp(savings))} {sym}</span>
        </div>
      )}

      {/* Spending chart */}
      <SpendingChart
        transactions={transactions}
        dailyQuota={dailyQuota}
        disp={disp}
        sym={sym}
        selectedMonth={selectedMonth}
      />

      {/* Add transaction */}
      <AddForm
        key={selectedMonth}
        onAdd={addTransaction}
        sym={sym}
        toBGN={toBGN}
        defaultDate={defaultAddDate}
      />

      {/* Monthly plan toggle */}
      <div
        className={styles.calToggle}
        onClick={() => setShowCalendar(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowCalendar(v => !v)}
      >
        <span>{showCalendar ? '↑ Скрий плана' : '↓ Месечен план'}</span>
        <span className={styles.calToggleMonth}>{selMonthName.toUpperCase()}</span>
      </div>

      {showCalendar && (
        <MonthCalendar
          transactions={transactions}
          dailyQuota={dailyQuota}
          disp={disp}
          sym={sym}
          selectedMonth={selectedMonth}
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
        <p className={styles.empty}>Няма разходи за {selMonthName}</p>
      )}
    </div>
  )
}
