/* Sound: everything is synthesized with the Web Audio API (no audio files).
   Every level has its own song (the menu too), and every song has a Light and a Dark
   layer; switching dimensions crossfades between them. Songs also scatter ambient
   sounds that fit the place: birds and crickets, space radio, clock chimes, bubbles, rumbles. */
(function () {
  'use strict';
  const DR = window.DR;

  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note -> Hz
  const MUSIC_VOL = 0.42;

  let ctx = null, master = null, musicBus = null, lightBus = null, darkBus = null, noiseBuf = null, reverb = null;
  let timer = null, nextT = 0, step = 0, bpm = 100, tempoScale = 1, intensity = 0, muted = false, mixTarget = 0;
  let song = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    // music: soft low-pass and a generated reverb for a calmer, roomier sound
    const tone_ = ctx.createBiquadFilter(); tone_.type = 'lowpass'; tone_.frequency.value = 5200;
    tone_.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(tone_);
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    reverb.connect(wet).connect(musicBus);
    lightBus = ctx.createGain(); lightBus.gain.value = 1; lightBus.connect(musicBus); lightBus.connect(reverb);
    darkBus = ctx.createGain(); darkBus.gain.value = 0; darkBus.connect(musicBus); darkBus.connect(reverb);
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
  function noise(dur, { vol = 0.1, freq = 1200, type = 'bandpass', at = 0, when = null, bus = master, sweep = null, q = 1 } = {}) {
    if (!ctx) return;
    const t = when != null ? when : ctx.currentTime + at;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------------
  // instruments (all take an absolute time `w` and a bus `b`)
  // ------------------------------------------------------------------
  const I = {
    marimba: (n, w, b, v = 0.07) => { tone(NOTE(n), 0.35, { vol: v, when: w, bus: b }); tone(NOTE(n) * 4, 0.08, { vol: v * 0.25, when: w, bus: b }); },
    musicBox: (n, w, b, v = 0.05) => { tone(NOTE(n), 0.9, { vol: v, when: w, bus: b }); tone(NOTE(n) * 3, 0.25, { vol: v * 0.3, when: w, bus: b }); },
    bell: (n, w, b, v = 0.05, len = 1.8) => { tone(NOTE(n), len, { vol: v, when: w, bus: b }); tone(NOTE(n) * 2.76, len * 0.4, { vol: v * 0.35, when: w, bus: b }); },
    pluck: (n, w, b, v = 0.05) => tone(NOTE(n), 0.3, { type: 'triangle', vol: v, when: w, bus: b }),
    flute: (n, w, b, v = 0.05, len = 0.8) => tone(NOTE(n), len, { type: 'triangle', vol: v, when: w, bus: b, attack: 0.08 }),
    pad: (notes, w, b, len, v = 0.03, cut = 1100) => notes.forEach(n => {
      tone(NOTE(n) * 1.004, len, { type: 'sawtooth', vol: v, when: w, bus: b, attack: Math.min(0.8, len * 0.3), filter: cut });
      tone(NOTE(n) * 0.996, len, { type: 'sawtooth', vol: v, when: w, bus: b, attack: Math.min(0.8, len * 0.3), filter: cut });
    }),
    softPad: (notes, w, b, len, v = 0.04) => notes.forEach(n => tone(NOTE(n), len, { type: 'triangle', vol: v, when: w, bus: b, attack: Math.min(0.9, len * 0.35) })),
    bass: (n, w, b, v = 0.14, len = 0.4) => tone(NOTE(n), len, { type: 'triangle', vol: v, when: w, bus: b, attack: 0.01 }),
    sub: (n, w, b, v = 0.16, len = 0.8) => tone(NOTE(n), len, { vol: v, when: w, bus: b, attack: 0.02 }),
    harpsi: (n, w, b, v = 0.035) => tone(NOTE(n), 0.3, { type: 'sawtooth', vol: v, when: w, bus: b, filter: 2200 }),
    brass: (notes, w, b, v = 0.05, len = 0.5) => notes.forEach(n => tone(NOTE(n), len, { type: 'sawtooth', vol: v, when: w, bus: b, attack: 0.04, filter: 900 })),
    kick: (w, b, v = 0.22) => tone(110, 0.3, { vol: v, to: 42, when: w, bus: b }),
    taiko: (w, b, v = 0.32) => { tone(82, 0.55, { vol: v, to: 38, when: w, bus: b }); noise(0.12, { vol: v * 0.3, freq: 300, when: w, bus: b }); },
    tom: (f, w, b, v = 0.12) => tone(f, 0.22, { vol: v, to: f * 0.6, when: w, bus: b }),
    snare: (w, b, v = 0.05) => noise(0.12, { vol: v, freq: 1800, when: w, bus: b }),
    hat: (w, b, v = 0.015) => noise(0.04, { vol: v, freq: 8000, type: 'highpass', when: w, bus: b }),
    shaker: (w, b, v = 0.018) => noise(0.06, { vol: v, freq: 6000, when: w, bus: b, q: 2 }),
    tick: (w, b, hi, v = 0.05) => noise(0.025, { vol: v, freq: hi ? 4200 : 2400, when: w, bus: b, q: 6 }),
    bubble: (w, b, v = 0.05) => { const f = 250 + Math.random() * 400; tone(f, 0.09, { vol: v, to: f * 2.6, when: w, bus: b }); },
  };

  // ------------------------------------------------------------------
  // ambient sounds
  // ------------------------------------------------------------------
  const AMB = {
    bird: (w, b) => { const f = 2200 + Math.random() * 1400, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) tone(f * (i % 2 ? 1.25 : 1), 0.09, { vol: 0.025, to: f * (i % 2 ? 1 : 1.35), when: w + i * 0.11, bus: b }); },
    cricket: (w, b) => { for (let i = 0; i < 3; i++) tone(4600, 0.035, { vol: 0.012, when: w + i * 0.06, bus: b }); },
    owl: (w, b) => { tone(420, 0.35, { vol: 0.04, to: 400, when: w, bus: b, attack: 0.05 }); tone(400, 0.5, { vol: 0.035, to: 370, when: w + 0.45, bus: b, attack: 0.05 }); },
    radio: (w, b) => { const f = 900 + Math.random() * 900; tone(f, 0.08, { type: 'square', vol: 0.012, when: w, bus: b, filter: 2500 }); tone(f * 1.5, 0.08, { type: 'square', vol: 0.01, when: w + 0.1, bus: b, filter: 2500 }); },
    whoosh: (w, b) => noise(1.4, { vol: 0.03, freq: 300, sweep: 2400, when: w, bus: b }),
    hum: (w, b) => tone(55, 2.5, { type: 'sawtooth', vol: 0.03, when: w, bus: b, attack: 0.8, filter: 200 }),
    chime: (w, b) => [72, 76, 74, 67].forEach((n, i) => I.bell(n, w + i * 0.45, b, 0.03, 1.4)),
    clank: (w, b) => { tone(180, 0.15, { type: 'square', vol: 0.02, to: 120, when: w, bus: b, filter: 800 }); noise(0.08, { vol: 0.03, freq: 900, when: w, bus: b }); },
    bubbles: (w, b) => { for (let i = 0; i < 3; i++) I.bubble(w + i * (0.06 + Math.random() * 0.08), b, 0.03); },
    squeak: (w, b) => tone(3200, 0.05, { vol: 0.012, to: 4600, when: w, bus: b }),
    rumble: (w, b) => noise(2.2, { vol: 0.09, freq: 110, type: 'lowpass', when: w, bus: b }),
    pop: (w, b) => { tone(600 + Math.random() * 500, 0.06, { vol: 0.03, to: 1400, when: w, bus: b }); noise(0.03, { vol: 0.03, freq: 3000, when: w + 0.02, bus: b }); },
    zoom: (w, b) => { tone(180, 1.0, { type: 'sawtooth', vol: 0.02, to: 90, when: w, bus: b, filter: 900 }); noise(0.9, { vol: 0.025, freq: 600, sweep: 2400, when: w, bus: b }); },
    growl: (w, b) => tone(70, 1.3, { type: 'sawtooth', vol: 0.05, to: 52, when: w, bus: b, attack: 0.2, filter: 300 }),
    crackle: (w, b) => { for (let i = 0; i < 5; i++) noise(0.012, { vol: 0.05, freq: 3000, when: w + Math.random() * 0.4, bus: b, q: 3 }); },
  };

  // ------------------------------------------------------------------
  // songs. light/dark(s, bar, w, L/D bus) are called on every step; amb lists ambient sounds per world
  // ------------------------------------------------------------------
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  const SONGS = {
    // a gentle music-box lullaby for the title screen
    menu: {
      bpm: 70, steps: 16, bars: 4,
      chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]],
      light(s, bar, w, B) {
        const c = this.chords[bar], beat = 60 / bpm / 4;
        if (s === 0) { I.softPad([c[0] - 12, c[1] - 12, c[2] - 12], w, B, beat * 16, 0.028); I.sub(c[0] - 24, w, B, 0.08, beat * 12); }
        if (s % 2 === 0) I.musicBox(c[[0, 1, 2, 3, 2, 1, 2, 3][s / 2]] + 12, w, B, 0.026);
        if (s === 12 && bar % 2 === 1) I.bell(c[3] + 24, w, B, 0.018);
      },
      dark(s, bar, w, B) {
        const c = this.chords[bar], beat = 60 / bpm / 4;
        if (s === 0) I.softPad([c[0] - 12, c[2] - 12], w, B, beat * 16, 0.03);
        if (s === 0 || s === 6 || s === 10) I.bell(c[[0, 2, 1][s % 3]] + 12, w, B, 0.025, 2.2);
      },
      amb: [[], []],
    },
    // Jungle Temple: marimba, hand drums and shakers; at night flute, crickets and an owl
    1: {
      bpm: 108, steps: 16, bars: 4, roots: [60, 57, 53, 55],
      mel: [[0, -1, 2, -1, 4, 3, 2, -1, 0, -1, 2, 4, 5, -1, 4, -1], [4, -1, 3, 2, 0, -1, 2, -1, 3, -1, 2, -1, 0, -1, -1, -1],
        [2, -1, 4, -1, 5, 4, 3, -1, 2, -1, 4, -1, 3, -1, 2, -1], [3, -1, 2, -1, 0, -1, 2, 3, 4, -1, 3, -1, 2, -1, 1, -1]],
      light(s, bar, w, B) {
        const r = this.roots[bar];
        if (s === 0 || s === 6 || s === 8 || s === 11) I.kick(w, B, 0.16);
        if (s === 3 || s === 10 || s === 14) I.tom(320, w, B, 0.07);
        if (s % 2 === 1) I.shaker(w, B);
        if (s % 4 === 0) I.marimba(r - 12 + (s === 8 ? 7 : 0), w, B, 0.09);
        const m = this.mel[bar][s];
        if (m >= 0) I.marimba(r + PENTA[m], w, B, 0.06);
      },
      dark(s, bar, w, B) {
        const r = this.roots[bar] - 3;
        if (s === 0 || s === 8) I.kick(w, B, 0.14);
        if (s === 0) I.softPad([r - 12, r - 5], w, B, 2.2, 0.03);
        if (s === 0 || s === 6 || s === 12) I.flute(r + [0, 3, 7, 10, 12][(bar + s) % 5], w, B, 0.04, 0.7);
      },
      amb: [[['bird', 0.35]], [['cricket', 0.7], ['owl', 0.04]]],
    },
    // Deep Space: dreamy pads, twinkling arpeggios and a deep pulse; the dark side drones
    2: {
      bpm: 92, steps: 16, bars: 4, chords: [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [41, 45, 48, 52, 55], [48, 52, 55, 59, 62]],
      light(s, bar, w, B) {
        const c = this.chords[bar], beat = 60 / bpm / 4;
        if (s === 0) { I.pad([c[1], c[2], c[3]], w, B, beat * 16, 0.022, 1300); I.sub(c[0] - 12, w, B, 0.14, beat * 14); }
        if (s === 0 || s === 8) I.kick(w, B, 0.08);
        I.pluck(c[[0, 2, 4, 3, 1, 3, 2, 4][s % 8]] + 12 + (s >= 8 ? 12 : 0), w, B, 0.025);
      },
      dark(s, bar, w, B) {
        const c = this.chords[bar], beat = 60 / bpm / 4;
        if (s === 0) I.pad([c[0] - 12, c[0] - 5], w, B, beat * 16, 0.03, 420);
        if (s % 4 === 0) I.sub(c[0] - 24, w, B, 0.12, beat * 3);
        if (s === 6 || (s === 14 && bar % 2)) I.bell(c[2] + 13, w, B, 0.02, 2.5);
      },
      amb: [[['radio', 0.25], ['whoosh', 0.05]], [['hum', 0.05], ['radio', 0.08]]],
    },
    // Time Rift: a ticking waltz with music box and harpsichord; the future side pulses
    3: {
      bpm: 132, steps: 12, bars: 4, chords: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]],
      tune: [[12, -1, 7, -1, 4, 7], [9, -1, 5, -1, 2, 5], [11, -1, 7, -1, 2, 7], [12, -1, 16, -1, 12, -1]],
      light(s, bar, w, B) {
        const c = this.chords[bar];
        if (s % 4 === 0) I.tick(w, B, s === 0, 0.05);
        if (s === 0) I.harpsi(c[0] - 12, w, B, 0.05);
        if (s === 4 || s === 8) c.forEach(n => I.harpsi(n, w, B, 0.022));
        if (s % 2 === 0) { const m = this.tune[bar][s / 2]; if (m >= 0) I.musicBox(c[0] + m, w, B, 0.04); }
      },
      dark(s, bar, w, B) {
        const c = this.chords[bar];
        if (s % 4 === 0) I.tick(w, B, s === 0, 0.04);
        if (s === 0) I.sub(c[0] - 24, w, B, 0.14, 1.2);
        if (s % 2 === 0) tone(NOTE(c[(s / 2) % 3] + 12), 0.18, { type: 'square', vol: 0.016, when: w, bus: B, filter: 1500 });
        if (s === 6) I.bell(c[2] + 12, w, B, 0.02);
      },
      amb: [[['chime', 0.05], ['clank', 0.15]], [['clank', 0.1], ['radio', 0.1]]],
    },
    // Toxic Chaos: bouncy bass and bubbly blips; the dark side wobbles
    4: {
      bpm: 112, steps: 16, bars: 4, roots: [52, 53, 52, 50], scale: [0, 1, 3, 5, 7, 8, 10, 12],
      light(s, bar, w, B) {
        const r = this.roots[bar];
        if ([0, 3, 6, 8, 11, 14].includes(s)) tone(NOTE(r - 12), 0.22, { type: 'triangle', vol: 0.13, to: NOTE(r - 13), when: w, bus: B });
        if (s === 4 || s === 12) I.snare(w, B, 0.04);
        if (s % 2 === 0) I.hat(w, B);
        if ((s * 7 + bar) % 5 === 0) { const n = r + 12 + this.scale[(s + bar * 3) % 8]; tone(NOTE(n), 0.12, { vol: 0.04, to: NOTE(n) * 1.5, when: w, bus: B }); }
      },
      dark(s, bar, w, B) {
        const r = this.roots[bar];
        if (s % 4 === 0) tone(NOTE(r - 24), 0.5, { type: 'sawtooth', vol: 0.07, to: NOTE(r - 22), when: w, bus: B, filter: 380 });
        if (s === 8) I.kick(w, B, 0.14);
        if (s === 10 || s === 15) tone(NOTE(r + 24), 0.05, { type: 'square', vol: 0.012, when: w, bus: B, filter: 3000 });
      },
      amb: [[['bubbles', 0.45]], [['bubbles', 0.3], ['squeak', 0.25]]],
    },
    // Volcanic Collapse: taiko drums, brass stabs and tension; rumbles and crackling fire
    5: {
      bpm: 126, steps: 16, bars: 4, roots: [50, 46, 48, 45],
      light(s, bar, w, B) {
        const r = this.roots[bar], beat = 60 / bpm / 4;
        if ([0, 3, 8, 10, 11].includes(s)) I.taiko(w, B, s === 0 ? 0.32 : 0.22);
        if (s === 6 || s === 14) I.tom(150, w, B, 0.1);
        if (s === 0) { I.brass([r - 12, r - 5], w, B, 0.045, 0.6); I.softPad([r, r + 3, r + 7], w, B, beat * 16, 0.022); }
        if (s === 10 && bar % 2) I.brass([r - 12, r - 5, r], w, B, 0.04, 0.35);
      },
      dark(s, bar, w, B) {
        const r = this.roots[bar], beat = 60 / bpm / 4;
        if (s % 4 === 0) I.taiko(w, B, 0.26);
        if (s === 0) I.pad([r - 12, r - 9], w, B, beat * 16, 0.03, 500);
        if (s === 12) I.brass([r - 24 + 12], w, B, 0.05, 0.8);
      },
      amb: [[['rumble', 0.08], ['crackle', 0.4]], [['rumble', 0.1], ['crackle', 0.25]]],
    },
  };

  // levels 6-8
  Object.assign(SONGS, {
    // Candy Kingdom: bouncy, sparkly and sweet; the sour side goes off-key and spooky
    6: {
      bpm: 124, steps: 16, bars: 4, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [57, 60, 64]],
      light(s, bar, w, B) {
        const c = this.chords[bar];
        if (s % 4 === 0) I.kick(w, B, 0.13);
        if (s === 4 || s === 12) { I.snare(w, B, 0.035); noise(0.05, { vol: 0.03, freq: 2400, when: w + 0.01, bus: B }); }
        if (s % 2 === 1) I.hat(w, B, 0.012);
        if ([0, 3, 6, 8, 10, 14].includes(s)) I.bass(c[0] - 24 + (s === 10 ? 7 : 0), w, B, 0.1, 0.2);
        if (s % 2 === 0) I.musicBox(c[[0, 1, 2, 1, 2, 0, 1, 2][s / 2]] + 12 + (s >= 8 ? 12 : 0), w, B, 0.03);
      },
      dark(s, bar, w, B) {
        const c = this.chords[bar];
        if (s === 0 || s === 8) I.kick(w, B, 0.12);
        if (s === 0) I.softPad([c[0] - 13, c[2] - 12], w, B, 2, 0.03);
        if (s === 3 || s === 7 || s === 13) I.bell(c[1] + 11 + (s === 13 ? 6 : 0), w, B, 0.022, 1.4);
      },
      amb: [[['pop', 0.3]], [['squeak', 0.15], ['owl', 0.03]]],
    },
    // Rainbow Skies: sunny and carefree: ukulele strums, a whistled tune, claps and sparkles; at night a starry lullaby
    7: {
      bpm: 118, steps: 16, bars: 4, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
      tune: [[12, -1, 16, -1, 19, -1, 16, 14, 12, -1, -1, -1, 14, -1, 16, -1], [14, -1, 11, -1, 7, -1, 11, 14, 19, -1, -1, -1, 17, -1, 14, -1],
        [16, -1, 12, -1, 9, -1, 12, 16, 21, -1, 19, -1, 16, -1, 12, -1], [17, -1, 16, -1, 14, -1, 12, -1, 9, -1, 12, -1, 14, -1, -1, -1]],
      light(s, bar, w, B) {
        const c = this.chords[bar];
        if (s === 0 || s === 8) I.kick(w, B, 0.12);
        if (s === 4 || s === 12) for (let k = 0; k < 3; k++) noise(0.05, { vol: 0.03, freq: 2200 + k * 400, when: w + k * 0.008, bus: B });   // claps
        if (s % 2 === 1) I.shaker(w, B, 0.012);
        if ([0, 3, 6, 8, 10, 12, 14].includes(s)) c.forEach((n, k) => I.pluck(n + (s % 4 === 2 ? 12 : 0), w + k * 0.012, B, 0.022));   // ukulele strum
        if (s === 0 || s === 8) I.bass(c[0] - 12, w, B, 0.1, 0.35);
        const m = this.tune[bar][s];
        if (m >= 0) tone(NOTE(c[0] + m), 0.22, { vol: 0.035, when: w, bus: B, attack: 0.03 });   // whistle
        if (s === 15 && bar === 3) [84, 88, 91, 96].forEach((n, k) => I.bell(n, w + k * 0.05, B, 0.012, 0.8));   // sparkle run
      },
      dark(s, bar, w, B) {
        const c = this.chords[bar], beat = 60 / bpm / 4;
        if (s === 0) I.softPad([c[0] - 12, c[1] - 12, c[2] - 12], w, B, beat * 16, 0.028);
        if (s % 4 === 0) I.musicBox(c[(s / 4) % 3] + 24, w, B, 0.022);
        if (s === 10) I.bell(c[2] + 12, w, B, 0.016, 2);
      },
      amb: [[['bird', 0.25]], [['cricket', 0.4]]],
    },
    // The Monster King: heavy war drums, low brass, a dark choir and tremolo strings
    8: {
      bpm: 138, steps: 16, bars: 4, roots: [50, 50, 46, 45],
      light(s, bar, w, B) {
        const r = this.roots[bar], beat = 60 / bpm / 4;
        if ([0, 3, 8, 11].includes(s)) I.taiko(w, B, s === 0 ? 0.34 : 0.24);
        if (s === 6 || s === 14) I.tom(130, w, B, 0.12);
        if (s % 2 === 1) I.hat(w, B, 0.01);
        tone(NOTE(r - 12 + (s % 4 === 3 ? 1 : 0)), beat * 0.9, { type: 'sawtooth', vol: 0.018, when: w, bus: B, filter: 700 });   // tremolo strings
        if (s === 0) { I.brass([r - 24, r - 17, r - 12], w, B, 0.045, 0.9); I.softPad([r, r + 3, r + 7], w, B, beat * 16, 0.026); }
        if (s === 12 && bar % 2) I.brass([r - 12 + 1, r - 5 + 1], w, B, 0.04, 0.35);
      },
      dark(s, bar, w, B) {
        const r = this.roots[bar], beat = 60 / bpm / 4;
        if (s % 4 === 0) I.taiko(w, B, 0.28);
        if (s === 0) I.pad([r - 24, r - 21, r - 18], w, B, beat * 16, 0.03, 450);
        if (s === 8) I.bell(r + 13, w, B, 0.025, 2);
      },
      amb: [[['growl', 0.08], ['crackle', 0.2]], [['growl', 0.1], ['rumble', 0.05]]],
    },
  });

  // ----- music sequencer (scheduled slightly ahead for tight timing) -----
  function schedule() {
    if (!song) return;
    const sd = 60 / bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      const s = step % song.steps, bar = Math.floor(step / song.steps) % song.bars;
      song.light(s, bar, nextT, lightBus);
      song.dark(s, bar, nextT, darkBus);
      // ambient sounds, checked once per beat
      if (s % 4 === 0) {
        song.amb.forEach((list, wi) => {
          for (const [name, p] of list) if (Math.random() < p) AMB[name](nextT + Math.random() * sd * 3, wi ? darkBus : lightBus);
        });
      }
      // intensity layer (final escape): driving hats and toms on both layers
      if (intensity > 0) {
        I.hat(nextT, musicBus, 0.025 * intensity);
        if (s % 4 === 2) I.tom(140, nextT, musicBus, 0.12 * intensity);
      }
      nextT += sd;
      step++;
    }
  }

  const Sound = {
    init,
    get muted() { return muted; },
    setMuted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02); },
    /** Picks the song: 'menu' or a level number. */
    setSong(id) {
      const next = SONGS[id] || SONGS.menu;
      if (next !== song) step = 0;
      song = next;
      tempoScale = 1;
      bpm = song.bpm;
    },
    get songTempo() { return song ? song.bpm : 100; },
    musicStart() {
      if (!ctx) return;
      if (!song) this.setSong('menu');
      if (timer) return;
      nextT = ctx.currentTime + 0.06;
      timer = setInterval(schedule, 40);
    },
    musicStop() { clearInterval(timer); timer = null; },
    setIntensity(v) { intensity = v; },
    /** Speed the current song up or down (time pads, final escape). */
    setTempoScale(k) { tempoScale = k; bpm = (song ? song.bpm : 100) * k; },
    setTempo(t) { bpm = t; },
    /** 0 = Light music, 1 = Dark music */
    setWorldMix(m) {
      if (!ctx || Math.abs(m - mixTarget) < 0.01) return;
      mixTarget = m;
      lightBus.gain.setTargetAtTime(Math.cos(m * Math.PI / 2), ctx.currentTime, 0.06);
      darkBus.gain.setTargetAtTime(Math.sin(m * Math.PI / 2), ctx.currentTime, 0.06);
    },

    // ----- effects -----
    jump() { tone(300, 0.16, { type: 'triangle', vol: 0.12, to: 620 }); },
    slide() { noise(0.28, { vol: 0.14, freq: 900, sweep: 300 }); },
    move() { noise(0.08, { vol: 0.05, freq: 2600 }); },
    switchTo(world) {
      if (world === 1) { tone(660, 0.35, { type: 'triangle', vol: 0.08, to: 165 }); noise(0.35, { vol: 0.1, freq: 3000, sweep: 200 }); }
      else { tone(220, 0.35, { type: 'triangle', vol: 0.1, to: 880 }); noise(0.3, { vol: 0.07, freq: 400, sweep: 5000 }); }
    },
    denied() { tone(150, 0.12, { type: 'triangle', vol: 0.08 }); },
    ready() { tone(1320, 0.1, { type: 'sine', vol: 0.05 }); },
    coin(world) {   // soft "pling" (it plays a lot, so it stays gentle)
      const f = world === 1 ? 1175 : 1568;
      tone(f, 0.12, { vol: 0.045 }); tone(f * 1.5, 0.16, { vol: 0.03, at: 0.045 });
    },
    shield() { tone(660, 0.35, { type: 'triangle', vol: 0.12, to: 1320 }); noise(0.25, { vol: 0.12, freq: 3000, sweep: 600 }); },
    revive() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'sine', vol: 0.1, at: i * 0.07 })); },
    chest() {
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.1, at: i * 0.06 }));
      noise(0.4, { vol: 0.08, freq: 5000, type: 'highpass', at: 0.1 });
    },
    warp(kind) {
      if (kind === 'fast') { tone(220, 0.4, { type: 'triangle', vol: 0.1, to: 1760 }); noise(0.3, { vol: 0.08, freq: 800, sweep: 8000 }); }
      else { tone(880, 0.6, { type: 'triangle', vol: 0.1, to: 110 }); [0, 0.25, 0.5].forEach(at => noise(0.03, { vol: 0.06, freq: 3500, at, q: 6 })); }
    },
    roar() {
      tone(110, 1.4, { type: 'sawtooth', vol: 0.12, to: 55, attack: 0.15, filter: 700 });
      tone(165, 1.2, { type: 'sawtooth', vol: 0.06, to: 70, attack: 0.15, filter: 500 });
      noise(1.3, { vol: 0.12, freq: 400, sweep: 150 });
    },
    bossThrow() { noise(0.5, { vol: 0.07, freq: 500, sweep: 2500 }); tone(220, 0.3, { type: 'triangle', vol: 0.05, to: 110 }); },
    bossHit() { tone(880, 0.5, { type: 'triangle', vol: 0.1, to: 220 }); noise(0.4, { vol: 0.15, freq: 1500, sweep: 300 }); this.roar(); },
    bossDefeat() { this.roar(); [0, 0.35, 0.7, 1.1, 1.5].forEach(at => { tone(70, 0.7, { vol: 0.16, to: 30, at }); noise(0.6, { vol: 0.12, freq: 220, type: 'lowpass', at }); }); },
    thunder() { noise(0.15, { vol: 0.25, freq: 2000, type: 'highpass' }); noise(2.4, { vol: 0.22, freq: 160, type: 'lowpass', at: 0.05 }); },
    boom() { tone(70, 0.8, { vol: 0.18, to: 30 }); noise(0.8, { vol: 0.12, freq: 200, type: 'lowpass' }); },
    shard() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.07, at: i * 0.05 })); },
    bounce() { tone(160, 0.2, { type: 'triangle', vol: 0.14, to: 80 }); noise(0.15, { vol: 0.12, freq: 400 }); },
    crash() { tone(200, 0.6, { type: 'triangle', vol: 0.18, to: 45 }); noise(0.5, { vol: 0.24, freq: 300, type: 'lowpass' }); },
    fall() { tone(500, 1.0, { type: 'triangle', vol: 0.12, to: 60 }); },
    rift() { tone(110, 0.5, { type: 'triangle', vol: 0.1, to: 880 }); noise(0.5, { vol: 0.12, freq: 200, sweep: 6000 }); },
    beep(high) { tone(high ? 1046 : 523, high ? 0.35 : 0.15, { type: 'triangle', vol: 0.09 }); },
    click() { tone(880, 0.05, { type: 'sine', vol: 0.05 }); },
    finish() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.11, at: i * 0.11 })); },
    victory() {
      const seq = [523, 659, 784, 1046, 1318, 1568];
      seq.forEach((f, i) => { tone(f, 0.6, { type: 'triangle', vol: 0.11, at: i * 0.14 }); tone(f / 2, 0.6, { type: 'sine', vol: 0.09, at: i * 0.14 }); });
      [1046, 1318, 1568, 2093].forEach(f => tone(f, 2.2, { type: 'sine', vol: 0.05, at: 0.95, attack: 0.1 }));
    },
  };

  DR.Sound = Sound;
})();
