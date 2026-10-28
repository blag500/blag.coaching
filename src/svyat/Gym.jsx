import { useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import { clank } from './sound'

/* Залата по изгрев (етап 2, Р20) — олдскул бодибилдинг зала, диорама без
 * предна стена: тъмна тухла, гумен под, високи фабрични прозорци с изгрева,
 * индустриални лампи, хромирани дъмбели, железни дискове, пейки с кожа и
 * знакът BLAG с двете ръце над стойката. Щангата се вдига при докосване.
 * Хромът има нужда от отражение: малка рисувана карта на стаята (тъмно,
 * топли лампи отгоре, изгревът отляво), само за материалите на залата.
 * RoomEnvironment изглеждаше същото, но удвояваше първото зареждане. */

export const GYM_X = -26

const GOLD = '#d9b26a'
const RUBBER = '#141516'
const LEATHER = '#5a1a17'

/* ---------- текстури, рисувани в canvas ---------- */

function brickTexture() {
  const W = 1024, H = 512, bw = 128, bh = 40, m = 6
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#1b1310'
  g.fillRect(0, 0, W, H)
  for (let row = 0; row * bh < H; row++) {
    const off = row % 2 ? bw / 2 : 0
    for (let x = -bw; x < W + bw; x += bw) {
      g.fillStyle = `hsl(${10 + Math.random() * 12}, ${28 + Math.random() * 14}%, ${20 + Math.random() * 9}%)`
      for (const dx of [0, -W, W]) g.fillRect(x + off + m / 2 + dx, row * bh + m / 2, bw - m, bh - m)
    }
  }
  const img = g.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Гумени плочи 1×1 м с тънки фуги и петна от магнезий. */
function floorTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#17181a'
  g.fillRect(0, 0, S, S)
  const img = g.getImageData(0, 0, S, S)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.putImageData(img, 0, 0)
  g.strokeStyle = '#0a0a0b'
  g.lineWidth = 3
  g.strokeRect(1.5, 1.5, S - 3, S - 3)
  for (let k = 0; k < 6; k++) {
    g.fillStyle = `rgba(230,225,215,${0.015 + Math.random() * 0.02})`
    g.beginPath()
    g.arc(Math.random() * S, Math.random() * S, 20 + Math.random() * 70, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Изгревът в прозорците: вертикален преход, излъчва — Bloom го разлива. */
function sunriseTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#9dbbe0')
  grad.addColorStop(0.45, '#ffd2a0')
  grad.addColorStop(0.75, '#ff9a5c')
  grad.addColorStop(1, '#ff7040')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Стаята за отраженията: 128×64, лентите светлина са лампите и прозорците. */
function envTexture() {
  const W = 128, H = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#3a2a1e')
  sky.addColorStop(0.5, '#1a1410')
  sky.addColorStop(1, '#070605')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#fff1d6'
  for (const x of [14, 46, 78, 110]) g.fillRect(x, 6, 10, 5)            // лампите
  g.fillStyle = '#ffb27a'
  g.fillRect(0, 16, 22, 18)                                             // изгревът
  g.fillStyle = '#8a6a50'
  g.fillRect(56, 22, 30, 10)                                            // светлата стена
  const t = new THREE.CanvasTexture(c)
  t.mapping = THREE.EquirectangularReflectionMapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ---------- материалите на залата (споделени) ---------- */

function useMaterials() {
  return useMemo(() => {
    const env = envTexture()
    return {
      env,
      chrome: new THREE.MeshStandardMaterial({ color: '#c9ced3', metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 1.3 }),
      iron: new THREE.MeshStandardMaterial({ color: '#1d1e20', metalness: 0.7, roughness: 0.42, envMap: env, envMapIntensity: 0.6 }),
      frame: new THREE.MeshStandardMaterial({ color: '#202225', metalness: 0.75, roughness: 0.35, envMap: env, envMapIntensity: 0.7 }),
      leather: new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.38, envMap: env, envMapIntensity: 0.8 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.22, emissive: GOLD, emissiveIntensity: 0.26, envMap: env, envMapIntensity: 2 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5532', roughness: 0.55, envMap: env, envMapIntensity: 0.3 }),
    }
  }, [])
}

/* ---------- части ---------- */

function Window({ x, sky }) {
  return (
    <group position={[x, 3.9, 0.02]}>
      <mesh>
        <planeGeometry args={[1.4, 2.6]} />
        <meshBasicMaterial map={sky} toneMapped={false} color="#ffffff" />
      </mesh>
      {/* рамката и решетката — фабричен прозорец */}
      {[[0, 1.33, 1.52, 0.1], [0, -1.33, 1.52, 0.1], [-0.73, 0, 0.1, 2.74], [0.73, 0, 0.1, 2.74], [0, 0.43, 1.4, 0.04], [0, -0.43, 1.4, 0.04], [-0.23, 0, 0.04, 2.6], [0.23, 0, 0.04, 2.6]].map(([px, py, w, h], i) => (
        <mesh key={i} position={[px, py, 0.03]}><boxGeometry args={[w, h, 0.06]} /><meshStandardMaterial color="#0e0f10" metalness={0.5} roughness={0.5} /></mesh>
      ))}
      {/* перваз */}
      <mesh position={[0, -1.42, 0.08]}><boxGeometry args={[1.6, 0.08, 0.18]} /><meshStandardMaterial color="#2a1d17" roughness={0.9} /></mesh>
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
    grad.addColorStop(0, 'rgba(255,200,140,0.95)')
    grad.addColorStop(1, 'rgba(255,200,140,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={[x + 1.0, 2.6, 2.2]} rotation={[-0.75, 0, rot]}>
      <planeGeometry args={[1.3, 6]} />
      <meshBasicMaterial map={tex} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

/** Индустриална лампа: кабел, конус, нажежена крушка. Без собствена
 * светлина — всяка лампа в сцената оскъпява всеки пиксел, и на улицата. */
function Pendant({ x, z, m }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 5.6, 0]}><cylinderGeometry args={[0.008, 0.008, 0.8, 6]} /><meshBasicMaterial color="#050505" /></mesh>
      <mesh position={[0, 5.08, 0]} material={m.frame}><cylinderGeometry args={[0.06, 0.34, 0.3, 32, 1, true]} /></mesh>
      <mesh position={[0, 5.08, 0]}><cylinderGeometry args={[0.055, 0.335, 0.29, 32, 1, true]} /><meshStandardMaterial color="#e9d7b5" side={THREE.BackSide} roughness={0.6} emissive="#ffcf8a" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 4.95, 0]}><sphereGeometry args={[0.07, 16, 12]} /><meshStandardMaterial color="#000" emissive="#ffd59a" emissiveIntensity={4} toneMapped={false} /></mesh>
    </group>
  )
}

/** Железен диск: тяло, ръб от двете страни, главина. Оста му е X. */
function IronPlate({ r, w, m, x = 0 }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={m.iron}><cylinderGeometry args={[r * 0.96, r * 0.96, w * 0.7, 40]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * w * 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.iron}><torusGeometry args={[r * 0.95, w * 0.16, 8, 40]} /></mesh>
      ))}
      <mesh material={m.iron}><cylinderGeometry args={[r * 0.24, r * 0.24, w * 1.05, 24]} /></mesh>
    </group>
  )
}

/** Хромиран дъмбел с кръгли глави. Оста му е X. */
function Dumbbell({ size, m }) {
  const r = 0.055 + size * 0.012
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.017, 0.017, 0.34, 12]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (0.15 + size * 0.006), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={m.chrome}><cylinderGeometry args={[r, r, 0.05 + size * 0.008, 28]} /></mesh>
          <mesh position={[0, s * (0.03 + size * 0.004), 0]} material={m.chrome}><cylinderGeometry args={[r * 0.5, r * 0.5, 0.02, 20]} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** Стелажът с дъмбелите: два реда, леките отляво. */
function DumbbellRack({ m }) {
  const legs = [-1.25, 0, 1.25]
  return (
    <group>
      {legs.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.45, -0.18]} material={m.frame}><boxGeometry args={[0.06, 0.9, 0.06]} /></mesh>
          <mesh position={[0, 0.3, 0.2]} material={m.frame}><boxGeometry args={[0.06, 0.6, 0.06]} /></mesh>
        </group>
      ))}
      {/* рафтовете — горният по-назад и по-високо */}
      <mesh position={[0, 0.88, -0.18]} rotation-x={0.25} material={m.frame}><boxGeometry args={[2.7, 0.04, 0.32]} /></mesh>
      <mesh position={[0, 0.58, 0.2]} rotation-x={0.25} material={m.frame}><boxGeometry args={[2.7, 0.04, 0.32]} /></mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={`t${i}`} position={[-1.08 + i * 0.36, 0.97, -0.18]} rotation={[0, Math.PI / 2, 0]}><Dumbbell size={i} m={m} /></group>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={`b${i}`} position={[-1.0 + i * 0.4, 0.7, 0.2]} rotation={[0, Math.PI / 2, 0]}><Dumbbell size={i + 7} m={m} /></group>
      ))}
    </group>
  )
}

/** Дървото за дискове: колона и шест щифта. */
function PlateTree({ m }) {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} material={m.frame}><boxGeometry args={[0.7, 0.06, 0.7]} /></mesh>
      <mesh position={[0, 0.65, 0]} material={m.frame}><boxGeometry args={[0.08, 1.3, 0.08]} /></mesh>
      {[[0.38, 1, 0.225], [0.78, 1, 0.2], [1.12, 1, 0.14], [0.38, -1, 0.225], [0.78, -1, 0.17], [1.12, -1, 0.12]].map(([y, s, r], i) => (
        <group key={i} position={[0, y, 0]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <mesh position={[0, 0, 0.12]} rotation-x={Math.PI / 2} material={m.chrome}><cylinderGeometry args={[0.022, 0.022, 0.24, 10]} /></mesh>
          <group position={[0, 0, 0.13]} rotation={[0, Math.PI / 2, 0]}><IronPlate r={r} w={0.045} m={m} /></group>
          <group position={[0, 0, 0.19]} rotation={[0, Math.PI / 2, 0]}><IronPlate r={r} w={0.045} m={m} /></group>
        </group>
      ))}
    </group>
  )
}

/** Пейка с бордо кожа; incline > 0 вдига облегалката. */
function Bench({ m, incline = 0 }) {
  return (
    <group>
      <mesh position={[0, 0.44, 0.35]} material={m.leather}><boxGeometry args={[0.3, 0.09, 0.55]} /></mesh>
      <group position={[0, 0.44, 0.05]} rotation-x={-incline}>
        <mesh position={[0, 0, -0.42]} material={m.leather}><boxGeometry args={[0.3, 0.09, 0.85]} /></mesh>
      </group>
      <mesh position={[0, 0.2, -0.1]} material={m.frame}><boxGeometry args={[0.08, 0.06, 1.3]} /></mesh>
      {[-0.65, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.03, z]} material={m.frame}><boxGeometry args={[0.5, 0.06, 0.07]} /></mesh>
      ))}
      <mesh position={[0, 0.3, 0.3]} material={m.frame}><boxGeometry args={[0.06, 0.3, 0.06]} /></mesh>
      <mesh position={[0, 0.3, -0.5]} material={m.frame}><boxGeometry args={[0.06, 0.3, 0.06]} /></mesh>
    </group>
  )
}

/** Кулисната машина: рамка, ролки, тежестите и въжето. */
function CableTower({ m }) {
  return (
    <group>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]} material={m.frame}><boxGeometry args={[0.08, 2.5, 0.08]} /></mesh>
      ))}
      <mesh position={[0, 2.5, 0]} material={m.frame}><boxGeometry args={[0.85, 0.08, 0.12]} /></mesh>
      <mesh position={[0, 0.03, 0]} material={m.frame}><boxGeometry args={[0.9, 0.06, 0.6]} /></mesh>
      {/* тежестите */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 0.12 + i * 0.055, 0]} material={m.iron}><boxGeometry args={[0.5, 0.048, 0.22]} /></mesh>
      ))}
      <mesh position={[0, 1.5, 0]} material={m.chrome}><cylinderGeometry args={[0.012, 0.012, 1.4, 8]} /></mesh>
      {/* ролката и въжето към ръкохватката */}
      <mesh position={[0, 2.38, 0.14]} rotation={[0, Math.PI / 2, 0]} material={m.chrome}><cylinderGeometry args={[0.07, 0.07, 0.04, 24]} /></mesh>
      <mesh position={[0, 1.75, 0.2]}><cylinderGeometry args={[0.006, 0.006, 1.25, 6]} /><meshStandardMaterial color="#0b0b0b" /></mesh>
      <mesh position={[0, 1.12, 0.2]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.015, 0.015, 0.45, 10]} /></mesh>
    </group>
  )
}

/** Знакът: BLAG между двете златни ръце, на черно табло с месингов кант. */
function Mark({ m }) {
  const arm = useLoader(THREE.TextureLoader, '/arms-hi.webp')
  const armMat = useMemo(() => {
    arm.colorSpace = THREE.SRGBColorSpace
    arm.anisotropy = 8
    return new THREE.MeshStandardMaterial({
      map: arm, alphaTest: 0.4, transparent: false, metalness: 0.55, roughness: 0.3,
      emissive: '#ffffff', emissiveMap: arm, emissiveIntensity: 0.45, envMap: m.env, envMapIntensity: 1.8,
      side: THREE.DoubleSide,
    })
  }, [arm, m.env])
  const aim = useMemo(() => new THREE.Object3D(), [])
  const aw = 0.86, ah = aw * (1050 / 534)
  return (
    <group>
      {/* таблото */}
      <mesh position={[0, 0, -0.02]}><boxGeometry args={[5.2, 2.3, 0.06]} /><meshStandardMaterial color="#0c0b0a" roughness={0.55} metalness={0.2} /></mesh>
      {[[0, 1.17, 5.3, 0.05], [0, -1.17, 5.3, 0.05], [-2.63, 0, 0.05, 2.38], [2.63, 0, 0.05, 2.38]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.02]} material={m.gold}><boxGeometry args={[w, h, 0.04]} /></mesh>
      ))}
      {/* лявата ръка е огледалната */}
      <mesh position={[-1.85, -0.02, 0.03]} scale={[-1, 1, 1]} material={armMat}><planeGeometry args={[aw, ah]} /></mesh>
      <mesh position={[1.85, -0.02, 0.03]} material={armMat}><planeGeometry args={[aw, ah]} /></mesh>
      <Text font="/svyat/fonts/Oswald.ttf" fontSize={1.05} letterSpacing={0.14} position={[0, 0.22, 0.04]} anchorX="center" anchorY="middle" material={m.gold}>
        BLAG
      </Text>
      <mesh position={[0, -0.42, 0.04]} material={m.gold}><boxGeometry args={[1.6, 0.012, 0.01]} /></mesh>
      <Text font="/svyat/fonts/Oswald.ttf" fontSize={0.22} letterSpacing={0.5} position={[0, -0.68, 0.04]} anchorX="center" anchorY="middle" material={m.gold}>
        GYM
      </Text>
      {/* лампите над таблото; светлината е една, за двете */}
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 1.32, 0.3]} rotation-x={0.6} material={m.frame}><cylinderGeometry args={[0.05, 0.1, 0.22, 20, 1, true]} /></mesh>
      ))}
      {/* целта е в групата: target-position без нея сочи към нулата на света (улицата) */}
      <primitive object={aim} position={[0, -0.2, 0]} />
      <spotLight position={[0, 1.9, 1.6]} angle={0.75} penumbra={0.8} intensity={16} distance={5} decay={1.4} color="#ffe2b8" target={aim} />
    </group>
  )
}

/** Щангата: натискаш → вдига се, дисковете се въртят → пада със звън. */
function Barbell({ m }) {
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
      <mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.016, 0.016, 2.2, 16]} /></mesh>
      <group ref={plates}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.82, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.028, 0.028, 0.42, 16]} /></mesh>
            <mesh position={[s * -0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.045, 0.045, 0.03, 20]} /></mesh>
            <IronPlate x={s * -0.15} r={0.225} w={0.06} m={m} />
            <IronPlate x={s * -0.085} r={0.225} w={0.06} m={m} />
            <IronPlate x={s * -0.03} r={0.16} w={0.045} m={m} />
            <mesh position={[s * 0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 0.03, 16]} /></mesh>
          </group>
        ))}
      </group>
      {/* по-голяма цел за пръста */}
      {/* прозрачна, не скрита: скрит обект не получава докосвания */}
      <mesh onPointerDown={press} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <boxGeometry args={[2.3, 0.5, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function Gym() {
  const m = useMaterials()
  const sky = useMemo(sunriseTexture, [])
  const brick = useMemo(brickTexture, [])
  const back = useMemo(() => { const t = brick.clone(); t.repeat.set(3.5, 3); t.needsUpdate = true; return t }, [brick])
  const side = useMemo(() => { const t = brick.clone(); t.repeat.set(0.75, 3); t.needsUpdate = true; return t }, [brick])
  const floor = useMemo(() => { const t = floorTexture(); t.repeat.set(14, 6); return t }, [])
  const blob = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    r.addColorStop(0, 'rgba(255,255,255,0.75)')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <group position={[GYM_X, 0, 0]}>
      {/* под, тухлени стени и таван (без предна стена — диорама) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 3]}><planeGeometry args={[14, 6]} /><meshStandardMaterial map={floor} roughness={0.9} color="#9a9a9a" /></mesh>
      <mesh position={[0, 3, 0]}><planeGeometry args={[14, 6]} /><meshStandardMaterial map={back} bumpMap={back} bumpScale={2.4} roughness={0.95} color="#c9b2a2" /></mesh>
      <mesh position={[-7, 3, 1.5]} rotation-y={Math.PI / 2}><planeGeometry args={[3, 6]} /><meshStandardMaterial map={side} bumpMap={side} bumpScale={2.4} roughness={0.95} color="#a8907f" /></mesh>
      <mesh position={[7, 3, 1.5]} rotation-y={-Math.PI / 2}><planeGeometry args={[3, 6]} /><meshStandardMaterial map={side} bumpMap={side} bumpScale={2.4} roughness={0.95} color="#a8907f" /></mesh>
      <mesh position={[0, 6, 1.5]} rotation-x={Math.PI / 2}><planeGeometry args={[14, 3]} /><meshStandardMaterial color="#141110" roughness={1} /></mesh>
      {/* боядисаният цокъл и гредите на тавана */}
      <mesh position={[0, 0.55, 0.01]}><planeGeometry args={[14, 1.1]} /><meshStandardMaterial color="#0f0e0d" roughness={0.7} /></mesh>
      <mesh position={[0, 1.11, 0.03]}><boxGeometry args={[14, 0.04, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
      {[-4.5, 0, 4.5].map((x) => <mesh key={x} position={[x, 5.85, 1.5]} material={m.frame}><boxGeometry args={[0.18, 0.3, 3]} /></mesh>)}

      {/* високите прозорци с изгрева и лъчите */}
      {[-5.6, -3.8].map((x) => <Window key={x} x={x} sky={sky} />)}
      {[-5.6, -3.8].map((x, i) => <Beam key={x} x={x} rot={0.06 * (i - 0.5)} />)}
      <Sparkles count={160} scale={[5, 4.2, 4]} position={[-3.6, 2.6, 2.2]} size={2} speed={0.2} opacity={0.65} color="#ffd8a8" />

      {/* знакът над стойката */}
      <group position={[0, 4.15, 0.06]}><Mark m={m} /></group>

      {/* лампите */}
      <Pendant x={-2.4} z={2.2} m={m} />
      <Pendant x={1.6} z={2.2} m={m} />
      <Pendant x={5} z={2.2} m={m} />

      {/* помостът: дърво в средата, гума отстрани */}
      <group position={[0, 0.03, 1.4]}>
        <mesh><boxGeometry args={[2.6, 0.06, 2.4]} /><meshStandardMaterial color="#0e0f10" roughness={0.95} /></mesh>
        <mesh position={[0, 0.032, 0]} material={m.wood}><boxGeometry args={[1.3, 0.005, 2.4]} /></mesh>
      </group>

      {/* стойката и щангата */}
      <group position={[0, 0, 0.6]}>
        {[-1.05, 1.05].map((x) => (
          <group key={x} position={[x, 0, 0.35]}>
            <mesh position={[0, 1.2, 0]} material={m.frame}><boxGeometry args={[0.08, 2.4, 0.08]} /></mesh>
            <mesh position={[0, 1.36, 0.07]} material={m.chrome}><boxGeometry args={[0.08, 0.05, 0.16]} /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.03, 0.35]} material={m.frame}><boxGeometry args={[2.3, 0.06, 0.6]} /></mesh>
      </group>
      <Barbell m={m} />

      {/* дъмбелите и дискът вдясно, кулисата в ъгъла */}
      <group position={[4.3, 0, 0.55]}><DumbbellRack m={m} /></group>
      <group position={[2.35, 0, 0.75]}><PlateTree m={m} /></group>
      <group position={[6.25, 0, 0.6]} rotation-y={-0.35}><CableTower m={m} /></group>

      {/* пейките и чифт тежки дъмбели на пода */}
      <group position={[-2.1, 0, 2.9]} rotation-y={-0.5}><Bench m={m} incline={0.55} /></group>
      <group position={[3.3, 0, 3.0]} rotation-y={0.3}><Bench m={m} /></group>
      <group position={[-1.35, 0.075, 3.55]} rotation-y={0.4}><Dumbbell size={12} m={m} /></group>
      <group position={[-1.1, 0.075, 3.85]} rotation-y={0.2}><Dumbbell size={12} m={m} /></group>

      {/* сенките под уредите — нарисувани петна: евтино, без втори рендер */}
      {[[0, 1.2, 2.8, 1.6], [4.3, 0.6, 3.2, 1.2], [2.35, 0.75, 1.1, 1.1], [6.25, 0.6, 1.3, 1], [-2.1, 2.9, 1.1, 1.8], [3.3, 3.0, 0.9, 1.6], [-1.2, 3.7, 0.9, 0.9]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.008, z]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial map={blob} transparent opacity={0.85} depthWrite={false} color="#000000" />
        </mesh>
      ))}

      {/* светлината: изгревът отзад-отляво, топлото на лампите */}
      <pointLight position={[-4.2, 3.6, 1.4]} intensity={20} distance={9} color="#ffa96e" />
      <pointLight position={[3.5, 3.8, 4.5]} intensity={16} distance={10} color="#ffe6c8" />
      <pointLight position={[-0.5, 2.4, 5.5]} intensity={8} distance={8} color="#ffcf9e" />
    </group>
  )
}
