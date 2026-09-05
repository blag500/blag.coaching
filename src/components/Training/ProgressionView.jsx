import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import BlockCompare from './BlockCompare'
import { useSettings } from '../../contexts/SettingsContext'
import { useExerciseAliases } from '../../hooks/useExerciseAliases'
import { haptic } from '../../lib/haptics'
import styles from './ProgressionView.module.css'

// ── Chart ────────────────────────────────────────────────────────────────────

const W = 300, H = 160
const PL = 40, PR = 10, PT = 14, PB = 26
const CW = W - PL - PR
const CH = H - PT - PB
const GRAD_ID = 'progGrad'

// Eight weeks is the block, so it is a range in its own right rather than
// something to approximate with "1 month" or "3 months".
const RANGES = [
  { key: '8W',  labelKey: 'pv.range8w',  days: 56  },
  { key: '3M',  labelKey: 'pv.range3m',  days: 90  },
  { key: 'ALL', labelKey: 'pv.rangeAll', days: null },
]

const PALETTE = ['var(--accent)', '#4FC3F7', '#ff8a65', '#81C784', '#CE93D8', '#80DEEA', '#FFAB91']
function blockColor(idx) { return PALETTE[idx % PALETTE.length] }

function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i]
    const cpx = (curr.x - prev.x) * 0.4
    d += ` C${prev.x + cpx},${prev.y} ${curr.x - cpx},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

// Epley's estimate, so a set that added reps counts as the progress it is.
// The chart plotted load alone, which drew a flat line through eight weeks of
// going from eight reps to twelve — see BlockCompare for the same reasoning.
export function e1RM(weight, reps) {
  if (!weight) return 0
  return Math.round(weight * (1 + (reps || 1) / 30) * 10) / 10
}

function ExerciseChart({ entries }) {
  const { t } = useSettings()
  const vals = entries.map(e => e1RM(e.weight, e.reps)).filter(w => w > 0)
  if (!vals.length) return <p className={styles.noData}>{t('pv.noWeight')}</p>

  const rawMin = Math.min(...vals), rawMax = Math.max(...vals)
  const pad    = Math.max((rawMax - rawMin) * 0.18, 1)
  const minVal = rawMin - pad, maxVal = rawMax + pad
  const rangeV = maxVal - minVal
  const ve     = entries.filter(e => e.weight > 0)
              .map(e => ({ ...e, plot: e1RM(e.weight, e.reps) }))

  function toX(i) { return PL + (i / Math.max(ve.length - 1, 1)) * CW }
  function toY(v) { return PT + (1 - (v - minVal) / rangeV) * CH }

  const pts      = ve.map((e, i) => ({ x: toX(i), y: toY(e.plot), ...e }))
  const last     = pts[pts.length - 1]
  const linePath = smoothPath(pts)
  const areaPath = ve.length > 1
    ? `${linePath} L${last.x},${H - PB} L${pts[0].x},${H - PB} Z`
    : null

  const yTicks  = [0, 1, 2, 3].map(i => ({ v: Math.round((minVal + (i / 3) * rangeV) * 10) / 10, y: toY(minVal + (i / 3) * rangeV) }))
  const n       = pts.length
  const xIdxs   = n <= 3 ? [...Array(n).keys()] : [0, Math.round((n - 1) / 2), n - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
      <defs>
        <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {yTicks.map(t => (
        <g key={t.v}>
          <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="var(--border)" strokeWidth="1" />
          <text x={PL - 5} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-body)">{t.v}</text>
        </g>
      ))}
      {xIdxs.map(idx => (
        <text key={idx} x={pts[idx].x} y={H - PB + 14} textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="var(--font-body)">
          {pts[idx].date?.slice(5)}
        </text>
      ))}
      {areaPath && <path d={areaPath} fill={`url(#${GRAD_ID})`} />}
      {ve.length > 1 && <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" />)}
      <text x={last.x} y={last.y - 9} textAnchor="middle" fontSize="10" fill="var(--accent)" fontFamily="var(--font-body)" fontWeight="bold">
        {last.weight}kg
      </text>
    </svg>
  )
}

// ── Editable table ───────────────────────────────────────────────────────────

function ExerciseTable({ entries, onDelete, onUpdate }) {
  const { t } = useSettings()
  const [editId, setEditId] = useState(null)
  const [draft,  setDraft]  = useState({})
  const [saving, setSaving] = useState(false)

  function startEdit(e) {
    setEditId(e.id)
    setDraft({
      weight: String(e.weight ?? ''),
      reps:   String(e.reps   ?? ''),
      sets:   String(e.sets   ?? ''),
      notes:  e.notes || '',
    })
  }

  async function saveEdit() {
    setSaving(true)
    const updates = {
      weight: draft.weight ? parseFloat(draft.weight) : null,
      reps:   draft.reps   ? parseInt(draft.reps)     : null,
      sets:   draft.sets   ? parseInt(draft.sets)     : null,
      notes:  draft.notes.trim() || null,
    }
    await onUpdate(editId, updates)
    setSaving(false)
    setEditId(null)
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>{t('pv.thDate')}</th>
            <th className={styles.th}>{t('pv.thWeight')}</th>
            <th className={styles.th}>{t('pv.thReps')}</th>
            <th className={styles.th}>{t('pv.thSets')}</th>
            <th className={styles.thNotes}>{t('pv.thNotes')}</th>
            <th className={styles.thAction} />
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) =>
            editId === e.id ? (
              <tr key={e.id} className={styles.trEdit}>
                <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>{e.date?.slice(5)}</td>
                <td className={styles.tdEdit}>
                  <input className={styles.editInput} type="number" min="0" step="0.5"
                    value={draft.weight} onChange={ev => setDraft(p => ({ ...p, weight: ev.target.value }))} />
                </td>
                <td className={styles.tdEdit}>
                  <input className={styles.editInput} type="number" min="0"
                    value={draft.reps} onChange={ev => setDraft(p => ({ ...p, reps: ev.target.value }))} />
                </td>
                <td className={styles.tdEdit}>
                  <input className={styles.editInput} type="number" min="0"
                    value={draft.sets} onChange={ev => setDraft(p => ({ ...p, sets: ev.target.value }))} />
                </td>
                <td className={styles.tdEdit}>
                  <input className={styles.editInput} type="text" placeholder={t('pv.notesPh')}
                    value={draft.notes} onChange={ev => setDraft(p => ({ ...p, notes: ev.target.value }))} />
                </td>
                <td className={styles.tdAction}>
                  <button className={styles.saveRowBtn} onClick={saveEdit} disabled={saving} type="button">✓</button>
                  <button className={styles.cancelRowBtn} onClick={() => setEditId(null)} type="button">✕</button>
                </td>
              </tr>
            ) : (
              <tr key={e.id ?? i} className={`${styles.tr} ${i === 0 ? styles.trLatest : ''}`}>
                <td className={styles.td}>{e.date}</td>
                <td className={styles.td}>{e.weight ? `${e.weight}kg` : '—'}</td>
                <td className={styles.td}>{e.reps ?? '—'}</td>
                <td className={styles.td}>{e.sets ?? '—'}</td>
                <td className={`${styles.td} ${styles.tdNotes}`}>{e.notes || '—'}</td>
                <td className={styles.tdAction}>
                  <button className={styles.editRowBtn} onClick={() => startEdit(e)} type="button" aria-label={t('pv.edit')}>✎</button>
                  <button className={styles.deleteRowBtn} onClick={() => onDelete(e.id)} type="button" aria-label={t('pv.delete')}>✕</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Level 2: progression for one exercise ────────────────────────────────────


/**
 * „Това е същото като…"
 *
 * Дневникът пази това, което е било написано в деня; тук се казва кои имена са
 * едно движение. Ръчно, защото автоматичното сливане по близко име рано или
 * късно слепва наклонена и равна лежанка — а сгрешено обединяване се забелязва
 * месеци по-късно, когато кривата вече е излъгала.
 */
function MergeBar({ name, allNames, blocks = [], mergedInto, onMerge, onUnmerge }) {
  const { t } = useSettings()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const absorbed = mergedInto?.(name) ?? []

  /* Списъкът, разделен на блокове.
     Плосък облак от всяко име, което някога е вписвано, става нечетим още на
     двайсетото упражнение — а въпросът „в кое да се влее" почти винаги има
     отговор в блока, от който идва другото име. Затова падащ списък с групи:
     блокът дава контекста, изборът е едно упражнение.
     Накрая стои група за онова, което не е в никой план — заместители,
     вписани в движение, и упражнения от стари програми. */
  const groups = useMemo(() => {
    const taken = new Set([name])
    const out = []
    const seen = new Set()
    for (const b of blocks ?? []) {
      const names = (b.exercises ?? [])
        .map(e => e.name)
        .filter(n => n && allNames.includes(n) && !taken.has(n) && !seen.has(n))
      for (const n of names) seen.add(n)
      if (names.length) out.push({ label: b.label, names })
    }
    const rest = allNames.filter(n => !taken.has(n) && !seen.has(n))
    if (rest.length) out.push({ label: t('pv.mergeOther'), names: rest })
    return out
  }, [allNames, blocks, name, t])

  const total = groups.reduce((n, g) => n + g.names.length, 0)

  async function run(fn) {
    setBusy(true)
    haptic('tap')
    await fn()
    setBusy(false)
    setOpen(false)
  }

  return (
    <div className={styles.mergeBar}>
      {absorbed.length > 0 && (
        <div className={styles.mergeList}>
          {absorbed.map(a => (
            <button
              key={a}
              type="button"
              className={styles.mergeChip}
              disabled={busy}
              onClick={() => run(() => onUnmerge?.(a))}
              title={t('pv.unmerge')}
            >
              {a} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {!open ? (
        total > 0 && (
          <button type="button" className={styles.mergeBtn} onClick={() => setOpen(true)}>
            {t('pv.mergeWith')}
          </button>
        )
      ) : (
        <div className={styles.mergePicker}>
          <span className={styles.mergeHint}>{t('pv.mergeHint', { name })}</span>
          <select
            className={styles.mergeSelect}
            defaultValue=""
            disabled={busy}
            onChange={e => { if (e.target.value) run(() => onMerge?.(name, e.target.value)) }}
            aria-label={t('pv.mergeHint', { name })}
          >
            <option value="">{t('pv.mergePick')}</option>
            {groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.names.map(n => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            ))}
          </select>
          <button type="button" className={styles.mergeCancel} onClick={() => setOpen(false)}>
            {t('pv.mergeCancel')}
          </button>
        </div>
      )}
    </div>
  )
}

function ExerciseProgression({ exerciseName, allLogs, onBack, blockLabel, onDelete, onUpdate, embedded, allNames = [], blocks = [], mergedInto, onMerge, onUnmerge }) {
  const { t } = useSettings()
  const [range, setRange] = useState('ALL')

  const chronoEntries = useMemo(() => {
    return (allLogs[exerciseName] || []).slice().sort((a, b) => a.date.localeCompare(b.date))
  }, [allLogs, exerciseName])

  const filtered = useMemo(() => {
    const r = RANGES.find(x => x.key === range)
    if (!r.days) return chronoEntries
    const cutoff = new Date(Date.now() - r.days * 86400000).toISOString().slice(0, 10)
    return chronoEntries.filter(e => e.date >= cutoff)
  }, [chronoEntries, range])

  const tableEntries = [...filtered].reverse()

  const withW = filtered.filter(e => e.weight > 0)
  const maxW  = withW.length ? Math.max(...withW.map(e => e.weight)) : null
  // Progress on what the sets were worth, not on what was on the bar: reps are
  // progression too, and measured on load alone they read as standing still.
  const diff  = withW.length >= 2
    ? +(e1RM(withW.at(-1).weight, withW.at(-1).reps) - e1RM(withW[0].weight, withW[0].reps)).toFixed(1)
    : null

  return (
    <div className={styles.wrap}>
      {!embedded && (
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} type="button" aria-label={t('pv.backTo', { name: blockLabel })}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
              <polyline points="15 6 9 12 15 18" />
            </svg>
          </button>
        </div>
      )}
      <h3 className={styles.exTitle}>{exerciseName}</h3>

      <MergeBar
        name={exerciseName}
        allNames={allNames}
        blocks={blocks}
        mergedInto={mergedInto}
        onMerge={onMerge}
        onUnmerge={onUnmerge}
      />

      <div className={styles.rangeBar}>
        {RANGES.map(r => (
          <button key={r.key}
            className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ''}`}
            onClick={() => setRange(r.key)} type="button">{t(r.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.noData}>{t('pv.noEntries')}</p>
      ) : (
        <>
          <div className={styles.chartWrap}><ExerciseChart entries={filtered} /></div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{filtered.length}</span>
              <span className={styles.statLabel}>{t('pv.statEntries')}</span>
            </div>
            {maxW != null && (
              <div className={styles.stat}>
                <span className={styles.statVal}>{maxW}kg</span>
                <span className={styles.statLabel}>{t('pv.statMaxWeight')}</span>
              </div>
            )}
            {diff != null && (
              <div className={styles.stat}>
                <span className={`${styles.statVal} ${diff > 0 ? styles.statUp : diff < 0 ? styles.statDown : ''}`}>
                  {diff > 0 ? `+${diff}` : diff}kg
                </span>
                <span className={styles.statLabel}>{t('pv.statProgress')}</span>
              </div>
            )}
          </div>

          {/* Said once, rather than leaving the reader to wonder why the line
              moved on a day the weight did not. */}
          <p className={styles.chartNote}>
            {t('pv.footnote')}
          </p>

          <ExerciseTable entries={tableEntries} onDelete={onDelete} onUpdate={onUpdate} />
        </>
      )}
    </div>
  )
}

// ── Level 1: exercises within a block ────────────────────────────────────────

function BlockExercises({ block, allLogs, onSelectExercise, onBack, completions = [], embedded }) {
  const { t } = useSettings()
  // Planned exercise names (lowercased for a case-tolerant contains check).
  const planned = new Set((block.exercises ?? []).map(e => e.name))

  // Dates this block was completed — used to attribute stray exercise logs
  // to it. If you swapped Preacher curl for "Hammer curl" on a day Upper A
  // was done, "Hammer curl" belongs here as a substitute lift so its own
  // progression is discoverable from the block that hosted it.
  const blockDates = new Set(
    completions
      .filter(c => c.block_label === block.label)
      .map(c => c.completed_date)
  )

  const substitutes = []
  if (blockDates.size) {
    for (const [name, logs] of Object.entries(allLogs)) {
      if (planned.has(name)) continue
      if (logs.some(l => blockDates.has(l.date))) {
        substitutes.push({ name, count: logs.length })
      }
    }
  }

  return (
    <div className={styles.wrap}>
      {!embedded && (
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} type="button" aria-label={t('pv.backToBlocks')}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
              <polyline points="15 6 9 12 15 18" />
            </svg>
          </button>
        </div>
      )}
      <h3 className={styles.blockTitle}>{block.label}</h3>

      {/* The block's own answer, before the per-exercise charts: is week eight
          heavier than week one. The charts are for asking why. */}
      {!block.isRest && block.exercises.length > 0 && (
        <BlockCompare block={block} allLogs={allLogs} />
      )}

      {block.isRest || block.exercises.length === 0 ? (
        <p className={styles.noData}>{t('pv.restDay')}</p>
      ) : (
        <>
          <div className={styles.exList}>
            {block.exercises.map((ex, i) => {
              const count = allLogs[ex.name]?.length ?? 0
              return (
                <button
                  key={i}
                  className={styles.exBtn}
                  onClick={() => onSelectExercise(ex.name)}
                  type="button"
                >
                  <span className={styles.exBtnName}>{ex.name}</span>
                  <span className={styles.exBtnMeta}>
                    {ex.sets}×{ex.reps}
                    {count > 0 && <span className={styles.exBtnCount}>{t('pv.entryCount', { n: count })}</span>}
                  </span>
                  <span className={styles.exBtnArrow}>›</span>
                </button>
              )
            })}
          </div>

          {substitutes.length > 0 && (
            <>
              <h4 className={styles.subsHead}>{t('pv.subsHead')}</h4>
              <p className={styles.subsHint}>
                {t('pv.subsNote')}
              </p>
              <div className={styles.exList}>
                {substitutes.map(s => (
                  <button
                    key={s.name}
                    className={styles.exBtn}
                    onClick={() => onSelectExercise(s.name)}
                    type="button"
                  >
                    <span className={styles.exBtnName}>{s.name}</span>
                    <span className={styles.exBtnMeta}>
                      {t('pv.swap')}
                      <span className={styles.exBtnCount}>{t('pv.entryCount', { n: s.count })}</span>
                    </span>
                    <span className={styles.exBtnArrow}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Level 0: block list ───────────────────────────────────────────────────────

function BlockList({ blocks, allLogs, onSelectBlock, onClose, embedded }) {
  const { t } = useSettings()
  return (
    <div className={styles.wrap}>
      {!embedded && (
        <div className={styles.header}>
          <h2 className={styles.title}>{t('pv.title')}</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label={t('pv.close')}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6"  y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <div className={styles.blockGrid}>
        {blocks.map((block, idx) => {
          const total = block.exercises.reduce((sum, ex) => sum + (allLogs[ex.name]?.length ?? 0), 0)
          return (
            <button
              key={block.id}
              className={styles.blockBtn}
              style={{ borderColor: blockColor(idx) }}
              onClick={() => onSelectBlock(block)}
              type="button"
            >
              <span className={styles.blockBtnDot} style={{ background: blockColor(idx) }} />
              <span className={styles.blockBtnLabel}>{block.label}</span>
              {total > 0 && <span className={styles.blockBtnCount}>{t('pv.entryCount', { n: total })}</span>}
              <span className={styles.blockBtnArrow}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function ProgressionView({
  onClose, blocks = [], embedded = false,
  completions = [],
  // Optional controlled state — Training lifts these so the AppHeader burger
  // can turn into a back arrow when the user is inside a block/exercise.
  selectedBlock: selectedBlockProp,
  selectedEx:    selectedExProp,
  onSelectBlock: onSelectBlockProp,
  onSelectEx:    onSelectExProp,
}) {
  const { t } = useSettings()
  const { user } = useAuth()
  const [allLogsArr, setAllLogsArr]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [innerBlock, setInnerBlock]       = useState(null)
  const [innerEx,    setInnerEx]          = useState(null)
  const selectedBlock  = selectedBlockProp !== undefined ? selectedBlockProp : innerBlock
  const selectedEx     = selectedExProp    !== undefined ? selectedExProp    : innerEx
  const setSelectedBlock = onSelectBlockProp ?? setInnerBlock
  const setSelectedEx    = onSelectExProp    ?? setInnerEx

  const { resolve: resolveAlias, mergedInto, merge, unmerge } = useExerciseAliases()

  useEffect(() => {
    if (!user) return
    supabase
      .from('exercise_logs')
      .select('id, exercise_name, date, weight, reps, sets, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(({ data }) => { if (data) setAllLogsArr(data); setLoading(false) })
  }, [user?.id])

  /* Групира се по каноничното име, не по написаното.
     Без това „Лежанка" и „Лежанка с щанга" са две криви за едно
     движение, а осем седмици прогрес, разцепен на две, не показва
     прогрес. Самите вписвания остават с името от деня. */
  const allLogs = useMemo(() => {
    const m = {}
    for (const log of allLogsArr) {
      const name = resolveAlias(log.exercise_name)
      if (!m[name]) m[name] = []
      m[name].push(log)
    }
    return m
  }, [allLogsArr, resolveAlias])

  async function handleDelete(id) {
    await supabase.from('exercise_logs').delete().eq('id', id)
    setAllLogsArr(prev => prev.filter(l => l.id !== id))
  }

  async function handleUpdate(id, updates) {
    const { data } = await supabase
      .from('exercise_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) setAllLogsArr(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  if (loading) return <div className={styles.wrap}><p className={styles.noData}>{t('pv.loading')}</p></div>

  if (selectedBlock && selectedEx) {
    return (
      <ExerciseProgression
        allNames={Object.keys(allLogs)}
        blocks={blocks}
        mergedInto={mergedInto}
        onMerge={merge}
        onUnmerge={unmerge}
        /* Каноничното име, не избраното.
           Планът сочи към „Лежанка", но тя може вече да е влязла в
           „Лежанка с щанга". Без това екранът опустява веднага след
           обединяването: името, на което стоиш, вече не е ключ в данните. */
        exerciseName={resolveAlias(selectedEx)}
        allLogs={allLogs}
        blockLabel={selectedBlock.label}
        onBack={() => setSelectedEx(null)}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        embedded={embedded}
      />
    )
  }

  if (selectedBlock) {
    return (
      <BlockExercises
        block={selectedBlock}
        allLogs={allLogs}
        onSelectExercise={setSelectedEx}
        onBack={() => setSelectedBlock(null)}
        completions={completions}
        embedded={embedded}
      />
    )
  }

  return (
    <BlockList
      blocks={blocks}
      allLogs={allLogs}
      onSelectBlock={setSelectedBlock}
      onClose={onClose}
      embedded={embedded}
    />
  )
}
