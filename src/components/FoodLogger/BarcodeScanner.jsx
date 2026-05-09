import { useEffect, useRef, useState } from 'react'
import { lookupBarcode } from '../../utils/openFoodFacts'
import styles from './BarcodeScanner.module.css'

const SUPPORTED = typeof BarcodeDetector !== 'undefined'

export default function BarcodeScanner({ onFound, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)
  const [status, setStatus] = useState('opening') // opening | scanning | found | error | manual
  const [manualCode, setManualCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!SUPPORTED) {
      setStatus('manual')
      return
    }

    detectorRef.current = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })

    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setStatus('scanning')
        scan()
      })
      .catch(() => {
        if (!cancelled) setStatus('manual')
      })

    function scan() {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan)
        return
      }
      detectorRef.current.detect(videoRef.current)
        .then(codes => {
          if (cancelled) return
          if (codes.length > 0) {
            const code = codes[0].rawValue
            stopStream()
            setStatus('found')
            return lookupBarcode(code)
              .then(food => { if (!cancelled) onFound(food) })
              .catch(() => { if (!cancelled) { setErrorMsg('Продуктът не е намерен. Опитай ръчно.'); setStatus('manual') } })
          }
          rafRef.current = requestAnimationFrame(scan)
        })
        .catch(() => { rafRef.current = requestAnimationFrame(scan) })
    }

    return () => {
      cancelled = true
      stopStream()
    }
  }, [])

  function stopStream() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function handleManual(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    setStatus('found')
    try {
      const food = await lookupBarcode(manualCode.trim())
      onFound(food)
    } catch {
      setErrorMsg('Продуктът не е намерен.')
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
            <p className={styles.hint}>Насочи камерата към баркода</p>
          </div>
        )}

        {status === 'found' && (
          <div className={styles.searching}>
            <span className={styles.spinner} />
            <p>Търси продукта...</p>
          </div>
        )}

        {(status === 'manual') && (
          <div className={styles.manualWrap}>
            {!SUPPORTED && (
              <p className={styles.unsupported}>Камерата не се поддържа в този браузър.</p>
            )}
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
