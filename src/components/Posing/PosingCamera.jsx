import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import { todayStr } from '../../hooks/useCheckin'

import { useClapTrigger } from './useClapTrigger'
import { useWordTrigger, wordSetup, wordTriggerSupported, isIOS } from './useWordTrigger'
import styles from './PosingCamera.module.css'

/**
 * Снимане на позите без ръце.
 *
 * Телефонът стои на статив или на пейката; човекът е на три метра, в поза.
 * Затова нищо тук не иска докосване по време на снимането: пляскане или дума
 * пускат отброяване, отброяването дава време да се заеме позата, снимката
 * се прави и екранът сам минава на следващата поза.
 *
 * Отброяването е нарочно: пляскането разваля позата. Три секунди стигат ръцете
 * да се върнат в положение и коремът да се стегне.
 *
 * Контурът от миналия път е причината сравнението после да е честно: две
 * снимки от различно разстояние и ъгъл сравняват камерата, не тялото.
 */

const COUNTDOWNS = [0, 3, 5]

// Дългата страна на записаната снимка. Стига за увеличение на телефон, а
// осем снимки на сесия по 4K бързо стават скъпи за хранилището.
const MAX_EDGE = 1600

/** Кратък звук без файлове — тон от осцилатора. */
function beep(ctxRef, freq = 880, ms = 90, gain = 0.15) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!ctxRef.current) ctxRef.current = new Ctx()
    const ctx = ctxRef.current
    ctx.resume?.()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = freq
    g.gain.value = gain
    o.connect(g); g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + ms / 1000)
  } catch { /* без звук */ }
}

export default function PosingCamera({ poses, shots, save, onClose, onCompare }) {
  const { t, lang } = useSettings()
  const [facing, setFacing] = useState('user')
  const [stream, setStream] = useState(null)
  const [camError, setCamError] = useState(null)
  const [idx, setIdx] = useState(0)
  const [count, setCount] = useState(null)        // отброяване: число или null
  const [flash, setFlash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState({})          // poseId -> objectURL от тази сесия
  const [delay, setDelay] = useState(3)
  const [sens, setSens] = useState('mid')
  // На iPhone думата е по избор: разпознавателят там се бори с камерата за
  // микрофона. Пляскането стига; думата се пуска с докосване на чипа.
  const [useWord, setUseWord] = useState(wordTriggerSupported() && !isIOS())
  const [ghost, setGhost] = useState(true)
  const [failed, setFailed] = useState(false)

  const videoRef = useRef(null)
  const audioCtxRef = useRef(null)
  const deafUntil = useRef(0)
  const timerRef = useRef(null)
  const shootingRef = useRef(false)

  const pose = poses[idx]
  const today = todayStr()
  const done = poses.every(p => taken[p.id])

  /* Миналата снимка на същата поза, не от днес — тя е контурът. */
  const ghostUrl = useMemo(() => {
    const prev = shots.find(s => s.pose_id === pose.id && s.taken_on !== today && s.url)
    return prev?.url ?? null
  }, [shots, pose.id, today])

  /* Камерата и микрофонът заедно: един поток, едно разрешение. Ушите не бива
     да изглаждат звука — автоматичното усилване и шумопотискането изяждат
     точно пика, по който се познава пляскането. */
  useEffect(() => {
    let alive = true
    let got = null
    setCamError(null)
    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    }).then(s => {
      if (!alive) { s.getTracks().forEach(tr => tr.stop()); return }
      got = s
      setStream(s)
    }).catch(err => {
      if (!alive) return
      setCamError(err?.name === 'NotAllowedError' ? 'denied' : 'none')
    })
    return () => {
      alive = false
      got?.getTracks().forEach(tr => tr.stop())
    }
  }, [facing])

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    audioCtxRef.current?.close?.().catch(() => {})
  }, [])

  const capture = useCallback(async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) { shootingRef.current = false; return }
    const scale = Math.min(1, MAX_EDGE / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)

    deafUntil.current = performance.now() + 800
    beep(audioCtxRef, 1400, 60, 0.2)
    setFlash(true)
    setTimeout(() => setFlash(false), 180)
    haptic('success')

    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9))
    if (!blob) { shootingRef.current = false; return }
    const poseId = poses[idx].id
    setTaken(p => ({ ...p, [poseId]: URL.createObjectURL(blob) }))

    setBusy(true)
    const { error } = await save(poseId, blob, today)
    setBusy(false)
    if (error) {
      setFailed(true)
      haptic('reject')
    }
    shootingRef.current = false
    // Следващата поза, която още няма снимка от днес.
    setTimeout(() => {
      setIdx(i => {
        for (let k = 1; k <= poses.length; k++) {
          const j = (i + k) % poses.length
          if (!taken[poses[j].id] && poses[j].id !== poseId) return j
        }
        return i
      })
    }, 700)
  }, [poses, idx, save, today, taken])

  /* Спусъкът — от пляскане, дума или бутона. Отброяването се пуска веднъж;
     ново пляскане по време на отброяване не го рестартира. */
  const trigger = useCallback(() => {
    // След „всички са снимани" спусъкът остава жив: докосваш поза в лентата
    // и пляскаш, за да я снимаш наново.
    if (shootingRef.current || !stream) return
    shootingRef.current = true
    haptic('toggle')
    if (!delay) { capture(); return }
    let n = delay
    setCount(n)
    // Отброяването пиука — ушите не бива да го вземат за пляскане.
    deafUntil.current = performance.now() + delay * 1000 + 600
    beep(audioCtxRef)
    timerRef.current = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(timerRef.current)
        setCount(null)
        capture()
      } else {
        setCount(n)
        beep(audioCtxRef)
      }
    }, 1000)
  }, [stream, delay, capture])

  const { level } = useClapTrigger(stream, { enabled: !!stream, sensitivity: sens, onClap: trigger, deafUntil })
  const { state: wordState } = useWordTrigger({ enabled: !!stream && useWord, appLang: lang, onWord: trigger, deafUntil })
  const { words } = wordSetup(lang)

  const mirrored = facing === 'user'

  return createPortal(
    <div className={styles.cam}>
      <video
        ref={videoRef}
        className={`${styles.video} ${mirrored ? styles.mirror : ''}`}
        autoPlay playsInline muted
      />
      {ghost && ghostUrl && (
        <img className={styles.ghost} src={ghostUrl} alt="" aria-hidden="true" />
      )}
      {flash && <div className={styles.flash} aria-hidden="true" />}

      <header className={styles.top}>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={t('pose.cam.close')}>✕</button>
        <div className={styles.poseHead}>
          <span className={styles.abbr}>{pose.abbr}</span>
          <span className={styles.name}>{t(`pose.${pose.id}.name`)}</span>
        </div>
        <button type="button" className={styles.iconBtn}
          onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}
          aria-label={t('pose.cam.flip')}>⟲</button>
      </header>

      <div className={styles.center} aria-live="polite">
        {camError && <p className={styles.notice}>{t(camError === 'denied' ? 'pose.cam.denied' : 'pose.cam.none')}</p>}
        {count != null && <span key={count} className={styles.count}>{count}</span>}
        {!camError && count == null && !done && (
          <p className={styles.hint}>
            {t('pose.cam.hintClap')}
            {useWord && wordState === 'on' && <> · {t('pose.cam.hintWord', { w: words[0] })}</>}
          </p>
        )}
        {done && count == null && (
          <div className={styles.doneBox}>
            <p className={styles.doneTitle}>{t('pose.cam.allDone')}</p>
            <button type="button" className={styles.primary} onClick={onCompare}>{t('pose.cam.toCompare')}</button>
          </div>
        )}
        {failed && <p className={styles.notice}>{t('pose.cam.uploadFailed')}</p>}
      </div>

      <div className={styles.bottom}>
        <div className={styles.strip}>
          {poses.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.thumb} ${i === idx ? styles.thumbOn : ''}`}
              onClick={() => { if (!shootingRef.current) setIdx(i) }}
              aria-label={t(`pose.${p.id}.name`)}
            >
              {taken[p.id]
                ? <img src={taken[p.id]} alt="" />
                : <span>{p.abbr}</span>}
            </button>
          ))}
        </div>

        <div className={styles.controls}>
          <div className={styles.meter} aria-hidden="true">
            <span style={{ transform: `scaleY(${Math.max(0.06, level)})` }} />
          </div>
          <button
            type="button"
            className={styles.shutter}
            onClick={trigger}
            disabled={!stream || busy}
            aria-label={t('pose.cam.shoot')}
          />
          <button
            type="button"
            className={`${styles.chip} ${ghost ? styles.chipOn : ''}`}
            onClick={() => setGhost(g => !g)}
            disabled={!ghostUrl}
          >{t('pose.cam.ghost')}</button>
        </div>

        <div className={styles.settings}>
          <div className={styles.group}>
            <span>{t('pose.cam.delay')}</span>
            {COUNTDOWNS.map(d => (
              <button key={d} type="button"
                className={`${styles.chip} ${delay === d ? styles.chipOn : ''}`}
                onClick={() => setDelay(d)}>{d ? `${d}s` : '0'}</button>
            ))}
          </div>
          <div className={styles.group}>
            <span>{t('pose.cam.sens')}</span>
            {['low', 'mid', 'high'].map(s => (
              <button key={s} type="button"
                className={`${styles.chip} ${sens === s ? styles.chipOn : ''}`}
                onClick={() => setSens(s)}>{t(`pose.cam.sens.${s}`)}</button>
            ))}
          </div>
          {wordTriggerSupported() && (
            <button type="button"
              className={`${styles.chip} ${useWord && wordState !== 'failed' ? styles.chipOn : ''}`}
              onClick={() => setUseWord(w => !w)}>
              {wordState === 'failed' ? t('pose.cam.wordFailed') : t('pose.cam.word', { w: words[0] })}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
