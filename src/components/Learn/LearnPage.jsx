import { useState, useRef } from 'react'
import { LEARN_CARDS } from '../../data/learnCards'
import styles from './LearnPage.module.css'

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const CATEGORY_COLORS = {
  nutrition:       '#66BB6A',
  fitness:         '#4FC3F7',
  biomechanics:    '#FF7043',
  supplementation: '#AB47BC',
  biophysics:      '#FFA726',
}

export default function LearnPage() {
  const [resetKey, setResetKey] = useState(0)
  return <LearnDeck key={resetKey} onRestart={() => setResetKey(k => k + 1)} />
}

function LearnDeck({ onRestart }) {
  const [cards]       = useState(() => shuffle([...LEARN_CARDS]))
  const [index,        setIndex]       = useState(0)
  const [answered,     setAnswered]    = useState(null)
  const [showExplain,  setShowExplain] = useState(false)
  const [score,        setScore]       = useState({ correct: 0, total: 0 })
  const [exiting,      setExiting]     = useState(false)

  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)
  const [dragX,      setDragX]      = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const done = index >= cards.length
  const card = done ? null : cards[index]

  function handleAnswer(i) {
    if (answered !== null) return
    const correct = i === card.correct
    setAnswered(i)
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    setTimeout(() => setShowExplain(true), 240)
  }

  function goNext() {
    if (answered === null) return
    setExiting(true)
    setTimeout(() => {
      setIndex(n => n + 1)
      setAnswered(null)
      setShowExplain(false)
      setExiting(false)
      setDragX(0)
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
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 12) {
      setIsDragging(false)
      return
    }
    setDragX(dx)
  }

  function onTouchEnd() {
    setIsDragging(false)
    if (Math.abs(dragX) > 80) {
      goNext()
    } else {
      setDragX(0)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (done) {
    return (
      <Summary
        score={score}
        total={cards.length}
        onRestart={onRestart}
      />
    )
  }

  const color        = CATEGORY_COLORS[card.category] ?? '#ffb74d'
  const rotate       = dragX * 0.04
  const dragOpacity  = Math.max(0.3, 1 - Math.abs(dragX) / 280)
  const isCorrect    = answered === card.correct

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
        {index + 1 < cards.length && (
          <div className={styles.cardBehind} />
        )}

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
                if (i === card.correct)                      variant = styles.optCorrect
                else if (i === answered && !isCorrect)       variant = styles.optWrong
                else                                         variant = styles.optDim
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

function Summary({ score, total, onRestart }) {
  const pct = Math.round((score.correct / total) * 100)
  const msg =
    pct >= 80 ? 'Отлично! Знаеш материала много добре.' :
    pct >= 50 ? 'Добре! Продължавай да учиш и повтаряш.' :
                'Не се отказвай — повтаряй до майсторство.'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ЗНАНИЯ</h1>
      </header>

      <div className={styles.summaryCard}>
        <p className={styles.summaryScore}>
          {score.correct}<span className={styles.summaryTotal}>/{total}</span>
        </p>
        <p className={styles.summaryPct}>{pct}% верни отговора</p>
        <p className={styles.summaryMsg}>{msg}</p>
        <div className={styles.summaryBar}>
          <div className={styles.summaryFill} style={{ width: `${pct}%` }} />
        </div>

        <div className={styles.summaryBreakdown}>
          <div className={styles.summaryBItem}>
            <span className={styles.summaryBVal} style={{ color: '#66BB6A' }}>{score.correct}</span>
            <span className={styles.summaryBLabel}>Верни</span>
          </div>
          <div className={styles.summaryBItem}>
            <span className={styles.summaryBVal} style={{ color: '#ef5350' }}>{total - score.correct}</span>
            <span className={styles.summaryBLabel}>Грешни</span>
          </div>
          <div className={styles.summaryBItem}>
            <span className={styles.summaryBVal}>{total}</span>
            <span className={styles.summaryBLabel}>Общо</span>
          </div>
        </div>

        <button className={styles.restartBtn} onClick={onRestart} type="button">
          Играй отново
        </button>
      </div>
    </div>
  )
}
