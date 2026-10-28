import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { flick, flickFactor, level, neon, now } from './neon'
import { click } from './sound'

/* Неонът като истински 3D тръби. Пътищата са същите SVG като на плаката
 * (D:\blag-ai\metro-city\neon\tubes.js → public/svyat/neon/): всеки контур
 * става тръба по линията, а тръбите на една табела се сливат в една геометрия.
 * Светенето е emissive без tone mapping — Bloom прави ореола. */

/** Тръба по начупена линия, равномерно по дължината. */
class Poly extends THREE.Curve {
  constructor(pts) {
    super()
    this.pts = pts
    this.acc = [0]
    for (let i = 1; i < pts.length; i++) this.acc.push(this.acc[i - 1] + pts[i].distanceTo(pts[i - 1]))
    this.total = this.acc[this.acc.length - 1]
  }
  getPoint(t, target = new THREE.Vector3()) {
    const d = t * this.total
    let i = 1
    while (i < this.acc.length - 1 && this.acc[i] < d) i++
    const a = this.acc[i - 1]
    const seg = this.acc[i] - a || 1
    return target.copy(this.pts[i - 1]).lerp(this.pts[i], (d - a) / seg)
  }
}

function buildTubes(data, width, radius) {
  const loops = []
  for (const p of data.paths) {
    const stroke = String(p.userData?.style?.stroke || '').toUpperCase()
    if (stroke === '#FFFFFF' || stroke === 'NONE' || !stroke) continue   // белият център на 2D тръбата
    for (const sp of p.subPaths) {
      const pts = sp.getPoints(8)
      const clean = pts.filter((v, i) => i === 0 || v.distanceTo(pts[i - 1]) > 1e-3)
      if (clean.length > 1) loops.push(clean)
    }
  }
  const box = new THREE.Box2()
  loops.forEach((l) => l.forEach((v) => box.expandByPoint(v)))
  const size = box.getSize(new THREE.Vector2())
  const c = box.getCenter(new THREE.Vector2())
  const s = width / size.x
  const geos = loops.map((l) => {
    const curve = new Poly(l.map((v) => new THREE.Vector3((v.x - c.x) * s, -(v.y - c.y) * s, 0)))
    return new THREE.TubeGeometry(curve, Math.max(6, Math.round(curve.total * 70)), radius, 6, false)
  })
  return mergeGeometries(geos)
}

const OFF = new THREE.Color('#3a4438')

function Sign({ url, sign, width, radius = 0.022, color, position, light = 6 }) {
  const data = useLoader(SVGLoader, url)
  const geometry = useMemo(() => buildTubes(data, width, radius), [data, width, radius])
  const on = useMemo(() => new THREE.Color(color), [color])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: OFF.clone(), emissive: on, emissiveIntensity: 0, roughness: 0.25, metalness: 0.1, toneMapped: false,
  }), [on])
  const lamp = useRef()
  const last = useRef(0)

  useFrame(() => {
    const at = now()
    const t = neon.start == null ? -1 : at - neon.start
    const v = level(sign, t) * flickFactor(at)
    mat.emissiveIntensity = 0.03 + v * 2.3
    mat.color.copy(OFF).lerp(on, v)
    if (lamp.current) lamp.current.intensity = v * light
    if (v > 0.5 && last.current <= 0.5) click()
    last.current = v
  })

  return (
    <group position={position}>
      <mesh geometry={geometry} material={mat}
        onClick={(e) => { e.stopPropagation(); flick() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }} />
      <pointLight ref={lamp} color={color} intensity={0} distance={8} decay={2} position={[0, 0, 0.9]} />
    </group>
  )
}

export default function Neon() {
  return (
    <group position={[0, 0, 0.14]}>
      <Sign url="/svyat/neon/tube-name-arc.svg" sign="name" width={4.4} color="#ffe2a8" position={[0, 5.62, 0]} light={10} />
      <Sign url="/svyat/neon/tube-mark.svg" sign="mark" width={3.0} radius={0.026} color="#d4f04a" position={[0, 3.62, 0]} light={22} />
      <Sign url="/svyat/neon/tube-hours.svg" sign="hours" width={1.9} color="#ff6a4d" position={[0, 1.62, 0]} light={12} />
    </group>
  )
}
