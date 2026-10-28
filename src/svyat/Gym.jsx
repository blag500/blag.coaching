import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import { clank } from './sound'

/* Залата по изгрев (етап 2, Р20) — сцена-диорама без предна стена:
 * прозорци с изгрева, лъчи и прах в тях, помост, стойка с щанга, гири,
 * дъмбели и BLAG в старо злато. Щангата се вдига при докосване. */

export const GYM_X = -26

const GOLD = '#c8a05a'
const RUBBER = '#18191b'
const STEEL = '#8e959c'

/** Изгревът в прозорците: вертикален преход, излъчва — Bloom го разлива. */
function sunriseTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#8fb3d9')
  grad.addColorStop(0.45, '#f7c79a')
  grad.addColorStop(0.75, '#ff9a5c')
  grad.addColorStop(1, '#ff7a45')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Window({ x, sky }) {
  return (
    <group position={[x, 2.55, 0.02]}>
      <mesh>
        <planeGeometry args={[1.5, 3.3]} />
        <meshBasicMaterial map={sky} toneMapped={false} color="#ffffff" />
      </mesh>
      {/* рамката и кръстът */}
      {[[0, 1.68, 1.62, 0.08], [0, -1.68, 1.62, 0.08], [-0.78, 0, 0.08, 3.4], [0.78, 0, 0.08, 3.4], [0, 0.35, 1.5, 0.05], [0, 0, 0.05, 3.3]].map(([px, py, w, h], i) => (
        <mesh key={i} position={[px, py, 0.03]}><boxGeometry args={[w, h, 0.06]} /><meshStandardMaterial color="#121315" metalness={0.5} roughness={0.5} /></mesh>
      ))}
    </group>
  )
}

/** Слънчев лъч: плоскост с преход, добавя светлина (additive). */
function Beam({ x, rot }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 128
    const g = c.getContext('2d')
    const grad = g.createLinearGradient(0, 0, 0, 128)
    grad.addColorStop(0, 'rgba(255,214,160,0.9)')
    grad.addColorStop(1, 'rgba(255,214,160,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={[x + 0.9, 2.2, 2.0]} rotation={[-0.9, 0, rot]}>
      <planeGeometry args={[1.4, 5.2]} />
      <meshBasicMaterial map={tex} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

function Plate({ x, r, w, color }) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, w, 40]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
    </mesh>
  )
}

/** Щангата: натискаш → вдига се, дисковете се въртят → пада със звън. */
function Barbell() {
  const bar = useRef()
  const plates = useRef()
  const clock = useThree((s) => s.clock)
  const lift = useRef({ start: -10, landed: true })
  useFrame((_, dt) => {
    const t = clock.elapsedTime - lift.current.start
    // нагоре 0.5 s, горе 0.5 s, надолу 0.4 s
    const up = t < 0 ? 0 : t < 0.5 ? t / 0.5 : t < 1 ? 1 : t < 1.4 ? 1 - (t - 1) / 0.4 : 0
    if (bar.current) bar.current.position.y = 1.42 + 0.62 * (up * up * (3 - 2 * up))
    if (plates.current && t > 0 && t < 1.4) plates.current.rotation.x += dt * 7
    if (t >= 1.4 && !lift.current.landed) { lift.current.landed = true; clank() }
  })
  const press = (e) => {
    e.stopPropagation()
    if (clock.elapsedTime - lift.current.start < 1.4) return   // още е във въздуха
    lift.current = { start: clock.elapsedTime, landed: false }
  }
  const hover = (on) => () => { document.body.style.cursor = on ? 'pointer' : '' }
  return (
    <group ref={bar} position={[0, 1.42, 0.95]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 2.2, 16]} />
        <meshStandardMaterial color={STEEL} metalness={1} roughness={0.25} />
      </mesh>
      <group ref={plates}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.82, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.028, 0.028, 0.42, 16]} /><meshStandardMaterial color={STEEL} metalness={1} roughness={0.2} /></mesh>
            <Plate x={s * -0.12} r={0.225} w={0.065} color="#173F2E" />
            <Plate x={s * -0.05} r={0.225} w={0.05} color="#e5482f" />
            <Plate x={s * 0.01} r={0.16} w={0.03} color="#eeeae1" />
          </group>
        ))}
      </group>
      {/* по-голяма невидима цел за пръста */}
      {/* прозрачна, не скрита: скрит обект не получава докосвания */}
      <mesh onPointerDown={press} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <boxGeometry args={[2.3, 0.5, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function Gym() {
  const sky = useMemo(sunriseTexture, [])
  return (
    <group position={[GYM_X, 0, 0]}>
      {/* под, задна и странични стени (без предна — диорама) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 3]}><planeGeometry args={[14, 6]} /><meshStandardMaterial color={RUBBER} roughness={0.92} /></mesh>
      <mesh position={[0, 3, 0]}><planeGeometry args={[14, 6]} /><meshStandardMaterial color="#d9d2c4" roughness={0.9} /></mesh>
      <mesh position={[-7, 3, 1.5]} rotation-y={Math.PI / 2}><planeGeometry args={[3, 6]} /><meshStandardMaterial color="#cfc7b8" roughness={0.9} /></mesh>
      <mesh position={[7, 3, 1.5]} rotation-y={-Math.PI / 2}><planeGeometry args={[3, 6]} /><meshStandardMaterial color="#cfc7b8" roughness={0.9} /></mesh>
      <mesh position={[0, 6, 1.5]} rotation-x={Math.PI / 2}><planeGeometry args={[14, 3]} /><meshStandardMaterial color="#bdb5a6" /></mesh>

      {/* прозорците с изгрева и лъчите */}
      {[-5.4, -3.6, -1.8].map((x) => <Window key={x} x={x} sky={sky} />)}
      {[-5.4, -3.6, -1.8].map((x, i) => <Beam key={x} x={x} rot={0.08 * (i - 1)} />)}
      <Sparkles count={140} scale={[6, 3.6, 4]} position={[-3.2, 2.2, 2]} size={2.2} speed={0.22} opacity={0.7} color="#ffdcae" />

      {/* BLAG в старо злато */}
      <Text font="/svyat/fonts/Oswald.ttf" fontSize={1.5} letterSpacing={0.06} position={[3.4, 3.7, 0.05]} anchorX="center" anchorY="middle">
        BLAG
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} emissive={GOLD} emissiveIntensity={0.12} />
      </Text>
      <pointLight position={[3.4, 2.5, 0.9]} intensity={9} distance={4.5} color="#ffd8a0" />

      {/* помостът: дърво в средата, гума отстрани */}
      <group position={[0, 0.03, 1.4]}>
        <mesh><boxGeometry args={[2.4, 0.06, 2.4]} /><meshStandardMaterial color={RUBBER} roughness={0.95} /></mesh>
        <mesh position={[0, 0.032, 0]}><boxGeometry args={[1.2, 0.005, 2.4]} /><meshStandardMaterial color="#b98a52" roughness={0.6} /></mesh>
      </group>

      {/* стойката и щангата */}
      <group position={[0, 0, 0.6]}>
        {[-1.05, 1.05].map((x) => (
          <group key={x} position={[x, 0, 0.35]}>
            <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.07, 2.4, 0.07]} /><meshStandardMaterial color="#1e2023" metalness={0.6} roughness={0.4} /></mesh>
            <mesh position={[0, 1.36, 0.06]}><boxGeometry args={[0.07, 0.06, 0.14]} /><meshStandardMaterial color="#e5482f" /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.03, 0.35]}><boxGeometry args={[2.3, 0.06, 0.6]} /><meshStandardMaterial color="#1e2023" metalness={0.6} roughness={0.4} /></mesh>
      </group>
      <group position={[0, 0, 0]}><Barbell /></group>

      {/* дъмбели вдясно, гири и пейка вляво */}
      <group position={[5.2, 0, 1.2]}>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.6, 0.06, 0.5]} /><meshStandardMaterial color="#1e2023" metalness={0.5} /></mesh>
        {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
          <group key={x} position={[x, 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.32, 10]} /><meshStandardMaterial color={STEEL} metalness={1} roughness={0.3} /></mesh>
            {[-0.14, 0.14].map((z) => <mesh key={z} position={[z, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05 + i * 0.008, 0.05 + i * 0.008, 0.07, 6]} /><meshStandardMaterial color="#232528" roughness={0.6} /></mesh>)}
          </group>
        ))}
      </group>
      <group position={[-4.6, 0, 2.4]}>
        {[0, 0.45, 0.9].map((x, i) => (
          <group key={x} position={[x, 0.16 + i * 0.02, 0]}>
            <mesh><sphereGeometry args={[0.16 + i * 0.02, 24, 18]} /><meshStandardMaterial color="#1b1c1e" roughness={0.55} metalness={0.3} /></mesh>
            <mesh position={[0, 0.2 + i * 0.02, 0]}><torusGeometry args={[0.08, 0.02, 10, 24, Math.PI]} /><meshStandardMaterial color="#1b1c1e" metalness={0.4} /></mesh>
          </group>
        ))}
      </group>
      <group position={[2.6, 0, 2.6]} rotation-y={-0.4}>
        <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.32, 0.08, 1.2]} /><meshStandardMaterial color="#202224" roughness={0.7} /></mesh>
        {[-0.45, 0.45].map((z) => <mesh key={z} position={[0, 0.2, z]}><boxGeometry args={[0.06, 0.4, 0.06]} /><meshStandardMaterial color="#1e2023" metalness={0.6} /></mesh>)}
      </group>

      {/* светлината в залата: изгревът отзад, топло отгоре */}
      <pointLight position={[-3.6, 3.2, 1.2]} intensity={22} distance={10} color="#ffb27a" />
      <pointLight position={[2.5, 5.2, 2.5]} intensity={10} distance={9} color="#fff0dc" />
    </group>
  )
}
