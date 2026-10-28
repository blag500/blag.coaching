import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, Scroll, ScrollControls, useProgress, useScroll } from '@react-three/drei'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Noise, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Street from './Street.jsx'
import Gym, { GYM_X } from './Gym.jsx'
import Atmosphere, { nightAt } from './Atmosphere.jsx'
import Sections from './Sections.jsx'
import { ignite } from './neon'
import { setScrollEl, takeStart, onHashChange, STOPS } from './nav'

/* Сцената: скролът движи камерата по ключови кадри, HTML секциите текат над
 * 3D-то (Scroll html), а Bloom прави ореола на неона. */

const PAGES = 5
// [отместване, позиция на камерата, накъде гледа, (накъде гледа по x на изправен телефон)]
const G = GYM_X
const KEYS = [
  [0.0, [G - 0.5, 1.75, 6.2], [G + 0.5, 1.5, -10], G],   // от входа по дължината на залата
  [0.25, [G - 0.4, 1.7, 1.0], [G + 1.7, 1.2, -2.6], G + 1], // лежанката до дясната стена
  [0.5, [-0.4, 2.7, 8.4], [0, 3.6, 0]],               // улицата и неонът
  [0.75, [2.6, 1.6, 4.4], [4.6, 1.35, 0]],            // вратата
  [1.0, [-1.4, 2.1, 6.8], [0, 3.3, 0]],               // картата
]
const ease = (x) => x * x * (3 - 2 * x)
const P = new THREE.Vector3()
const L = new THREE.Vector3()

function Rig({ reduce }) {
  const scroll = useScroll()
  const look = useRef(new THREE.Vector3(G + 0.5, 1.5, -10))
  useFrame((state, dt) => {
    const o = scroll.offset
    let i = 1
    while (i < KEYS.length - 1 && KEYS[i][0] < o) i++
    const [a, pa, la, qa = la[0]] = KEYS[i - 1]
    const [b, pb, lb, qb = lb[0]] = KEYS[i]
    const k = ease(THREE.MathUtils.clamp((o - a) / (b - a), 0, 1))
    P.fromArray(pa).lerp(L.fromArray(pb), k)
    const lx = THREE.MathUtils.lerp(la[0], lb[0], k), ly = THREE.MathUtils.lerp(la[1], lb[1], k), lz = THREE.MathUtils.lerp(la[2], lb[2], k)
    // Изправен телефон: по-назад и погледът по-ниско — неонът отива в горната
    // половина, текстът е долу (svyat.css, @media (max-aspect-ratio: 4/5)).
    let ly2 = ly
    let lx2 = lx
    // Камерата застава срещу точката, към която гледа — не към нулата на
    // света (там е улицата; залата е на x = −26).
    if (state.size.width / state.size.height < 0.8) { lx2 = THREE.MathUtils.lerp(qa, qb, k); P.z += o < 0.32 ? 1.2 : 4.5; P.x = THREE.MathUtils.lerp(P.x, lx2, 0.8); ly2 = ly - (o < 0.32 ? 0.6 : 1.7) }   // в тесния коридор — само крачка назад
    if (!reduce) { P.x += state.pointer.x * 0.35; P.y += state.pointer.y * 0.18 }
    const s = reduce ? 20 : 3.2
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, P.x, s, dt)
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, P.y, s, dt)
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, P.z, s, dt)
    look.current.set(
      THREE.MathUtils.damp(look.current.x, lx2, s, dt),
      THREE.MathUtils.damp(look.current.y, ly2, s, dt),
      THREE.MathUtils.damp(look.current.z, lz, s, dt),
    )
    state.camera.lookAt(look.current)
    if (o > 0.4) ignite()
  })
  return null
}

/* Дава на менюто скролващия елемент и скача към #адреса при отваряне. */
function Nav() {
  const scroll = useScroll()
  const pending = useRef(null)
  useEffect(() => {
    setScrollEl(scroll.el)
    const id = takeStart()
    if (id && STOPS.includes(id)) pending.current = { i: STOPS.indexOf(id), id, frames: 0 }
    window.addEventListener('hashchange', onHashChange)
    return () => { setScrollEl(null); window.removeEventListener('hashchange', onHashChange) }
  }, [scroll.el])
  // Скокът при отваряне се повтаря кадър по кадър, докато drei наистина го
  // прочете: слушателят му се закача с закъснение (и след шрифта на залата),
  // а събитие преди това се губи. До 4 секунди.
  useFrame(() => {
    const p = pending.current
    if (!p) return
    const target = p.i / (STOPS.length - 1)
    if (Math.abs(scroll.offset - target) < 0.02 || p.frames++ > 240) {
      history.replaceState(null, '', `#${p.id}`)
      pending.current = null
      return
    }
    const el = scroll.el
    el.scrollTop = target * (el.scrollHeight - el.clientHeight)
    el.dispatchEvent(new Event('scroll'))
  })
  return null
}

/* Тонът: залата е почти черно-бяла и контрастна като стара снимка; с
   нощта цветът се връща и неонът на улицата е в цвят. */
function Grade() {
  const scroll = useScroll()
  const hue = useRef()
  const bc = useRef()
  useFrame(() => {
    const day = 1 - nightAt(scroll.offset)
    if (hue.current) hue.current.saturation = -0.5 * day
    if (bc.current) bc.current.contrast = 0.22 * day
  })
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.2} radius={0.7} />
      <HueSaturation ref={hue} saturation={-0.5} />
      <BrightnessContrast ref={bc} contrast={0.22} />
      <Noise premultiply opacity={0.55} />
      <Vignette offset={0.22} darkness={0.78} />
    </EffectComposer>
  )
}

/* Първият кадър е нарисуван — зареждането може да се махне. Неонът се пали
   в Rig, когато камерата стигне улицата. */
function Ignite({ onReady }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onReady?.()
  })
  return null
}

export default function Scene({ onReady, onSlow, onProgress, reduce }) {
  // Броячът е тук, не в App: така лекият изглед не тегли drei само заради него.
  const { progress } = useProgress()
  useEffect(() => { onProgress?.(progress) }, [progress, onProgress])
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [GYM_X - 0.5, 1.75, 6.2], fov: 45, near: 0.1, far: 90 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0 }}>
      <PerformanceMonitor onDecline={onSlow} bounds={() => [30, 55]} flipflops={3} />
      <Suspense fallback={null}>
        <ScrollControls pages={PAGES} damping={0.22}>
          <Atmosphere />
          <Gym />
          <Street />
          <Rig reduce={reduce} />
          <Nav />
          <Scroll html style={{ width: '100%' }}>
            <Sections />
          </Scroll>
          <Grade />
        </ScrollControls>
        <Ignite onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
