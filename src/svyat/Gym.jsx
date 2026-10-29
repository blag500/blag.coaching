import { useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clank } from './sound'

/* Залата (етап 2, Р20) — старата хардкор зала: дълъг тесен коридор с
 * нисък таван и ред луминесцентни лампи, стени боядисани до кръста в тъмносиво
 * и мръсно бяло горе, плакати, часовник, тръби по пода, бетон с бели линии,
 * шведска стена, пейки, стойка с щанга до стената, купчини дискове, дъмбели,
 * кулиси в дъното и таблото BLAG GYM на задната стена. Вид по снимката на
 * Николай (28.10): тъмно, топло, сепия и зърно (Sepia в Scene.jsx), кръгли
 * лампи в тавана, огледала вместо прозорци; цветът се връща на улицата.
 * Щангата се вдига при докосване. Хромът отразява малка рисувана карта на
 * стаята — RoomEnvironment изглеждаше същото, но удвояваше зареждането.
 * Бетонът и релефът на мазилката са фото-текстури от Poly Haven (CC0) в
 * public/svyat/tex/; цветът на стените остава рисуван (двата тона).
 * Стойката за клек, стелажът с дъмбелите и щангата с дисковете на пода са
 * „Weight Room Set 1–3“ от Tytan в Sketchfab (CC BY 4.0) — надписът е в
 * контакта; оригиналите са в D:\blag-ai\gym-models\sketchfab, свити с
 * gltf-transform до текстури 256 px в public/svyat/models/. */

// Залата е отворена като старите калифорнийски зали от 70-те (снимките на
// Николай, 29.10): широка, висок таван, огледала по цялата лява стена,
// станции на гумени настилки. x = −30, за да не стига до сградата на улицата (до −19).
export const GYM_X = -30
// стаята: широка 12 м, отворена отпред (z = 1.5), дълга до z = −20, таван 4.6 м
const RW = 6
const FRONT = 1.5
const BACK = -20
const H = 4.6
const LEN = FRONT - BACK

const GOLD = '#d9b26a'
const LEATHER = '#5a1a17'

/* ---------- текстури, рисувани в canvas ---------- */

function grain(g, S, amount) {
  const img = g.getImageData(0, 0, S, S)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.putImageData(img, 0, 0)
}

function canvasTexture(c, repeat) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.repeat.set(...repeat)
  return t
}

/** Стената: долу боядисани блокчета до 1.25 м, ивица, горе светла мазилка с
 *  потъмнели следи. Височината на текстурата е цялата стена (H). */
function wallTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  const split = Math.round(S * (1 - 1.25 / H))
  g.fillStyle = '#5b5348'
  g.fillRect(0, 0, S, split)
  g.fillStyle = '#2b2723'
  g.fillRect(0, split, S, S - split)
  // фугите на блокчетата: ред от 20 см, всеки втори изместен
  const row = (0.2 / H) * S
  g.fillStyle = 'rgba(8,7,6,0.55)'
  for (let y = split + row, r = 0; y < S; y += row, r++) {
    g.fillRect(0, y, S, 2)
    for (let x = (r % 2) * 40; x < S; x += 80) g.fillRect(x, y - row, 2, row)
  }
  g.fillStyle = '#0d0c0b'
  g.fillRect(0, split - 6, S, 9)
  for (let k = 0; k < 8; k++) {                          // едва видими стекли следи
    g.fillStyle = `rgba(10,8,6,${0.05 + Math.random() * 0.06})`
    const x = Math.random() * S
    g.fillRect(x, Math.random() * split * 0.6, 4 + Math.random() * 30, 30 + Math.random() * 140)
  }
  grain(g, S, 18)
  return canvasTexture(c)
}

/** Таванът: груба мазилка на петна. */
function ceilingTexture() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#3a342c'
  g.fillRect(0, 0, S, S)
  for (let k = 0; k < 60; k++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '6,5,4' : '70,62,52'},${0.05 + Math.random() * 0.08})`
    g.beginPath()
    g.arc(Math.random() * S, Math.random() * S, 4 + Math.random() * 28, 0, Math.PI * 2)
    g.fill()
  }
  grain(g, S, 40)
  return canvasTexture(c, [3, 8])
}

/** Стаята за отраженията: студена луминесцентна светлина, светли стени. */
function envTexture() {
  const W = 128, Hh = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = Hh
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, Hh)
  sky.addColorStop(0, '#8d8f8e')
  sky.addColorStop(0.45, '#c9c8c2')
  sky.addColorStop(0.62, '#4b555a')
  sky.addColorStop(1, '#3d3f40')
  g.fillStyle = sky
  g.fillRect(0, 0, W, Hh)
  g.fillStyle = '#f4f8ff'
  for (const x of [8, 40, 72, 104]) g.fillRect(x, 4, 18, 3)              // лампите
  g.fillStyle = '#eef2f4'
  g.fillRect(0, 18, 14, 12)                                             // прозорците
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

/** Готов модел от public/svyat/models: мащабиран и стъпил на пода (моделите
 *  идват центрирани около нулата). Идват нови и светли — dim ги потъмнява до
 *  старото желязо на залата. Хромът им отразява картата на стаята. */
function Model({ url, scale, dim = 0.45, only, skip, m }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const o = scene.clone()
    const drop = []
    o.traverse((n) => {
      if (!n.isMesh) return
      if ((only && n.material.name !== only) || n.material.name === skip) { drop.push(n); return }
      n.material = n.material.clone()
      n.material.color.multiplyScalar(dim)
      n.material.envMap = m.env
      n.material.envMapIntensity = 0.35
    })
    drop.forEach((n) => n.removeFromParent())
    o.scale.setScalar(scale)
    const box = new THREE.Box3().setFromObject(o)
    o.position.y = -box.min.y
    // една част от модела (only) не е в средата му — центрира се отделно
    if (only) { const c = box.getCenter(new THREE.Vector3()); o.position.x = -c.x; o.position.z = -c.z }
    return o
  }, [scene, scale, dim, only, skip, m.env])
  return <primitive object={obj} />
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
function Barbell({ m, at }) {
  const [x0, y0, z0] = at
  const bar = useRef()
  const plates = useRef()
  const clock = useThree((s) => s.clock)
  const lift = useRef({ start: -10, landed: true })
  useFrame((_, dt) => {
    const t = clock.elapsedTime - lift.current.start
    // нагоре 0.5 s, горе 0.5 s, надолу 0.4 s
    const up = t < 0 ? 0 : t < 0.5 ? t / 0.5 : t < 1 ? 1 : t < 1.4 ? 1 - (t - 1) / 0.4 : 0
    if (bar.current) bar.current.position.y = y0 + 0.62 * (up * up * (3 - 2 * up))
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
    <group ref={bar} position={[x0, y0, z0]}>
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

/** Луминесцентно тяло: метална кутия, светеща тръба отдолу. Светлините на
 *  стаята са отделно (четири за цялата дължина) — всяка лампа струва пиксели. */
function Fluoro({ x = 0.15, z, m }) {
  return (
    <group position={[x, H - 0.06, z]}>
      <mesh material={m.frame}><boxGeometry args={[0.2, 0.08, 1.3]} /></mesh>
      <mesh position={[0, -0.05, 0]}><boxGeometry args={[0.07, 0.03, 1.22]} /><meshStandardMaterial color="#000" emissive="#ffd6a0" emissiveIntensity={2.6} toneMapped={false} /></mesh>
    </group>
  )
}

/** Кръгла лампа в тавана — само светещ диск; в далечината Bloom я прави на
 *  размито петно като на снимката, без светлина в сцената. */
function Downlight({ x, z }) {
  return (
    <mesh position={[x, H - 0.005, z]} rotation-x={Math.PI / 2}>
      <circleGeometry args={[0.09, 24]} />
      <meshStandardMaterial color="#000" emissive="#ffd29a" emissiveIntensity={3.4} toneMapped={false} />
    </mesh>
  )
}

/** Огледало на стената: гладко, отразява картата на стаята; w × h. */
function Mirror({ m, w = 1.2, h = 2.0 }) {
  return (
    <group>
      {/* рамката е изцяло зад стъклото — иначе предната ѝ стена го покрива */}
      <mesh position={[0, 0, -0.02]} material={m.frame}><boxGeometry args={[w + 0.06, h + 0.06, 0.03]} /></mesh>
      <mesh><planeGeometry args={[w, h]} /><meshStandardMaterial color="#5d574e" metalness={1} roughness={0.04} envMap={m.env} envMapIntensity={1} /></mesh>
    </group>
  )
}

/** Гумена настилка под станция: тъмен квадрат с ръб. */
function Mat({ w, d }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}><planeGeometry args={[w, d]} /><meshStandardMaterial color="#0e0d0c" roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}><planeGeometry args={[w + 0.06, d + 0.06]} /><meshStandardMaterial color="#26221e" roughness={0.9} /></mesh>
    </group>
  )
}

/** Шведската стена: две греди и пречки. */
function WallBars({ m }) {
  return (
    <group>
      {[-0.45, 0.45].map((z) => <mesh key={z} position={[0, 1.4, z]} material={m.wood}><boxGeometry args={[0.07, 2.8, 0.07]} /></mesh>)}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.22, 0]} rotation-x={Math.PI / 2} material={m.wood}><cylinderGeometry args={[0.018, 0.018, 0.9, 8]} /></mesh>
      ))}
    </group>
  )
}

/** Купчина дискове на пода — легнали, всеки малко изместен. */
function PlatePile({ n = 4, r = 0.225, m }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[(i % 2) * 0.02, 0.03 + i * 0.052, 0]} rotation={[0, 0, Math.PI / 2]}>
          <IronPlate r={i > n - 2 && n > 2 ? r - 0.05 : r} w={0.05} m={m} />
        </group>
      ))}
    </group>
  )
}

/** Плакат: снимка на позиране от библиотеката на приложението (posing-lib),
 *  изрязана до портрет; бял кант, черна рамка. */
function Poster({ url }) {
  const photo = useLoader(THREE.TextureLoader, url)
  const map = useMemo(() => {
    const t = photo.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(0.54 / 0.74, 1)
    t.offset.set((1 - 0.54 / 0.74) / 2, 0)
    t.needsUpdate = true
    return t
  }, [photo])
  return (
    <group>
      <mesh position={[0, 0, -0.006]}><planeGeometry args={[0.64, 0.84]} /><meshStandardMaterial color="#0d0d0d" /></mesh>
      <mesh position={[0, 0, -0.003]}><planeGeometry args={[0.6, 0.8]} /><meshStandardMaterial color="#e8e6e0" roughness={0.8} /></mesh>
      <mesh><planeGeometry args={[0.54, 0.74]} /><meshStandardMaterial map={map} roughness={0.55} /></mesh>
    </group>
  )
}

/** Стенен часовник; лицето гледа по +Z. */
function Clock() {
  return (
    <group>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.04, 32]} /><meshStandardMaterial color="#f1f1ee" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.021]}><torusGeometry args={[0.2, 0.018, 8, 32]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.03, 0.03, 0.024]} rotation-z={-0.9}><boxGeometry args={[0.012, 0.13, 0.005]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0, 0.05, 0.024]}><boxGeometry args={[0.012, 0.1, 0.005]} /><meshStandardMaterial color="#111" /></mesh>
    </group>
  )
}

/** Олимпийската лежанка (Flat Bench, Sousinho, CC BY). live: щангата на
 *  модела е заменена с нашата, която се вдига; куките са на 1.08 м, z −0.38. */
function PressStation({ m, live = false }) {
  return (
    <group>
      {/* настилката е в координатите на модела: рамката е x −0.95…1.05, z −0.6…1.6 */}
      <group position={[0.05, 0, 0.5]}><Mat w={2.4} d={2.5} /></group>
      <Model url="/svyat/models/flat-bench.glb" skip={live ? '20kg_barbell' : undefined} scale={1.15} dim={0.3} m={m} />
      {live && <Barbell m={m} at={[0.06, 1.08, -0.38]} />}
    </group>
  )
}

const TEX = ['floor-diff', 'floor-nor', 'floor-rough', 'wall-nor', 'wall-rough'].map((n) => `/svyat/tex/${n}.webp`)

const SHADOWS = [[3.8, -3, 2.2, 2.2], [3.8, -9.5, 2.2, 2.2], [-2.2, -3, 1, 1.8], [-2.6, -7, 1.7, 2.1], [-2.4, -10.6, 1, 1.8], [-5.1, -13.5, 1.2, 2.2], [5.2, -6.8, 1.1, 1.1], [-RW + 0.4, -1.6, 0.6, 1.2], [-3.5, -18.6, 1.2, 0.9], [3.5, -18.6, 1.2, 0.9]]

export default function Gym() {
  const m = useMaterials()
  const wall = useMemo(() => { const t = wallTexture(); t.repeat.set(LEN / 3.2, 1); return t }, [])
  const backWall = useMemo(() => { const t = wall.clone(); t.repeat.set((2 * RW) / 3.2, 1); t.needsUpdate = true; return t }, [wall])
  const [fDiff, fNor, fRough, wNor, wRough] = useLoader(THREE.TextureLoader, TEX)
  // подът е тъмен като гума: фото-бетонът, притъмнен и затоплен
  const floorMat = useMemo(() => {
    const rep = (t, srgb) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(2 * RW / 2.2, LEN / 2.2); c.anisotropy = 8; if (srgb) c.colorSpace = THREE.SRGBColorSpace; c.needsUpdate = true; return c }
    return new THREE.MeshStandardMaterial({ map: rep(fDiff, true), normalMap: rep(fNor), roughnessMap: rep(fRough), color: new THREE.Color(0.62, 0.58, 0.54), normalScale: new THREE.Vector2(0.6, 0.6) })
  }, [fDiff, fNor, fRough])
  const wallMat = useMemo(() => {
    const rel = (t, len) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(len / 1.6, H / 1.6); c.needsUpdate = true; return c }
    const mk = (map, len) => new THREE.MeshStandardMaterial({ map, normalMap: rel(wNor, len), roughnessMap: rel(wRough, len), normalScale: new THREE.Vector2(0.6, 0.6) })
    return { side: mk(wall, LEN), back: mk(backWall, 2 * RW) }
  }, [wall, backWall, wNor, wRough])
  const corner = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 64
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 64)
    gr.addColorStop(0, 'rgba(255,255,255,0.32)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 4, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  const ceiling = useMemo(ceilingTexture, [])
  const blob = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    r.addColorStop(0, 'rgba(255,255,255,0.7)')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  const midZ = (FRONT + BACK) / 2
  const rightLen = -0.6 - BACK
  return (
    <group position={[GYM_X, 0, 0]}>
      {/* под, таван, стени: дълъг коридор, отворен отпред */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, midZ]} material={floorMat}><planeGeometry args={[2 * RW, LEN]} /></mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H, midZ]}><planeGeometry args={[2 * RW, LEN]} /><meshStandardMaterial map={ceiling} roughness={1} /></mesh>
      <mesh position={[-RW, H / 2, midZ]} rotation-y={Math.PI / 2} material={wallMat.side}><planeGeometry args={[LEN, H]} /></mesh>
      {/* дясната стена спира 2 м преди отвора — оттам камерата излиза на улицата */}
      <mesh position={[RW, H / 2, BACK + rightLen / 2]} rotation-y={-Math.PI / 2} material={wallMat.side}><planeGeometry args={[rightLen, H]} /></mesh>
      <mesh position={[0, H / 2, BACK]} material={wallMat.back}><planeGeometry args={[2 * RW, H]} /></mesh>

      {/* тъмното в ъглите под–стена: светлината не стига там (вместо AO) */}
      {[[-RW + 0.3, midZ, Math.PI / 2, LEN], [RW - 0.3, BACK + rightLen / 2, -Math.PI / 2, rightLen]].map(([x, z, ry, len], i) => (
        <mesh key={i} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, ry]} renderOrder={1}>
          <planeGeometry args={[len, 0.6]} />
          <meshBasicMaterial map={corner} transparent depthWrite={false} color="#000000" />
        </mesh>
      ))}
      <mesh position={[0, 0.006, BACK + 0.3]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[2 * RW, 0.6]} />
        <meshBasicMaterial map={corner} transparent depthWrite={false} color="#000000" />
      </mesh>

      {/* белите линии по бетона */}
      {[-1.2, 1.2].map((x) => <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.004, midZ]}><planeGeometry args={[0.05, LEN]} /><meshStandardMaterial color="#5c544a" roughness={0.7} /></mesh>)}

      {/* тръбите по пода покрай лявата стена */}
      {[0.16, 0.27].map((y) => <mesh key={y} position={[-RW + 0.08, y, midZ]} rotation-x={Math.PI / 2} material={m.frame}><cylinderGeometry args={[0.028, 0.028, LEN, 10]} /></mesh>)}

      {/* лампите: два реда тела, кръгли до стените; светлините са пет за цялата зала */}
      {[0.2, -3, -6.2, -9.4, -12.6, -15.8].flatMap((z) => [-1.8, 1.8].map((x) => <Fluoro key={`${x}${z}`} x={x} z={z} m={m} />))}
      {[-1.4, -4.6, -7.8, -11, -14.2, -17.4].flatMap((z) => [-4, 4].map((x) => <Downlight key={`${x}${z}`} x={x} z={z} />))}
      {[-0.5, -5, -9.5, -14, -18].map((z) => <pointLight key={z} position={[0, H - 0.5, z]} intensity={24} distance={12} decay={1.6} color="#ffc27e" />)}

      {/* огледалата по цялата лява стена, плакатите и часовникът отдясно */}
      {Array.from({ length: 10 }, (_, i) => (
        <group key={i} position={[-RW + 0.02, 1.55, -3.6 - i * 1.6]} rotation-y={Math.PI / 2}><Mirror m={m} w={1.56} h={2.2} /></group>
      ))}
      {[[-1.8, 'stand-front-fdb'], [-5, 'stand-back-latbi'], [-8.2, 'stand-side-sc'], [-11.4, 'stand-front-mm'], [-14.6, 'stand-back-fdb']].map(([z, pose]) => (
        <group key={z} position={[RW - 0.01, 2.9, z]} rotation-y={-Math.PI / 2}><Poster url={`/posing-lib/${pose}.webp`} /></group>
      ))}
      <group position={[RW - 0.03, 3.2, -6.6]} rotation-y={-Math.PI / 2}><Clock /></group>

      {/* таблото BLAG GYM на задната стена — вижда се от входа през цялата зала */}
      <group position={[0, 3.1, BACK + 0.04]} scale={0.8}><Mark m={m} /></group>

      {/* лявата страна: шведска стена, регулируемите пейки, стойката, дъмбелите пред огледалото */}
      <group position={[-RW + 0.1, 0, -1.6]}><WallBars m={m} /></group>
      <group position={[-2.2, 0, -3]} rotation-y={0.4}><Model url="/svyat/models/incline-bench.glb" scale={1} dim={0.35} m={m} /></group>
      <group position={[-2.6, 0, -7]}><Mat w={2.6} d={2.6} /></group>
      <group position={[-2.6, 0, -7]}><Model url="/svyat/models/rack.glb" scale={1.05} dim={0.25} m={m} /></group>
      <group position={[-2.4, 0, -10.6]} rotation-y={-0.5}><Model url="/svyat/models/incline-bench.glb" scale={1} dim={0.35} m={m} /></group>
      <group position={[-5.1, 0, -13.5]} rotation-y={Math.PI / 2}><Model url="/svyat/models/dumbbells.glb" scale={0.9} m={m} /></group>
      <group position={[-3.5, 0, -18.6]}><CableTower m={m} /></group>
      <group position={[3.5, 0, -18.6]}><CableTower m={m} /></group>

      {/* дясната страна: две олимпийски лежанки на настилки, дискове; първата е живата */}
      <group position={[4.4, 0, -3]} rotation-y={-Math.PI / 2}><PressStation m={m} live /></group>
      <group position={[4.4, 0, -9.5]} rotation-y={-Math.PI / 2}><PressStation m={m} /></group>
      <group position={[5.4, 0, -5.2]}><PlatePile n={5} m={m} /></group>
      <group position={[5.3, 0, 0.6]}><PlatePile n={3} r={0.2} m={m} /></group>
      <group position={[5.2, 0, -6.8]}><PlateTree m={m} /></group>
      <group position={[0.8, 0, -14.6]} rotation-y={0.25}><Model url="/svyat/models/barbell.glb" scale={1.1} m={m} /></group>

      {/* разхвърляни дискове по пода */}
      <group position={[-0.6, 0, -4.2]}><PlatePile n={1} r={0.2} m={m} /></group>
      <group position={[1.6, 0, -6.4]}><PlatePile n={2} r={0.14} m={m} /></group>
      <group position={[0.4, 0, -11]}><PlatePile n={1} m={m} /></group>
      {/* сенките под уредите — нарисувани петна, без втори рендер */}
      {SHADOWS.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.008, z]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial map={blob} transparent opacity={0.7} depthWrite={false} color="#000000" />
        </mesh>
      ))}
    </group>
  )
}

