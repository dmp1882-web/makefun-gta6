// One fixed step of the living world, shared by the live loop and by the
// screenshot staging, so a staged frame is a real frame of the real game.
import { updatePlayer } from './player.js';
import { updateTraffic, updatePeds } from './traffic.js';
import { updatePolice } from './police.js';
import { updateCombat } from './combat.js';
import { updateMissions } from './missions.js';
import { SCREENS } from './state.js';

export function stepWorld(state, input, dt, audio) {
  if (state.screen !== SCREENS.PLAY) return;
  state.time += dt;
  updatePlayer(state, input, dt, audio);
  if (state.screen !== SCREENS.PLAY) return;
  updateTraffic(state, dt);
  updatePeds(state, dt);
  updatePolice(state, dt, audio);
  if (state.screen !== SCREENS.PLAY) return;
  updateCombat(state, input, dt, audio);
  updateMissions(state, dt, audio);
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    state.messages[i].t -= dt;
    if (state.messages[i].t <= 0) state.messages.splice(i, 1);
  }
  if (state.flash) {
    state.flash.t -= dt;
    if (state.flash.t <= 0) state.flash = null;
  }
  if (state.wantedFlashT > 0) state.wantedFlashT -= dt;
  if (state.wantedMsgT > 0) state.wantedMsgT -= dt;
  const p = state.player;
  state.camera.x += (p.x - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (p.y - state.camera.y) * Math.min(1, dt * 5);
  if (state.wanted === 0 && p.health < 100) p.health = Math.min(100, p.health + 2 * dt);
  if (audio) {
    const driving = !p.onFoot && p.car;
    audio.engine(driving ? p.car.speed : 0, driving);
    audio.siren(state.wanted, state.time);
  }
}
