# Solmar Heat

An original open-world crime game for the make.fun **gta6-01** bounty
("Make GTA 6"). It plays offline in a desktop browser from its own static
files — no build step, no network request, no library.

## The game

Deke owes the fixer Mara Solis $2,800. Three jobs stand between him and a
clean slate, in the sun-soaked coastal city of **Solmar Bay**:

1. **The Pickup** — reach the package at the east docks.
2. **Three Drops** — collect three stashes hidden around the city.
3. **Lose the Heat** — survive 45 seconds at 3 wanted stars and shake the cops.

After the story, free roam continues. Everything is original: the city, the
characters, the story and the art are drawn in code. Nothing comes from any
commercial game.

## What is in the world

- A city to explore **on foot and by car**: a road grid with buildings,
  parks, palms, a beach and docks.
- **Traffic** cars that follow the roads and **pedestrians** who stroll the
  sidewalks — and run when a gun goes off.
- **Cars to steal**: walk up to one and press E. Stealing is a crime.
- A **wanted level** (0–5 stars) with **police cars** that chase, ram and
  bust the player; the heat decays after a stretch of quiet.
- **Combat**: aim with the mouse, click to shoot the pistol.
- A **HUD with a minimap** (roads, mission markers, police blips, player
  arrow), cash, health, wanted stars, mission objective and speed.
- A **start screen** with the story and controls, pause, wasted / busted /
  story-complete screens, and a **save** (localStorage) that keeps cash and
  mission progress.
- **Sound**, synthesized live with WebAudio: engine hum, police siren,
  shots, pickups. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk, or drive (W accelerate, S brake/reverse, A/D steer) |
| E | Enter / exit the nearest car |
| Mouse + click | Aim and shoot the pistol (on foot) |
| P / Esc | Pause |
| M | Mute |
| Enter | Start, respawn, continue |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Any static file server works: serve `game/` and open `index.html`.

## Shots

`screenshots/` holds four real renders of the game's own code, staged by
`game/src/shots.js` through `?shot=chase|street|mission|title&seed=1`:

1. `1-chase.jpg` — a police chase at 3 stars, HUD and minimap live.
2. `2-street.jpg` — on foot downtown, traffic and pedestrians around.
3. `3-mission.jpg` — driving to a drop marker at 1 star.
4. `4-title.jpg` — the start screen.

## Layout

```
main.ts                  entry program: copies game/ + screenshots/ to /output,
                         writes /output/dossier.json with vendor/makefun-game.ts
serve.ts                 local static server for play-testing
vendor/makefun-game.ts   the kit's dossier library, unchanged
game/
  index.html             canvas + module bootstrap, no external references
  src/
    main.js              bootstrap, screens, main loop, save hooks
    state.js             the whole game state, fresh runs, spawning
    config.js            tuning constants and palette
    random.js            seeded RNG (mulberry32)
    city.js              city generation, roads, buildings, road routing
    physics.js           angles, distances, circle collisions
    input.js             keyboard and mouse
    audio.js             WebAudio synth: engine, siren, shots, pickups
    player.js            walking, driving, stealing cars
    traffic.js           traffic AI and pedestrians
    police.js            wanted level and police pursuit
    combat.js            pistol, bullets, what they hit
    missions.js          the three jobs and their payouts
    update.js            one fixed step of the living world
    render.js            city, cars, people, HUD, minimap, screens
    save.js              localStorage save / load
    shots.js             deterministic screenshot scenes
screenshots/            1-chase.jpg, 2-street.jpg, 3-mission.jpg, 4-title.jpg
LICENSE                  MIT
```

## License

MIT — see `LICENSE`.
