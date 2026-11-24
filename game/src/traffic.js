// Traffic and pedestrians: the city breathing. Traffic cars follow road
// routes and slow for the car ahead; pedestrians stroll the sidewalks and
// run when a gun goes off or a car comes at them.
import { CAR } from './config.js';
import { roadPath, collideBuildings, clampToWorld } from './city.js';
import { dist, angleDiff, clamp } from './physics.js';
import { spawnTraffic, spawnPeds } from './state.js';

function carAhead(state, car) {
  const fx = car.x + Math.cos(car.angle) * 46;
  const fy = car.y + Math.sin(car.angle) * 46;
  for (const other of state.cars) {
    if (other === car) continue;
    if (dist(fx, fy, other.x, other.y) < 42) return true;
  }
  return false;
}

export function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    if (car.wait > 0) {
      car.wait -= dt;
      continue;
    }
    // Follow the route, one waypoint at a time.
    const wp = car.route ? car.route[car.routeIndex] : null;
    if (!wp) {
      const dest = { x: 60 + state.rng() * 2480, y: 60 + state.rng() * 1880 };
      car.route = roadPath(state.city, car.x, car.y, dest.x, dest.y);
      car.routeIndex = 1;
      continue;
    }
    const d = dist(car.x, car.y, wp.x, wp.y);
    if (d < 26) {
      car.routeIndex += 1;
      if (car.routeIndex >= car.route.length) {
        car.route = null;
        car.wait = 0.5 + state.rng() * 1.5;
      }
      continue;
    }
    const want = Math.atan2(wp.y - car.y, wp.x - car.x);
    car.angle += clamp(angleDiff(car.angle, want), -2.4 * dt, 2.4 * dt);
    const target = carAhead(state, car) ? 0 : CAR.trafficSpeed;
    car.speed += clamp(target - car.speed, -300 * dt, 200 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    collideBuildings(state.city, car, CAR.length / 2 - 4);
    clampToWorld(car, 30);
  }
  // Keep the streets full: replace cars that were stolen or wrecked.
  let traffic = 0;
  for (const c of state.cars) if (c.kind === 'traffic') traffic += 1;
  if (traffic < 8) spawnTraffic(state, 8 - traffic);
}

export function updatePeds(state, dt) {
  for (const ped of state.peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      continue;
    }
    if (ped.mode === 'flee') {
      ped.fleeT -= dt;
      ped.x += Math.cos(ped.angle) * 130 * dt;
      ped.y += Math.sin(ped.angle) * 130 * dt;
      if (ped.fleeT <= 0) ped.mode = 'walk';
    } else {
      const d = dist(ped.x, ped.y, ped.tx, ped.ty);
      if (d < 20) {
        ped.tx = ped.x + (state.rng() - 0.5) * 500;
        ped.ty = ped.y + (state.rng() - 0.5) * 500;
        ped.tx = clamp(ped.tx, 40, 2560);
        ped.ty = clamp(ped.ty, 40, 1960);
      } else {
        ped.angle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
      }
    }
    collideBuildings(state.city, ped, 10);
    clampToWorld(ped, 24);
  }
  let alive = 0;
  for (const p of state.peds) if (p.down <= 0) alive += 1;
  if (alive < 14) spawnPeds(state, 14 - alive);
}

// Everyone nearby runs when a shot is fired.
export function scarePeds(state, x, y, radius = 260) {
  for (const ped of state.peds) {
    if (ped.down > 0) continue;
    if (dist(ped.x, ped.y, x, y) < radius) {
      ped.mode = 'flee';
      ped.fleeT = 2.5;
      ped.angle = Math.atan2(ped.y - y, ped.x - x);
    }
  }
}
