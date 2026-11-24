// Combat: the pistol, bullets and what they hit. Shooting on foot is the
// player's only weapon; every shot is a crime, and hitting a pedestrian or a
// police car raises the wanted level.
import { PLAYER, WANTED } from './config.js';
import { dist } from './physics.js';
import { addWanted } from './missions.js';
import { scarePeds } from './traffic.js';

export function updateCombat(state, input, dt, audio) {
  const p = state.player;
  if (p.onFoot && input.shoot && p.fireCooldown <= 0) {
    p.fireCooldown = PLAYER.fireCooldown;
    state.stats.shotsFired += 1;
    const a = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    state.bullets.push({
      x: p.x + Math.cos(a) * 18,
      y: p.y + Math.sin(a) * 18,
      vx: Math.cos(a) * PLAYER.bulletSpeed,
      vy: Math.sin(a) * PLAYER.bulletSpeed,
      life: 0.7,
    });
    addWanted(state, WANTED.shoot);
    scarePeds(state, p.x, p.y, 300);
    if (audio) audio.shot();
  }
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      // Buildings stop bullets.
      for (const bd of state.city.buildings) {
        if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) {
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const ped of state.peds) {
        if (ped.down <= 0 && dist(b.x, b.y, ped.x, ped.y) < 14) {
          ped.down = 999;
          addWanted(state, WANTED.hitPed);
          scarePeds(state, ped.x, ped.y, 320);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of state.cars) {
        if (car.kind === 'police' && dist(b.x, b.y, car.x, car.y) < 26) {
          car.health -= 1;
          addWanted(state, WANTED.killCopCar);
          if (car.health <= 0) {
            car.kind = 'traffic';
            car.smoke = true;
            car.speed = 0;
            car.route = null;
          }
          dead = true;
          break;
        }
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }
}
