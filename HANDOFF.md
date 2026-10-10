# Handoff: level registry extension

Task: add Levels 1-3 to the registry without touching Level 0 or the controls.

## Done (shared infra, don't redo it)
- `levels/types.ts`: LevelConfig with `scene`, `physics` (groundAt / medium / afterMove), `ambience`.
- `lib/levels-kit/*`: MeshBuilder (merged geometry per material key), canvas texture helpers
  (`canvasTexture`, `grain`, `blotches`, `noiseNormalMap`, `causticsTexture`, `labelAtlas`),
  `lazyResources` (dispose on level switch), `makeSpot`, `customFloor`, `box`.
- `components/levels/light-pool.tsx`: N point lights that follow the fixtures nearest the player.
- `lib/backrooms/water-state.ts` + `components/backrooms/water-overlay.tsx`: blue submerged tint and lens droplets.
- `components/backrooms/player.tsx`: uses `physics.medium` (speed, splash sound, swim bob).
  Hold crouch in deep water to sink, which counts as hidden.
- `lib/backrooms/ambience.ts`: WebAudio ambience for 'garage' | 'pool' | 'living', routed through the existing mute.
- `LevelCard` in hud.tsx shows the level name in the corner on entering a level.
- Level 1 (garage) is complete: `levels/garage-layout.ts`, `components/levels/garage-scene.tsx`, `levels/level-1.ts`.

## Status
All levels (0-3) are done, pass `tsc`, and render in the browser with no runtime errors.
Fixed along the way:
- `lib/backrooms/store.ts` now uses the literal `'level-0'` instead of `DEFAULT_LEVEL_ID`, breaking a circular import.
- The garage pillar hide spot was missing its `label`.
Possible next steps: tune lighting and fog, and play-test the loop doors in level 3 (`livingAfterMove`).

## Level 2 (pool rooms)
- `levels/pool-layout.ts`: generator, colliders, hide spots, groundAt and medium
- `components/levels/pool-scene.tsx`: textures, water, caustics
- `levels/level-2.ts`, registered in `levels/registry.ts`

## Level 3 (living room)
- `levels/living-layout.ts`: generator, looping doors via `afterMove`, long hallway
- `components/levels/living-scene.tsx`: textures, CRT static, lamps
- `levels/level-3.ts`, registered in `levels/registry.ts`

Test a level with `?level=level-2&seed=1234`.
