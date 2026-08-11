import { useState, useMemo } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import styles from './DraftMode.module.css'

const MACROS = [
  { key: 'protein', label: 'Протеин', short: 'П', color: '#42A5F5', kcalPerG: 4 },
  { key: 'carbs',   label: 'Въглехидрати', short: 'В', color: '#66BB6A', kcalPerG: 4 },
  { key: 'fat',     label: 'Мазнини', short: 'М', color: '#CE93D8', kcalPerG: 9 },
]

/** Donut of where the planned calories come from. */
function MacroDonut({ totals, size = 132 }) {
  const parts = MACROS.map(m => ({ ...m, kcal: (totals[m.key] || 0) * m.kcalPerG }))
  const sum = parts.reduce((a, p) => a + p.kcal, 0)
  const r = size / 2 - 11
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
      {sum > 0 && parts.map(p => {
        const frac = p.kcal / sum
        const dash = frac * circ
        const el = (
          <circle
            key={p.key}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={p.color} strokeWidth="11"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray .45s ease, stroke-dashoffset .45s ease' }}
          />
        )
        offset += dash
        return el
      })}
      <text x="50%" y="47%" textAnchor="middle" fill="var(--text)"
            fontFamily="var(--font-heading)" fontSize="26">{Math.round(totals.kcal || 0)}</text>
      <text x="50%" y="62%" textAnchor="middle" fill="var(--muted)"
            fontFamily="var(--font-body)" fontSize="9" letterSpacing="1.6">ККАЛ</text>
    </svg>
  )
}

/**
 * A scratchpad for a meal you are thinking about eating. Nothing here counts
 * until it is pushed to the log, so it can be edited freely.
 */
export default function DraftMode({ onAddRaw, totals = {}, targets = {} }) {
  const [items, setItems] = useLocalStorage('blag_draft_v1', [])
  const [form, setForm] = useState({ name: '', grams: '100', kcal: '', protein: '', carbs: '', fat: '' })
  const [pushed, setPushed] = useState(false)

  const draft = useMemo(() => items.reduce((a, i) => ({
    kcal:    a.kcal    + (+i.kcal    || 0),
    protein: a.protein + (+i.protein || 0),
    carbs:   a.carbs   + (+i.carbs   || 0),
    fat:     a.fat     + (+i.fat     || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [items])

  // What the day looks like if this draft is eaten — the number that matters.
  const projected = {
    kcal:    (totals.kcal    || 0) + draft.kcal,
    protein: (totals.protein || 0) + draft.protein,
    carbs:   (totals.carbs   || 0) + draft.carbs,
    fat:     (totals.fat     || 0) + draft.fat,
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function add(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setItems(prev => [...prev, {
      id: Date.now(),
      name: form.name.trim(),
      grams:   Math.round(+form.grams || 0),
      kcal:    Math.round(+form.kcal || 0),
      protein: Math.round((+form.protein || 0) * 10) / 10,
      carbs:   Math.round((+form.carbs   || 0) * 10) / 10,
      fat:     Math.round((+form.fat     || 0) * 10) / 10,
    }])
    setForm({ name: '', grams: '100', kcal: '', protein: '', carbs: '', fat: '' })
    setPushed(false)
  }

  function remove(id) {
    setItems(prev => prev.filter(i => i.id !== id))
    setPushed(false)
  }

  function pushToLog() {
    items.forEach(i => onAddRaw({
      name: i.name, grams: i.grams, kcal: i.kcal,
      protein: i.protein, carbs: i.carbs, fat: i.fat,
    }))
    setItems([])
    setPushed(true)
    setTimeout(() => setPushed(false), 2600)
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Нахвърляй какво мислиш да ядеш. Нищо не влиза в дневника, докато не го пренесеш.
      </p>

      <form className={styles.form} onSubmit={add}>
        <div className={styles.rowTop}>
          <input
            className={styles.nameInput}
            placeholder="Какво мислиш да ядеш?"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            aria-label="Име"
          />
          <input
            className={styles.gramsInput}
            type="number" min="1" inputMode="numeric"
            value={form.grams}
            onChange={e => set('grams', e.target.value)}
            aria-label="Грамаж"
          />
          <span className={styles.gUnit}>g</span>
        </div>

        <div className={styles.macroRow}>
          <label className={styles.macroField}>
            <span className={styles.macroTag} style={{ color: '#ffb74d' }}>ККАЛ</span>
            <input type="number" min="0" inputMode="numeric" value={form.kcal}
                   onChange={e => set('kcal', e.target.value)} placeholder="0" />
          </label>
          {MACROS.map(m => (
            <label className={styles.macroField} key={m.key}>
              <span className={styles.macroTag} style={{ color: m.color }}>{m.short}</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" value={form[m.key]}
                     onChange={e => set(m.key, e.target.value)} placeholder="0" />
            </label>
          ))}
        </div>

        <button className={styles.addBtn} type="submit">+ Добави в черновата</button>
      </form>

      {items.length === 0 ? (
        <p className={styles.empty}>Черновата е празна.</p>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map(i => (
              <li key={i.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{i.name}</span>
                  <span className={styles.itemMacros}>
                    {i.grams}g · {i.kcal} ккал · П{i.protein} В{i.carbs} М{i.fat}
                  </span>
                </div>
                <button className={styles.removeBtn} onClick={() => remove(i.id)}
                        type="button" aria-label={`Премахни ${i.name}`}>×</button>
              </li>
            ))}
          </ul>

          <div className={styles.summary}>
            <MacroDonut totals={draft} />
            <div className={styles.legend}>
              {MACROS.map(m => (
                <div className={styles.legendRow} key={m.key}>
                  <span className={styles.legendDot} style={{ background: m.color }} />
                  <span className={styles.legendLabel}>{m.label}</span>
                  <span className={styles.legendVal}>{Math.round(draft[m.key] * 10) / 10}g</span>
                </div>
              ))}
            </div>
          </div>

          {targets.kcal > 0 && (
            <div className={styles.projection}>
              <span className={styles.projLabel}>С тази чернова за деня</span>
              <div className={styles.projBars}>
                {[
                  { k: 'kcal',    label: 'Ккал', color: '#ffb74d' },
                  { k: 'protein', label: 'П',    color: '#42A5F5' },
                  { k: 'carbs',   label: 'В',    color: '#66BB6A' },
                  { k: 'fat',     label: 'М',    color: '#CE93D8' },
                ].map(({ k, label, color }) => {
                  const t = targets[k] || 0
                  const now = totals[k] || 0
                  const pctNow = t ? Math.min(now / t, 1) * 100 : 0
                  const pctAdd = t ? Math.min(draft[k] / t, Math.max(0, 1 - now / t)) * 100 : 0
                  const over = t && projected[k] > t
                  return (
                    <div className={styles.projRow} key={k}>
                      <span className={styles.projName}>{label}</span>
                      <div className={styles.projTrack}>
                        <div className={styles.projNow} style={{ width: `${pctNow}%`, background: color }} />
                        <div className={styles.projAdd} style={{ width: `${pctAdd}%`, background: color }} />
                      </div>
                      <span className={styles.projVal} style={{ color: over ? '#ef5350' : 'var(--muted)' }}>
                        {Math.round(projected[k])}/{Math.round(t)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button className={styles.pushBtn} onClick={pushToLog} type="button">
            Пренеси в дневника →
          </button>
        </>
      )}

      {pushed && <p className={styles.pushed}>✓ Пренесено в дневника</p>}
    </div>
  )
}
