import { useState, useEffect, useRef } from 'react'
import styles from './PosingPage.module.css'

const POSES = [
  {
    id: 'fdb',
    name: 'ФРОНТ ДВОЕН БИЦЕП',
    abbr: 'FDB',
    cues: ['Ръцете извити нагоре, китките навън', 'Гърдите напред, коремът стегнат', 'Бедрата леко раздалечени'],
  },
  {
    id: 'fls',
    name: 'ФРОНТ ЛАТ СПРЕД',
    abbr: 'FLS',
    cues: ['Ръцете на кръста, лактите напред', 'Разперете гърба максимално', 'Гърдите нагоре, главата права'],
  },
  {
    id: 'sc_r',
    name: 'СТРАНИЧЕН ЧЕСТ',
    abbr: 'SC',
    cues: ['Тялото настрани към публиката', 'Ръцете стиснати, гърдата изпъкнала', 'Предният крак леко сгънат'],
  },
  {
    id: 'bdb',
    name: 'БЕК ДВОЕН БИЦЕП',
    abbr: 'BDB',
    cues: ['Гърбом към публиката', 'Ръцете извити нагоре', 'Стегнете глутеусите и прасците'],
  },
  {
    id: 'bls',
    name: 'БЕК ЛАТ СПРЕД',
    abbr: 'BLS',
    cues: ['Ръцете на кръста, лактите напред', 'Разгъвайте гърба широко', 'Лопатките надолу и навън'],
  },
  {
    id: 'st_r',
    name: 'СТРАНИЧЕН ТРИЦЕП',
    abbr: 'ST',
    cues: ['Едната ръка зад тялото, изпружена', 'Трицепсът натиснат назад и нагоре', 'Гърдата изпъкнала напред'],
  },
  {
    id: 'at',
    name: 'АБДОМИНАЛИ И БЕДРА',
    abbr: 'A&T',
    cues: ['Ръцете зад главата', 'Издишайте и стегнете коремните мускули', 'Единият крак леко изнесен напред'],
  },
  {
    id: 'mm',
    name: 'МОСТ МОСТРИ',
    abbr: 'MM',
    cues: ['Ръцете събрани пред гърдите или на кръста', 'Максимално свиване на всички мускули', 'Наклонете торса леко напред'],
  },
]

const DURATIONS = [15, 30, 60]

const R = 44
const CIRC = 2 * Math.PI * R

export default function PosingPage() {
  const [mode, setMode] = useState('list')
  const [poseIndex, setPoseIndex] = useState(0)
  const [duration, setDuration] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  const pose = POSES[poseIndex]

  useEffect(() => {
    if (mode !== 'session' || paused) {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          advance()
          return duration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [mode, paused, poseIndex, duration])

  function startSession() {
    setPoseIndex(0)
    setTimeLeft(duration)
    setPaused(false)
    setMode('session')
  }

  function advance() {
    if (poseIndex + 1 >= POSES.length) {
      setMode('done')
    } else {
      setPoseIndex(i => i + 1)
      setTimeLeft(duration)
    }
  }

  function prev() {
    if (poseIndex > 0) {
      setPoseIndex(i => i - 1)
      setTimeLeft(duration)
    }
  }

  function drillPose(idx) {
    setPoseIndex(idx)
    setTimeLeft(duration)
    setPaused(true)
    setMode('session')
  }

  const progressPct = timeLeft / duration
  const strokeOffset = CIRC * progressPct
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  if (mode === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.doneScreen}>
          <div className={styles.doneTitle}>СЕСИЯТА ЗАВЪРШИ</div>
          <p className={styles.doneSub}>{POSES.length} пози · {duration}с всяка</p>
          <button className={styles.startBtn} onClick={() => setMode('list')} type="button">
            ОБРАТНО КЪМ СПИСЪКА
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'session') {
    return (
      <div className={styles.page}>
        <header className={styles.sessionHeader}>
          <button className={styles.backBtn} onClick={() => setMode('list')} type="button">
            ←
          </button>
          <div className={styles.dots}>
            {POSES.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === poseIndex ? styles.dotActive : i < poseIndex ? styles.dotDone : ''}`}
              />
            ))}
          </div>
          <span className={styles.poseCount}>{poseIndex + 1}/{POSES.length}</span>
        </header>

        <div className={styles.sessionBody}>
          <div className={styles.poseAbbr}>{pose.abbr}</div>
          <h2 className={styles.poseName}>{pose.name}</h2>

          <div className={styles.timerWrap}>
            <svg width={R * 2 + 20} height={R * 2 + 20} viewBox={`0 0 ${R * 2 + 20} ${R * 2 + 20}`} aria-hidden="true">
              <circle
                cx={R + 10} cy={R + 10} r={R}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="6"
              />
              <circle
                cx={R + 10} cy={R + 10} r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - strokeOffset}
                transform={`rotate(-90 ${R + 10} ${R + 10})`}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <div className={styles.timerCenter}>
              <span className={styles.timerNum}>
                {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : secs}
              </span>
              <span className={styles.timerLabel}>сек.</span>
            </div>
          </div>

          <ul className={styles.cueList}>
            {pose.cues.map((cue, i) => (
              <li key={i} className={styles.cue}>{cue}</li>
            ))}
          </ul>
        </div>

        <div className={styles.sessionActions}>
          <button
            className={styles.navBtn}
            onClick={prev}
            disabled={poseIndex === 0}
            type="button"
          >
            ←
          </button>
          <button
            className={`${styles.pauseBtn} ${paused ? styles.pauseBtnActive : ''}`}
            onClick={() => setPaused(p => !p)}
            type="button"
          >
            {paused ? 'ПРОДЪЛЖИ' : 'ПАУЗА'}
          </button>
          <button
            className={styles.navBtn}
            onClick={advance}
            type="button"
          >
            →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.listHeader}>
        <h1 className={styles.title}>ПОУЗИНГ</h1>
        <p className={styles.subtitle}>ПРАКТИКА</p>
      </header>

      <div className={styles.controls}>
        <span className={styles.controlLabel}>ПАУЗА НА ПОЗА</span>
        <div className={styles.durationPicker}>
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              className={`${styles.durBtn} ${duration === d ? styles.durBtnActive : ''}`}
              onClick={() => setDuration(d)}
            >
              {d}с
            </button>
          ))}
        </div>
      </div>

      <button className={styles.startBtn} onClick={startSession} type="button">
        СТАРТ СЕСИЯ · {POSES.length} ПОЗИ
      </button>

      <div className={styles.poseList}>
        {POSES.map((p, i) => (
          <button
            key={p.id}
            className={styles.poseRow}
            onClick={() => drillPose(i)}
            type="button"
          >
            <span className={styles.poseRowAbbr}>{p.abbr}</span>
            <span className={styles.poseRowName}>{p.name}</span>
            <span className={styles.poseRowArrow}>→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
