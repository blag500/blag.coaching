import { useEffect, useRef, useState } from 'react'
import { lookupBarcode } from '../../utils/openFoodFacts'
import styles from './BarcodeScanner.module.css'

// Chrome and Android ship a native decoder; Safari does not. Camera access
// itself works everywhere, so where the native one is missing we load ZXing
// and decode the same video stream in JavaScript. It is ~200 KB, so it is
// only fetched when actually needed.
const HAS_NATIVE = typeof BarcodeDetector !== 'undefined'

export default function BarcodeScanner({ onFound, onClose }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('opening') // opening | scanning | found | manual
  const [manualCode, setManualCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
      } catch {
        // Denied, or no camera — typing the number still works.
        if (!cancelled) setStatus('manual')
        return
      }

      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // iOS refuses to autoplay unless both of these are set on the element.
        videoRef.current.setAttribute('playsinline', 'true')
        try { await videoRef.current.play() } catch { /* ignore */ }
      }
      if (cancelled) return
      setStatus('scanning')

      if (HAS_NATIVE) {
        runNative()
      } else {
        await runZXing()
      }
    }

    function handleCode(code) {
      if (cancelled) return
      stopStream()
      setStatus('found')
      lookupBarcode(code)
        .then(food => { if (!cancelled) onFound(food) })
        .catch(() => {
          if (cancelled) return
          setErrorMsg('Продуктът не е намерен. Провери номера.')
          setManualCode(code)
          setStatus('manual')
        })
    }

    function runNative() {
      const detector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      })
      const tick = () => {
        if (cancelled) return
        const v = videoRef.current
        if (!v || v.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return }
        detector.detect(v)
          .then(codes => {
            if (cancelled) return
            if (codes.length) handleCode(codes[0].rawValue)
            else rafRef.current = requestAnimationFrame(tick)
          })
          .catch(() => { rafRef.current = requestAnimationFrame(tick) })
      }
      tick()
    }

    async function runZXing() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && !cancelled) handleCode(result.getText())
        })
      } catch {
        if (!cancelled) {
          setErrorMsg('Разпознаването не тръгна. Въведи номера ръчно.')
          setStatus('manual')
        }
      }
    }

    start()
    return () => { cancelled = true; stopStream() }
  }, [])

  function stopStream() {
    cancelAnimationFrame(rafRef.current)
    try { readerRef.current?.reset?.() } catch { /* ignore */ }
    readerRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function handleManual(e) {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    setStatus('found')
    try {
      onFound(await lookupBarcode(code))
    } catch {
      setErrorMsg('Продуктът не е намерен в базата.')
      setStatus('manual')
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Баркод скенер">
      <div className={styles.modal}>
        <div className={styles.top}>
          <span className={styles.modalTitle}>СКЕНЕР</span>
          <button className={styles.closeBtn} onClick={() => { stopStream(); onClose() }} aria-label="Затвори">✕</button>
        </div>

        {(status === 'scanning' || status === 'opening') && (
          <div className={styles.cameraWrap}>
            <video ref={videoRef} className={styles.video} playsInline muted autoPlay />
            <div className={styles.crosshair} />
            <p className={styles.hint}>
              {status === 'opening' ? 'Отваря камерата…' : 'Насочи камерата към баркода'}
            </p>
          </div>
        )}

        {status === 'found' && (
          <div className={styles.searching}>
            <span className={styles.spinner} />
            <p>Търси продукта...</p>
          </div>
        )}

        {status === 'manual' && (
          <div className={styles.manualWrap}>
            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
            <p className={styles.manualLabel}>Въведи EAN / баркод:</p>
            <form onSubmit={handleManual} className={styles.manualForm}>
              <input
                className={styles.manualInput}
                type="text"
                inputMode="numeric"
                placeholder="напр. 3017620422003"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                autoFocus
              />
              <button type="submit" className={styles.manualBtn}>Търси</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
