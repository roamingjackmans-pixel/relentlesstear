# CLAUDE.md — Relentless Tear

Story-driven 2D browser RPG with reactive turn-based combat (see README.md, and docs/DESIGN.md for the story bible,
cast, systems and content rosters). Vite + TypeScript, Canvas 2D, DOM overlays for UI, no framework. Accounts,
saves and the co-op relay are Shoallhell's server (game id `rt`, `C:\dev\Shoallhell`). Hosted at
`https://josephjackman.com/games/RelentlessTear/` via the `ready` branch (games repo `deploy/library.json`).

## Rules that are easy to break

- Original world only. The combat is in the spirit of Clair Obscur: Expedition 33; never reuse its names, plot,
  characters or look.
- `BState` (battle state) stays plain JSON and the engine stays deterministic: randomness only from `rnd(st, ...)`
  (hash of seed + turn + keys). Co-op clients run the same engine on the same inputs.
- Content is data: story in `src/story/*` (written with `src/story/dsl.ts`), world in `src/world/*`, enemies in
  `src/data/enemies.ts`, skills in `src/data/skills.ts`. `tests/content.test.ts` checks every reference and flag.
- A cutscene is marked `seen:<id>` only when it finishes (so closing mid-scene can't soft-lock the story).
- Balance: run `npx vitest run tests/balance.test.ts --reporter=verbose` after changing stats, XP or HP; it plays
  the whole campaign with AI and prints party vs enemy levels per region. Knobs: `ENEMY_HP_SCALE`/`BOSS_HP_SCALE`
  in `src/battle/engine.ts`, `xpToNext` in `src/data/characters.ts`.
- Everything visual is drawn in code; everything audible is synthesized (`src/audio`). No asset files.

## Commands

```powershell
npm run dev                      # server :3031 + Vite :5180 (launch config "relentlesstear-dev" uses :3041)
npm run typecheck; npm test      # content, engine, balance sim, audio, enemies
npm run build
```

The games-site card clip: `C:\dev\DungeonJoe\deploy\previews\recipes\RelentlessTear.mjs`.
