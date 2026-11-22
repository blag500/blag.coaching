import { useEffect, useRef } from 'react'
import styles from './Floaters.module.css'

/* Елементчетата на фона (22.11): летят постоянно и отскачат от краищата на
 * екрана като стария DVD скрийнсейвър; при удар сменят цвета. Под съдържанието,
 * без докосване, приглушени. При „намалено движение“ стоят на място. */

const ITEMS = ['希娅', 'Si', '🐉', '𝒪.']
const COLORS = ['#FF7A70', '#A594FF', '#5AB8FF', '#4CC38A', '#F2B45A', '#E58BD0']
const SPEED = 38 // пиксела в секунда

export default function Floaters() {
  const refs = useRef([])

  useEffect(() => {
    const els = refs.current.filter(Boolean)
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const W = () => window.innerWidth
    const H = () => window.innerHeight
    const st = els.map((el, i) => {
      const a = Math.random() * Math.PI * 2
      const sp = SPEED * (0.8 + Math.random() * 0.5)
      return {
        el,
        x: Math.random() * Math.max(1, W() - el.offsetWidth),
        y: Math.random() * Math.max(1, H() - el.offsetHeight),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: Math.random() * 30 - 15,
        vr: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10),
        c: i % COLORS.length,
      }
    })
    const paint = (s) => {
      s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rot}deg)`
      s.el.style.color = COLORS[s.c]
    }
    st.forEach(paint)
    if (still) return undefined

    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = W(); const h = H()
      for (const s of st) {
        const ew = s.el.offsetWidth; const eh = s.el.offsetHeight
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt
        let hit = false
        if (s.x <= 0) { s.x = 0; s.vx = Math.abs(s.vx); hit = true }
        if (s.x >= w - ew) { s.x = Math.max(0, w - ew); s.vx = -Math.abs(s.vx); hit = true }
        if (s.y <= 0) { s.y = 0; s.vy = Math.abs(s.vy); hit = true }
        if (s.y >= h - eh) { s.y = Math.max(0, h - eh); s.vy = -Math.abs(s.vy); hit = true }
        if (hit) { s.c = (s.c + 1) % COLORS.length; s.vr = -s.vr }
        paint(s)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={styles.layer} aria-hidden="true">
      {ITEMS.map((t, i) => (
        <span key={t} ref={(el) => { refs.current[i] = el }} className={styles.item}>{t}</span>
      ))}
    </div>
  )
}
