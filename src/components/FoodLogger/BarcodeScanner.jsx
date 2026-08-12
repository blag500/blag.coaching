import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lookupBarcode } from '../../utils/openFoodFacts'
import { supabase } from '../../lib/supabase'
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
  const [status, setStatus] = useState('opening') // opening | scanning | found | manual | unknown
  const [manualCode, setManualCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  // Details typed in for a barcode nobody has catalogued yet.
  const [newProduct, setNewProduct] = useState({ name: '', grams: '100', kcal: '', protein: '', carbs: '', fat: '' })
  const [saving, setSaving] = useState(false)
  // Torch is a camera-track capability, not a browser API — absent on iOS and
  // on any device without a rear lamp, so the button only shows when supported.
  const [hasTorch, setHasTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

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

      const track = stream.getVideoTracks()[0]
      if (track?.getCapabilities?.().torch) setHasTorch(true)

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
          setManualCode(code)
          setStatus('unknown')
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

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch { /* lamp refused — leave the button as it was */ }
  }

  function stopStream() {
    setTorchOn(false)
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
      setStatus('unknown')
    }
  }

  /** Catalogue an unknown barcode. Written to the shared table, so the next
   *  person to scan it gets the product straight away. */
  async function saveProduct(e) {
    e.preventDefault()
    const name = newProduct.name.trim()
    if (!name || saving) return
    setSaving(true)

    const per100 = {
      kcal:    Math.round(+newProduct.kcal    || 0),
      protein: +newProduct.protein || 0,
      carbs:   +newProduct.carbs   || 0,
      fat:     +newProduct.fat     || 0,
    }
    const { error } = await supabase.from('barcode_products').insert({
      barcode: manualCode.trim(),
      name,
      typical_grams: Math.round(+newProduct.grams || 100),
      ...per100,
    })
    setSaving(false)
    if (error) { setErrorMsg('Неуспешен запис. Опитай пак.'); return }

    onFound({
      id: crypto.randomUUID(),
      name,
      brand: '',
      servingSize: `${Math.round(+newProduct.grams || 100)}g`,
      per100g: per100,
    })
  }

  // Rendered into body: the page wrapper animates with a transform, and a
  // transformed ancestor makes position:fixed resolve against it instead of the
  // viewport — the sheet ended up below the fold rather than over the screen.
  return createPortal(
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
            {hasTorch && (
              <button
                className={`${styles.torchBtn} ${torchOn ? styles.torchOn : ''}`}
                onClick={toggleTorch}
                type="button"
                aria-pressed={torchOn}
                aria-label={torchOn ? 'Изгаси светкавицата' : 'Светкавица'}
              >⚡</button>
            )}
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

        {status === 'unknown' && (
          <div className={styles.unknownWrap}>
            <p className={styles.unknownLead}>
              Този баркод още го няма в базата. Въведи го веднъж и следващия път ще се разпознава сам.
            </p>
            <p className={styles.unknownCode}>{manualCode}</p>
            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

            <form onSubmit={saveProduct} className={styles.unknownForm}>
              <input
                className={styles.manualInput}
                placeholder="Име на продукта"
                value={newProduct.name}
                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                autoFocus
                aria-label="Име на продукта"
              />

              <p className={styles.unknownHint}>Стойности на 100 г от етикета:</p>
              <div className={styles.unknownGrid}>
                {[
                  { k: 'kcal',    label: 'ККАЛ', color: 'var(--accent)' },
                  { k: 'protein', label: 'П',    color: '#42A5F5' },
                  { k: 'carbs',   label: 'В',    color: '#66BB6A' },
                  { k: 'fat',     label: 'М',    color: '#CE93D8' },
                ].map(({ k, label, color }) => (
                  <label className={styles.unknownCell} key={k}>
                    <span className={styles.unknownTag} style={{ color }}>{label}</span>
                    <input
                      type="number" min="0" step="0.1" inputMode="decimal"
                      value={newProduct[k]}
                      onChange={e => setNewProduct(p => ({ ...p, [k]: e.target.value }))}
                      placeholder="0"
                      aria-label={label}
                    />
                  </label>
                ))}
              </div>

              <button type="submit" className={styles.manualBtn} disabled={saving}>
                {saving ? 'Записва…' : 'Запази и добави'}
              </button>
            </form>

            <button
              className={styles.retryBtn}
              onClick={() => { setErrorMsg(''); setStatus('manual') }}
              type="button"
            >
              ← Друг баркод
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
