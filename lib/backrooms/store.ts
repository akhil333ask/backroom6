import { useSyncExternalStore } from 'react'
import { deriveLevelSeed, getLevelConfig, type LevelConfig } from '@/levels/registry'
import { audio } from './audio'
import { resetBlackouts } from './blackouts'
import { FLOOR_H, FLOORS, LOBBY, CELL } from './constants'
import { resetOccupancy, type HideSpot } from './hide-spot'
import { resetPlayerState } from './player-store'
import { resetWater } from './water-state'
import type { FloorData } from './world-generator'

/** Mutable per-frame state (read/written inside useFrame, never triggers React renders). */
export const game = {
  floors: [] as FloorData[],
  hideSpots: [] as HideSpot[],
  /** Hide spot currently aimed at (drives the highlight). */
  highlight: null as HideSpot | null,
  levelSeed: 0,
  /** Level-specific layout from LevelData.extra. */
  extra: null as unknown,
  player: { x: 0, z: 0, feet: 0, yaw: Math.PI, pitch: 0, bob: 0, speed: 0 },
  input: {
    keys: new Set<string>(),
    joyX: 0,
    joyY: 0,
    lookDX: 0,
    lookDY: 0,
    interactQueued: false,
  },
  shake: 0,
}

export const floorOf = (feet: number) => Math.max(0, Math.min(FLOORS - 1, Math.floor((feet + FLOOR_H * 0.3) / FLOOR_H)))

/** UI-facing state with subscriptions. */
export interface UiState {
  levelId: string
  seed: number
  floor: number
  muted: boolean
  started: boolean
  locked: boolean
  isTouch: boolean
  target: string | null
  /** Found-footage camcorder look (overlay, fisheye, low-res). */
  footage: boolean
}

// Literal instead of DEFAULT_LEVEL_ID: level scenes import this store, so the registry may not be initialized yet.
let ui: UiState = {
  levelId: 'level-0',
  seed: 0,
  floor: 0,
  muted: false,
  started: false,
  locked: false,
  isTouch: false,
  target: null,
  footage: true,
}
const listeners = new Set<() => void>()

export function setUi(patch: Partial<UiState>) {
  let changed = false
  for (const k in patch) {
    const key = k as keyof UiState
    if (ui[key] !== patch[key]) changed = true
  }
  if (!changed) return
  ui = { ...ui, ...patch }
  listeners.forEach((l) => l())
}

export const getUi = () => ui

export function useUi<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => selector(ui),
    () => selector(ui),
  )
}

export function resetPlayer() {
  const p = game.player
  p.x = ((LOBBY.cx0 + LOBBY.cx1 + 1) / 2) * CELL
  p.z = (LOBBY.cz0 + 1.5) * CELL
  p.feet = 0
  p.yaw = Math.PI
  p.pitch = 0
}

let currentLevel: LevelConfig | null = null
export const getCurrentLevel = () => currentLevel ?? getLevelConfig(ui.levelId)

/** Loads exactly one level. Disposes the previous level's GPU resources when switching levels. */
export function loadLevel(levelId: string, seed: number) {
  const level = getLevelConfig(levelId)
  if (currentLevel && currentLevel.id !== level.id) currentLevel.dispose()
  currentLevel = level

  resetPlayerState()
  resetOccupancy()
  resetWater()
  game.highlight = null

  const levelSeed = deriveLevelSeed(level.id, seed)
  const data = level.generate(levelSeed)
  game.floors = data.floors
  game.hideSpots = data.hideSpots
  game.extra = data.extra ?? null
  game.levelSeed = levelSeed

  const spawn = level.spawn(data, levelSeed)
  const p = game.player
  p.x = spawn.x
  p.z = spawn.z
  p.feet = spawn.floor * FLOOR_H
  p.yaw = spawn.yaw
  p.pitch = 0

  resetBlackouts(levelSeed)
  audio.configure(level.ambientSound)
  setUi({ levelId: level.id, seed, floor: spawn.floor })
}

export function loadSeed(seed: number) {
  loadLevel(ui.levelId, seed)
}

export const randomSeed = () => 1000 + Math.floor(Math.random() * 9000)
