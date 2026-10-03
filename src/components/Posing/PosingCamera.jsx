import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import { todayStr } from '../../hooks/useCheckin'

import { useClapTrigger } from './useClapTrigger'
import { useWordTrigger, wordSetup, wordTriggerSupported, isIOS } from './useWordTrigger'
import { lensName, knobsFor, constraintFor, loadRig, saveRig } from './cameraRig'
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
  const { t } = useSettings()
  const rig = useMemo(loadRig, [])
  const [facing, setFacing] = useState(rig.facing ?? 'user')
  const [lens, setLens] = useState(rig.deviceId ?? null)   // deviceId или null = по facingMode
  const [devices, setDevices] = useState([])
  const [caps, setCaps] = useState(null)
  const [vals, setVals] = useState({})            // стойностите на плъзгачите; null = авто
  const [torch, setTorch] = useState(false)
  const [mirrored, setMirrored] = useState(facing === 'user')
  const [panel, setPanel] = useState(false)
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
    const size = { width: { ideal: 1920 }, height: { ideal: 1920 } }
    navigator.mediaDevices?.getUserMedia({
      video: lens ? { deviceId: { exact: lens }, ...size } : { facingMode: facing, ...size },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    }).then(s => {
      if (!alive) { s.getTracks().forEach(tr => tr.stop()); return }
      got = s
      setStream(s)
    }).catch(err => {
      if (!alive) return
      // Запомненият обектив го няма (друг телефон, сменен браузър) — назад към
      // предна/задна, без грешка на екрана.
      if (lens && (err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError')) {
        setLens(null)
        return
      }
      setCamError(err?.name === 'NotAllowedError' ? 'denied' : 'none')
    })
    return () => {
      alive = false
      got?.getTracks().forEach(tr => tr.stop())
    }
  }, [facing, lens])

  /* Новият поток: кои обективи има (етикетите идват едва след разрешението),
     какво може тази писта и запомнените стойности за този обектив. */
  useEffect(() => {
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    const st = track.getSettings?.() ?? {}
    setMirrored(st.facingMode ? st.facingMode === 'user' : facing === 'user')
    const c = track.getCapabilities?.() ?? {}
    setCaps(c)
    setTorch(false)
    const saved = rig.knobs?.[st.deviceId] ?? {}
    const next = {}
    for (const k of knobsFor(c)) {
      const v = saved[k.id]
      next[k.id] = v != null && v >= c[k.id].min && v <= c[k.id].max ? v
        : k.mode ? null : (st[k.id] ?? null)
      const con = next[k.id] != null ? constraintFor(k, next[k.id]) : null
      if (con) track.applyConstraints({ advanced: [con] }).catch(() => {})
    }
    setVals(next)
    navigator.mediaDevices.enumerateDevices?.()
      .then(list => setDevices(list.filter(d => d.kind === 'videoinput')))
      .catch(() => {})
  }, [stream]) // eslint-disable-line react-hooks/exhaustive-deps

  const knobs = useMemo(() => knobsFor(caps), [caps])
  const activeId = stream?.getVideoTracks()[0]?.getSettings?.().deviceId ?? lens

  function pickLens(id) {
    setLens(id)
    rig.deviceId = id
    saveRig(rig)
  }

  function flip() {
    const f = facing === 'user' ? 'environment' : 'user'
    setFacing(f)
    setLens(null)
    rig.facing = f
    rig.deviceId = null
    saveRig(rig)
  }

  function setKnob(knob, value) {
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    setVals(v => ({ ...v, [knob.id]: value }))
    const con = constraintFor(knob, value)
    if (con) track.applyConstraints({ advanced: [con] }).catch(() => {})
    const id = track.getSettings?.().deviceId
    if (!id) return
    rig.knobs = { ...rig.knobs, [id]: { ...rig.knobs?.[id], [knob.id]: value } }
    saveRig(rig)
  }

  function toggleTorch() {
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    const on = !torch
    track.applyConstraints({ advanced: [{ torch: on }] }).then(() => setTorch(on)).catch(() => {})
  }

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
  const { state: wordState } = useWordTrigger({ enabled: !!stream && useWord, onWord: trigger, deafUntil })
  const { words } = wordSetup()

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
          onClick={flip}
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
        {panel && (
          <div className={styles.panel}>
            {devices.length > 1 && (
              <div className={styles.group}>
                <span>{t('pose.cam.lens')}</span>
                {devices.map((d, i) => (
                  <button key={d.deviceId || i} type="button"
                    className={`${styles.chip} ${d.deviceId === activeId ? styles.chipOn : ''}`}
                    onClick={() => pickLens(d.deviceId)}
                    title={d.label}>{lensName(d.label, i)}</button>
                ))}
              </div>
            )}
            {knobs.map(k => {
              const c = caps[k.id]
              const v = vals[k.id]
              return (
                <label key={k.id} className={styles.knob}>
                  <span className={styles.knobHead}>
                    {t(`pose.cam.k.${k.id}`)}
                    <b>{v != null ? k.fmt(v) : t('pose.cam.auto')}</b>
                  </span>
                  <span className={styles.knobRow}>
                    <input type="range" min={c.min} max={c.max} step={c.step || (c.max - c.min) / 100}
                      value={v ?? (k.id === 'zoom' ? c.min : (c.min + c.max) / 2)}
                      onChange={e => setKnob(k, Number(e.target.value))} />
                    {(k.mode || k.id === 'exposureCompensation') && v != null && (
                      <button type="button" className={styles.chip}
                        onClick={() => setKnob(k, k.mode ? null : 0)}>{t('pose.cam.auto')}</button>
                    )}
                  </span>
                </label>
              )
            })}
            <div className={styles.group}>
              <span>{t('pose.cam.sens')}</span>
              {['low', 'mid', 'high'].map(v => (
                <button key={v} type="button"
                  className={`${styles.chip} ${sens === v ? styles.chipOn : ''}`}
                  onClick={() => setSens(v)}>{t(`pose.cam.sens.${v}`)}</button>
              ))}
            </div>
            {caps?.torch && (
              <button type="button" className={`${styles.chip} ${torch ? styles.chipOn : ''}`}
                onClick={toggleTorch}>{t('pose.cam.torch')}</button>
            )}
            {!knobs.length && !caps?.torch && devices.length < 2 && (
              <p className={styles.panelNote}>{t('pose.cam.noManual')}</p>
            )}
          </div>
        )}
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

        {/* Три колони като в системната камера: времето и думата отляво,
            затворът в средата, контурът и настройките отдясно. Рядко
            пипаното (чувствителност, обектив, плъзгачи) е в панела „Камера“. */}
        <div className={styles.controls}>
          <div className={styles.side}>
            <div className={styles.seg} role="group" aria-label={t('pose.cam.delay')}>
              {COUNTDOWNS.map(d => (
                <button key={d} type="button"
                  className={delay === d ? styles.segOn : ''}
                  aria-pressed={delay === d}
                  onClick={() => setDelay(d)}>{d ? `${d}s` : '0'}</button>
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

          <div className={styles.shutterCol}>
            <button
              type="button"
              className={styles.shutter}
              onClick={trigger}
              disabled={!stream || busy}
              aria-label={t('pose.cam.shoot')}
            />
            {/* Нивото на звука: колко силно трябва да се пляска. */}
            <div className={styles.meter} aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.max(0.04, level)})` }} />
            </div>
          </div>

          <div className={`${styles.side} ${styles.sideEnd}`}>
            <button
              type="button"
              className={`${styles.chip} ${ghost && ghostUrl ? styles.chipOn : ''}`}
              onClick={() => setGhost(g => !g)}
              disabled={!ghostUrl}
            >{t('pose.cam.ghost')}</button>
            <button type="button"
              className={`${styles.chip} ${panel ? styles.chipOn : ''}`}
              onClick={() => setPanel(p => !p)}
              aria-expanded={panel}>{t('pose.cam.rig')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
