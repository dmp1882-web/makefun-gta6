// Screenshot scenes behind ?shot=chase|street|mission|title. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { CAR } from './config.js';
import { roadPath } from './city.js';
import { angleDiff, dist } from './physics.js';
import { SCREENS, startMission, spawnPoliceCar } from './state.js';
import { setWanted } from './missions.js';
import { stepWorld } from './update.js';

const STEP = 1 / 30;

function blankInput() {
  return {
    up: false, down: false, left: false, right: false,
    action: false, shoot: false,
    mouseX: 640, mouseY: 360, clicked: false, clickX: 0, clickY: 0,
    pressedKeys: new Set(),
  };
}

// Steer the player's car toward a waypoint, like a hurried driver.
function driveToward(state, input, tx, ty) {
  const car = state.player.car;
  if (!car) return;
  const want = Math.atan2(ty - car.y, tx - car.x);
  const diff = angleDiff(car.angle, want);
  input.up = true;
  input.down = false;
  input.left = diff > 0.12;
  input.right = diff < -0.12;
}

// Walk toward a point.
function walkToward(state, input, tx, ty) {
  const p = state.player;
  input.up = ty < p.y - 6;
  input.down = ty > p.y + 6;
  input.left = tx < p.x - 6;
  input.right = tx > p.x + 6;
}

function putPlayerInCar(state, x, y) {
  let best = null;
  let bestD = 1e9;
  for (const c of state.cars) {
    if (c.kind !== 'traffic') continue;
    const d = dist(c.x, c.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (!best) return null;
  best.x = x;
  best.y = y;
  best.angle = -Math.PI / 2;
  best.speed = 0;
  best.kind = 'player';
  best.route = null;
  const p = state.player;
  p.onFoot = false;
  p.car = best;
  p.x = x;
  p.y = y;
  p.angle = best.angle;
  return best;
}

function runSteps(state, input, seconds, audio) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i += 1) {
    stepWorld(state, input, STEP, audio);
    if (state.screen !== SCREENS.PLAY) break;
  }
}

// Drive along the road grid toward a target, waypoint by waypoint.
function autopilotDrive(state, input, route) {
  let index = 1;
  return function drive() {
    const car = state.player.car;
    if (!car || index >= route.length) return false;
    const wp = route[index];
    if (dist(car.x, car.y, wp.x, wp.y) < 30) {
      index += 1;
      return index < route.length;
    }
    driveToward(state, input, wp.x, wp.y);
    return true;
  };
}

export function stageShot(state, name, audio) {
  state.screen = SCREENS.PLAY;
  state.viewW = 1280;
  state.viewH = 720;
  const input = blankInput();
  if (name === 'title') {
    state.screen = SCREENS.TITLE;
    return SCREENS.TITLE;
  }
  if (name === 'street') {
    const p = state.player;
    p.x = state.city.roadsX[4];
    p.y = state.city.roadsY[2];
    p.onFoot = true;
    p.car = null;
    state.camera.x = p.x;
    state.camera.y = p.y;
    // Crowd the corner: pull traffic and pedestrians in close.
    let moved = 0;
    for (const c of state.cars) {
      if (c.kind === 'traffic' && moved < 4) {
        c.x = state.city.roadsX[4] + (moved - 2) * 130;
        c.y = state.city.roadsY[2] - 160;
        c.route = null;
        moved += 1;
      }
    }
    state.peds.forEach((ped, i) => {
      if (i < 8) {
        ped.x = p.x + (i % 4 - 1.5) * 70;
        ped.y = p.y + (Math.floor(i / 4) - 0.5) * 90;
      }
    });
    for (let i = 0; i < 5 * 30; i += 1) {
      walkToward(state, input, state.city.roadsX[5], state.city.roadsY[2]);
      stepWorld(state, input, STEP, audio);
      if (state.screen !== SCREENS.PLAY) break;
    }
    return SCREENS.PLAY;
  }
  if (name === 'mission') {
    startMission(state, 1);
    const first = state.mission.markers[0];
    const car = putPlayerInCar(state, state.city.roadsX[2], state.city.roadsY[1] + 200);
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    setWanted(state, 1);
    if (car) {
      const route = roadPath(state.city, car.x, car.y, first.x, first.y);
      const drive = autopilotDrive(state, input, route);
      for (let i = 0; i < 10 * 30; i += 1) {
        if (!drive()) break;
        stepWorld(state, input, STEP, audio);
        if (state.screen !== SCREENS.PLAY) break;
      }
    }
    return SCREENS.PLAY;
  }
  // Default: the chase. Seven seconds in: the player is already moving and
  // the police are closing in, but nobody has piled up yet.
  const car = putPlayerInCar(state, state.city.roadsX[3], state.city.roadsY[3]);
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  setWanted(state, 3);
  spawnPoliceCar(state);
  spawnPoliceCar(state);
  spawnPoliceCar(state);
  state.mission.text = 'Job 1 — The Pickup: Mara left a package at the east docks. Get to the marker.';
  if (car) {
    car.speed = 320;
    const route = roadPath(state.city, car.x, car.y, state.city.docks.x, state.city.docks.y);
    const drive = autopilotDrive(state, input, route);
    for (let i = 0; i < 7 * 30; i += 1) {
      if (!drive()) break;
      stepWorld(state, input, STEP, audio);
      if (state.screen !== SCREENS.PLAY) break;
    }
  }
  return SCREENS.PLAY;
}
