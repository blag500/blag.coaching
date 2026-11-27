// Тестовият четец (/vrata/#chetec): камерата на втори телефон или лаптоп стои
// на мястото на четеца при вратата. Чете QR, праща го на zs-access (scan) и
// показва какво би направила вратата. Истинският четец ще прави същия POST
// с reader и key (ZS_READER_KEY).
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

export default function Reader({ call }) {
  const video = useRef(null)
  const [state, setState] = useState({ kind: 'idle', text: 'Покажи QR-а от другия телефон пред камерата.' })
  const [camErr, setCamErr] = useState('')
  const busy = useRef(false)
  const lastQr = useRef('')

  useEffect(() => {
    let stream, raf, stop = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let t = 0

    const tick = async (now) => {
      if (stop) return
      raf = requestAnimationFrame(tick)
      const v = video.current
      if (!v || v.readyState < 2 || busy.current || now - t < 150) return
      t = now
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360
      canvas.width = w; canvas.height = h
      ctx.drawImage(v, 0, 0, w, h)
      const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
      if (!hit || hit.data === lastQr.current) return
      lastQr.current = hit.data
      busy.current = true
      const d = await call('scan', { qr: hit.data, reader: 'test-chetec' })
      if (d.error) setState({ kind: 'bad', text: d.error })
      else setState({ kind: 'ok', text: d.repeat ? 'Вече отворено с този QR.' : 'Отворено. Влизането е записано.' })
      setTimeout(() => { busy.current = false; setState({ kind: 'idle', text: 'Покажи QR-а от другия телефон пред камерата.' }) }, 2500)
    }

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (stop) return s.getTracks().forEach((x) => x.stop())
        video.current.srcObject = s
        video.current.play().catch(() => {})
        raf = requestAnimationFrame(tick)
      })
      .catch(() => setCamErr('Няма достъп до камерата. Разреши я в браузъра и презареди.'))
    if (!navigator.mediaDevices) setCamErr('Тук камерата не е достъпна (нужен е https).')

    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((x) => x.stop()) }
  }, [call])

  return (
    <section className="v-card v-reader">
      <h2 className="v-label">Тестов четец</h2>
      <div className={`v-cam is-${state.kind}`}>
        <video ref={video} muted playsInline />
      </div>
      <p className={`v-status is-${state.kind}`} role="status">{state.text}</p>
      {camErr && <p className="v-err">{camErr}</p>}
      <a className="v-link" href="#">Към моя QR</a>
    </section>
  )
}
