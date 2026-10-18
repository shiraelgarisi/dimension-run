/* Sound: everything is synthesized with the Web Audio API (no audio files).
   Every level (and the menu) has its own song: a real drum groove with a little swing, a
   rhythmic bassline and a catchy hook that repeats with variations. In the Dark World the
   same song keeps playing but turns muffled and spooky (a low-pass sweep plus a dark layer).
   Ambient sounds fit each place: birds and crickets, space radio, clock chimes, bubbles... */
(function () {
  'use strict';
  const DR = window.DR;

  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note -> Hz
  const MUSIC_VOL = 0.5;
  const rnd = Math.random;

  let ctx = null, master = null, musicGain = null, musicFilter = null, mainBus = null, darkBus = null, ambLight = null, ambDark = null, noiseBuf = null, reverb = null;
  let timer = null, nextT = 0, step = 0, bpm = 100, tempoScale = 1, intensity = 0, muted = false, mixTarget = 0;
  let song = null, wantMusic = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); if (wantMusic && !timer) startTimer(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    // music chain: notes -> mainBus -> low-pass (opens in the Light World, closes in the Dark) -> volume
    musicGain = ctx.createGain(); musicGain.gain.value = MUSIC_VOL; musicGain.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 9000; musicFilter.Q.value = 0.8;
    musicFilter.connect(musicGain);
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    reverb.connect(wet).connect(musicGain);
    mainBus = ctx.createGain(); mainBus.connect(musicFilter); mainBus.connect(reverb);
    darkBus = ctx.createGain(); darkBus.gain.value = 0; darkBus.connect(musicGain); darkBus.connect(reverb);
    ambLight = ctx.createGain(); ambLight.connect(musicGain);
    ambDark = ctx.createGain(); ambDark.gain.value = 0; ambDark.connect(musicGain);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    if (wantMusic) startTimer();   // music asked for before the first tap starts now
  }
  // phones suspend audio in the background; wake it up when the game is visible again
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state === 'suspended') ctx.resume(); });

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
  // drums (w = time, v = loudness 0..1)
  // ------------------------------------------------------------------
  const DRUM = {
    kick: (w, v) => { tone(130, 0.32, { vol: 0.32 * v, to: 42, when: w, bus: mainBus }); noise(0.012, { vol: 0.08 * v, freq: 3000, when: w, bus: mainBus }); },
    snare: (w, v) => { noise(0.16, { vol: 0.13 * v, freq: 1900, when: w, bus: mainBus, q: 0.8 }); tone(190, 0.1, { vol: 0.08 * v, to: 140, when: w, bus: mainBus }); },
    clap: (w, v) => { for (let k = 0; k < 3; k++) noise(k < 2 ? 0.02 : 0.14, { vol: 0.1 * v, freq: 1400, when: w + k * 0.011, bus: mainBus, q: 1.2 }); },
    rim: (w, v) => noise(0.03, { vol: 0.12 * v, freq: 2600, when: w, bus: mainBus, q: 6 }),
    hat: (w, v) => noise(0.035, { vol: 0.035 * v, freq: 8500, type: 'highpass', when: w, bus: mainBus }),
    open: (w, v) => noise(0.18, { vol: 0.035 * v, freq: 7500, type: 'highpass', when: w, bus: mainBus }),
    shaker: (w, v) => noise(0.05, { vol: 0.03 * v, freq: 6500, when: w, bus: mainBus, q: 2 }),
    conga: (w, v) => tone(330, 0.2, { vol: 0.11 * v, to: 230, when: w, bus: mainBus }),
    tom: (w, v) => tone(150, 0.3, { vol: 0.15 * v, to: 95, when: w, bus: mainBus }),
    taiko: (w, v) => { tone(78, 0.6, { vol: 0.3 * v, to: 38, when: w, bus: mainBus }); noise(0.1, { vol: 0.07 * v, freq: 300, when: w, bus: mainBus }); },
    tick: (w, v) => noise(0.02, { vol: 0.07 * v, freq: 4200, when: w, bus: mainBus, q: 8 }),
  };

  // ------------------------------------------------------------------
  // instruments for bass, melody and chords (n = MIDI note, len = seconds)
  // ------------------------------------------------------------------
  const INST = {
    pluck: (n, w, len, v) => { tone(NOTE(n), Math.max(0.18, len), { type: 'triangle', vol: 0.07 * v, when: w, bus: mainBus, filter: 3200 }); },
    marimba: (n, w, len, v) => { tone(NOTE(n), 0.4, { vol: 0.08 * v, when: w, bus: mainBus }); tone(NOTE(n) * 4, 0.08, { vol: 0.02 * v, when: w, bus: mainBus }); },
    glock: (n, w, len, v) => { tone(NOTE(n), 0.9, { vol: 0.05 * v, when: w, bus: mainBus }); tone(NOTE(n) * 2.76, 0.3, { vol: 0.016 * v, when: w, bus: mainBus }); },
    musicBox: (n, w, len, v) => { tone(NOTE(n), 1.1, { vol: 0.05 * v, when: w, bus: mainBus }); tone(NOTE(n) * 3, 0.25, { vol: 0.012 * v, when: w, bus: mainBus }); },
    whistle: (n, w, len, v) => { tone(NOTE(n), len * 0.95, { vol: 0.05 * v, when: w, bus: mainBus, attack: 0.03 }); tone(NOTE(n) * 2, len * 0.6, { vol: 0.006 * v, when: w, bus: mainBus, attack: 0.03 }); },
    chip: (n, w, len, v) => tone(NOTE(n), Math.max(0.12, len * 0.8), { type: 'square', vol: 0.022 * v, when: w, bus: mainBus, filter: 3500 }),
    synth: (n, w, len, v) => { for (const d of [0.996, 1.004]) tone(NOTE(n) * d, Math.max(0.2, len), { type: 'sawtooth', vol: 0.022 * v, when: w, bus: mainBus, attack: 0.01, filter: 2800 }); },
    brass: (n, w, len, v) => { for (const d of [0.997, 1.003]) tone(NOTE(n) * d, Math.max(0.2, len), { type: 'sawtooth', vol: 0.03 * v, when: w, bus: mainBus, attack: 0.035, filter: 1500 }); },
    harpsi: (n, w, len, v) => tone(NOTE(n), 0.32, { type: 'sawtooth', vol: 0.03 * v, when: w, bus: mainBus, filter: 2400 }),
    clav: (n, w, len, v) => tone(NOTE(n), 0.12, { type: 'square', vol: 0.025 * v, when: w, bus: mainBus, filter: 1800 }),
    // basses
    bass: (n, w, len, v) => { tone(NOTE(n), Math.max(0.16, len), { type: 'triangle', vol: 0.15 * v, when: w, bus: mainBus, filter: 900 }); tone(NOTE(n), Math.max(0.16, len), { vol: 0.07 * v, when: w, bus: mainBus }); },
    slap: (n, w, len, v) => { tone(NOTE(n), 0.2, { type: 'sawtooth', vol: 0.06 * v, when: w, bus: mainBus, filter: 1100 }); tone(NOTE(n), 0.2, { vol: 0.09 * v, when: w, bus: mainBus }); },
    upright: (n, w, len, v) => tone(NOTE(n), 0.35, { vol: 0.16 * v, when: w, bus: mainBus, attack: 0.012 }),
    sub: (n, w, len, v) => tone(NOTE(n), Math.max(0.3, len), { vol: 0.15 * v, when: w, bus: mainBus, attack: 0.02 }),
  };
  // a soft pad holding the chord for the whole bar
  const pad = (notes, w, len, v = 1) => notes.forEach(n => tone(NOTE(n), len, { type: 'triangle', vol: 0.022 * v, when: w, bus: mainBus, attack: Math.min(0.6, len * 0.25) }));

  // ------------------------------------------------------------------
  // ambient sounds
  // ------------------------------------------------------------------
  const AMB = {
    bird: (w, b) => { const f = 2200 + rnd() * 1400, n = 2 + (rnd() * 3 | 0); for (let i = 0; i < n; i++) tone(f * (i % 2 ? 1.25 : 1), 0.09, { vol: 0.022, to: f * (i % 2 ? 1 : 1.35), when: w + i * 0.11, bus: b }); },
    cricket: (w, b) => { for (let i = 0; i < 3; i++) tone(4600, 0.035, { vol: 0.01, when: w + i * 0.06, bus: b }); },
    owl: (w, b) => { tone(420, 0.35, { vol: 0.035, to: 400, when: w, bus: b, attack: 0.05 }); tone(400, 0.5, { vol: 0.03, to: 370, when: w + 0.45, bus: b, attack: 0.05 }); },
    radio: (w, b) => { const f = 900 + rnd() * 900; tone(f, 0.08, { type: 'square', vol: 0.01, when: w, bus: b, filter: 2500 }); tone(f * 1.5, 0.08, { type: 'square', vol: 0.008, when: w + 0.1, bus: b, filter: 2500 }); },
    whoosh: (w, b) => noise(1.4, { vol: 0.025, freq: 300, sweep: 2400, when: w, bus: b }),
    hum: (w, b) => tone(55, 2.5, { type: 'sawtooth', vol: 0.025, when: w, bus: b, attack: 0.8, filter: 200 }),
    chime: (w, b) => [84, 88, 86, 79].forEach((n, i) => tone(NOTE(n), 1.2, { vol: 0.02, when: w + i * 0.45, bus: b })),
    clank: (w, b) => { tone(180, 0.15, { type: 'square', vol: 0.016, to: 120, when: w, bus: b, filter: 800 }); noise(0.08, { vol: 0.025, freq: 900, when: w, bus: b }); },
    bubbles: (w, b) => { for (let i = 0; i < 3; i++) { const f = 250 + rnd() * 400; tone(f, 0.09, { vol: 0.025, to: f * 2.6, when: w + i * (0.06 + rnd() * 0.08), bus: b }); } },
    squeak: (w, b) => tone(3200, 0.05, { vol: 0.01, to: 4600, when: w, bus: b }),
    rumble: (w, b) => noise(2.2, { vol: 0.07, freq: 110, type: 'lowpass', when: w, bus: b }),
    crackle: (w, b) => { for (let i = 0; i < 5; i++) noise(0.012, { vol: 0.04, freq: 3000, when: w + rnd() * 0.4, bus: b, q: 3 }); },
    pop: (w, b) => { tone(600 + rnd() * 500, 0.06, { vol: 0.025, to: 1400, when: w, bus: b }); },
    zoom: (w, b) => noise(0.9, { vol: 0.02, freq: 600, sweep: 2400, when: w, bus: b }),
    growl: (w, b) => tone(70, 1.3, { type: 'sawtooth', vol: 0.04, to: 52, when: w, bus: b, attack: 0.2, filter: 300 }),
  };

  // ------------------------------------------------------------------
  // songs
  //   chords: one per bar (root first). drums: 16-step strings per instrument ('x' hit, 'X' accent).
  //   bass: { pat: 16-step string, deg: semitones above the chord root for each hit, inst, oct }
  //   hook: 2-bar melody [[step 0-31, MIDI note, length in steps], ...]; hookB: a variation (optional)
  // ------------------------------------------------------------------
  const C_MAJ = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]];   // C  Am  F  G
  const SONGS = {
    menu: {
      bpm: 86, swing: 0.14, chords: C_MAJ,
      drums: { kick: 'x.....x...x.....', rim: '....x.......x...', hat: '..x...x...x...x.' },
      bass: { pat: 'x.....x...x.....', deg: [0, 0, 7], inst: 'bass', oct: -12 },
      hook: [[0, 76, 2], [3, 79, 1], [4, 81, 3], [8, 79, 2], [10, 76, 2], [12, 74, 4], [16, 72, 2], [19, 74, 1], [20, 76, 3], [24, 74, 2], [26, 72, 2], [28, 69, 4]],
      lead: 'musicBox', padVol: 1, amb: [[], []],
    },
    0: {   // Infinite World: house groove with an earworm pluck
      bpm: 124, swing: 0, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
      drums: { kick: 'x...x...x...x...', clap: '....x.......x...', open: '..x...x...x...x.', shaker: 'xxxxxxxxxxxxxxxx' },
      bass: { pat: '..x...x...x...x.', deg: [0, 0, 0, 0], inst: 'bass', oct: -12 },
      hook: [[0, 81, 1], [2, 84, 1], [3, 81, 1], [6, 79, 2], [8, 76, 2], [11, 79, 1], [12, 81, 4], [16, 81, 1], [18, 84, 1], [19, 86, 1], [22, 84, 2], [24, 81, 2], [27, 79, 1], [28, 76, 4]],
      lead: 'synth', arpB: true, padVol: 0.8, amb: [[['whoosh', 0.03]], [['hum', 0.04]]],
    },
    1: {   // Jungle: tropical bounce, congas and a marimba hook
      bpm: 108, swing: 0.1, chords: C_MAJ,
      drums: { kick: 'x...x...x...x...', rim: '...x..x....x..x.', shaker: '.x.x.x.x.x.x.x.x', conga: 'x.....x.x...x...' },
      bass: { pat: 'x..x....x..x....', deg: [0, 0, 7, 5], inst: 'bass', oct: -12 },
      hook: [[0, 72, 1], [2, 76, 1], [4, 79, 2], [6, 76, 1], [8, 81, 2], [10, 79, 1], [12, 76, 2], [14, 74, 1], [16, 72, 1], [18, 74, 1], [20, 76, 2], [22, 74, 1], [24, 72, 2], [28, 67, 2]],
      hookB: [[0, 84, 1], [2, 81, 1], [4, 79, 2], [6, 81, 1], [8, 84, 2], [12, 86, 2], [16, 84, 1], [18, 81, 1], [20, 79, 2], [24, 76, 2], [26, 79, 1], [28, 72, 4]],
      lead: 'marimba', padVol: 0.6, amb: [[['bird', 0.3]], [['cricket', 0.6], ['owl', 0.04]]],
    },
    2: {   // Deep Space: synth-pop
      bpm: 116, swing: 0, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]],
      drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
      bass: { pat: 'x.x.x.x.x.x.x.x.', deg: [0, 12, 0, 12, 0, 12, 0, 12], inst: 'bass', oct: -12 },
      hook: [[0, 74, 2], [2, 77, 2], [4, 81, 3], [8, 79, 1], [9, 77, 1], [10, 76, 2], [12, 74, 4], [16, 74, 2], [18, 77, 2], [20, 84, 3], [24, 81, 2], [26, 79, 2], [28, 77, 4]],
      lead: 'synth', arpB: true, padVol: 1, amb: [[['radio', 0.2]], [['hum', 0.05]]],
    },
    3: {   // Time Rift: electro-swing with a walking bass and a clock tick
      bpm: 126, swing: 0.22, chords: [[57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]],
      drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', tick: 'x...x...x...x...' },
      bass: { pat: 'x...x...x...x...', deg: [0, 3, 7, 10], inst: 'upright', oct: -12 },
      hook: [[0, 76, 1], [1, 77, 1], [2, 76, 1], [4, 72, 2], [6, 69, 2], [8, 71, 1], [9, 72, 1], [10, 71, 1], [12, 68, 2], [14, 64, 2], [16, 69, 1], [18, 72, 1], [20, 76, 2], [22, 81, 2], [24, 80, 1], [26, 76, 1], [28, 72, 4]],
      lead: 'harpsi', padVol: 0.5, amb: [[['chime', 0.04], ['clank', 0.12]], [['clank', 0.08]]],
    },
    4: {   // Toxic Chaos: funk with slap bass and clav stabs
      bpm: 104, swing: 0.16, chords: [[52, 55, 59, 62], [57, 61, 64, 67], [52, 55, 59, 62], [59, 63, 66, 69]],
      drums: { kick: 'x..x..x...x..x..', snare: '....x..x....x...', hat: 'XxXxXxXxXxXxXxXx' },
      bass: { pat: 'x..x..xx..x..x..', deg: [0, 0, 12, 10, 7, 5], inst: 'slap', oct: -12 },
      stabs: '..x..x....x..x..', stabInst: 'clav',
      hook: [[6, 79, 1], [7, 81, 1], [14, 83, 2], [22, 81, 1], [23, 79, 1], [30, 76, 2]],
      lead: 'chip', padVol: 0.3, amb: [[['bubbles', 0.35]], [['bubbles', 0.25], ['squeak', 0.2]]],
    },
    5: {   // Volcanic Collapse: epic rock with taiko and brass
      bpm: 138, swing: 0, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
      drums: { kick: 'x...x.x.x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', taiko: 'x.......x.......' },
      bass: { pat: 'x.x.x.x.x.x.x.x.', deg: [0, 0, 0, 0, 0, 0, 7, 5], inst: 'bass', oct: -12 },
      hook: [[0, 74, 3], [3, 72, 1], [4, 74, 2], [6, 77, 2], [8, 76, 4], [12, 72, 4], [16, 74, 3], [19, 72, 1], [20, 69, 2], [22, 72, 2], [24, 74, 8]],
      lead: 'brass', padVol: 0.8, amb: [[['rumble', 0.06], ['crackle', 0.3]], [['rumble', 0.08]]],
    },
    6: {   // Candy Kingdom: bubblegum pop with a chiptune hook
      bpm: 128, swing: 0, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
      drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' },
      bass: { pat: 'x.x.x.x.x.x.x.x.', deg: [0, 12, 0, 12, 0, 12, 0, 12], inst: 'bass', oct: -12 },
      hook: [[0, 84, 1], [1, 84, 1], [2, 79, 1], [4, 81, 1], [6, 79, 1], [8, 84, 2], [10, 86, 2], [12, 88, 4], [16, 86, 1], [17, 86, 1], [18, 84, 1], [20, 81, 1], [22, 79, 1], [24, 81, 2], [26, 79, 2], [28, 76, 4]],
      lead: 'chip', sparkle: true, padVol: 0.6, amb: [[['pop', 0.25]], [['squeak', 0.12]]],
    },
    7: {   // Rainbow Skies: ukulele strums and a whistled tune
      bpm: 118, swing: 0.12, chords: C_MAJ,
      drums: { kick: 'x.......x.......', clap: '....x.......x...', shaker: 'x.x.x.x.x.x.x.x.' },
      bass: { pat: 'x.......x.......', deg: [0, 7], inst: 'bass', oct: -12 },
      strum: 'x..x..x...x..x..',
      hook: [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 4], [16, 77, 2], [18, 76, 2], [20, 74, 2], [22, 76, 2], [24, 72, 6]],
      lead: 'whistle', padVol: 0.4, amb: [[['bird', 0.25]], [['cricket', 0.4]]],
    },
    8: {   // The Monster King: fast, heavy and dramatic
      bpm: 150, swing: 0, chords: [[50, 53, 57], [50, 53, 57], [46, 50, 53], [45, 49, 52]],
      drums: { kick: 'x...x.x.x...x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', taiko: 'x.....x.x.....x.' },
      bass: { pat: 'xx.xx.xx.xx.xx.x', deg: [0, 0, 12, 0, 0, 12, 0, 1, 0, 0, 12], inst: 'bass', oct: -12 },
      hook: [[0, 74, 2], [3, 74, 1], [4, 77, 2], [8, 76, 2], [11, 74, 1], [12, 73, 4], [16, 74, 2], [19, 74, 1], [20, 81, 2], [24, 79, 2], [27, 77, 1], [28, 76, 4]],
      lead: 'brass', padVol: 1, amb: [[['growl', 0.06], ['crackle', 0.15]], [['growl', 0.08]]],
    },
  };

  // ----- sequencer (16th notes, scheduled slightly ahead; a touch of swing and human timing) -----
  function playStep(w, s, bar, cycle, sd) {
    const S = song, chord = S.chords[bar % S.chords.length], root = chord[0];
    const hum = () => (rnd() - 0.5) * 0.008;
    // drums
    for (const k in S.drums) {
      const ch = S.drums[k][s];
      if (ch === 'x' || ch === 'X') DRUM[k](w, (ch === 'X' ? 1 : 0.7) * (0.85 + rnd() * 0.3));
    }
    // bass
    const B = S.bass;
    if (B && B.pat[s] === 'x') {
      const hit = [...B.pat.slice(0, s)].filter(c => c === 'x').length;
      INST[B.inst](root + B.oct + B.deg[hit % B.deg.length], w, sd * 1.8, 1);
    }
    // chord stabs / ukulele strums / pad
    if (S.stabs && S.stabs[s] === 'x') chord.forEach(n => INST[S.stabInst](n + 12, w, sd, 0.8));
    if (S.strum && S.strum[s] === 'x') chord.forEach((n, i) => INST.pluck(n + 12, w + i * 0.014, sd * 2, 0.75));
    if (s === 0 && S.padVol) pad(chord.map(n => n), w, sd * 16, S.padVol);
    // melody: the hook, a variation every other cycle, and arpeggios on the B part
    const hook = cycle % 2 && S.hookB ? S.hookB : S.hook;
    const pos = (bar % 2) * 16 + s;
    for (const [at, n, len] of hook) if (at === pos) INST[S.lead](n + (cycle % 4 === 3 && !S.hookB ? 12 : 0), w + hum(), len * sd, 0.9 + rnd() * 0.2);
    if (S.arpB && cycle % 2 === 1 && s % 2 === 0) INST.pluck(chord[(s / 2) % chord.length] + 24, w, sd, 0.5);
    if (S.sparkle && s === 14 && bar === 3) [84, 88, 91].forEach((n, k) => INST.glock(n, w + k * 0.05, sd, 0.6));
    // the Dark World layer: a low drone and a lonely bell
    if (s === 0) tone(NOTE(root - 24), sd * 16, { type: 'sawtooth', vol: 0.05, when: w, bus: darkBus, attack: 0.4, filter: 320 });
    if (s === 6 && bar % 2 === 0) tone(NOTE(root + 15), 2.2, { vol: 0.02, when: w, bus: darkBus });
    // final escape / boss rage: a driving extra layer
    if (intensity > 0) { DRUM.hat(w + sd / 2, 0.6 * intensity); if (s % 4 === 2) DRUM.tom(w, 0.8 * intensity); }
  }

  function schedule() {
    if (!song) return;
    const sd = 60 / bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      if (nextT < ctx.currentTime - 0.3) nextT = ctx.currentTime + 0.02;   // woke up late (background tab): skip ahead, no pile-up
      const s = step % 16, bar = Math.floor(step / 16) % 4, cycle = Math.floor(step / 64);
      const w = nextT + (s % 2 ? song.swing * sd : 0);
      playStep(w, s, bar, cycle, sd);
      if (s % 4 === 0) {
        song.amb.forEach((list, wi) => {
          for (const [name, p] of list) if (rnd() < p) AMB[name](nextT + rnd() * sd * 3, wi ? ambDark : ambLight);
        });
      }
      nextT += sd;
      step++;
    }
  }
  function startTimer() {
    if (!ctx || timer) return;
    if (!song) song = SONGS.menu;
    nextT = ctx.currentTime + 0.06;
    timer = setInterval(schedule, 40);
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
    /** Starts the music; before the first tap it waits and starts as soon as sound is allowed. */
    musicStart() { wantMusic = true; startTimer(); },
    musicStop() { wantMusic = false; clearInterval(timer); timer = null; },
    setIntensity(v) { intensity = v; },
    /** Speed the current song up or down (time pads, final escape). */
    setTempoScale(k) { tempoScale = k; bpm = (song ? song.bpm : 100) * k; },
    setTempo(t) { bpm = t; },
    /** 0 = Light World (open and bright), 1 = Dark World (muffled, with a spooky drone) */
    setWorldMix(m) {
      if (!ctx || Math.abs(m - mixTarget) < 0.01) return;
      mixTarget = m;
      const t = ctx.currentTime;
      musicFilter.frequency.setTargetAtTime(9000 * Math.pow(1100 / 9000, m), t, 0.08);
      darkBus.gain.setTargetAtTime(m, t, 0.08);
      ambLight.gain.setTargetAtTime(1 - m, t, 0.08);
      ambDark.gain.setTargetAtTime(m, t, 0.08);
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
    gem() {
      [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.18, { vol: 0.045, at: i * 0.04 }));
      noise(0.3, { vol: 0.04, freq: 7000, type: 'highpass', at: 0.05 });
    },
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
    // a new level unlocks: the lock rattles, clicks open, and a fanfare plays
    lockRattle() { [0, 0.09, 0.18, 0.3, 0.39].forEach(at => { noise(0.04, { vol: 0.09, freq: 2200, at, q: 5 }); tone(900, 0.04, { type: 'square', vol: 0.02, at, filter: 2000 }); }); },
    unlock() {
      noise(0.05, { vol: 0.2, freq: 1800, q: 4 }); tone(320, 0.12, { type: 'square', vol: 0.05, to: 180, filter: 1500 });   // clunk
      noise(0.03, { vol: 0.15, freq: 4200, at: 0.08, q: 8 });                                                            // click
      [1568, 2093, 2637].forEach((f, i) => tone(f, 0.3, { vol: 0.04, at: 0.15 + i * 0.05 }));                            // sparkle
    },
    fanfare() {
      [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.38]].forEach(([f, at]) => { tone(f, 0.25, { type: 'triangle', vol: 0.1, at }); tone(f / 2, 0.25, { type: 'sawtooth', vol: 0.03, at, filter: 1500 }); });
      [523, 659, 784, 1046].forEach(f => { tone(f, 1.3, { type: 'triangle', vol: 0.07, at: 0.55, attack: 0.02 }); tone(f / 2, 1.3, { type: 'sawtooth', vol: 0.025, at: 0.55, filter: 1400 }); });
      noise(0.3, { vol: 0.06, freq: 7000, type: 'highpass', at: 0.55 });
    },
    // opening animation
    introTick(i) { tone(600 + i * 70, 0.07, { type: 'triangle', vol: 0.05, to: 900 + i * 70 }); },
    introWhoosh() { noise(0.6, { vol: 0.1, freq: 300, sweep: 4000 }); },
    introBoom() { tone(90, 0.9, { vol: 0.25, to: 40 }); noise(0.5, { vol: 0.1, freq: 400, type: 'lowpass' }); [523, 659, 784].forEach(f => tone(f, 1.4, { type: 'triangle', vol: 0.05, at: 0.05, attack: 0.02 })); },
    introChime(i) { tone([1046, 1318, 1568][i] || 1568, 0.6, { vol: 0.05 }); tone(([1046, 1318, 1568][i] || 1568) * 2, 0.3, { vol: 0.015 }); },
  };

  DR.Sound = Sound;
})();
