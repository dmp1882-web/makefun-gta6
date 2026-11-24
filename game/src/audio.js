// Sound, synthesized live with WebAudio: no audio files, no network. An
// engine hum that follows the car's speed, a two-tone siren while wanted, and
// one-shot blips for shots, pickups and crashes. Silent until the first user
// gesture, and harmless when audio is unavailable.
export function createAudio() {
  const audio = { ctx: null, master: null, engine: null, engineGain: null, siren: null, sirenGain: null, muted: false };
  function ensure() {
    if (audio.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.35;
      audio.master.connect(audio.ctx.destination);
      const eng = audio.ctx.createOscillator();
      eng.type = 'sawtooth';
      eng.frequency.value = 60;
      const engGain = audio.ctx.createGain();
      engGain.gain.value = 0;
      eng.connect(engGain);
      engGain.connect(audio.master);
      eng.start();
      audio.engine = eng;
      audio.engineGain = engGain;
      const sir = audio.ctx.createOscillator();
      sir.type = 'square';
      sir.frequency.value = 700;
      const sirGain = audio.ctx.createGain();
      sirGain.gain.value = 0;
      sir.connect(sirGain);
      sirGain.connect(audio.master);
      sir.start();
      audio.siren = sir;
      audio.sirenGain = sirGain;
      return true;
    } catch (err) {
      return false;
    }
  }
  function blip(freq, dur, type, vol) {
    if (!ensure() || audio.muted) return;
    try {
      const t = audio.ctx.currentTime;
      const o = audio.ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      const g = audio.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(audio.master);
      o.start(t);
      o.stop(t + dur);
    } catch (err) { /* sound is decoration; never break the game */ }
  }
  return {
    unlock() { ensure(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); },
    setMuted(m) {
      audio.muted = m;
      if (audio.master) audio.master.gain.value = m ? 0 : 0.35;
    },
    isMuted() { return audio.muted; },
    engine(speed, driving) {
      if (!ensure() || audio.muted) return;
      const target = driving ? 0.05 + Math.min(0.12, Math.abs(speed) / 540 * 0.12) : 0;
      audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
      audio.engine.frequency.setTargetAtTime(55 + Math.abs(speed) * 0.16, audio.ctx.currentTime, 0.1);
    },
    siren(wanted, time) {
      if (!ensure() || audio.muted) return;
      const on = wanted > 0;
      audio.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, audio.ctx.currentTime, 0.2);
      if (on) audio.siren.frequency.setTargetAtTime(Math.sin(time * 5) > 0 ? 660 : 880, audio.ctx.currentTime, 0.05);
    },
    shot() { blip(190, 0.12, 'square', 0.25); },
    pickup() { blip(880, 0.09, 'sine', 0.22); setTimeout(() => blip(1320, 0.12, 'sine', 0.22), 90); },
    crash() { blip(70, 0.25, 'sawtooth', 0.3); },
    missionDone() { blip(523, 0.12, 'sine', 0.22); setTimeout(() => blip(659, 0.12, 'sine', 0.22), 110); setTimeout(() => blip(784, 0.2, 'sine', 0.22), 220); },
  };
}
