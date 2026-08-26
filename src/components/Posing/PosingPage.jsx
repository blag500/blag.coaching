import { useState, useEffect, useRef } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './PosingPage.module.css'

/* Позите носят само id + abbr — имена, описание и cue-та се държат в
   locales/{bg,en}.js под pose.{id}.* и се резолвват при render. Така всяка
   поза е един ред тук, а езиковото съдържание живее на едно място. */
const POSES = [
  { id: 'fdb', abbr: 'FDB' },
  { id: 'fls', abbr: 'FLS' },
  { id: 'sc',  abbr: 'SC'  },
  { id: 'bdb', abbr: 'BDB' },
  { id: 'bls', abbr: 'BLS' },
  { id: 'st',  abbr: 'ST'  },
  { id: 'at',  abbr: 'A&T' },
  { id: 'mm',  abbr: 'MM'  },
]

const DURATIONS = [15, 30, 60]

const R = 44
const CIRC = 2 * Math.PI * R

export default function PosingPage() {
  const { t } = useSettings()
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
          <div className={styles.doneTitle}>{t('pose.sessionDone')}</div>
          <p className={styles.doneSub}>{t('pose.sessionMeta', { n: POSES.length, sec: duration })}</p>
          <button className={styles.startBtn} onClick={() => setMode('list')} type="button">
            {t('pose.backToList')}
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
          <h2 className={styles.poseName}>{t(`pose.${pose.id}.name`)}</h2>

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
              <span className={styles.timerLabel}>{t('pose.sec')}</span>
            </div>
          </div>

          <p className={styles.poseDesc}>{t(`pose.${pose.id}.desc`)}</p>

          <ul className={styles.cueList}>
            {[1, 2, 3].map(i => (
              <li key={i} className={styles.cue}>{t(`pose.${pose.id}.cue${i}`)}</li>
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
            {paused ? t('pose.continue') : t('pose.pause')}
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
        <h1 className={styles.title}>{t('pose.title')}</h1>
        <p className={styles.subtitle}>{t('pose.subtitle')}</p>
      </header>

      <div className={styles.controls}>
        <span className={styles.controlLabel}>{t('pose.pauseOnPose')}</span>
        <div className={styles.durationPicker}>
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              className={`${styles.durBtn} ${duration === d ? styles.durBtnActive : ''}`}
              onClick={() => setDuration(d)}
            >
              {t('pose.durSec', { n: d })}
            </button>
          ))}
        </div>
      </div>

      <button className={styles.startBtn} onClick={startSession} type="button">
        {t('pose.startSession', { n: POSES.length })}
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
            <span className={styles.poseRowName}>{t(`pose.${p.id}.name`)}</span>
            <span className={styles.poseRowArrow}>→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
