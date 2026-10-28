/* Звукът на неона — синтезиран в браузъра, без файлове: бръмчене от 100 Hz с
 * хармоници (като трансформатор на неонова табела) и щракване при палене.
 * Изключен по подразбиране; браузърът и без това не пуска звук без докосване. */

let ctx = null
let hum = null

export function soundOn() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    hum = ctx.createGain()
    hum.gain.value = 0
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 900
    hum.connect(low).connect(ctx.destination)
    for (const [f, g] of [[100, 0.6], [200, 0.3], [300, 0.14], [50, 0.2]]) {
      const o = ctx.createOscillator()
      const a = ctx.createGain()
      o.frequency.value = f
      a.gain.value = g
      o.connect(a).connect(hum)
      o.start()
    }
  }
  ctx.resume()
}

export function soundOff() {
  ctx?.suspend()
}

export const soundActive = () => ctx?.state === 'running'

/** Силата на бръмченето според това колко свети неонът (0…1). */
export function setHum(v) {
  if (!ctx || ctx.state !== 'running') return
  hum.gain.setTargetAtTime(v * 0.045, ctx.currentTime, 0.04)
}

/** Звънът на щангата, когато падне на куките: нехармонични тонове, които
 *  затихват бързо — като стомана, а не като камбана. */
export function clank() {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  for (const [f, g, d] of [[180, 0.25, 0.35], [432, 0.18, 0.28], [1170, 0.09, 0.18], [2310, 0.05, 0.1]]) {
    const o = ctx.createOscillator()
    const a = ctx.createGain()
    o.frequency.value = f
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(a).connect(ctx.destination)
    o.start(t)
    o.stop(t + d + 0.02)
  }
}

/** Щракването на газа при палене — кратък шум. */
export function click() {
  if (!ctx || ctx.state !== 'running') return
  const len = Math.floor(ctx.sampleRate * 0.035)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  g.gain.value = 0.35
  src.buffer = buf
  src.connect(g).connect(ctx.destination)
  src.start()
}
