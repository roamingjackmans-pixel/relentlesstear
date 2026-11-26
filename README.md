# Relentless Tear

A story-driven 2D RPG for the browser. The world is a patchwork of lands sewn together under the Loom, a god of
fate, and something is tearing it open. Reactive turn-based combat: every enemy blow can be dodged, parried or
jumped in real time, every skill has timed strikes, and Free Aim lets you shoot weak points. Always a party of four:
play alone (you lead Ash, AI plays the rest, or command all four) or with up to three friends online, each playing
one companion.

Plays at **https://josephjackman.com/games/RelentlessTear/**. Everything you see and hear is drawn and synthesized
in code: no image or audio files.

## What's in it

- **A full campaign**: a Prologue, nine chapters in three acts, both endings (Mend or Tear), credits, New Game+, two
  optional regions and a post-game superboss. About 107 cutscenes, 31 bond scenes, 24 Lost Mender journals.
- **Seven companions** with signature mechanics: Ash's Stitches, Corin's Guard, Wick's Patterns (learned from beaten
  enemies) and Fray, Orrin's Tension, Maudra's Verses and Hymns, Rook's Heat, Tess's Penance.
- **Combat**: a speed-based turn order, AP (attack +1, skills cost 0-9, parries +1), timed inputs (tap rings, hold and
  release, rhythm arrows for hymns), Dodge / Parry / Jump with Counters, unblockable and ground-wave attacks, Break
  bars, elements and statuses, Free Aim with weak points and breakable armor, duo **Weave Arts**, bosses with phases.
- **Progression**: levels and attributes, a skill tree per companion with a six-skill loadout, weapons with upgrades
  and perks, **Patches** (passives) that become **Embroideries** anyone can wear after four battles, and **12 Classes**
  unlocked by account-wide Tasks (parry 30 hits: Duelist, and so on) that any companion can wear.
- **Exploration**: painted side-scrolling scenes with parallax, weather and light, chests, journals, Glass Beads
  (tincture upgrades), Waystitches (rest, level up, camp, travel), Bobbin merchants, roaming enemies you can strike
  first (or be ambushed by), and a patchwork world map.
- **Camp and bonds**: conversations with each companion raise bond levels, grant stats and skill points, and unlock
  Weave Arts.
- **Accounts**: email + password (shared with Shoallhell, Smash Your Bros and Baker's Dozen) with "Forgot password?"
  by emailed code; saves in the cloud (three slots), or play offline on one device.
- **Co-op**: host a game, friends join with a 4-digit code and each claims a companion; unclaimed seats are AI. The
  host runs the world; every client runs the same deterministic battle engine and plays its own timed inputs locally.

## Run it

```powershell
cd C:\dev\RelentlessTear; npm install
npm run dev      # Shoallhell's server (accounts, saves, co-op relay) + Vite: http://localhost:5180/games/RelentlessTear/
npm run typecheck; npm test
npm run build
```

`npm run dev` starts the server from `..\Shoallhell` (set `SHOALLHELL_DIR` to move it; `SHOALLHELL_PORT` and
`SHOALLHELL_SERVER` to use another port). Offline play works without it.

Testing aids: `?bgtick=1` keeps the game running in a hidden tab; `window.rtAuto = true` lets the AI play every seat.

## How it deploys

Every push to `main` runs `.github/workflows/ready.yml` (type check, tests, build) and publishes the built site to
the `ready` branch; the `games` repo picks it up into `/games/RelentlessTear/`. The accounts/co-op server is
Shoallhell's Fly.io app (`C:\dev\Shoallhell`, `fly deploy`).

## Controls

| | Keyboard / mouse | Gamepad |
|---|---|---|
| Move / run | A D or arrows / Shift | stick / LT |
| Interact, talk, rest | E or W | A |
| Strike first | Z or J | X |
| Menu / hold to fast-forward a scene | Esc | Start |
| World map | M | Select |
| Timed strikes, confirm | Space, Enter or click | A |
| Parry / Dodge / Jump | Space or F / Shift or Q / W | A or RB / B or LB / Y |
| Free Aim | mouse or arrows, Space to fire | right stick, A |

Touch: tap menus; Dodge, Parry and Jump buttons appear when an enemy attacks.
