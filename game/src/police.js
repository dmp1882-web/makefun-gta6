// The wanted system and the police. Crimes raise the stars; quiet time
// lowers them. Police cars spawn on nearby roads, chase the player, ram the
// player's car, and bust the player on foot if they catch them standing still.
import { CAR, WANTED } from './config.js';
import { collideBuildings, clampToWorld } from './city.js';
import { dist, angleDiff, clamp } from './physics.js';
import { spawnPoliceCar, policeCount, addMessage } from './state.js';
import { hurtPlayer, spawnSparks } from './player.js';
import { setWanted } from './missions.js';

export function updatePolice(state, dt, audio) {
  const p = state.player;
  // Wanted decays after a stretch of quiet.
  if (state.wanted > 0) {
    state.wantedQuiet += dt;
    if (state.wantedQuiet > WANTED.decayDelay) {
      state.wantedQuiet = 0;
      setWanted(state, state.wanted - 1);
      if (state.wanted === 0) addMessage(state, 'You lost the heat.', 3);
    }
  }
  // Keep the right number of police cars on the road.
  const want = Math.min(state.wanted, WANTED.maxPolice);
  const have = policeCount(state);
  if (have < want) spawnPoliceCar(state);
  if (have > want) {
    for (const c of state.cars) {
      if (c.kind === 'police' && have > want) {
        c.kind = 'traffic';
        c.route = null;
        break;
      }
    }
  }
  // Chase.
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    // Stuck against a building: back up and turn away instead of grinding
    // on the wall forever. The beeline chase has no pathfinding, so a
    // reversing cop is what keeps the pursuit moving.
    if (car.reverseT > 0) {
      car.reverseT -= dt;
      car.speed = -170;
      car.angle += 1.6 * dt;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      collideBuildings(state.city, car, CAR.length / 2 - 4);
      clampToWorld(car, 30);
      continue;
    }
    const px = car.x;
    const py = car.y;
    const wantAngle = Math.atan2(p.y - car.y, p.x - car.x);
    car.angle += clamp(angleDiff(car.angle, wantAngle), -3.2 * dt, 3.2 * dt);
    const target = state.wanted > 0 ? CAR.policeSpeed : 0;
    car.speed += clamp(target - car.speed, -500 * dt, 420 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const hitWall = collideBuildings(state.city, car, CAR.length / 2 - 4);
    if (hitWall) car.speed *= 0.6;
    clampToWorld(car, 30);
    // Trying hard but barely moving means a wall is in the way.
    const moved = Math.hypot(car.x - px, car.y - py);
    if (state.wanted > 0 && Math.abs(car.speed) > 80 && moved < 3) car.stuck += dt;
    else car.stuck = 0;
    if (car.stuck > 1.0) {
      car.reverseT = 0.8;
      car.stuck = 0;
    }
    // Ram the player.
    const d = dist(car.x, car.y, p.x, p.y);
    if (d < 44) {
      if (p.onFoot) {
        p.bustMeter += dt;
        if (p.bustMeter > 1.6) {
          state.stats.busted += 1;
          state.screen = 'busted';
          return;
        }
      } else if (p.car) {
        p.car.speed *= 0.7;
        hurtPlayer(state, 5);
        spawnSparks(state, p.x, p.y);
        if (audio) audio.crash();
        // Shove the police car back so it does not stick.
        car.x -= Math.cos(car.angle) * 30;
        car.y -= Math.sin(car.angle) * 30;
        car.speed *= 0.4;
      }
    } else if (p.onFoot) {
      p.bustMeter = Math.max(0, p.bustMeter - dt * 0.5);
    }
  }
}
