// Solmar Heat — bootstrap and the main loop. Owns the canvas, the screens
// (title, play, pause, wasted, busted, complete) and the save; the world
// itself lives in state.js and the systems it calls.
import { createState, resetRun, SCREENS } from './state.js';
import { createInput, pressed, consumeClick } from './input.js';
import { createAudio } from './audio.js';
import { render, titleButtons } from './render.js';
import { stepWorld } from './update.js';
import { stageShot } from './shots.js';
import { loadSave, applySave, writeSave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seedParam = parseInt(params.get('seed') || '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : (Date.now() % 2147483647);

const state = createState(seed);
state.save = loadSave();
const input = createInput(canvas);
const audio = createAudio();
let savedMission = -1;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.viewW = w;
  state.viewH = h;
}
window.addEventListener('resize', resize);
resize();

function startGame(useSave) {
  audio.unlock();
  if (useSave && state.save) applySave(state, state.save);
  else resetRun(state);
  state.screen = SCREENS.PLAY;
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  savedMission = state.mission.index;
}

function respawn(fee) {
  const p = state.player;
  if (p.car) {
    p.car.kind = 'traffic';
    p.car.route = null;
    p.car.speed = 0;
    p.car = null;
  }
  p.onFoot = true;
  p.health = 100;
  p.bustMeter = 0;
  p.cash = Math.max(0, p.cash - fee);
  p.x = state.city.spawn.x;
  p.y = state.city.spawn.y;
  state.camera.x = p.x;
  state.camera.y = p.y;
  state.wanted = 0;
  state.wantedQuiet = 0;
  for (const c of state.cars) if (c.kind === 'police') c.kind = 'traffic';
  state.screen = SCREENS.PLAY;
}

function handleScreens() {
  const click = consumeClick(input);
  if (state.screen === SCREENS.TITLE) {
    if (click) {
      for (const b of titleButtons(state, state.viewW, state.viewH)) {
        if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
          startGame(b.id === 'continue');
          return;
        }
      }
    }
    if (pressed(input, 'Enter')) startGame(false);
    return;
  }
  if (state.screen === SCREENS.PLAY) {
    if (pressed(input, 'KeyP') || pressed(input, 'Escape')) state.screen = SCREENS.PAUSE;
    if (pressed(input, 'KeyM')) audio.setMuted(!audio.isMuted());
    return;
  }
  if (state.screen === SCREENS.PAUSE) {
    if (pressed(input, 'KeyP') || pressed(input, 'Escape') || pressed(input, 'Enter')) state.screen = SCREENS.PLAY;
    return;
  }
  if (state.screen === SCREENS.WASTED) {
    if (pressed(input, 'Enter')) respawn(200);
    return;
  }
  if (state.screen === SCREENS.BUSTED) {
    if (pressed(input, 'Enter')) respawn(300);
    return;
  }
  if (state.screen === SCREENS.COMPLETE) {
    if (pressed(input, 'Enter')) state.screen = SCREENS.PLAY;
  }
}

if (shot) {
  // Screenshot mode: stage one deterministic frame. Keep repainting it every
  // frame, so a later viewport resize (which clears the canvas bitmap) never
  // leaves a blank frame behind.
  stageShot(state, shot, null);
  (function paint() {
    render(state, ctx, state.viewW, state.viewH);
    requestAnimationFrame(paint);
  })();
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleScreens();
    if (state.screen === SCREENS.PLAY) {
      stepWorld(state, input, dt, audio);
      if (state.mission.index !== savedMission) {
        savedMission = state.mission.index;
        writeSave(state);
      }
    }
    render(state, ctx, state.viewW, state.viewH);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', () => writeSave(state));
}
