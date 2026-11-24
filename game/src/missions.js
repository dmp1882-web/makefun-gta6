// The story: three jobs for Mara Solis, the fixer who owns Deke's debt.
// Each mission defines its briefing, its markers and what counts as done.
// Missions never move the player; they only watch the state and pay out.
import { WORLD } from './config.js';
import { addCash, addMessage, startMission, SCREENS } from './state.js';

function marker(x, y, label) {
  return { x, y, label, done: false };
}

export const MISSION_DEFS = [
  {
    id: 'pickup',
    name: 'The Pickup',
    brief: 'Job 1 — The Pickup: Mara left a package at the east docks. Get to the marker.',
    setup(state) {
      state.mission.markers = [marker(state.city.docks.x, state.city.docks.y, 'DOCKS')];
    },
    update(state, dt) {
      const m = state.mission.markers[0];
      const p = state.player;
      if (Math.hypot(p.x - m.x, p.y - m.y) < 70) {
        m.done = true;
        return completeMission(state, 500, 'Package secured. Mara is pleased.');
      }
      return false;
    },
  },
  {
    id: 'drops',
    name: 'Three Drops',
    brief: 'Job 2 — Three Drops: three stashes hidden around Solmar Bay. Collect them all.',
    setup(state) {
      const city = state.city;
      state.mission.markers = [
        marker(city.roadsX[2], city.roadsY[1], 'DROP 1'),
        marker(city.roadsX[7], city.roadsY[5], 'DROP 2'),
        marker(city.roadsX[4], WORLD.height - 190, 'DROP 3'),
      ];
    },
    update(state, dt) {
      const p = state.player;
      let changed = false;
      for (const m of state.mission.markers) {
        if (!m.done && Math.hypot(p.x - m.x, p.y - m.y) < 60) {
          m.done = true;
          state.mission.collected += 1;
          addCash(state, 250, 'Stash collected');
          changed = true;
        }
      }
      if (changed && state.mission.collected >= state.mission.markers.length) {
        return completeMission(state, 0, 'All three drops collected. Clean work.');
      }
      return false;
    },
  },
  {
    id: 'heat',
    name: 'Lose the Heat',
    brief: 'Job 3 — Lose the Heat: the cops are on you, 3 stars. Survive 45 seconds and shake them.',
    setup(state) {
      state.mission.timer = 45;
      setWanted(state, 3);
      addMessage(state, 'The heat is on! Lose the cops!', 4);
    },
    update(state, dt) {
      state.mission.timer -= dt;
      if (state.wanted < 3 && state.mission.timer > 0) setWanted(state, 3);
      if (state.mission.timer <= 0) {
        return completeMission(state, 1500, 'You shook them. Debt paid — Solmar Bay is yours.');
      }
      return false;
    },
  },
];

export const MISSION_COUNT = MISSION_DEFS.length;

export function setWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(5, stars));
  state.wantedQuiet = 0;
}

export function addWanted(state, stars) {
  const before = state.wanted;
  setWanted(state, state.wanted + stars);
  state.wantedQuiet = 0;
  // A new star flashes the wanted box and, at most once every 2 seconds, a
  // line of text — so stealing a car or firing a shot reads as a real event
  // instead of the stars silently ticking up.
  if (state.wanted > before) {
    state.wantedFlashT = 1;
    if (state.wantedMsgT <= 0) {
      addMessage(state, 'Wanted: ' + '★'.repeat(state.wanted) + ' — lose the cops!', 2.5);
      state.wantedMsgT = 2;
    }
  }
}

function completeMission(state, reward, line) {
  const def = MISSION_DEFS[state.mission.index];
  state.stats.missionsDone += 1;
  // The banner already names the reward, so pay quietly — no duplicate "+$".
  if (reward > 0) addCash(state, reward, null, true);
  addMessage(state, line, 4);
  state.flash = { text: 'MISSION COMPLETE — ' + def.name + (reward > 0 ? '  +$' + reward : ''), t: 3 };
  const next = state.mission.index + 1;
  if (next >= MISSION_DEFS.length) {
    // Last job done: move to free roam (mission index past the last def) so
    // the finished mission never runs again, then show the end screen.
    state.storyDone = true;
    startMission(state, next);
    state.screen = SCREENS.COMPLETE;
    return true;
  }
  return 'next';
}

// Called every frame while playing: advances the current mission, and moves
// to the next one when it reports done.
export function updateMissions(state, dt, audio) {
  const def = MISSION_DEFS[state.mission.index];
  if (!def) return;
  const done = def.update(state, dt);
  if (done === 'next') {
    if (audio) audio.missionDone();
    startMission(state, state.mission.index + 1);
  }
}
