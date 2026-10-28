import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars, useScroll } from '@react-three/drei'
import * as THREE from 'three'

/* Денят тече със скрола (Р20): залата (тъмна, в сепия) → нощ на улицата.
 * Небето, мъглата, слънцето и луната следват едно число — колко е нощ (0…1).
 * Нощта настъпва, докато камерата излиза от залата към улицата. */

export const NIGHT_FROM = 0.27
export const NIGHT_TO = 0.46

const DAWN = new THREE.Color('#110e0b')
const NIGHT = new THREE.Color('#05070a')

export function nightAt(o) {
  const x = THREE.MathUtils.clamp((o - NIGHT_FROM) / (NIGHT_TO - NIGHT_FROM), 0, 1)
  return x * x * (3 - 2 * x)
}

export default function Atmosphere() {
  const scroll = useScroll()
  const scene = useThree((s) => s.scene)
  const sun = useRef()
  const moon = useRef()
  const hemi = useRef()
  const stars = useRef()
  useFrame(() => {
    const n = nightAt(scroll.offset)
    if (!scene.background) scene.background = new THREE.Color()
    scene.background.copy(DAWN).lerp(NIGHT, n)
    if (!scene.fog) scene.fog = new THREE.Fog(0, 10, 30)
    scene.fog.color.copy(scene.background)
    scene.fog.near = THREE.MathUtils.lerp(14, 10, n)
    scene.fog.far = THREE.MathUtils.lerp(44, 30, n)
    if (sun.current) sun.current.intensity = 1.2 * (1 - n)
    if (moon.current) moon.current.intensity = 0.22 * n
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.22, 0.3, n)
    if (hemi.current) hemi.current.color.set(n > 0.5 ? '#2a3a66' : '#c9a882')
    if (stars.current) stars.current.visible = n > 0.6
  })
  return (
    <>
      <ambientLight intensity={0.05} />
      <hemisphereLight ref={hemi} args={['#c9a882', '#080a07', 0.22]} />
      {/* дневната светлина влиза в залата отляво, през прозорците */}
      <directionalLight ref={sun} position={[-34, 4, -2]} intensity={1.2} color="#f2f4f6" />
      <directionalLight ref={moon} position={[-6, 10, 8]} intensity={0} color="#8fa6ff" />
      <group ref={stars} visible={false}><Stars radius={70} depth={30} count={1800} factor={3} fade speed={0.4} /></group>
    </>
  )
}
