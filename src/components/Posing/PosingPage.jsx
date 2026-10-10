import { useState, useEffect, useRef, useMemo } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePosingShots } from '../../hooks/usePosingShots'
import { haptic } from '../../lib/haptics'
import { POSES, BLOCKS, orderPoses } from './poses'
import PosingCamera from './PosingCamera'
import PosingCompare from './PosingCompare'
import PoseLibrary from './PoseLibrary'
import { LIBRARY } from './library'
import styles from './PosingPage.module.css'
import AppHeader from '../AppHeader/AppHeader'

const DURATIONS = [15, 30, 60]

const R = 44
const CIRC = 2 * Math.PI * R

/* Изборът на пози е удобство на този телефон, не данни: пази се в браузъра.
   Празен или повреден запис връща блока на бодибилдинга. */
const PICK_KEY = 'posing.picked'
function loadPicked() {
  try {
    const v = JSON.parse(localStorage.getItem(PICK_KEY) ?? 'null')
    if (Array.isArray(v) && v.length) return v.filter(id => POSES.some(p => p.id === id))
  } catch { /* няма или е повреден */ }
  return BLOCKS[0].poses
}

export default function PosingPage({ onMenuOpen }) {
  const { t } = useSettings()
  const { user } = useAuth()
  const { shots, save, remove } = usePosingShots(user?.id)
  const [mode, setMode] = useState('list')   // list | session | done | camera | compare | library
  const [picked, setPicked] = useState(loadPicked)
  const [poseIndex, setPoseIndex] = useState(0)
  const [duration, setDuration] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(PICK_KEY, JSON.stringify(picked)) } catch { /* частен режим */ }
  }, [picked])

  const poses = useMemo(() => orderPoses(picked), [picked])
  const pose = poses[poseIndex] ?? poses[0]

  // Кой блок съвпада точно с избора — той свети. Пипнеш ли поза, блокът
  // угасва: изборът вече е свой.
  const activeBlock = BLOCKS.find(b =>
    b.poses.length === picked.length && b.poses.every(id => picked.includes(id)))?.id

  function togglePose(id) {
    haptic('toggle')
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }

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
    if (poseIndex + 1 >= poses.length) {
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

  function drillPose(id) {
    const i = poses.findIndex(p => p.id === id)
    if (i < 0) return
    setPoseIndex(i)
    setTimeLeft(duration)
    setPaused(true)
    setMode('session')
  }

  const progressPct = timeLeft / duration
  const strokeOffset = CIRC * progressPct
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  if (mode === 'camera') {
    return (
      <div className={styles.page}>
        <PosingCamera
          poses={poses}
          shots={shots}
          save={save}
          onClose={() => setMode('list')}
          onCompare={() => setMode('compare')}
        />
      </div>
    )
  }

  if (mode === 'library') {
    return (
      <div className={styles.page}>
        <PoseLibrary onBack={() => setMode('list')} />
      </div>
    )
  }

  if (mode === 'compare') {
    return (
      <div className={styles.page}>
        <AppHeader onBack={() => setMode('list')} eyebrow={t('pose.title')} title={t('pose.cmp.title')} />
        <PosingCompare shots={shots} save={save} remove={remove} initialPose={poses[0]?.id} />
      </div>
    )
  }

  if (mode === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.doneScreen}>
          <div className={styles.doneTitle}>{t('pose.sessionDone')}</div>
          <p className={styles.doneSub}>{t('pose.sessionMeta', { n: poses.length, sec: duration })}</p>
          <button className={styles.startBtn} onClick={() => setMode('list')} type="button">
            {t('pose.backToList')}
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'session' && pose) {
    return (
      <div className={styles.page}>
        <AppHeader onBack={() => setMode('list')} eyebrow={t('pose.title')} title={`${poseIndex + 1}/${poses.length}`} />
        <header className={styles.sessionHeader}>
          <div className={styles.dots}>
            {poses.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === poseIndex ? styles.dotActive : i < poseIndex ? styles.dotDone : ''}`}
              />
            ))}
          </div>
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

  const empty = poses.length === 0

  return (
    <div className={styles.page}>
      <AppHeader onMenuOpen={onMenuOpen} eyebrow={t('pose.subtitle')} title={t('pose.title')} />

      {/* Блоковете: кой формат се тренира днес. */}
      <div className={styles.blocks}>
        {BLOCKS.map(b => (
          <button
            key={b.id}
            type="button"
            className={`${styles.block} ${activeBlock === b.id ? styles.blockOn : ''}`}
            onClick={() => { haptic('toggle'); setPicked(b.poses) }}
          >
            {t(b.labelKey)}
            <small>{t('pose.block.count', { n: b.poses.length })}</small>
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.startBtn} onClick={() => setMode('camera')} type="button" disabled={empty}>
          {t('pose.shoot', { n: poses.length })}
        </button>
        <button className={styles.ghostBtn} onClick={() => setMode('compare')} type="button">
          {t('pose.compare')}
        </button>
      </div>

      <button className={styles.libEntry} onClick={() => setMode('library')} type="button">
        <span>
          {t('lib.entry')}
          <small>{t('lib.entryMeta', { n: LIBRARY.length })}</small>
        </span>
        <span className={styles.poseRowArrow} aria-hidden="true">›</span>
      </button>

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
        <button className={styles.drillBtn} onClick={startSession} type="button" disabled={empty}>
          {t('pose.startSession', { n: poses.length })}
        </button>
      </div>

      <div className={styles.poseList}>
        {POSES.map((p, i) => {
          const on = picked.includes(p.id)
          const firstPose = !p.turn && POSES[i - 1]?.turn
          return (
            <div key={p.id}>
              {i === 0 && <div className={styles.listGroup}>{t('pose.group.turns')}</div>}
              {firstPose && <div className={styles.listGroup}>{t('pose.group.poses')}</div>}
              <div className={`${styles.poseRow} ${on ? '' : styles.poseRowOff}`}>
                <button
                  type="button"
                  className={styles.poseRowMain}
                  onClick={() => drillPose(p.id)}
                  disabled={!on}
                >
                  <span className={styles.poseRowAbbr}>{p.abbr}</span>
                  <span className={styles.poseRowName}>{t(`pose.${p.id}.name`)}</span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t(`pose.${p.id}.name`)}
                  className={`${styles.switch} ${on ? styles.switchOn : ''}`}
                  onClick={() => togglePose(p.id)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
