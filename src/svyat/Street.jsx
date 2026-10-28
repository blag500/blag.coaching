import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, useScroll } from '@react-three/drei'
import { nightAt } from './Atmosphere.jsx'
import * as THREE from 'three'
import Neon from './Neon.jsx'
import { glow } from './neon'
import { setHum } from './sound'

/* Улицата в Метро Сити, нощ: тухлена стена с неона, тротоар, мокър асфалт,
 * който го отразява, и вратата с четеца. Тухлите се рисуват в canvas — нула
 * файлове за сваляне и шевът при повторението е гарантирано чист. */

function bricks() {
  const W = 1024, H = 512, bw = 128, bh = 42, m = 5
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#141b16'
  g.fillRect(0, 0, W, H)
  for (let row = 0; row * bh < H; row++) {
    const off = row % 2 ? bw / 2 : 0
    for (let x = -bw; x < W + bw; x += bw) {
      const l = 15 + Math.random() * 7
      g.fillStyle = `hsl(${138 + Math.random() * 10}, ${16 + Math.random() * 8}%, ${l}%)`
      // по модул ширината — тухлата на ръба се появява и от другата страна
      for (const dx of [0, -W, W]) g.fillRect(x + off + m / 2 + dx, row * bh + m / 2, bw - m, bh - m)
    }
  }
  const img = g.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3.4)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function Door() {
  const screen = useRef()
  useFrame(({ clock }) => {
    if (screen.current) screen.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 2.4) * 0.5
  })
  return (
    <group position={[5.1, 0, 0.05]}>
      {/* рамката */}
      {[[-0.7, 1.3, 0.12, 2.6], [0.7, 1.3, 0.12, 2.6], [0, 2.62, 1.52, 0.12]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.06]}><boxGeometry args={[w, h, 0.14]} /><meshStandardMaterial color="#0d100e" metalness={0.6} roughness={0.4} /></mesh>
      ))}
      {/* вътре: тъмно, с осветени рафтове; отпред — стъкло, което отразява */}
      <mesh position={[0, 1.3, -0.14]}>
        <planeGeometry args={[1.28, 2.5]} />
        <meshStandardMaterial color="#07090b" roughness={1} />
      </mesh>
      {[0.55, 1.05, 1.55, 2.05].map((y) => (
        <mesh key={y} position={[0, y, -0.09]}>
          <planeGeometry args={[1.1, 0.035]} />
          <meshStandardMaterial color="#000" emissive="#ffe2b0" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
      {[0.75, 1.25, 1.75].map((y) => (
        <mesh key={`p${y}`} position={[0, y, -0.11]}>
          <planeGeometry args={[1.0, 0.16]} />
          <meshStandardMaterial color="#2b3a22" emissive="#d4f04a" emissiveIntensity={0.05} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.3, 0.05]}>
        <planeGeometry args={[1.28, 2.5]} />
        <meshPhysicalMaterial color="#0a0e12" transparent opacity={0.38} roughness={0.05} metalness={0.2} clearcoat={1} />
      </mesh>
      {/* четецът до вратата */}
      <group position={[-1.12, 1.3, 0.08]}>
        <mesh><boxGeometry args={[0.2, 0.3, 0.06]} /><meshStandardMaterial color="#141614" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 0.03, 0.032]}>
          <planeGeometry args={[0.13, 0.13]} />
          <meshStandardMaterial ref={screen} color="#000" emissive="#d4f04a" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>
      {/* лампата над вратата */}
      <mesh position={[0, 2.98, 0.25]}><cylinderGeometry args={[0.12, 0.26, 0.16, 24, 1, true]} /><meshStandardMaterial color="#141614" metalness={0.8} roughness={0.35} side={2} /></mesh>
      <mesh position={[0, 2.91, 0.25]} rotation-x={Math.PI / 2}><circleGeometry args={[0.2, 24]} /><meshStandardMaterial color="#000" emissive="#ffcf8a" emissiveIntensity={2.2} toneMapped={false} side={2} /></mesh>
      <spotLight position={[0, 2.9, 0.4]} angle={0.7} penumbra={0.8} intensity={14} distance={6} color="#ffcf8a" target-position={[0, 0, 1.2]} />
    </group>
  )
}

/* Улична лампа по пътя от залата: свети, когато падне нощта. */
function Lamp({ x }) {
  const scroll = useScroll()
  const light = useRef()
  const head = useRef()
  useFrame(() => {
    const n = nightAt(scroll.offset)
    if (light.current) light.current.intensity = 16 * n
    if (head.current) head.current.emissiveIntensity = 0.1 + 2.6 * n
  })
  return (
    <group position={[x, 0, 1.6]}>
      <mesh position={[0, 2.1, 0]}><cylinderGeometry args={[0.04, 0.06, 4.2, 10]} /><meshStandardMaterial color="#121412" metalness={0.6} roughness={0.5} /></mesh>
      <mesh position={[0, 4.18, 0.22]}><boxGeometry args={[0.06, 0.06, 0.5]} /><meshStandardMaterial color="#121412" metalness={0.6} /></mesh>
      <mesh position={[0, 4.08, 0.45]}><boxGeometry args={[0.32, 0.08, 0.2]} />
        <meshStandardMaterial ref={head} color="#111" emissive="#ffc98a" emissiveIntensity={0.1} toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 3.9, 0.5]} intensity={0} distance={6.5} color="#ffc98a" />
    </group>
  )
}

/* Бръмченето следва колко свети неонът. */
function Hum() {
  useFrame(() => setHum(glow()))
  return null
}

export default function Street() {
  const map = useMemo(bricks, [])
  // стената е 28 широка — повторението се разтяга, за да са тухлите същия размер
  const wallMap = useMemo(() => { const t = map.clone(); t.repeat.set(3 * 28 / 18, 3.4); t.needsUpdate = true; return t }, [map])
  return (
    <>
      {/* небето, мъглата и общата светлина — в Atmosphere (денят тече) */}

      {/* стената и корнизът */}
      <mesh position={[-5, 3.4, 0]}>
        <planeGeometry args={[28, 6.8]} />
        <meshStandardMaterial map={wallMap} bumpMap={wallMap} bumpScale={2.2} roughness={0.95} color="#b9cbbd" />
      </mesh>
      <mesh position={[-5, 6.95, 0.2]}><boxGeometry args={[28, 0.3, 0.5]} /><meshStandardMaterial color="#0b0e0b" roughness={0.8} /></mesh>

      <Neon />
      <Lamp x={-13.5} />
      <Lamp x={-7.5} />
      <Door />
      <Hum />

      {/* тротоарът */}
      <mesh position={[-5, 0.06, 0.95]}><boxGeometry args={[28, 0.12, 1.9]} /><meshStandardMaterial color="#1a1e1b" roughness={0.85} /></mesh>
      {/* мокрият асфалт */}
      <mesh rotation-x={-Math.PI / 2} position={[-4, 0, 10]}>
        <planeGeometry args={[34, 18]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={512} mixBlur={1} mixStrength={22} roughness={0.9}
          depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#0b0d0e" metalness={0.6} mirror={0.7} />
      </mesh>
    </>
  )
}
