# NOVA — Step 20.1 Product Contract Validation

Date: 2026-09-16
Source of truth: `docs/20-product-contract.md` + `docs/19-mvp.md`
Scope: audit only, no gameplay system added.

## Product Contract Coverage

| Contract area | Requirement | Status | Evidence | Gap |
|---|---|---|---|---|
| World | 128x128 seeded map | PARTIAL | `App.tsx:21` `createWorld({seed:4242,width:64,height:48})`, `world-generator.ts` supports arbitrary dims | Map 64x48, not 128x128 |
| World | plains/hills/coast/river/lake | PARTIAL | `world-generator.ts:createTerrainCell` elevation/water/restricted only, sin/cos + seeded random | No distinct biomes, no river/lake/coast objects |
| World | start location 900 cells, water <12, fertile <20 | MISSING | `create-initial-settlement.ts` picks center-nearest buildable, no validation | No validation rule |
| Construction | roads | PASS | `domain/construction/roads.ts`, `placeRoad`, E2E roads 6->7 | — |
| Construction | residential zones | PASS | `domain/city/zones.ts`, `createDevelopmentZone`, drag draw | — |
| Construction | food nodes | PASS | `BUILDING_TYPES.farm foodPerDay:8`, manual + auto place | — |
| Construction | energy nodes | MISSING | `building-types.ts` only house/farm/apartment, no generator | No energy producer |
| Population | aggregate population | PASS | `population-state.ts total`, header readout | — |
| Population | households/workers | MISSING | `PopulationState {total,growthProgress}` only | No households/workers |
| Population | contract growth formula | MISSING | Actual: `capacity-capped +60/day`, no wellbeing/housingRatio/foodRatio | Different model |
| Economy | food prod/cons | PARTIAL | `economy-state.ts` farm 8/day, 0.1/person/day, shortage tracked | No storage cap, no overflow event |
| Economy | energy/materials/storage | MISSING | No energy/materials fields, `EconomyState {food,...}` only | Systems absent |
| Growth | Settlement/Village/Town | MISSING | No stage code found (grep stage/settlement/village/town = 0 in src) | No progression rules |
| Time | pause/1x/2x/5x/20x | PASS | `SIMULATION_SPEEDS=[0,1,2,5,20,100]`, footer controls, STEP/RESET | — |
| Time | 1 tick = 1 day | MISSING | `FIXED_TIMESTEP_SECONDS=1/60`, `SIMULATION_SECONDS_PER_DAY=86400`, dev interval 600 ticks | 1 tick = 1/60s, not 1 day |
| Time | canonical tick order | PARTIAL | Actual: `clock->population->economy->development` in `simulation-state.ts:advanceSimulationTick` | No commands/accessibility/hash phases |
| Rendering | WebGL2 baseline | PASS | `ThreeWorldRenderer.ts`, E2E GPU 4/4 PASS RTX3070 | — |
| Rendering | day/night | PARTIAL | `App.tsx` YEAR/DAY derived from seconds, lighting exists but not verified vs contract | Visual check pending |
| Rendering | instancing/perf | PARTIAL | No perf instrumentation found, chunk 799KB warning | No budgets measured |
| Persistence | manual slot + autosave | MISSING | grep save/load/persist = App/rendering only, no infra/persistence dir | No save system |
| Persistence | save/reload same hash 100 ticks | BLOCKED | No save, no hash | Cannot validate |
| Determinism | same seed+commands=same hash | PARTIAL | Seeded `createRandom`, deterministic sort tie-breaks, but no state hash | Hash absent |
| UX | build tools/controls/metrics/inspector | PASS | Construction panel, speed/STEP/RESET, RECENT CHANGES feed, InspectionPanel | Metrics limited to pop/housing/food |
| UX | keyboard + a11y | PARTIAL | Delete/Backspace remove, aria-labels, canvas live region incomplete | Full keyboard path not proven |
| Acceptance | Playwright smoke | PASS | `test:e2e:gpu` 4/4 | CPU `test:e2e` stalls SwiftShader = env only |

## Playtest (GPU Chromium, RTX3070)

Flow executed via E2E + code trace:
1. Start NOVA seed 4242 64x48, 8 buildings (6 houses/2 farms), 5 roads, pop <=12, food 18 — observed in `create-initial-settlement.ts`, E2E expects BUILDINGS 8 / ROADS 6 (1 road merged or invalid).
2. Inspect: click building/road/service/zone -> `toInspection` -> panel. Empty cell closes.
3. Build HOUSE/FARM/ROAD/COMMUNITY/ZONE, VALID PLACEMENT check, drag zones.
4. Start simulation, speeds 1/2/5/20/100, STEP single tick, RESET clears feed.
5. Autonomous dev every 600 ticks: house->apartment densification, farm on shortage, road extension max 4 cells.
6. Feed RECENT CHANGES tick-stamped, grouped, click->select->inspect. Zone removal preserves buildings.

## Product Promise

1. Can player found establishment? YES. HOUSE+FARM+ROAD+ZONE+COMMUNITY, initial settlement prebuilt, E2E places/selects/removes.
2. Can player understand why it grows? PARTIALLY. Feed + inspection + zone/road adjacency visible. No causal why (by design Step18), no wellbeing breakdown, no stages.
3. Can player watch small city form? YES at small scale. Auto houses/farms/apartments + roads over time. Not Town scale (500 pop/40 houses), pop capped by housing (max ~ dozens).

## Gaps

- Requirement: 128x128 / biomes / start validation — Status: PARTIAL/MISSING — Impact: contract map fidelity — Next: enlarge default world + biome tags, keep gen seeded.
- Requirement: energy/materials/storage — Status: MISSING (A) — Impact: economy half — Next: add energy/materials domain + producers before Village.
- Requirement: households/workers + contract growth — Status: MISSING (B) — Impact: progression thresholds untestable — Next: align pop model or amend contract.
- Requirement: Settlement/Village/Town — Status: MISSING (A) — Impact: no win/progress — Next: implement stage evaluator + UI badge.
- Requirement: 1 tick=1 day + tick order + hash — Status: MISSING (A) — Impact: determinism unverifiable — Next: redefine tick vs frame, add canonical hash + command log.
- Requirement: manual+autosave — Status: MISSING (A) — Impact: acceptance gates 5/6 blocked — Next: SaveGameV1 atomic write + hash validate.
- Requirement: perf budgets — Status: C (implemented, not observable) — Impact: gate 8 unproven — Next: add tick/frame timers + memory log.

Gap classes: A=violation (energy, stages, tick, save), B=partial (food, pop, order), C=not observable (perf, day/night visual), D=validated (roads, zones, time controls, smoke), E=env (CPU WebGL stall).

## Validation

```text
pnpm typecheck: PASS (tsc -b, no errors)
pnpm lint: PASS (eslint, no errors)
pnpm test: PASS (24 files, 64 tests)
pnpm build: PASS (Vite 263ms, 799KB chunk warning only)
pnpm test:e2e:gpu: PASS (4/4, 5.9s, RTX3070 ANGLE/D3D11)
pnpm test:e2e (CPU): not used as gate, SwiftShader stall known env issue
```

## Production changes

```text
Production files modified: NO
Behavior changed: NO
New file: docs/qa/step20.1-product-contract-validation.md (this report)
```

## Final status

```text
PARTIAL — Product Contract has implementation gaps
```

Core loop playable and validated technically, but contract needs energy/materials, stages, tick/hash definition, and persistence before MVP acceptance.
