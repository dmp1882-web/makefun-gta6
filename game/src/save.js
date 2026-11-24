// Save and load, through localStorage. Cash, mission progress and the story
// flag survive a reload; the world itself is rebuilt from the seed.
import { SAVE_KEY } from './config.js';
import { startMission } from './state.js';
import { MISSION_COUNT } from './missions.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function applySave(state, data) {
  if (!data) return;
  state.player.cash = data.cash || 0;
  state.storyDone = !!data.storyDone;
  // A finished story resumes in free roam, not back at the last mission.
  const index = data.storyDone ? MISSION_COUNT : Math.min(data.missionIndex || 0, 2);
  startMission(state, index);
  state.save = data;
}

export function writeSave(state) {
  try {
    const data = {
      cash: state.player.cash,
      missionIndex: state.mission.index,
      storyDone: state.storyDone,
      bestCash: Math.max(state.player.cash, (state.save && state.save.bestCash) || 0),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    state.save = data;
  } catch (err) { /* a full or blocked store never breaks the game */ }
}
