import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lookupBarcode, looksInconsistent, correctBarcode } from '../../utils/openFoodFacts'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './BarcodeScanner.module.css'

// Chrome and Android ship a native decoder; Safari does not. Camera access
// itself works everywhere, so where the native one is missing we load ZXing
// and decode the same video stream in JavaScript. It is ~200 KB, so it is
// only fetched when actually needed.
const HAS_NATIVE = typeof BarcodeDetector !== 'undefined'

export default function BarcodeScanner({ onFound, onClose }) {
  const { t } = useSettings()
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('opening') // opening | scanning | found | manual | unknown | review
  // A product whose own numbers do not add up, held back for a look.
  const [review, setReview] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  // Details typed in for a barcode nobody has catalogued yet.
  const [newProduct, setNewProduct] = useState({ name: '', grams: '100', kcal: '', protein: '', carbs: '', fat: '' })
  const [saving, setSaving] = useState(false)
  // Torch is a camera-track capability, not a browser API — absent on iOS and
  // on any device without a rear lamp, so the button only shows when supported.
  // Whether a code has already been acted on this session.
  const handledRef = useRef(false)
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
      // One scan, one answer. The decoder keeps firing on every frame it can
      // read, so without this the second detection reopens a lookup while the
      // first one's result is already on screen — which is what made the sheet
      // flip between "searching" and the form, forever, with no way to type.
      if (handledRef.current) return
      handledRef.current = true
      stopStream()
      setStatus('found')
      lookupBarcode(code)
        .then(food => {
          if (cancelled) return
          // The fast path stays fast. A scan only stops for a look when the
          // product's own arithmetic is wrong — which is exactly the case where
          // adding it silently would put a bad number in the day.
          if (looksInconsistent(food.per100g)) {
            setManualCode(code)
            setReview(food)
            setStatus('review')
            return
          }
          onFound(food)
        })
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
        // decodeFromVideoElement resolves to a controls object, and stopping is
        // controls.stop(). The reader itself has no reset() — the call that was
        // here did nothing at all, silently, which is why the decoder ran on.
        const controls = await reader.decodeFromVideoElement(
          videoRef.current,
          (result) => { if (result && !cancelled) handleCode(result.getText()) },
        )
        if (cancelled) { controls.stop(); return }
        readerRef.current = controls
      } catch {
        if (!cancelled) {
          setErrorMsg(t('bs.startFailed'))
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
    try { readerRef.current?.stop?.() } catch { /* already stopped */ }
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
      const food = await lookupBarcode(code)
      if (looksInconsistent(food.per100g)) { setReview(food); setStatus('review'); return }
      onFound(food)
    } catch {
      setStatus('unknown')
    }
  }

  /** Accept the reviewed product, saving the numbers if they were changed. */
  async function acceptReview(e) {
    e.preventDefault()
    if (saving) return
    const per100g = {
      kcal:    Math.round(+review.per100g.kcal    || 0),
      protein: +review.per100g.protein || 0,
      carbs:   +review.per100g.carbs   || 0,
      fat:     +review.per100g.fat     || 0,
    }
    setSaving(true)
    // Written back to the shared row, so the next person to scan this gets the
    // corrected figures rather than repeating the same discovery.
    await correctBarcode(manualCode.trim(), {
      name: review.name,
      per100g,
      typicalGrams: parseInt(review.servingSize) || 100,
    })
    setSaving(false)
    onFound({ ...review, per100g })
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
    if (error) { setErrorMsg(t('bs.saveFailed')); return }

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
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('bs.dialogAria')}>
      <div className={styles.modal}>
        <div className={styles.top}>
          <span className={styles.modalTitle}>{t('bs.title')}</span>
          <button className={styles.closeBtn} onClick={() => { stopStream(); onClose() }} aria-label={t('bs.close')}>✕</button>
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
                aria-label={torchOn ? t('bs.torchOff') : t('bs.torchOn')}
              >⚡</button>
            )}
            <p className={styles.hint}>
              {status === 'opening' ? t('bs.opening') : t('bs.aim')}
            </p>
          </div>
        )}

        {status === 'found' && (
          <div className={styles.searching}>
            <span className={styles.spinner} />
            <p>{t('bs.searching')}</p>
          </div>
        )}

        {status === 'manual' && (
          <div className={styles.manualWrap}>
            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
            <p className={styles.manualLabel}>{t('bs.manualLabel')}</p>
            <form onSubmit={handleManual} className={styles.manualForm}>
              <input
                className={styles.manualInput}
                type="text"
                inputMode="numeric"
                placeholder={t('bs.manualPh')}
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                autoFocus
              />
              <button type="submit" className={styles.manualBtn}>{t('bs.manualBtn')}</button>
            </form>
          </div>
        )}

        {status === 'review' && review && (
          <div className={styles.unknownWrap}>
            <p className={styles.unknownLead}>
              {t('bs.mismatch')}
            </p>
            <p className={styles.reviewName}>{review.name}</p>

            <form onSubmit={acceptReview} className={styles.unknownForm}>
              <p className={styles.unknownHint}>{t('bs.per100')}</p>
              <div className={styles.unknownGrid}>
                {[
                  { k: 'kcal',    label: t('macro.kcalCaps'), color: 'var(--accent)' },
                  { k: 'protein', label: t('macro.p'),        color: 'var(--macro-protein)' },
                  { k: 'carbs',   label: t('macro.c'),        color: 'var(--macro-carbs)' },
                  { k: 'fat',     label: t('macro.f'),        color: 'var(--macro-fat)' },
                ].map(({ k, label, color }) => (
                  <label className={styles.unknownCell} key={k}>
                    <span className={styles.unknownTag} style={{ color }}>{label}</span>
                    <input
                      type="number" min="0" step="0.1" inputMode="decimal"
                      value={review.per100g[k] ?? ''}
                      onChange={e => setReview(r => ({
                        ...r, per100g: { ...r.per100g, [k]: e.target.value },
                      }))}
                      aria-label={label}
                    />
                  </label>
                ))}
              </div>

              <button type="submit" className={styles.manualBtn} disabled={saving}>
                {saving ? t('bs.saving') : t('bs.add')}
              </button>
              <p className={styles.reviewNote}>
                {t('bs.fixNote')}
              </p>
            </form>
          </div>
        )}

        {status === 'unknown' && (
          <div className={styles.unknownWrap}>
            <p className={styles.unknownLead}>
              {t('bs.unknown')}
            </p>
            <p className={styles.unknownCode}>{manualCode}</p>
            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

            <form onSubmit={saveProduct} className={styles.unknownForm}>
              <input
                className={styles.manualInput}
                placeholder={t('bs.namePh')}
                value={newProduct.name}
                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                autoFocus
                aria-label={t('bs.namePh')}
              />

              <p className={styles.unknownHint}>{t('bs.per100Label')}</p>
              <div className={styles.unknownGrid}>
                {[
                  { k: 'kcal',    label: t('macro.kcalCaps'), color: 'var(--accent)' },
                  { k: 'protein', label: t('macro.p'),        color: 'var(--macro-protein)' },
                  { k: 'carbs',   label: t('macro.c'),        color: 'var(--macro-carbs)' },
                  { k: 'fat',     label: t('macro.f'),        color: 'var(--macro-fat)' },
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
                {saving ? t('bs.saving') : t('bs.saveAndAdd')}
              </button>
            </form>

            <button
              className={styles.retryBtn}
              onClick={() => { setErrorMsg(''); handledRef.current = false; setStatus('manual') }}
              type="button"
            >
              {t('bs.otherBarcode')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
