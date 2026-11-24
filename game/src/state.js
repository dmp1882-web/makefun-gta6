// The whole game state in one place, and how a fresh run starts. Systems
// (player, traffic, police, missions) read and write this object; none of
// them owns it, so a screenshot can stage any state and the loop can reset it.
import { WORLD, CAR, PLAYER } from './config.js';
import { generateCity, roadPath } from './city.js';
import { makeRng, pick, range, rangeInt } from './random.js';
import { MISSION_DEFS } from './missions.js';

export const SCREENS = {
  TITLE: 'title',
  PLAY: 'play',
  PAUSE: 'pause',
  WASTED: 'wasted',
  BUSTED: 'busted',
  COMPLETE: 'complete',
};

let nextCarId = 1;

export function makeCar(x, y, angle, kind, color) {
  return {
    id: nextCarId,
    x, y, angle, speed: 0,
    kind, color,
    health: kind === 'police' ? 3 : 1,
    route: null,
    routeIndex: 0,
    wait: 0,
    stuck: 0,
    reverseT: 0,
    smoke: false,
  };
}

export function createState(seed) {
  const rng = makeRng(seed);
  const city = generateCity(seed);
  const state = {
    seed,
    rng,
    city,
    time: 0,
    screen: SCREENS.TITLE,
    camera: { x: city.spawn.x, y: city.spawn.y },
    player: {
      x: city.spawn.x,
      y: city.spawn.y,
      angle: -Math.PI / 2,
      onFoot: true,
      health: PLAYER.healthMax,
      cash: 120,
      car: null,
      fireCooldown: 0,
      hurtCooldown: 0,
      bustMeter: 0,
      aimX: city.spawn.x,
      aimY: city.spawn.y - 100,
    },
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    wanted: 0,
    wantedQuiet: 0,
    wantedFlashT: 0,
    wantedMsgT: 0,
    messages: [],
    stats: { carsStolen: 0, shotsFired: 0, missionsDone: 0, busted: 0 },
    mission: {
      index: 0,
      phase: 'go',
      timer: 0,
      markers: [],
      collected: 0,
      text: '',
    },
    save: null,
    muted: false,
    flash: null,
    storyDone: false,
  };
  spawnTraffic(state, 10);
  spawnPeds(state, 18);
  startMission(state, 0);
  return state;
}

function randomRoadPoint(state, rng) {
  const city = state.city;
  if (rng() < 0.5) {
    return { x: pick(rng, city.roadsX), y: range(rng, 60, WORLD.height - 160) };
  }
  return { x: range(rng, 60, WORLD.width - 60), y: pick(rng, city.roadsY) };
}

export function spawnTraffic(state, count) {
  const rng = state.rng;
  const colors = ['#d94f3d', '#3d7dd9', '#e8c33d', '#7ed957', '#f2f2f2', '#222831', '#c65bd9', '#ff8c42'];
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(state, rng);
    const car = makeCar(p.x, p.y, pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), 'traffic', pick(rng, colors));
    const dest = randomRoadPoint(state, rng);
    car.route = roadPath(state.city, p.x, p.y, dest.x, dest.y);
    car.routeIndex = 1;
    car.speed = CAR.trafficSpeed * range(rng, 0.8, 1.1);
    state.cars.push(car);
  }
}

export function spawnPeds(state, count) {
  const rng = state.rng;
  const shirts = ['#e85d75', '#4d96e8', '#f2e14d', '#7ed957', '#f2f2f2', '#c65bd9', '#ff8c42', '#5dd6c8'];
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(state, rng);
    state.peds.push({
      x: p.x + range(rng, -30, 30),
      y: p.y + range(rng, -30, 30),
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 28, 55),
      color: pick(rng, shirts),
      mode: 'walk',
      tx: p.x,
      ty: p.y,
      down: 0,
      fleeT: 0,
    });
  }
}

export function spawnPoliceCar(state) {
  const p = state.player;
  const city = state.city;
  const rng = state.rng;
  // Appear on a road a little way from the player, ideally off screen.
  let x = p.x;
  let y = p.y;
  for (let tries = 0; tries < 12; tries += 1) {
    const cand = randomRoadPoint(state, rng);
    const d = Math.hypot(cand.x - p.x, cand.y - p.y);
    if (d > 520 && d < 1100) {
      x = cand.x;
      y = cand.y;
      break;
    }
  }
  const car = makeCar(x, y, 0, 'police', '#f4f6f8');
  car.speed = CAR.policeSpeed * 0.7;
  state.cars.push(car);
  return car;
}

export function policeCount(state) {
  let n = 0;
  for (const c of state.cars) if (c.kind === 'police') n += 1;
  return n;
}

export function addMessage(state, text, seconds = 3) {
  state.messages.push({ text, t: seconds });
  if (state.messages.length > 3) state.messages.shift();
}

export function addCash(state, amount, label, quiet = false) {
  state.player.cash += amount;
  if (!quiet && amount !== 0) {
    addMessage(state, (label ? label + ' ' : '') + (amount >= 0 ? '+' : '') + '$' + amount, 3);
  }
}

export function startMission(state, index) {
  state.mission.index = index;
  state.mission.phase = 'go';
  state.mission.timer = 0;
  state.mission.collected = 0;
  state.mission.markers = [];
  const def = MISSION_DEFS[index];
  if (!def) {
    state.mission.text = 'Free roam — Solmar Bay is yours. Cause chaos, lose the heat, get rich.';
    state.storyDone = true;
    return;
  }
  def.setup(state);
  state.mission.text = def.brief;
}

export function resetRun(state) {
  const seed = state.seed;
  const fresh = createState(seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}
