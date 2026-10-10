'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getLevelConfig } from '@/levels/registry'
import { zoneFactor } from '@/lib/backrooms/blackouts'
import { game, useUi } from '@/lib/backrooms/store'

export const FOOTAGE_FOV = 82
const NORMAL_FOV = 75

/** Fog, ambient fill and camera settings driven by the current level + found-footage toggle. */
export function LevelEnvironment() {
  const levelId = useUi((s) => s.levelId)
  const footage = useUi((s) => s.footage)
  const isTouch = useUi((s) => s.isTouch)
  const level = getLevelConfig(levelId)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const setDpr = useThree((s) => s.setDpr)
  const fogBase = useMemo(() => new THREE.Color(level.fog.color), [level])
  const dim = useRef(1)

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = footage ? FOOTAGE_FOV : NORMAL_FOV
    cam.updateProjectionMatrix()
    const dpr = window.devicePixelRatio || 1
    // Lower pixel ratio gives a soft camcorder image and saves fill-rate on phones.
    setDpr(isTouch ? Math.min(1.25, Math.max(1, dpr)) : Math.min(1.5, Math.max(1, dpr)))
  }, [camera, setDpr, footage, isTouch])

  useFrame(({ clock }, dt) => {
    const f = Math.min(1, zoneFactor(game.player.x, game.player.z, clock.elapsedTime))
    dim.current += (f - dim.current) * Math.min(1, dt * 14)
    const keep = level.lightStyle.blackoutAmbient
    const k = keep + (1 - keep) * dim.current
    if (hemi.current) hemi.current.intensity = level.ambient.hemiIntensity * k
    if (amb.current) amb.current.intensity = level.ambient.intensity * k
    const fk = 0.35 + 0.65 * dim.current
    if (scene.fog) scene.fog.color.copy(fogBase).multiplyScalar(fk)
    if (scene.background instanceof THREE.Color) scene.background.copy(fogBase).multiplyScalar(fk)
  })

  return (
    <>
      <color attach="background" args={[level.fog.color]} />
      <fog attach="fog" args={[level.fog.color, level.fog.near, level.fog.far]} />
      <hemisphereLight ref={hemi} args={[level.ambient.skyColor, level.ambient.groundColor, level.ambient.hemiIntensity]} />
      <ambientLight ref={amb} intensity={level.ambient.intensity} color={level.ambient.color} />
    </>
  )
}
