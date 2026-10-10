'use client'

import { useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { DEFAULT_LEVEL_ID, getLevelConfig, LEVELS } from '@/levels/registry'
import { ambience } from '@/lib/backrooms/ambience'
import { FLOOR_H } from '@/lib/backrooms/constants'
import { game, getCurrentLevel, getUi, loadLevel, randomSeed, setUi, useUi } from '@/lib/backrooms/store'
import { Effects } from './effects'
import { Elevator } from './elevator'
import { Flashlight } from './flashlight'
import { FloorMesh } from './floor-mesh'
import { FoundFootageOverlay } from './found-footage-overlay'
import { HideSpotHighlight } from './hide-spot-highlight'
import { HidingHud } from './hiding-hud'
import { Hud, LevelCard, StartOverlay } from './hud'
import { InputController } from './input-controller'
import { FOOTAGE_FOV, LevelEnvironment } from './level-environment'
import { LightRig } from './light-rig'
import { Player } from './player'
import { Stairwell } from './stairwell'
import { TouchControls } from './touch-controls'
import { WaterOverlay } from './water-overlay'

/** Per-level synthesized ambience; starts once audio is unlocked by the first click. */
function LevelAmbience() {
  useFrame(() => {
    const level = getCurrentLevel()
    ambience.set(getUi().started ? (level.ambience ?? null) : null)
    ambience.tick()
  })
  return null
}

function Scene() {
  const levelId = useUi((s) => s.levelId)
  const seed = useUi((s) => s.seed)
  const floor = useUi((s) => s.floor)
  const data = game.floors[floor]
  if (!data) return null
  const yOffset = floor * FLOOR_H
  const CustomScene = getLevelConfig(levelId).scene

  return (
    <>
      <LevelEnvironment />
      {CustomScene ? (
        <CustomScene key={`${levelId}-${seed}`} extra={game.extra} />
      ) : (
        <>
          <FloorMesh key={`${levelId}-${seed}-${floor}`} floor={data} yOffset={yOffset} />
          <Elevator floor={floor} zone={data.lobbyZone} yOffset={yOffset} />
          <Stairwell />
          <LightRig />
        </>
      )}
      <LevelAmbience />
      <Flashlight />
      <HideSpotHighlight />
      <Player />
      <InputController />
      <Effects />
    </>
  )
}

function initialSeed() {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'))
  return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : randomSeed()
}

function initialLevel() {
  const fromUrl = new URLSearchParams(window.location.search).get('level')
  return fromUrl && LEVELS[fromUrl] ? fromUrl : DEFAULT_LEVEL_ID
}

export default function BackroomsGame() {
  const [ready] = useState(() => {
    if (!game.floors.length) loadLevel(initialLevel(), initialSeed())
    return true
  })
  const isTouch = useUi((s) => s.isTouch)

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const touchOnly = navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches
    setUi({ isTouch: coarse || touchOnly })
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {ready && (
        <Canvas
          dpr={[1, 1.5]}
          flat
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: FOOTAGE_FOV, near: 0.05, far: 80 }}
        >
          <Scene />
        </Canvas>
      )}
      <WaterOverlay />
      <HidingHud />
      <FoundFootageOverlay />
      {isTouch && <TouchControls />}
      <Hud />
      <LevelCard />
      <StartOverlay />
    </div>
  )
}
