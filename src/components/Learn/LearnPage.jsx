import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { LEARN_CARDS } from '../../data/learnCards'
import styles from './LearnPage.module.css'

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const LS_KEY = 'blag_learn_progress'

function saveProgress(date, cardIds, index, correct) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ date, cardIds, index, correct }))
  } catch {}
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p.date !== todayStr()) { localStorage.removeItem(LS_KEY); return null }
    return p
  } catch { return null }
}

function clearProgress() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const CATEGORY_COLORS = {
  nutrition:       '#66BB6A',
  fitness:         '#4FC3F7',
  biomechanics:    '#FF7043',
  supplementation: '#AB47BC',
  biophysics:      '#FFA726',
}

// ── Main page ─────────────────────────────────────────────────
export default function LearnPage() {
  const { user } = useAuth()
  const [phase,       setPhase]       = useState('loading')  // 'loading' | 'quiz' | 'history'
  const [todayResult, setTodayResult] = useState(null)
  const [history,     setHistory]     = useState([])
  const [savedProg,   setSavedProg]   = useState(null)
  const [quizKey,     setQuizKey]     = useState(0)

  const today = todayStr()

  async function fetchHistory() {
    if (!user) return []
    const since = new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('quiz_results')
      .select('date, correct, total, completed_at')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date')
    return data || []
  }

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const hist = await fetchHistory()
      setHistory(hist)
      const tr = hist.find(r => r.date === today) || null
      setTodayResult(tr)
      if (tr) {
        setPhase('history')
      } else {
        setSavedProg(loadProgress())
        setPhase('quiz')
      }
    })()
  }, [user])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComplete(correct, total) {
    if (user) {
      await supabase.from('quiz_results').upsert(
        { user_id: user.id, date: today, correct, total, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      )
    }
    clearProgress()
    const hist = await fetchHistory()
    setHistory(hist)
    const tr = hist.find(r => r.date === today) || { date: today, correct, total }
    setTodayResult(tr)
    setPhase('history')
  }

  function handleReplay() {
    clearProgress()
    setSavedProg(null)
    setQuizKey(k => k + 1)
    setPhase('quiz')
  }

  if (phase === 'loading') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>ЗНАНИЯ</h1>
        </header>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  if (phase === 'history') {
    return <HistoryView todayResult={todayResult} history={history} onReplay={handleReplay} />
  }

  return (
    <LearnDeck
      key={quizKey}
      savedProgress={savedProg}
      onComplete={handleComplete}
    />
  )
}

// ── LearnDeck ─────────────────────────────────────────────────
function LearnDeck({ savedProgress, onComplete }) {
  const cardMap = Object.fromEntries(LEARN_CARDS.map(c => [c.id, c]))

  const [cards] = useState(() => {
    if (savedProgress?.cardIds?.length === LEARN_CARDS.length) {
      const restored = savedProgress.cardIds.map(id => cardMap[id]).filter(Boolean)
      if (restored.length === LEARN_CARDS.length) return restored
    }
    return shuffle([...LEARN_CARDS])
  })

  const startIndex   = Math.min(savedProgress?.index ?? 0, cards.length - 1)
  const startCorrect = savedProgress?.correct ?? 0

  const [index,       setIndex]      = useState(startIndex)
  const [answered,    setAnswered]   = useState(null)
  const [showExplain, setShowExplain] = useState(false)
  const [score,       setScore]      = useState({ correct: startCorrect, total: startIndex })
  const [exiting,     setExiting]    = useState(false)

  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [dragX,      setDragX]      = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const timerRef    = useRef(null)

  const today    = todayStr()
  const cardIds  = cards.map(c => c.id)
  const card     = cards[index] ?? null

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleAnswer(i) {
    if (answered !== null || !card) return
    const isRight = i === card.correct
    setAnswered(i)
    const newCorrect = score.correct + (isRight ? 1 : 0)
    const newTotal   = score.total + 1
    setScore({ correct: newCorrect, total: newTotal })
    saveProgress(today, cardIds, index, newCorrect)
    timerRef.current = setTimeout(() => setShowExplain(true), 240)
  }

  function goNext() {
    if (answered === null) return
    const newIndex = index + 1
    const isLast   = newIndex >= cards.length
    setExiting(true)
    timerRef.current = setTimeout(() => {
      if (isLast) {
        onComplete(score.correct, cards.length)
      } else {
        setIndex(newIndex)
        setAnswered(null)
        setShowExplain(false)
        setExiting(false)
        setDragX(0)
        saveProgress(today, cardIds, newIndex, score.correct)
      }
    }, 310)
  }

  function onTouchStart(e) {
    if (answered === null) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function onTouchMove(e) {
    if (!isDragging || touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 12) { setIsDragging(false); return }
    setDragX(dx)
  }

  function onTouchEnd() {
    setIsDragging(false)
    if (Math.abs(dragX) > 80) goNext()
    else setDragX(0)
    touchStartX.current = null
    touchStartY.current = null
  }

  if (!card) return null  // safety: onComplete will transition parent

  const color       = CATEGORY_COLORS[card.category] ?? '#ffb74d'
  const rotate      = dragX * 0.04
  const dragOpacity = Math.max(0.3, 1 - Math.abs(dragX) / 280)
  const isCorrect   = answered === card.correct

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ЗНАНИЯ</h1>
        <div className={styles.scoreRow}>
          <span className={styles.scoreCorrect}>✓ {score.correct}</span>
          <span className={styles.scoreSep}>·</span>
          <span className={styles.scoreWrong}>✗ {score.total - score.correct}</span>
        </div>
      </header>

      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(index / cards.length) * 100}%` }} />
        </div>
        <span className={styles.progressLabel}>{index + 1} / {cards.length}</span>
      </div>

      <div className={styles.deckArea}>
        {index + 1 < cards.length && <div className={styles.cardBehind} />}

        <div
          className={`${styles.card} ${exiting ? styles.cardExit : ''}`}
          style={isDragging ? {
            transform:  `translateX(${dragX}px) rotate(${rotate}deg)`,
            opacity:    dragOpacity,
            transition: 'none',
          } : undefined}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span
            className={styles.categoryBadge}
            style={{ color, borderColor: color + '44', background: color + '18' }}
          >
            {card.categoryLabel}
          </span>

          <p className={styles.question}>{card.question}</p>

          <div className={styles.options}>
            {card.options.map((opt, i) => {
              let variant = ''
              if (answered !== null) {
                if (i === card.correct)                variant = styles.optCorrect
                else if (i === answered && !isCorrect) variant = styles.optWrong
                else                                   variant = styles.optDim
              }
              return (
                <button
                  key={i}
                  className={`${styles.option} ${variant}`}
                  onClick={() => handleAnswer(i)}
                  type="button"
                  disabled={answered !== null}
                >
                  <span className={styles.optLetter}>{String.fromCharCode(65 + i)}</span>
                  <span className={styles.optText}>{opt}</span>
                </button>
              )
            })}
          </div>

          {showExplain && (
            <div className={`${styles.explain} ${isCorrect ? styles.explainOk : styles.explainFail}`}>
              <p className={styles.explainVerdict}>
                {isCorrect ? '✓ Правилно!' : '✗ Не съвсем'}
              </p>
              <p className={styles.explainText}>{card.explanation}</p>
              <button className={styles.nextBtn} onClick={goNext} type="button">
                {index + 1 < cards.length ? 'Следваща  →' : 'Резултат  →'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showExplain && (
        <p className={styles.swipeHint}>Плъзни или натисни за следваща</p>
      )}
    </div>
  )
}

// ── HistoryView ───────────────────────────────────────────────
function HistoryView({ todayResult, history, onReplay }) {
  const today = todayStr()

  // Today's percentage
  const pct = todayResult
    ? Math.round((todayResult.correct / todayResult.total) * 100)
    : null

  // Build 28-day calendar array
  const calDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (27 - i) * 86400000)
    return d.toISOString().slice(0, 10)
  })

  const resultMap = {}
  history.forEach(r => { resultMap[r.date] = r })

  // Offset for Monday-based grid
  const firstDow = (new Date(calDays[0]).getDay() + 6) % 7
  const paddedCal = [...Array(firstDow).fill(null), ...calDays]

  // Last ≤7 sessions for the chart
  const last7 = [...history].slice(-7)

  // Streak: consecutive days backward from the latest completed day
  const sortedDates = [...history].map(r => r.date).sort()
  let streak = 0
  if (sortedDates.length) {
    let d = new Date(sortedDates[sortedDates.length - 1])
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const ds = d.toISOString().slice(0, 10)
      if (resultMap[ds]) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ЗНАНИЯ</h1>
        {streak > 0 && (
          <div className={styles.streakBadge}>
            🔥 {streak} {streak === 1 ? 'ден' : streak < 5 ? 'дни' : 'дни'}
          </div>
        )}
      </header>

      {/* ── Today's score card ── */}
      {todayResult ? (
        <div className={styles.todayCard}>
          <div>
            <p className={styles.todayLabel}>ДНЕС</p>
            <p className={styles.todayScore}>
              {todayResult.correct}
              <span className={styles.todayTotal}>/{todayResult.total}</span>
            </p>
            <p className={styles.todayPctText}>
              {pct >= 70 ? '✓ Отлично!' : pct >= 50 ? '↑ Добре' : '↻ Повтори'}
            </p>
          </div>
          <div
            className={styles.todayRing}
            style={{
              background: `conic-gradient(${pct >= 70 ? '#66BB6A' : pct >= 50 ? '#FFA726' : '#ef5350'} ${pct}%, var(--surface-2) ${pct}%)`,
            }}
          >
            <div className={styles.todayRingInner}>
              <span className={styles.todayPctNum}>{pct}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.todayCard}>
          <p className={styles.noResultText}>Все още не си решавал/а днес.</p>
        </div>
      )}

      {/* ── 28-day calendar heatmap ── */}
      <div className={styles.sectionWrap}>
        <p className={styles.sectionLabel}>28-ДНЕВЕН КАЛЕНДАР</p>
        <div className={styles.calDowRow}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
            <span key={d} className={styles.calDow}>{d}</span>
          ))}
        </div>
        <div className={styles.calGrid}>
          {paddedCal.map((date, i) => {
            if (date === null) return <div key={`pad-${i}`} className={styles.calCellEmpty} />
            const r       = resultMap[date]
            const isToday = date === today
            let dotClass  = styles.calDot
            if (r) {
              const p = r.correct / r.total
              if (p >= 0.7)      dotClass = `${styles.calDot} ${styles.calDotGreen}`
              else if (p >= 0.5) dotClass = `${styles.calDot} ${styles.calDotYellow}`
              else               dotClass = `${styles.calDot} ${styles.calDotRed}`
            }
            return (
              <div
                key={date}
                className={`${styles.calCell} ${isToday ? styles.calCellToday : ''}`}
                title={r ? `${date}: ${r.correct}/${r.total}` : date}
              >
                <div className={dotClass} />
              </div>
            )
          })}
        </div>
        <div className={styles.calLegend}>
          <span className={`${styles.legendDot} ${styles.calDotGreen}`} />
          <span className={styles.legendText}>≥70%</span>
          <span className={`${styles.legendDot} ${styles.calDotYellow}`} style={{ marginLeft: 12 }} />
          <span className={styles.legendText}>50–69%</span>
          <span className={`${styles.legendDot} ${styles.calDotRed}`} style={{ marginLeft: 12 }} />
          <span className={styles.legendText}>&lt;50%</span>
        </div>
      </div>

      {/* ── Pass rate chart ── */}
      {last7.length >= 2 && (
        <div className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>ПОСЛЕДНИ {last7.length} СЕСИИ</p>
          <PassRateChart sessions={last7} />
        </div>
      )}

      <div className={styles.replayWrap}>
        <button className={styles.replayBtn} onClick={onReplay} type="button">
          Играй отново
        </button>
      </div>
    </div>
  )
}

// ── PassRateChart (SVG) ───────────────────────────────────────
function PassRateChart({ sessions }) {
  const W = 320, H = 130, PAD_L = 30, PAD_B = 26, PAD_T = 14, PAD_R = 8
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const n      = sessions.length
  const barW   = Math.min(30, (chartW / n) * 0.62)
  const gap    = chartW / n

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={styles.passChart}
      aria-label="Графика — резултати от последните сесии"
    >
      {/* Gridlines */}
      {[0, 50, 100].map(v => {
        const y = PAD_T + chartH - (v / 100) * chartH
        return (
          <g key={v}>
            <line
              x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
              stroke="rgba(255,255,255,0.07)" strokeWidth="1"
            />
            <text
              x={PAD_L - 4} y={y + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize="9"
              fontFamily="var(--font-body)"
            >
              {v}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {sessions.map((s, i) => {
        const p        = s.correct / s.total
        const barH     = Math.max(4, p * chartH)
        const x        = PAD_L + gap * i + gap / 2 - barW / 2
        const y        = PAD_T + chartH - barH
        const barColor = p >= 0.7 ? '#66BB6A' : p >= 0.5 ? '#FFA726' : '#ef5350'
        const [, mm, dd] = s.date.split('-')
        const label    = `${dd}.${mm}`

        return (
          <g key={s.date}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={barColor} opacity="0.85" />
            <text
              x={x + barW / 2} y={H - PAD_B + 13}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="9"
              fontFamily="var(--font-body)"
            >
              {label}
            </text>
            <text
              x={x + barW / 2} y={y - 4}
              textAnchor="middle"
              fill={barColor}
              fontSize="9"
              fontFamily="var(--font-body)"
            >
              {Math.round(p * 100)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
