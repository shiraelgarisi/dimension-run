/* Sound: everything is synthesized with the Web Audio API (no audio files).
   Each world has its own music layer; switching dimensions crossfades between them. */
(function () {
  'use strict';
  const DR = window.DR;

  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note -> Hz
  // progression per bar (MIDI roots): Light = C Am F G, Dark = Am F Dm E
  const LIGHT_ROOTS = [48, 45, 41, 43];
  const LIGHT_ARP = [[0, 4, 7, 12], [0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 11]];
  const DARK_ROOTS = [45, 41, 38, 40];
  const DARK_SCALE = [0, 3, 7, 10, 12, 15];

  let ctx = null, master = null, musicBus = null, lightBus = null, darkBus = null, noiseBuf = null;
  let timer = null, nextT = 0, step = 0, bpm = 120, intensity = 0, muted = false, mixTarget = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    lightBus = ctx.createGain(); lightBus.gain.value = 1; lightBus.connect(musicBus);
    darkBus = ctx.createGain(); darkBus.gain.value = 0; darkBus.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.1, to = null, at = 0, when = null, bus = master, attack = 0.005, filter = null } = {}) {
    if (!ctx) return;
    const t = when != null ? when : ctx.currentTime + at;   // `when` = absolute time, `at` = delay
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.1, freq = 1200, type = 'bandpass', at = 0, when = null, bus = master, sweep = null } = {}) {
    if (!ctx) return;
    const t = when != null ? when : ctx.currentTime + at;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  // ----- music sequencer (16th notes, scheduled slightly ahead for tight timing) -----
  function schedule() {
    const sd = 60 / bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      const s = step % 16, bar = Math.floor(step / 16) % 4;
      // Light World: bright pentatonic arpeggios
      const lr = LIGHT_ROOTS[bar];
      if (s % 4 === 0) tone(NOTE(lr - 12) * 1, 0.25, { type: 'sine', vol: 0.32, to: NOTE(lr - 12) * 0.5, when: nextT, bus: lightBus });
      if (s % 2 === 0) tone(NOTE(lr + 12 + LIGHT_ARP[bar][(s / 2) % 4]), 0.22, { type: 'triangle', vol: 0.07, when: nextT, bus: lightBus });
      if (s === 0 || s === 8) tone(NOTE(lr), 0.9, { type: 'triangle', vol: 0.09, when: nextT, bus: lightBus, attack: 0.04 });
      if (s % 4 === 2) noise(0.05, { vol: 0.025, freq: 8000, type: 'highpass', when: nextT, bus: lightBus });
      // Dark World: heartbeat bass, drone and eerie bells
      const dr = DARK_ROOTS[bar];
      if (s === 0 || s === 3 || s === 8 || s === 11) tone(70, 0.3, { type: 'sine', vol: s % 8 === 0 ? 0.45 : 0.3, to: 38, when: nextT, bus: darkBus });
      if (s === 0) tone(NOTE(dr - 12), 60 / bpm * 4, { type: 'sawtooth', vol: 0.06, when: nextT, bus: darkBus, attack: 0.3, filter: 380 });
      if (s % 3 === 0) tone(NOTE(dr + 12 + DARK_SCALE[(step * 5 + bar) % DARK_SCALE.length]), 0.5, { type: 'square', vol: 0.025, when: nextT, bus: darkBus, filter: 1600 });
      if (s % 2 === 1) noise(0.04, { vol: 0.02, freq: 6000, type: 'highpass', when: nextT, bus: darkBus });
      // intensity layer (final escape): driving 16th hats and toms on both layers
      if (intensity > 0) {
        noise(0.03, { vol: 0.03 * intensity, freq: 9000, type: 'highpass', when: nextT, bus: musicBus });
        if (s % 4 === 3) tone(160, 0.12, { vol: 0.15 * intensity, to: 90, when: nextT, bus: musicBus });
      }
      nextT += sd;
      step++;
    }
  }

  const Sound = {
    init,
    get muted() { return muted; },
    setMuted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02); },
    musicStart(tempo = 120) {
      if (!ctx) return;
      bpm = tempo;
      if (timer) return;
      nextT = ctx.currentTime + 0.06; step = 0;
      timer = setInterval(schedule, 40);
    },
    musicStop() { clearInterval(timer); timer = null; },
    setIntensity(v) { intensity = v; },
    setTempo(t) { bpm = t; },
    /** 0 = Light music, 1 = Dark music */
    setWorldMix(m) {
      if (!ctx || Math.abs(m - mixTarget) < 0.01) return;
      mixTarget = m;
      lightBus.gain.setTargetAtTime(Math.cos(m * Math.PI / 2), ctx.currentTime, 0.06);
      darkBus.gain.setTargetAtTime(Math.sin(m * Math.PI / 2), ctx.currentTime, 0.06);
    },

    // ----- effects -----
    jump() { tone(280, 0.18, { type: 'triangle', vol: 0.16, to: 640 }); },
    slide() { noise(0.3, { vol: 0.2, freq: 900, sweep: 300 }); },
    move() { noise(0.1, { vol: 0.08, freq: 2600 }); },
    switchTo(world) {
      if (world === 1) { tone(660, 0.35, { type: 'sawtooth', vol: 0.07, to: 110, filter: 2400 }); noise(0.35, { vol: 0.14, freq: 3000, sweep: 200 }); }
      else { tone(220, 0.35, { type: 'triangle', vol: 0.12, to: 990 }); noise(0.3, { vol: 0.1, freq: 400, sweep: 5000 }); }
    },
    denied() { tone(140, 0.12, { type: 'square', vol: 0.06 }); },
    ready() { tone(1320, 0.1, { type: 'sine', vol: 0.06 }); },
    coin(world) {
      if (world === 1) { tone(1046, 0.12, { type: 'sine', vol: 0.06 }); tone(1568, 0.18, { type: 'sine', vol: 0.05, at: 0.05 }); }
      else { tone(1320, 0.07, { type: 'square', vol: 0.035 }); tone(1980, 0.12, { type: 'square', vol: 0.035, at: 0.05 }); }
    },
    shard() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.08, at: i * 0.05 })); },
    bounce() { tone(160, 0.2, { type: 'sawtooth', vol: 0.12, to: 80, filter: 900 }); noise(0.15, { vol: 0.15, freq: 400 }); },
    crash() { tone(220, 0.7, { type: 'sawtooth', vol: 0.18, to: 40, filter: 1200 }); noise(0.5, { vol: 0.3, freq: 300, type: 'lowpass' }); },
    fall() { tone(500, 1.0, { type: 'triangle', vol: 0.14, to: 60 }); },
    rift() { tone(110, 0.5, { type: 'sawtooth', vol: 0.08, to: 880, filter: 3000 }); noise(0.5, { vol: 0.15, freq: 200, sweep: 6000 }); },
    beep(high) { tone(high ? 1046 : 523, high ? 0.35 : 0.15, { type: 'square', vol: 0.06 }); },
    click() { tone(880, 0.05, { type: 'sine', vol: 0.06 }); },
    finish() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.12, at: i * 0.11 })); },
    victory() {
      const seq = [523, 659, 784, 1046, 1318, 1568];
      seq.forEach((f, i) => { tone(f, 0.6, { type: 'triangle', vol: 0.12, at: i * 0.14 }); tone(f / 2, 0.6, { type: 'sine', vol: 0.1, at: i * 0.14 }); });
      [1046, 1318, 1568, 2093].forEach(f => tone(f, 2.2, { type: 'sine', vol: 0.06, at: 0.95, attack: 0.1 }));
    },
  };

  DR.Sound = Sound;
})();
