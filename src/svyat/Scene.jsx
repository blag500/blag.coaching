import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, Scroll, ScrollControls, useProgress, useScroll } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Street from './Street.jsx'
import Sections from './Sections.jsx'
import { ignite } from './neon'
import { setScrollEl, jumpTo, takeStart } from './nav'

/* Сцената: скролът движи камерата по ключови кадри, HTML секциите текат над
 * 3D-то (Scroll html), а Bloom прави ореола на неона. */

const PAGES = 4
// [отместване, позиция на камерата, накъде гледа]
const KEYS = [
  [0.0, [-1.6, 1.7, 15.5], [-3.0, 3.2, 0]],   // неонът вдясно — заглавието е вляво
  [0.34, [-0.4, 2.7, 8.4], [0, 3.6, 0]],
  [0.67, [2.6, 1.6, 4.4], [4.6, 1.35, 0]],
  [1.0, [-1.4, 2.1, 6.8], [0, 3.3, 0]],
]
const ease = (x) => x * x * (3 - 2 * x)
const P = new THREE.Vector3()
const L = new THREE.Vector3()

function Rig({ reduce }) {
  const scroll = useScroll()
  const look = useRef(new THREE.Vector3(0, 3.2, 0))
  useFrame((state, dt) => {
    const o = scroll.offset
    let i = 1
    while (i < KEYS.length - 1 && KEYS[i][0] < o) i++
    const [a, pa, la] = KEYS[i - 1]
    const [b, pb, lb] = KEYS[i]
    const k = ease(THREE.MathUtils.clamp((o - a) / (b - a), 0, 1))
    P.fromArray(pa).lerp(L.fromArray(pb), k)
    const lx = THREE.MathUtils.lerp(la[0], lb[0], k), ly = THREE.MathUtils.lerp(la[1], lb[1], k), lz = THREE.MathUtils.lerp(la[2], lb[2], k)
    // Изправен телефон: по-назад и погледът по-ниско — неонът отива в горната
    // половина, текстът е долу (svyat.css, @media (max-aspect-ratio: 4/5)).
    let ly2 = ly
    let lx2 = lx
    if (state.size.width / state.size.height < 0.8) { P.z += 4.5; P.x *= 0.2; ly2 = ly - 1.7; lx2 = lx * 0.2 }
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
  })
  return null
}

/* Дава на менюто скролващия елемент и скача към #адреса при отваряне. */
function Nav() {
  const scroll = useScroll()
  useEffect(() => {
    setScrollEl(scroll.el)
    const id = takeStart()
    if (id) requestAnimationFrame(() => jumpTo(id, 'auto'))
    return () => setScrollEl(null)
  }, [scroll.el])
  return null
}

/* Неонът се пали малко след като сцената е готова — първото „уау“. */
function Ignite({ onReady }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onReady?.()
    setTimeout(ignite, 900)
  })
  return null
}

export default function Scene({ onReady, onSlow, onProgress, reduce }) {
  // Броячът е тук, не в App: така лекият изглед не тегли drei само заради него.
  const { progress } = useProgress()
  useEffect(() => { onProgress?.(progress) }, [progress, onProgress])
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.7, 15.5], fov: 45, near: 0.1, far: 90 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0 }}>
      <PerformanceMonitor onDecline={onSlow} bounds={() => [30, 55]} flipflops={3} />
      <Suspense fallback={null}>
        <ScrollControls pages={PAGES} damping={0.22}>
          <Street />
          <Rig reduce={reduce} />
          <Nav />
          <Scroll html style={{ width: '100%' }}>
            <Sections />
          </Scroll>
        </ScrollControls>
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.2} radius={0.7} />
          <Noise premultiply opacity={0.5} />
          <Vignette offset={0.22} darkness={0.78} />
        </EffectComposer>
        <Ignite onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
