import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
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
  const [hits, setHits] = useState([])       // history matches for the typed name
  const [picked, setPicked] = useState(null) // the history row the macros came from
  // Reference portion behind the current macros. Present only while the figures
  // came from history, which is what makes rescaling by grams meaningful.
  const [base, setBase] = useState(null)
  const searchTimer = useRef(null)

  // Look the typed name up in the food history so the macros do not have to be
  // typed again for anything eaten before.
  useEffect(() => {
    const q = form.name.trim()
    clearTimeout(searchTimer.current)
    if (q.length < 2 || picked === q.toLowerCase()) { setHits([]); return }
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase.rpc('food_history', { search: q })
      setHits((data ?? []).slice(0, 5))
    }, 240)
    return () => clearTimeout(searchTimer.current)
  }, [form.name, picked])

  function useHit(h) {
    const g = Math.round(h.grams) || 100
    setForm({
      name:    h.name,
      grams:   String(g),
      kcal:    String(h.kcal),
      protein: String(h.protein),
      carbs:   String(h.carbs),
      fat:     String(h.fat),
    })
    setBase({
      grams: g,
      kcal:    +h.kcal    || 0,
      protein: +h.protein || 0,
      carbs:   +h.carbs   || 0,
      fat:     +h.fat     || 0,
    })
    setPicked(h.name.toLowerCase())
    setHits([])
  }

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

  /** Changing the portion rescales macros taken from history. */
  function setGrams(v) {
    const g = parseFloat(v)
    setForm(p => {
      if (!base?.grams || !g || g <= 0) return { ...p, grams: v }
      const r = g / base.grams
      return {
        ...p,
        grams:   v,
        kcal:    String(Math.round(base.kcal * r)),
        protein: String(Math.round(base.protein * r * 10) / 10),
        carbs:   String(Math.round(base.carbs   * r * 10) / 10),
        fat:     String(Math.round(base.fat     * r * 10) / 10),
      }
    })
  }

  /** A hand-corrected macro becomes the new reference for the current portion,
   *  so later changes of grams scale from the corrected figure. */
  function setMacro(k, v) {
    setForm(p => ({ ...p, [k]: v }))
    const g = parseFloat(form.grams)
    if (base && g > 0) setBase(b => ({ ...b, grams: g, [k]: parseFloat(v) || 0 }))
  }

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
    setBase(null)
    setPicked(null)
    setHits([])
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
            onChange={e => setGrams(e.target.value)}
            aria-label="Грамаж"
          />
          <span className={styles.gUnit}>g</span>
        </div>

        {hits.length > 0 && (
          <ul className={styles.hits}>
            {hits.map(h => (
              <li key={h.name}>
                <button className={styles.hit} onClick={() => useHit(h)} type="button">
                  <span className={styles.hitName}>{h.name}</span>
                  <span className={styles.hitMacros}>
                    {Math.round(h.grams)}g · {h.kcal} ккал
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.macroRow}>
          <label className={styles.macroField}>
            <span className={styles.macroTag} style={{ color: 'var(--accent)' }}>ККАЛ</span>
            <input type="number" min="0" inputMode="numeric" value={form.kcal}
                   onChange={e => setMacro('kcal', e.target.value)} placeholder="0" />
          </label>
          {MACROS.map(m => (
            <label className={styles.macroField} key={m.key}>
              <span className={styles.macroTag} style={{ color: m.color }}>{m.short}</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" value={form[m.key]}
                     onChange={e => setMacro(m.key, e.target.value)} placeholder="0" />
            </label>
          ))}
        </div>

        <button className={styles.addBtn} type="submit">+ Добави в черновата</button>
      </form>

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
              { k: 'kcal',    label: 'Ккал', color: 'var(--accent)' },
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

          <button className={styles.pushBtn} onClick={pushToLog} type="button">
            Пренеси в дневника →
          </button>
        </>
      )}

      {pushed && <p className={styles.pushed}>✓ Пренесено в дневника</p>}
    </div>
  )
}
