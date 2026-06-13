import { useState, useRef, useEffect } from 'react'
import styles from './AvatarCropper.module.css'

const CROP = 280

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export default function AvatarCropper({ file, onConfirm, onCancel }) {
  const [imgSrc,    setImgSrc]    = useState(null)
  const [imgSize,   setImgSize]   = useState({ w: 1, h: 1 })
  const [scale,     setScale]     = useState(1)
  const [offset,    setOffset]    = useState({ x: 0, y: 0 })
  const [confirming, setConfirming] = useState(false)

  const imgRef   = useRef(null)
  const dragRef  = useRef(null)  // { startX, startY, startOX, startOY }
  const pinchRef = useRef(null)  // { dist, scale }

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    const img = new Image()
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img
      const coverScale = Math.max(CROP / w, CROP / h)
      setImgSize({ w, h })
      setScale(coverScale)
      setOffset({ x: 0, y: 0 })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  function clamp(ox, oy, sc) {
    const hw = (imgSize.w * sc) / 2
    const hh = (imgSize.h * sc) / 2
    const half = CROP / 2
    return {
      x: Math.max(half - hw, Math.min(hw - half, ox)),
      y: Math.max(half - hh, Math.min(hh - half, oy)),
    }
  }

  function minScale() {
    return Math.max(CROP / imgSize.w, CROP / imgSize.h)
  }

  // ── Mouse ──
  function onMouseDown(e) {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOX: offset.x, startOY: offset.y }
  }
  function onMouseMove(e) {
    if (!dragRef.current) return
    const nx = dragRef.current.startOX + (e.clientX - dragRef.current.startX)
    const ny = dragRef.current.startOY + (e.clientY - dragRef.current.startY)
    setOffset(clamp(nx, ny, scale))
  }
  function onMouseUp() { dragRef.current = null }

  function onWheel(e) {
    e.preventDefault()
    const next = Math.max(minScale(), Math.min(scale * (e.deltaY < 0 ? 1.1 : 0.9), 6))
    setScale(next)
    setOffset(o => clamp(o.x, o.y, next))
  }

  // ── Touch ──
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: getTouchDist(e.touches), scale }
    } else {
      dragRef.current = {
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        startOX: offset.x, startOY: offset.y,
      }
    }
  }
  function onTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 2 && pinchRef.current) {
      const d     = getTouchDist(e.touches)
      const next  = Math.max(minScale(), Math.min(pinchRef.current.scale * (d / pinchRef.current.dist), 6))
      setScale(next)
      setOffset(o => clamp(o.x, o.y, next))
    } else if (dragRef.current) {
      const nx = dragRef.current.startOX + (e.touches[0].clientX - dragRef.current.startX)
      const ny = dragRef.current.startOY + (e.touches[0].clientY - dragRef.current.startY)
      setOffset(clamp(nx, ny, scale))
    }
  }
  function onTouchEnd() { dragRef.current = null; pinchRef.current = null }

  async function handleConfirm() {
    setConfirming(true)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 300
    const ctx = canvas.getContext('2d')

    // Map display crop window (0,0)→(CROP,CROP) back to image source coords
    const imgLeft = CROP / 2 + offset.x - (imgSize.w * scale) / 2
    const imgTop  = CROP / 2 + offset.y - (imgSize.h * scale) / 2
    const srcX = (0 - imgLeft) / scale
    const srcY = (0 - imgTop)  / scale
    const srcW = CROP / scale
    const srcH = CROP / scale

    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, 300, 300)
    canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.93)
  }

  const imgStyle = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: imgSize.w,
    height: imgSize.h,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
    transformOrigin: 'center center',
    userSelect: 'none',
    pointerEvents: 'none',
    touchAction: 'none',
    draggable: false,
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.sheet}>
        <p className={styles.hint}>Плъзни · Щипни за мащаб</p>

        <div
          className={styles.cropWrap}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
        >
          {imgSrc && <img ref={imgRef} src={imgSrc} style={imgStyle} alt="" />}
          <div className={styles.cropRing} />
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">Откажи</button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={confirming} type="button">
            {confirming ? '…' : 'Потвърди'}
          </button>
        </div>
      </div>
    </div>
  )
}
