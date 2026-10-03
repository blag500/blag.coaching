import { useEffect, useRef, useState } from 'react'

/**
 * Пляскане като спусък.
 *
 * Защо не само дума: разпознаването на реч на iPhone няма български (виж
 * BlagBot/useDictation.js), а залата е шумна. Пляскането е език-независимо,
 * работи без интернет и е най-рязкото нещо, което човек може да направи с
 * ръце, без да мърда от позицията си прекалено.
 *
 * Как се различава от музиката: не по сила, а по скок. Пляскането е пик, който
 * изскача многократно над средния шум на стаята за части от секундата. Затова
 * се следят две числа — бавно плъзгащо се ниво на фона и мигновеният пик — и
 * спусъкът е пикът над фона по множител, и над абсолютен под, за да не стреля
 * в тиха стая от прещракване на пода.
 */

// Под и множител по чувствителност. Подовете са пикова амплитуда (0–1).
const SENS = {
  low:  { floor: 0.45, ratio: 9 },
  mid:  { floor: 0.28, ratio: 7 },
  high: { floor: 0.16, ratio: 5 },
}

// След изстрел ушите са затворени: едно пляскане отеква, а и звукът на
// затвора не бива да стреля сам.
const REFRACTORY_MS = 1200

/**
 * @param {MediaStream|null} stream  Поток с аудио писта.
 * @param {object} opts
 * @param {boolean} opts.enabled
 * @param {'low'|'mid'|'high'} opts.sensitivity
 * @param {() => void} opts.onClap
 * @param {{current: number}} opts.deafUntil  performance.now(), до което не слуша
 *   (отброяването и звукът на затвора се пазят оттук).
 */
export function useClapTrigger(stream, { enabled, sensitivity = 'mid', onClap, deafUntil }) {
  const [level, setLevel] = useState(0)
  const clapRef = useRef(onClap)
  clapRef.current = onClap
  const sensRef = useRef(sensitivity)
  sensRef.current = sensitivity

  useEffect(() => {
    if (!enabled || !stream || !stream.getAudioTracks().length) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return

    const ctx = new Ctx()
    const src = ctx.createMediaStreamSource(stream)
    const an = ctx.createAnalyser()
    an.fftSize = 1024
    src.connect(an)
    const buf = new Float32Array(an.fftSize)

    let baseline = 0.02
    let lastFire = 0
    let lastUi = 0
    let raf = 0

    const tick = () => {
      raf = requestAnimationFrame(tick)
      an.getFloatTimeDomainData(buf)
      let peak = 0, sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i])
        if (v > peak) peak = v
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      const now = performance.now()

      // Фонът се движи бавно и само нагоре-надолу по средното, не по пиковете —
      // иначе самото пляскане вдига прага и следващото не минава.
      baseline = baseline * 0.97 + rms * 0.03

      const { floor, ratio } = SENS[sensRef.current] ?? SENS.mid
      const deaf = now < (deafUntil?.current ?? 0) || now - lastFire < REFRACTORY_MS
      if (!deaf && peak > floor && peak > baseline * ratio) {
        lastFire = now
        clapRef.current?.()
      }

      // Индикаторът е за човека — десет пъти в секунда стигат.
      if (now - lastUi > 100) {
        lastUi = now
        setLevel(Math.min(1, peak / floor))
      }
    }
    // iOS държи AudioContext спрян, докато не дойде жест; страницата се пуска
    // от натискане, така че resume тук минава.
    ctx.resume().catch(() => {})
    tick()

    return () => {
      cancelAnimationFrame(raf)
      try { src.disconnect() } catch { /* вече */ }
      ctx.close().catch(() => {})
    }
  }, [stream, enabled, deafUntil])

  return { level }
}
