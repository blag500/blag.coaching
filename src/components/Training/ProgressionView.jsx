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
  if (!entries.length) return null

  const vals    = entries.map(e => e.weight).filter(w => w > 0)
  if (!vals.length) return <p className={styles.noWeight}>Няма данни за тегло.</p>

  const rawMin  = Math.min(...vals)
  const rawMax  = Math.max(...vals)
  const pad     = Math.max((rawMax - rawMin) * 0.18, 1)
  const minVal  = rawMin - pad
  const maxVal  = rawMax + pad
  const rangeV  = maxVal - minVal

  const validEntries = entries.filter(e => e.weight > 0)

  function toX(i) { return PL + (i / Math.max(validEntries.length - 1, 1)) * CW }
  function toY(v) { return PT + (1 - (v - minVal) / rangeV) * CH }

  const points  = validEntries.map((e, i) => ({ x: toX(i), y: toY(e.weight), ...e }))
  const last    = points[points.length - 1]
  const linePath = smoothPath(points)
  const areaPath = validEntries.length > 1
    ? `${linePath} L${last.x},${H - PB} L${points[0].x},${H - PB} Z`
    : null

  // Y ticks
  const yTicks = [0, 1, 2, 3].map(i => {
    const v = minVal + (i / 3) * rangeV
    return { v: Math.round(v * 10) / 10, y: toY(v) }
  })

  // X labels: first, middle, last
  const n = points.length
  const xIdxs = n <= 3 ? [...Array(n).keys()] : [0, Math.round((n - 1) / 2), n - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
      <defs>
        <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map(t => (
        <line key={t.v} x1={PL} y1={t.y} x2={W - PR} y2={t.y}
          stroke="var(--border)" strokeWidth="1" />
      ))}

      {/* Y axis labels */}
      {yTicks.map(t => (
        <text key={t.v} x={PL - 5} y={t.y + 4} textAnchor="end"
          fontSize="9" fill="var(--muted)" fontFamily="var(--font-body)">
          {t.v}
        </text>
      ))}

      {/* X axis labels */}
      {xIdxs.map(idx => (
        <text key={idx}
          x={points[idx].x}
          y={H - PB + 14}
          textAnchor="middle"
          fontSize="9"
          fill="var(--muted)"
          fontFamily="var(--font-body)"
        >
          {points[idx].date?.slice(5)}
        </text>
      ))}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill={`url(#${GRAD_ID})`} />}

      {/* Line */}
      {validEntries.length > 1 && (
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" />
      ))}

      {/* Last value label */}
      <text x={last.x} y={last.y - 9} textAnchor="middle"
        fontSize="10" fill="var(--accent)" fontFamily="var(--font-body)" fontWeight="bold">
        {last.weight}kg
      </text>
    </svg>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

function ExerciseTable({ entries }) {
  if (!entries.length) return null
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
            <td className={styles.td}>{e.weight ? `${e.weight} kg` : '—'}</td>
            <td className={styles.td}>{e.reps ?? '—'}</td>
            <td className={styles.td}>{e.sets ?? '—'}</td>
            <td className={`${styles.td} ${styles.tdNotes}`}>{e.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProgressionView({ onClose }) {
  const { user } = useAuth()
  const [allLogs, setAllLogs]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedEx, setSelectedEx]     = useState(null)
  const [range, setRange]               = useState('ALL')

  useEffect(() => {
    if (!user) return
    supabase
      .from('exercise_logs')
      .select('exercise_name, date, weight, reps, sets, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (data) setAllLogs(data)
        setLoading(false)
      })
  }, [user?.id])

  // Group logs by exercise name
  const exerciseMap = useMemo(() => {
    const m = {}
    for (const log of allLogs) {
      if (!m[log.exercise_name]) m[log.exercise_name] = []
      m[log.exercise_name].push(log)
    }
    return m
  }, [allLogs])

  const exerciseNames = Object.keys(exerciseMap).sort()

  // Auto-select first exercise
  useEffect(() => {
    if (!selectedEx && exerciseNames.length > 0) setSelectedEx(exerciseNames[0])
  }, [exerciseNames.join(',')])

  // Apply date range filter
  const filteredEntries = useMemo(() => {
    const entries = exerciseMap[selectedEx] ?? []
    const rangeObj = RANGES.find(r => r.key === range)
    if (!rangeObj.days) return entries
    const cutoff = new Date(Date.now() - rangeObj.days * 86400000).toISOString().slice(0, 10)
    return entries.filter(e => e.date >= cutoff)
  }, [exerciseMap, selectedEx, range])

  // Reversed for the table (newest first)
  const tableEntries = [...filteredEntries].reverse()

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>ПРОГРЕСИЯ</h2>
        <button className={styles.closeBtn} onClick={onClose} type="button">✕ Назад</button>
      </div>

      {loading && <p className={styles.empty}>Зарежда...</p>}

      {!loading && exerciseNames.length === 0 && (
        <p className={styles.empty}>Нямаш записани тренировки. Логни упражнение с ⊕ бутона.</p>
      )}

      {!loading && exerciseNames.length > 0 && (
        <>
          {/* Exercise selector */}
          <div className={styles.exBar}>
            {exerciseNames.map(name => (
              <button
                key={name}
                className={`${styles.exPill} ${selectedEx === name ? styles.exPillActive : ''}`}
                onClick={() => setSelectedEx(name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>

          {/* Range filter */}
          <div className={styles.rangeBar}>
            {RANGES.map(r => (
              <button
                key={r.key}
                className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ''}`}
                onClick={() => setRange(r.key)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          {filteredEntries.length === 0 ? (
            <p className={styles.empty}>Няма записи за избрания период.</p>
          ) : (
            <div className={styles.chartWrap}>
              <ExerciseChart entries={filteredEntries} />
            </div>
          )}

          {/* Stats row */}
          {filteredEntries.length > 0 && (
            <div className={styles.statsRow}>
              {(() => {
                const withW = filteredEntries.filter(e => e.weight > 0)
                const maxW  = withW.length ? Math.max(...withW.map(e => e.weight)) : null
                const first = withW[0]?.weight
                const last  = withW.at(-1)?.weight
                const diff  = first != null && last != null ? +(last - first).toFixed(1) : null
                return (
                  <>
                    <div className={styles.stat}>
                      <span className={styles.statVal}>{filteredEntries.length}</span>
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
                  </>
                )
              })()}
            </div>
          )}

          {/* Table */}
          {tableEntries.length > 0 && (
            <div className={styles.tableWrap}>
              <ExerciseTable entries={tableEntries} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
