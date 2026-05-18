import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ProgressionView.module.css'

// ── Chart ────────────────────────────────────────────────────────────────────

const W = 300, H = 160
const PL = 40, PR = 10, PT = 14, PB = 26
const CW = W - PL - PR
const CH = H - PT - PB
const GRAD_ID = 'progGrad'

const RANGES = [
  { key: '1M',  label: '1 МЕС', days: 30  },
  { key: '3M',  label: '3 МЕС', days: 90  },
  { key: 'ALL', label: 'ВСЕ',   days: null },
]

const PALETTE = ['#ffb74d', '#4FC3F7', '#ff8a65', '#81C784', '#CE93D8', '#80DEEA', '#FFAB91']
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

function ExerciseChart({ entries }) {
  const vals = entries.map(e => e.weight).filter(w => w > 0)
  if (!vals.length) return <p className={styles.noData}>Няма данни за тегло.</p>

  const rawMin = Math.min(...vals), rawMax = Math.max(...vals)
  const pad    = Math.max((rawMax - rawMin) * 0.18, 1)
  const minVal = rawMin - pad, maxVal = rawMax + pad
  const rangeV = maxVal - minVal
  const ve     = entries.filter(e => e.weight > 0)

  function toX(i) { return PL + (i / Math.max(ve.length - 1, 1)) * CW }
  function toY(v) { return PT + (1 - (v - minVal) / rangeV) * CH }

  const pts      = ve.map((e, i) => ({ x: toX(i), y: toY(e.weight), ...e }))
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

function ExerciseTable({ entries }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.th}>Дата</th>
          <th className={styles.th}>Тегло</th>
          <th className={styles.th}>Повт.</th>
          <th className={styles.th}>Серии</th>
          <th className={styles.thNotes}>Бележки</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i} className={`${styles.tr} ${i === 0 ? styles.trLatest : ''}`}>
            <td className={styles.td}>{e.date}</td>
            <td className={styles.td}>{e.weight ? `${e.weight}kg` : '—'}</td>
            <td className={styles.td}>{e.reps ?? '—'}</td>
            <td className={styles.td}>{e.sets ?? '—'}</td>
            <td className={`${styles.td} ${styles.tdNotes}`}>{e.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Level 2: progression for one exercise ────────────────────────────────────

function ExerciseProgression({ exerciseName, allLogs, onBack, blockLabel }) {
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
  const diff  = withW.length >= 2 ? +(withW.at(-1).weight - withW[0].weight).toFixed(1) : null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">← {blockLabel}</button>
      </div>
      <h3 className={styles.exTitle}>{exerciseName}</h3>

      <div className={styles.rangeBar}>
        {RANGES.map(r => (
          <button key={r.key}
            className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ''}`}
            onClick={() => setRange(r.key)} type="button">{r.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.noData}>Няма записи за избрания период.</p>
      ) : (
        <>
          <div className={styles.chartWrap}><ExerciseChart entries={filtered} /></div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{filtered.length}</span>
              <span className={styles.statLabel}>записа</span>
            </div>
            {maxW != null && (
              <div className={styles.stat}>
                <span className={styles.statVal}>{maxW}kg</span>
                <span className={styles.statLabel}>макс. тегло</span>
              </div>
            )}
            {diff != null && (
              <div className={styles.stat}>
                <span className={`${styles.statVal} ${diff > 0 ? styles.statUp : diff < 0 ? styles.statDown : ''}`}>
                  {diff > 0 ? `+${diff}` : diff}kg
                </span>
                <span className={styles.statLabel}>прогрес</span>
              </div>
            )}
          </div>

          <div className={styles.tableWrap}><ExerciseTable entries={tableEntries} /></div>
        </>
      )}
    </div>
  )
}

// ── Level 1: exercises within a block ────────────────────────────────────────

function BlockExercises({ block, allLogs, onSelectExercise, onBack }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">← БЛОКОВЕ</button>
      </div>
      <h3 className={styles.blockTitle}>{block.label}</h3>

      {block.isRest || block.exercises.length === 0 ? (
        <p className={styles.noData}>Почивен ден — няма упражнения.</p>
      ) : (
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
                  {count > 0 && <span className={styles.exBtnCount}>{count} записа</span>}
                </span>
                <span className={styles.exBtnArrow}>›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Level 0: block list ───────────────────────────────────────────────────────

function BlockList({ blocks, allLogs, onSelectBlock, onClose }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>ПРОГРЕСИЯ</h2>
        <button className={styles.closeBtn} onClick={onClose} type="button">✕ Назад</button>
      </div>
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
              {total > 0 && <span className={styles.blockBtnCount}>{total} записа</span>}
              <span className={styles.blockBtnArrow}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function ProgressionView({ onClose, blocks = [] }) {
  const { user } = useAuth()
  const [allLogsArr, setAllLogsArr]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedEx, setSelectedEx]       = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('exercise_logs')
      .select('exercise_name, date, weight, reps, sets, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(({ data }) => { if (data) setAllLogsArr(data); setLoading(false) })
  }, [user?.id])

  const allLogs = useMemo(() => {
    const m = {}
    for (const log of allLogsArr) {
      if (!m[log.exercise_name]) m[log.exercise_name] = []
      m[log.exercise_name].push(log)
    }
    return m
  }, [allLogsArr])

  if (loading) return <div className={styles.wrap}><p className={styles.noData}>Зарежда...</p></div>

  if (selectedBlock && selectedEx) {
    return (
      <ExerciseProgression
        exerciseName={selectedEx}
        allLogs={allLogs}
        blockLabel={selectedBlock.label}
        onBack={() => setSelectedEx(null)}
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
      />
    )
  }

  return (
    <BlockList
      blocks={blocks}
      allLogs={allLogs}
      onSelectBlock={setSelectedBlock}
      onClose={onClose}
    />
  )
}
