// The player on foot and behind the wheel. Walking is WASD with building
// collision; driving steers the car the player sits in. E gets in and out of
// the nearest car — taking one that is not yours is a crime.
import { PLAYER, CAR, WANTED } from './config.js';
import { collideBuildings, clampToWorld, onRoad } from './city.js';
import { clamp, angleDiff } from './physics.js';
import { addWanted } from './missions.js';

export function updatePlayer(state, input, dt, audio) {
  const p = state.player;
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.hurtCooldown = Math.max(0, p.hurtCooldown - dt);
  if (p.onFoot) {
    updateOnFoot(state, input, dt);
  } else if (p.car) {
    updateDriving(state, input, dt, audio);
  }
  // Aim follows the mouse, in world coordinates.
  p.aimX = state.camera.x + input.mouseX - state.viewW / 2;
  p.aimY = state.camera.y + input.mouseY - state.viewH / 2;
  if (p.onFoot) p.angle = Math.atan2(p.aimY - p.y, p.aimX - p.x);
}

function updateOnFoot(state, input, dt) {
  const p = state.player;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.x += mx * PLAYER.walkSpeed * dt;
    p.y += my * PLAYER.walkSpeed * dt;
    p.moving = true;
  } else {
    p.moving = false;
  }
  collideBuildings(state.city, p, PLAYER.radius);
  clampToWorld(p, 24);
  if (input.action) {
    tryEnterCar(state);
    input.action = false;
  }
}

function nearestCar(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const c of state.cars) {
    if (c.kind === 'police') continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function tryEnterCar(state) {
  const p = state.player;
  const car = nearestCar(state, p.x, p.y, 64);
  if (!car) return;
  p.onFoot = false;
  p.car = car;
  car.kind = 'player';
  car.route = null;
  car.speed = 0;
  state.stats.carsStolen += 1;
  addWanted(state, WANTED.stealCar);
}

export function exitCar(state) {
  const p = state.player;
  const car = p.car;
  if (!car) return;
  car.speed = 0;
  car.kind = 'traffic';
  // Park it where it stands; traffic will pick it up again.
  const dest = { x: car.x + 400, y: car.y };
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  collideBuildings(state.city, p, PLAYER.radius);
  p.onFoot = true;
  p.car = null;
}

function updateDriving(state, input, dt, audio) {
  const p = state.player;
  const car = p.car;
  if (!car) {
    p.onFoot = true;
    return;
  }
  const throttle = (input.up ? 1 : 0) - (input.down ? 0.7 : 0);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) car.speed += CAR.brake * throttle * dt;
  else {
    car.speed -= Math.sign(car.speed) * 160 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = clamp(car.speed, -CAR.reverseMax, CAR.maxSpeed);
  const turnAuthority = clamp(Math.abs(car.speed) / 120, 0, 1);
  car.angle += steer * CAR.turnRate * turnAuthority * Math.sign(car.speed) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const hitWall = collideBuildings(state.city, car, CAR.length / 2 - 4);
  if (hitWall && Math.abs(car.speed) > 200) {
    car.speed *= 0.45;
    if (audio) audio.crash();
    spawnSparks(state, car.x, car.y);
  }
  clampToWorld(car, 30);
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  if (input.action) {
    exitCar(state);
    input.action = false;
  }
}

export function spawnSparks(state, x, y) {
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x, y,
      vx: (state.rng() - 0.5) * 260,
      vy: (state.rng() - 0.5) * 260,
      life: 0.4,
      color: '#ffd94d',
      size: 3,
    });
  }
}

export function hurtPlayer(state, amount) {
  const p = state.player;
  if (p.hurtCooldown > 0) return;
  p.health -= amount;
  p.hurtCooldown = 0.6;
  if (p.health <= 0) {
    p.health = 0;
    state.screen = 'wasted';
  }
}
