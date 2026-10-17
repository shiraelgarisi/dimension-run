/* Level dressing: what each level looks like. Themes (sky, light, colours, floor),
   props around the path (asteroids, clocks, gears, planets...), animals and other
   creatures, smoke presets and the themed obstacle skins. Everything is built from
   code at runtime; there are no image or model files. world.js uses this. */
(function () {
  'use strict';
  const DR = window.DR;
  const rnd = Math.random;
  const TAU = Math.PI * 2;
  const range = (a, b) => a + rnd() * (b - a);

  // ------------------------------------------------------------------
  // themes (level id -> look). Level 1 uses world.js defaults for anything not set.
  // ------------------------------------------------------------------
  const LEVEL_THEMES = {
    1: {
      name: 'Jungle Temple', accent: 0xffd84a, ambient: [0xfff3b0, 0xb07dff],
      sky: { sunCol: '#fff0c0', moonCol: '#d8c0ff' },
      floor: { tex: 'stone', light: 0xffffff, curb: 0xcbb48a, dark: 0xa45cff, darkTint: 0xffffff, darkCurb: 0x8a4dff },
      weather: { color: 0x9ad85a, size: 0.22, vel: [0.8, -1.1, 0.4], sway: 1.2, count: 220, additive: false, opacity: 0.9 },
      creatures: [{ kind: 'parrot', world: 0, n: 7 }, { kind: 'butterfly', world: 0, n: 16 }, { kind: 'bat', world: 1, n: 8 }, { kind: 'firefly', world: 1, n: 14 }],
      smoke: 'mist',
    },
    2: {
      name: 'Deep Space', accent: 0x7a9aff, ambient: [0xbfd0ff, 0xff6a8a], noGround: true,
      light: { skyTop: '#01000a', skyHor: '#160a3a', fog: '#0a0620', fogNear: 60, fogFar: 300, hemiSky: '#c8d4ff', hemiGround: '#3a2a6a', hemiI: 1.9, sun: '#ffffff', sunI: 2.3, abyss: '#000000' },
      dark: { skyTop: '#000000', skyHor: '#2a0010', fog: '#0c0006', fogNear: 40, fogFar: 220, hemiSky: '#ff7a9a', hemiGround: '#1a0008', hemiI: 1.3, sun: '#ff4a6a', sunI: 1.1, abyss: '#000000' },
      sky: { sunDir: [0.5, 0.25, -1], sunCol: '#ffffff', sunSize: 0.6, moonCol: '#ff9ab0', mirror: 1, starsL: 1, neb: 1, nebL: ['#ff4da6', '#3a6aff'], nebD: ['#ff3a1a', '#7a0aff'] },
      floor: { tex: 'metal', light: 0xffffff, curb: 0x9aa4c8, dark: 0xff3a5a, darkTint: 0xffb0c0, darkCurb: 0xff3a5a },
      mats: { rock: 0x6e6880, moss: 0x39f3ff, trunk: 0x9aa0b8, crate: 0x5a7ab8, crateBand: 0xffcf3a, log: 0x8a90a8, logRing: 0xffcf3a, archWood: 0x8a90a8, flower: 0xff3a3a, flower2: 0x3aff7a, vine: 0x222233, crystal: 0xff3a5a, crystal2: 0xff8a3a, rune: 0xffcf3a, wraithRing: 0xff3a5a, gem: 0xff6a8a },
      skins: { tree: 'beacon' },
      hide: { 0: [0, 1, 2, 'far'], 1: [0, 1, 2, 'far'] },
      props: [
        { kind: 'asteroid', world: 0, n: 42, place: 'near' }, { kind: 'satellite', world: 0, n: 5, place: 'near' },
        { kind: 'planet', world: 0, n: 6, place: 'far' }, { kind: 'bigplanet', world: 0, place: 'sky' },
        { kind: 'asteroidRed', world: 1, n: 42, place: 'near' }, { kind: 'blackhole', world: 1, place: 'sky' },
      ],
      creatures: [{ kind: 'ufo', world: 0, n: 4 }, { kind: 'comet', world: 0, n: 3 }, { kind: 'jelly', world: 1, n: 9 }],
      smoke: 'nebula',
      weather: { color: 0xffffff, size: 0.07, vel: [0, 0, 14], sway: 0, count: 600, additive: true, opacity: 0.9 },
    },
    3: {
      name: 'Time Rift', accent: 0xffc84a, ambient: [0xffe0a0, 0x7ae8ff], noGround: true,
      light: { skyTop: '#3a2008', skyHor: '#ffcf7a', fog: '#d8a860', fogNear: 35, fogFar: 200, hemiSky: '#fff0d0', hemiGround: '#8a5a2a', hemiI: 1.9, sun: '#ffd890', sunI: 2.2, abyss: '#2a1808' },
      dark: { skyTop: '#00020a', skyHor: '#0a2a5a', fog: '#04122a', fogNear: 25, fogFar: 160, hemiSky: '#5adcff', hemiGround: '#021020', hemiI: 1.3, sun: '#39f3ff', sunI: 1, abyss: '#00040a' },
      sky: { sunDir: [0.4, 0.3, -1], sunCol: '#fff4c0', sunSize: 1.2, moonCol: '#bff4ff', mirror: 1, vortex: 1, vortexL: '#ffb030', vortexD: '#39c8ff' },
      floor: { tex: 'clock', light: 0xffffff, curb: 0xe8c060, dark: 0x39f3ff, darkTint: 0xb0e8ff, darkCurb: 0x39f3ff },
      mats: { rock: 0x8a6a40, moss: 0xffd84a, crate: 0xb08040, crateBand: 0x5a3a1a, log: 0xb8862a, logRing: 0xffe08a, archWood: 0x7a4a20, flower: 0xffd84a, flower2: 0xfff4c0, vine: 0x8a6a2a, crystal: 0x39d8ff, crystal2: 0x8affff, rune: 0xffffff, wraithRing: 0x39f3ff, gem: 0x8af4ff },
      skins: { tree: 'grandclock', rock: 'gear' },
      hide: { 0: [0, 1, 2, 'far'], 1: [0, 1, 2, 'far'] },
      props: [
        { kind: 'clock', world: 0, n: 30, place: 'near' }, { kind: 'gear', world: 0, n: 18, place: 'near' },
        { kind: 'clocktower', world: 0, n: 10, place: 'far' }, { kind: 'biggear', world: 0, n: 8, place: 'far' }, { kind: 'skyclock', world: 0, place: 'sky' },
        { kind: 'holoclock', world: 1, n: 30, place: 'near' }, { kind: 'hourglass', world: 1, n: 10, place: 'far' }, { kind: 'skyclockHolo', world: 1, place: 'sky' },
      ],
      creatures: [{ kind: 'watch', world: 0, n: 10 }, { kind: 'watchHolo', world: 1, n: 10 }],
      smoke: 'steam',
      weather: { color: 0xffd890, size: 0.14, vel: [0, 0.6, 0], sway: 1.4, count: 450, additive: true, opacity: 0.9 },
    },
    4: {
      name: 'Toxic Chaos', accent: 0x9aff3a, ambient: [0xd8ff8a, 0xff4dd2],
      light: { skyTop: '#2f5e2a', skyHor: '#c8f07a', fog: '#b0d878', fogNear: 25, fogFar: 170, hemiSky: '#e8ffd0', hemiGround: '#4a7a2a', hemiI: 1.7, sun: '#d8ff8a', sunI: 2.1, ground: '#4f7d2a', abyss: '#142008' },
      dark: { skyTop: '#010805', skyHor: '#0a6a4a', fog: '#04261a', hemiSky: '#5aff9a', hemiGround: '#02140a', sun: '#ff4dd2', ground: '#04180e', abyss: '#000502' },
      sky: { sunDir: [-0.3, 0.3, -1], sunCol: '#eaff9a', sunSize: 1.6, moonCol: '#ff8ae8', glitch: 1 },
      floor: { tex: 'stone', light: 0xc8e0a0, curb: 0x9ac85a, dark: 0x5aff7a, darkTint: 0xb0ffc0, darkCurb: 0xff4dd2 },
      mats: { moss: 0x9aff3a, leaf: 0x4a8a2a, leaf2: 0x8adc3a, rock: 0x6a7a5a, crystal: 0x5aff7a, crystal2: 0xff4dd2, rune: 0xff4dd2, wraithRing: 0x5aff7a, gem: 0x9aff6a },
      scn: { leafA: 0x5a8a2a, leafB: 0x9adc3a, leafC: 0x3a6a1f, bush: 0x6aa83a, stone: 0x7a8a6a, petal: [0xff4dd2, 0x9aff3a, 0x39f3ff, 0xffe066], deadTrunk: 0x0a1a10, crystal: 0x5aff7a, rockDark: 0x0e2a1a, cap: [0x5aff7a, 0xff4dd2, 0x39f3ff] },
      hide: { 0: ['far'] },
      props: [{ kind: 'island', world: 0, n: 18, place: 'far' }],
      creatures: [{ kind: 'bat', world: 0, n: 7 }, { kind: 'bat', world: 1, n: 10 }, { kind: 'firefly', world: 1, n: 12 }],
      smoke: 'toxic',
      weather: { color: 0xb8ff6a, size: 0.18, vel: [0, 0.9, 0], sway: 1.6, count: 420, additive: true, opacity: 0.9 },
    },
    5: {
      name: 'Volcanic Collapse', accent: 0xff5a2a, ambient: [0xffb04d, 0xffcf3a], lightning: true, meteors: true,
      light: { skyTop: '#3a0a0a', skyHor: '#ff7a3a', fog: '#a8401f', fogNear: 22, fogFar: 160, hemiSky: '#ffc8a0', hemiGround: '#5a1a0a', hemiI: 1.6, sun: '#ff9a5a', sunI: 2.2, ground: '#3a2420', abyss: '#ff4a0a' },
      dark: { skyTop: '#000000', skyHor: '#4a1a00', fog: '#1a0800', fogNear: 14, fogFar: 120, hemiSky: '#ffb04d', hemiGround: '#100400', hemiI: 1.1, sun: '#ffd27a', ground: '#0e0602', abyss: '#3a0a00' },
      sky: { sunDir: [0.3, 0.15, -1], sunCol: '#ff5a2a', sunSize: 3, moonCol: '#ffcf7a' },
      floor: { tex: 'basalt', light: 0xffffff, curb: 0x4a3a36, dark: 0xff7a1a, darkTint: 0xffc0a0, darkCurb: 0xffb04d },
      mats: { moss: 0xff6a1a, leaf: 0x3a2a24, leaf2: 0x5a3a2a, rock: 0x4a3a36, trunk: 0x2a1a14, crystal: 0xff7a1a, crystal2: 0xffcf3a, rune: 0xffcf3a, wraithRing: 0xff7a1a, gem: 0xffb04d },
      scn: { trunk: 0x1e140f, leafA: 0x3a2a24, leafB: 0x5a2a1a, leafC: 0x2a1e1a, bush: 0x4a2e24, stone: 0x3a2e2a, petal: [0xff5a1a, 0xffb04d, 0xff8a3a, 0xffd27a], deadTrunk: 0x140600, crystal: 0xff7a1a, rockDark: 0x1a0a04, cap: [0xff7a1a, 0xffcf3a, 0xff3a1a] },
      hide: { 0: ['far'] },
      props: [{ kind: 'volcano', world: 0, n: 14, place: 'far' }],
      creatures: [{ kind: 'phoenix', world: 0, n: 4 }, { kind: 'bat', world: 1, n: 9 }],
      smoke: 'volcano',
      weather: { color: 0xff7a2a, size: 0.16, vel: [0.6, 2.8, 1], sway: 1.2, count: 500, additive: true, opacity: 1 },
    },
  };

  // ------------------------------------------------------------------
  // textures
  // ------------------------------------------------------------------
  function canvasTex(w, h, draw, repeat = true) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const MAKERS = {
    clockFace: () => canvasTex(256, 256, (g, S) => {
      const c = S / 2;
      const grd = g.createRadialGradient(c, c, 10, c, c, c);
      grd.addColorStop(0, '#fffaf0'); grd.addColorStop(1, '#e8d4a8');
      g.fillStyle = grd; g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.fill();
      g.strokeStyle = '#c8962a'; g.lineWidth = 14; g.beginPath(); g.arc(c, c, c - 9, 0, TAU); g.stroke();
      g.strokeStyle = '#7a5a1a'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, c - 18, 0, TAU); g.stroke();
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * TAU, r0 = c - (i % 5 ? 26 : 34), r1 = c - 20;
        g.strokeStyle = '#3a2a1a'; g.lineWidth = i % 5 ? 2 : 5;
        g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
      }
      g.fillStyle = '#3a2a1a'; g.font = 'bold 24px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      NUMERALS.forEach((n, i) => { const a = i / 12 * TAU; g.fillText(n, c + Math.sin(a) * (c - 56), c - Math.cos(a) * (c - 56)); });
    }, false),
    holoFace: () => canvasTex(256, 256, (g, S) => {
      const c = S / 2;
      g.strokeStyle = '#39f3ff'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 8, 0, TAU); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 22, 0, TAU); g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        g.lineWidth = 6; g.beginPath(); g.moveTo(c + Math.sin(a) * (c - 30), c - Math.cos(a) * (c - 30)); g.lineTo(c + Math.sin(a) * (c - 50), c - Math.cos(a) * (c - 50)); g.stroke();
      }
      g.fillStyle = '#39f3ff'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText('00:00', c, c + 50);
    }, false),
    metalFloor: () => canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#4a5068'; g.fillRect(0, 0, S, S);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
        const x = k * 128 + 6, y = r * 64 + 6, w = 116, h = 52, l = 92 + rnd() * 20 | 0;
        g.fillStyle = `rgb(${l},${l + 6},${l + 26})`; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w, 3);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y + h - 3, w, 3);
        g.fillStyle = '#c8d0e8';
        for (const [px, py] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) { g.beginPath(); g.arc(px, py, 2.5, 0, TAU); g.fill(); }
        if (rnd() < 0.4) { g.fillStyle = 'rgba(57,243,255,0.35)'; g.fillRect(x + 20, y + h / 2 - 2, w - 40, 4); }
      }
      for (let y = 0; y < S; y += 16) {   // hazard stripes on the lane borders
        g.fillStyle = (y / 16) % 2 ? '#ffcf3a' : '#1a1a22';
        g.fillRect(0, y, 6, 16); g.fillRect(S - 6, y, 6, 16);
      }
    }),
    clockFloor: () => canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#6a4a22'; g.fillRect(0, 0, S, S);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) {
        const cx = k * 128 + 64, cy = r * 128 + 64;
        const grd = g.createRadialGradient(cx, cy, 4, cx, cy, 64);
        grd.addColorStop(0, '#e8c070'); grd.addColorStop(1, '#a87a34');
        g.fillStyle = grd; g.fillRect(k * 128 + 3, r * 128 + 3, 122, 122);
        g.strokeStyle = 'rgba(70,40,10,0.75)'; g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, 48, 0, TAU); g.stroke();
        g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.stroke();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU;
          g.beginPath(); g.moveTo(cx + Math.sin(a) * 38, cy - Math.cos(a) * 38); g.lineTo(cx + Math.sin(a) * 46, cy - Math.cos(a) * 46); g.stroke();
        }
        const a = rnd() * TAU;
        g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * 30, cy - Math.cos(a) * 30); g.stroke();
      }
      g.fillStyle = '#ffe08a'; g.fillRect(0, 0, 5, S); g.fillRect(S - 5, 0, 5, S);
    }),
    basaltFloor: () => canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#1e1614'; g.fillRect(0, 0, S, S);
      for (let r = 0; r < 4; r++) {
        let x = r % 2 ? -50 : 0;
        while (x < S) {
          const w = 60 + rnd() * 50, l = 46 + rnd() * 18 | 0;
          g.fillStyle = `rgb(${l + 8},${l},${l - 4})`; g.fillRect(x + 5, r * 64 + 5, w - 10, 54);
          x += w;
        }
      }
      for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(rnd() * S, rnd() * S, 2, 2); }
      g.fillStyle = '#5a2a1a'; g.fillRect(0, 0, 5, S); g.fillRect(S - 5, 0, 5, S);
    }),
    lavaGlow: () => canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.strokeStyle = '#ff6a1a'; g.shadowColor = '#ff3a00'; g.shadowBlur = 10; g.lineWidth = 3;
      for (let r = 0; r <= 4; r++) { g.beginPath(); g.moveTo(0, r * 64 + 2); for (let x = 0; x <= S; x += 16) g.lineTo(x, r * 64 + 2 + (rnd() - 0.5) * 5); g.stroke(); }
      for (let i = 0; i < 5; i++) {
        let x = rnd() * S, y = rnd() * S;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y); }
        g.stroke();
      }
    }),
    padFast: () => canvasTex(128, 256, (g, W, H) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#3affc0'; g.lineWidth = 6; g.strokeRect(5, 5, W - 10, H - 10);
      g.fillStyle = '#3affc0';
      for (let i = 0; i < 4; i++) {
        const y = 30 + i * 60;
        g.beginPath(); g.moveTo(W / 2, y); g.lineTo(W - 22, y + 34); g.lineTo(W - 42, y + 34); g.lineTo(W / 2, y + 12); g.lineTo(42, y + 34); g.lineTo(22, y + 34); g.closePath(); g.fill();
      }
    }),
    padSlow: () => canvasTex(128, 256, (g, W, H) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#c86aff'; g.lineWidth = 6; g.strokeRect(5, 5, W - 10, H - 10);
      // hourglass
      g.fillStyle = '#c86aff';
      g.beginPath(); g.moveTo(30, 60); g.lineTo(W - 30, 60); g.lineTo(W / 2 + 4, H / 2); g.lineTo(W - 30, H - 60); g.lineTo(30, H - 60); g.lineTo(W / 2 - 4, H / 2); g.closePath(); g.fill();
      g.fillStyle = '#000'; g.fillRect(40, 70, W - 80, 14);
      g.fillStyle = '#c86aff'; g.fillRect(24, 50, W - 48, 8); g.fillRect(24, H - 58, W - 48, 8);
    }),
    smoke: () => canvasTex(64, 64, (g, S) => {
      for (let i = 0; i < 7; i++) {
        const x = S / 2 + (rnd() - 0.5) * 18, y = S / 2 + (rnd() - 0.5) * 18, r = 14 + rnd() * 14;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.fillRect(0, 0, S, S);
      }
    }, false),
    planet: () => canvasTex(256, 128, (g, W, H) => {
      const cols = ['#e8a86a', '#c87a4a', '#f4d0a0', '#a8603a', '#e8c090', '#d89060'];
      let y = 0;
      while (y < H) { const h = 4 + rnd() * 14; g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(0, y, W, h + 1); y += h; }
      for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(rnd() * W, rnd() * H, 8 + rnd() * 20, 2); }
      g.fillStyle = 'rgba(200,60,40,0.7)'; g.beginPath(); g.ellipse(W * 0.6, H * 0.62, 16, 8, 0, 0, TAU); g.fill();
    }),
  };
  const TEX = {};
  const tex = name => TEX[name] || (TEX[name] = MAKERS[name]());

  // ------------------------------------------------------------------
  // a small resource tracker so a level's props can be disposed on theme change
  // ------------------------------------------------------------------
  function Res() {
    const list = [];
    const R = o => { list.push(o); return o; };
    R.lam = (c, o = {}) => R(new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o)));
    R.std = (c, o = {}) => R(new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.4, flatShading: true }, o)));
    R.glow = (c, o = {}) => R(new THREE.MeshBasicMaterial(Object.assign({ color: c }, o)));
    R.add = (c, o = {}) => R(new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }, o)));
    R.mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(R(geo), mat); m.position.set(x, y, z); return m; };
    R.dispose = () => { for (const o of list) o.dispose(); list.length = 0; };
    return R;
  }

  // gear: disc + teeth + hub, lying in the XY plane (axis = z)
  function gear(R, mat, teeth = 12, r = 1, depth = 0.25) {
    const g = new THREE.Group();
    const disc = R.mesh(new THREE.CylinderGeometry(r, r, depth, 24), mat); disc.rotation.x = Math.PI / 2; g.add(disc);
    const tGeo = R(new THREE.BoxGeometry(r * 0.28, r * 0.3, depth));
    for (let i = 0; i < teeth; i++) {
      const a = i / teeth * TAU, t = new THREE.Mesh(tGeo, mat);
      t.position.set(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0); t.rotation.z = a + Math.PI / 2;
      g.add(t);
    }
    const hole = R.mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, depth * 1.2, 20), R.lam(0x3a2a1a)); hole.rotation.x = Math.PI / 2; g.add(hole);
    const hub = R.mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, depth * 1.6, 10), mat); hub.rotation.x = Math.PI / 2; g.add(hub);
    for (let i = 0; i < 4; i++) { const s = R.mesh(new THREE.BoxGeometry(r * 1.1, r * 0.12, depth * 0.9), mat); s.rotation.z = i * Math.PI / 4; g.add(s); }
    return g;
  }

  // clock: face + rim + hands; returns { g, hands } (face points to +z)
  function clock(R, holo) {
    const g = new THREE.Group();
    if (holo) {
      g.add(R.mesh(new THREE.CircleGeometry(1, 40), R.add(0xffffff, { map: tex('holoFace'), side: THREE.DoubleSide })));
    } else {
      const rim = R.mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.2, 32), R.std(0xc8962a, { metalness: 0.7, roughness: 0.3 }));
      rim.rotation.x = Math.PI / 2; g.add(rim);
      g.add(R.mesh(new THREE.CircleGeometry(1, 40), R.glow(0xffffff, { map: tex('clockFace') }), 0, 0, 0.11));
      const back = R.mesh(new THREE.CircleGeometry(1, 40), R.glow(0xffffff, { map: tex('clockFace') }), 0, 0, -0.11); back.rotation.y = Math.PI; g.add(back);
    }
    const handMat = holo ? R.add(0x9affff) : R.lam(0x1a120a);
    const hands = [];
    for (const [len, w] of [[0.55, 0.08], [0.85, 0.05]]) {
      for (const side of holo ? [1] : [1, -1]) {
        const p = new THREE.Group(); p.position.z = 0.13 * side;
        const h = R.mesh(new THREE.BoxGeometry(w, len, 0.02), handMat, 0, len / 2 - 0.08, 0);
        p.add(h); g.add(p); hands.push({ p, fast: len > 0.6 });
      }
    }
    return { g, hands };
  }

  // wings that flap around the x axis; returns [left, right] pivots
  function wings(R, g, mat, span = 0.6, chord = 0.3, y = 0) {
    const geo = R(new THREE.BoxGeometry(span, 0.03, chord));
    const out = [];
    for (const s of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(s * 0.08, y, 0);
      const w = new THREE.Mesh(geo, mat); w.position.x = s * span / 2; p.add(w);
      g.add(p); out.push(p);
    }
    return out;
  }
  const flapWings = (ws, a) => { ws[0].rotation.z = a; ws[1].rotation.z = -a; };

  // ------------------------------------------------------------------
  // props: scenery around the path. Each returns a Group; userData.anim(g, t, dt) is optional.
  // place: near (beside the path), far (horizon), sky (follows the camera)
  // ------------------------------------------------------------------
  const PROPS = {
    asteroid(R, red) {
      const g = new THREE.Group();
      const mat = red ? R.lam(0x3a1a1a, { emissive: 0x5a0a00 }) : R.lam(rnd() < 0.5 ? 0x7a7488 : 0x5e5a6a);
      const n = 1 + (rnd() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const m = R.mesh(new THREE.DodecahedronGeometry(1, 0), mat, (rnd() - 0.5) * 2, (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 2);
        m.scale.set(range(0.4, 1.3), range(0.4, 1), range(0.4, 1.2)); m.rotation.set(rnd() * 3, rnd() * 3, 0);
        g.add(m);
      }
      if (red && rnd() < 0.6) g.add(R.mesh(new THREE.OctahedronGeometry(0.3, 0), R.add(0xff4a2a), 0, 0.9, 0));
      const spin = range(-0.6, 0.6), seed = rnd() * 10;
      g.userData.y = [0, 9];
      g.userData.anim = (o, t, dt) => { o.rotation.x += dt * spin; o.rotation.y += dt * spin * 0.7; o.position.y = o.userData.base.y + Math.sin(t * 0.6 + seed) * 0.4; };
      return g;
    },
    asteroidRed: R => PROPS.asteroid(R, true),
    satellite(R) {
      const g = new THREE.Group();
      g.add(R.mesh(new THREE.BoxGeometry(0.8, 0.8, 1.1), R.std(0xd8a83a, { metalness: 0.8, roughness: 0.3 })));
      const panel = R.std(0x2a4aa8, { metalness: 0.6, roughness: 0.2, emissive: 0x0a1a5a });
      for (const s of [-1, 1]) g.add(R.mesh(new THREE.BoxGeometry(2.4, 0.04, 0.9), panel, s * 1.65, 0, 0));
      const dish = R.mesh(new THREE.SphereGeometry(0.45, 12, 6, 0, TAU, 0, Math.PI / 2.5), R.lam(0xeeeeee, { side: THREE.DoubleSide }), 0, 0.5, 0);
      g.add(dish);
      const blink = R.mesh(new THREE.SphereGeometry(0.08, 6, 6), R.glow(0xff3a3a), 0, 0.95, 0);
      g.add(blink);
      g.userData.y = [4, 10];
      g.userData.anim = (o, t, dt) => { o.rotation.y += dt * 0.3; o.rotation.z = Math.sin(t * 0.4) * 0.2; blink.visible = Math.sin(t * 5) > 0; };
      return g;
    },
    planet(R) {
      const g = new THREE.Group();
      const hue = rnd();
      const mat = R.lam(new THREE.Color().setHSL(hue, 0.5, 0.65), { map: tex('planet'), flatShading: false });
      g.add(R.mesh(new THREE.SphereGeometry(1, 24, 16), mat));
      if (rnd() < 0.6) {
        const ring = R.mesh(new THREE.RingGeometry(1.4, 2.1, 40), R.glow(new THREE.Color().setHSL((hue + 0.1) % 1, 0.6, 0.7), { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
        ring.rotation.x = Math.PI / 2 - 0.4; g.add(ring);
      }
      g.userData.y = [18, 55]; g.userData.s = [5, 13];
      g.userData.anim = (o, t, dt) => { o.children[0].rotation.y += dt * 0.1; };
      return g;
    },
    bigplanet(R) {
      const g = PROPS.planet(R);
      g.userData.offset = [-150, 100, -280]; g.userData.s = [42, 42];
      return g;
    },
    blackhole(R) {
      const g = new THREE.Group();
      g.add(R.mesh(new THREE.SphereGeometry(1, 24, 16), R.glow(0x000000)));
      const disk = new THREE.Mesh(R(new THREE.RingGeometry(1.2, 3.4, 64, 1)), R(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform float uTime; varying vec2 vP;
          void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
            float s = sin(a * 3.0 - r * 4.0 + uTime * 2.0) * 0.5 + 0.5;
            float fall = smoothstep(3.4, 1.3, r) * smoothstep(1.15, 1.35, r);
            vec3 c = mix(vec3(1.0, 0.35, 0.1), vec3(1.0, 0.85, 0.5), s);
            gl_FragColor = vec4(c, fall * (0.5 + 0.5 * s)); }`,
      })));
      disk.rotation.x = Math.PI / 2 - 0.35;
      g.add(disk);
      const halo = R.mesh(new THREE.RingGeometry(1.0, 1.25, 48), R.add(0xffb070, { side: THREE.DoubleSide }));
      g.add(halo);
      g.userData.offset = [100, 55, -260]; g.userData.s = [30, 30];
      g.userData.anim = (o, t) => { disk.material.uniforms.uTime.value = t; };
      return g;
    },
    clock(R) {
      const { g, hands } = clock(R, false);
      const spin = range(0.5, 3) * (rnd() < 0.5 ? -1 : 1), seed = rnd() * 10;
      g.userData.y = [1.5, 9]; g.userData.s = [0.6, 1.9];
      g.userData.anim = (o, t) => {
        for (const h of hands) h.p.rotation.z = -(h.fast ? t * spin : t * spin / 12) - seed;
        o.rotation.y = Math.sin(t * 0.3 + seed) * 0.6 + o.userData.face;
        o.position.y = o.userData.base.y + Math.sin(t * 0.8 + seed) * 0.3;
      };
      return g;
    },
    holoclock(R) {
      const { g, hands } = clock(R, true);
      const spin = range(1, 4) * (rnd() < 0.5 ? -1 : 1), seed = rnd() * 10;
      g.userData.y = [1.5, 9]; g.userData.s = [0.6, 1.9];
      g.userData.anim = (o, t) => {
        for (const h of hands) h.p.rotation.z = -(h.fast ? t * spin : t * spin / 12);
        o.rotation.y = o.userData.face + Math.sin(t + seed) * 0.4;
        o.children[0].material.opacity = 0.6 + 0.4 * Math.sin(t * 6 + seed) * Math.sin(t * 1.3);
      };
      return g;
    },
    gear(R) {
      const g = gear(R, R.std(rnd() < 0.5 ? 0xb8862a : 0x8a6a4a, { metalness: 0.8, roughness: 0.35 }), 10 + (rnd() * 6 | 0));
      const spin = range(0.4, 1.4) * (rnd() < 0.5 ? -1 : 1);
      g.userData.y = [0.5, 6]; g.userData.s = [0.8, 2.2];
      g.userData.anim = (o, t, dt) => { o.rotation.z += dt * spin; };
      g.userData.faceSide = true;
      return g;
    },
    clocktower(R) {
      const g = new THREE.Group();
      const brick = R.lam(0x8a5a3a);
      g.add(R.mesh(new THREE.BoxGeometry(1, 4, 1), brick, 0, 0, 0));
      const roof = R.mesh(new THREE.ConeGeometry(0.85, 1.1, 4), R.lam(0x3a4a6a), 0, 2.55, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
      const faces = [];
      for (const [x, z, ry] of [[0, 0.51, 0], [0.51, 0, Math.PI / 2], [-0.51, 0, -Math.PI / 2]]) {
        const c = clock(R, false); c.g.scale.setScalar(0.38); c.g.position.set(x, 1.3, z); c.g.rotation.y = ry; g.add(c.g); faces.push(...c.hands);
      }
      const spin = range(2, 6);
      g.userData.y = [-14, -6]; g.userData.s = [6, 10];
      g.userData.anim = (o, t) => { for (const h of faces) h.p.rotation.z = -(h.fast ? t * spin : t * spin / 12); };
      return g;
    },
    biggear(R) {
      const g = PROPS.gear(R);
      g.userData.y = [6, 30]; g.userData.s = [5, 11];
      return g;
    },
    hourglass(R) {
      const g = new THREE.Group();
      const glass = R.add(0x39f3ff, { opacity: 0.55 });
      for (const s of [-1, 1]) {
        const c = R.mesh(new THREE.ConeGeometry(0.7, 1, 16, 1, true), glass, 0, s * 0.5, 0); c.rotation.x = s > 0 ? Math.PI : 0; g.add(c);
        g.add(R.mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16), R.glow(0x9affff), 0, s * 1.02, 0));
      }
      const sand = R.mesh(new THREE.ConeGeometry(0.45, 0.5, 12), R.add(0xffffff, { opacity: 0.8 }), 0, -0.7, 0);
      g.add(sand);
      const seed = rnd() * 10;
      g.userData.y = [8, 28]; g.userData.s = [2.5, 6];
      g.userData.anim = (o, t, dt) => { o.rotation.z = Math.sin(t * 0.4 + seed) * Math.PI; o.rotation.y += dt * 0.3; };
      return g;
    },
    skyclock(R, holo) {
      const { g, hands } = clock(R, !!holo);
      g.traverse(o => { if (o.material) { o.material.fog = false; } });
      g.userData.offset = [0, 105, -290]; g.userData.s = [55, 55];
      g.userData.anim = (o, t) => { for (const h of hands) h.p.rotation.z = -(h.fast ? t * 2.2 : t * 0.18); };
      return g;
    },
    skyclockHolo: R => PROPS.skyclock(R, true),
    island(R) {
      const g = new THREE.Group();
      const r = R.mesh(new THREE.ConeGeometry(1, 1.5, 6), R.lam(0x5a6a4a), 0, -0.75, 0); r.rotation.x = Math.PI; g.add(r);
      g.add(R.mesh(new THREE.CylinderGeometry(1.02, 1, 0.2, 6), R.lam(0x8adc3a), 0, 0.1, 0));
      g.add(R.mesh(new THREE.OctahedronGeometry(0.35, 0), R.glow(rnd() < 0.5 ? 0xff4dd2 : 0x5aff7a), 0, 0.7, 0));
      const seed = rnd() * 10;
      g.userData.y = [6, 22]; g.userData.s = [2.5, 6.5]; g.userData.x = [14, 64];
      g.userData.anim = (o, t, dt) => { o.position.y = o.userData.base.y + Math.sin(t * 0.7 + seed) * 0.8; o.rotation.y += dt * 0.15; };
      return g;
    },
    volcano(R) {
      const g = new THREE.Group();
      g.add(R.mesh(new THREE.CylinderGeometry(0.22, 1, 0.9, 9), R.lam(0x2a1a16), 0, 0.45, 0));
      g.add(R.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 9), R.glow(0xff6a1a), 0, 0.9, 0));
      for (let i = 0; i < 3; i++) {   // lava streams down the side
        const a = rnd() * TAU, s = R.mesh(new THREE.BoxGeometry(0.06, 0.55, 0.02), R.glow(0xff4a0a));
        s.position.set(Math.sin(a) * 0.45, 0.62, Math.cos(a) * 0.45);
        s.lookAt(Math.sin(a) * 2, -1, Math.cos(a) * 2);
        g.add(s);
      }
      g.userData.y = [-0.3, -0.3]; g.userData.s = [16, 30];
      g.userData.top = 0.9;
      return g;
    },
  };

  // ------------------------------------------------------------------
  // creatures: animals and other flying things.
  // motion: cross (flies across the path ahead), hover (near the path), drift (slow, mid-air)
  // ------------------------------------------------------------------
  const CREATURES = {
    parrot(R) {
      const g = new THREE.Group();
      const col = [0xff3a3a, 0x3a8aff, 0xffd84a, 0x3adc6a][(rnd() * 4) | 0];
      const body = R.lam(col);
      const b = R.mesh(new THREE.ConeGeometry(0.18, 0.8, 6), body); b.rotation.x = Math.PI / 2; g.add(b);
      g.add(R.mesh(new THREE.SphereGeometry(0.16, 8, 6), body, 0, 0.05, -0.38));
      const beak = R.mesh(new THREE.ConeGeometry(0.06, 0.16, 4), R.lam(0xffb020), 0, 0, -0.56); beak.rotation.x = -Math.PI / 2; g.add(beak);
      const tail = R.mesh(new THREE.BoxGeometry(0.16, 0.03, 0.5), R.lam(col === 0xff3a3a ? 0x3a8aff : 0xff3a3a), 0, 0, 0.5); g.add(tail);
      const ws = wings(R, g, R.lam(col === 0xffd84a ? 0x3a8aff : 0xffd84a), 0.75, 0.32);
      g.scale.setScalar(1.4);
      return { g, motion: 'cross', speed: [7, 11], y: [5, 13], flap: t => flapWings(ws, Math.sin(t * 14) * 0.9) };
    },
    bat(R) {
      const g = new THREE.Group();
      const m = R.lam(0x1a1020);
      g.add(R.mesh(new THREE.SphereGeometry(0.16, 8, 6), m));
      for (const s of [-1, 1]) { const e = R.mesh(new THREE.ConeGeometry(0.05, 0.14, 4), m, s * 0.08, 0.16, 0); g.add(e); }
      for (const s of [-1, 1]) g.add(R.mesh(new THREE.SphereGeometry(0.03, 4, 4), R.glow(0xff2a55), s * 0.06, 0.04, -0.14));
      const ws = wings(R, g, m, 0.6, 0.35);
      g.scale.setScalar(1.6);
      return { g, motion: 'cross', speed: [9, 14], y: [2.5, 9], wobble: 1.5, flap: t => flapWings(ws, Math.sin(t * 24) * 1.1) };
    },
    butterfly(R) {
      const g = new THREE.Group();
      const m = R.lam([0xff6fa8, 0xffd84a, 0x8fd3ff, 0xffffff, 0xff8a3a][(rnd() * 5) | 0], { side: THREE.DoubleSide });
      const geo = R(new THREE.PlaneGeometry(0.3, 0.26).rotateX(-Math.PI / 2));
      const ws = [];
      for (const s of [-1, 1]) {
        const p = new THREE.Group(); const w = new THREE.Mesh(geo, m); w.position.x = s * 0.15; p.add(w); g.add(p); ws.push(p);
      }
      g.add(R.mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), R.lam(0x222222)));
      return { g, motion: 'hover', y: [0.8, 3], flap: t => flapWings(ws, Math.sin(t * 18) * 1.1) };
    },
    firefly(R) {
      const g = new THREE.Group();
      const m = R.add(0xd8ff6a);
      g.add(R.mesh(new THREE.SphereGeometry(0.08, 6, 6), m));
      g.add(R.mesh(new THREE.SphereGeometry(0.22, 8, 6), R.add(0xd8ff6a, { opacity: 0.25 })));
      const seed = rnd() * 10;
      return { g, motion: 'hover', y: [0.6, 4], flap: t => { g.children[1].material.opacity = 0.15 + 0.15 * Math.sin(t * 5 + seed); } };
    },
    ufo(R) {
      const g = new THREE.Group();
      const hull = R.mesh(new THREE.SphereGeometry(1, 20, 8), R.std(0xb8c0d8, { metalness: 0.9, roughness: 0.25 })); hull.scale.set(1.6, 0.35, 1.6); g.add(hull);
      g.add(R.mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, TAU, 0, Math.PI / 2), R.add(0x7affd8, { opacity: 0.6 }), 0, 0.2, 0));
      const lights = [];
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU, l = R.mesh(new THREE.SphereGeometry(0.1, 6, 6), R.glow(0xffffff), Math.cos(a) * 1.45, -0.05, Math.sin(a) * 1.45);
        g.add(l); lights.push(l);
      }
      const beam = R.mesh(new THREE.ConeGeometry(1.2, 4, 16, 1, true), R.add(0x7affd8, { opacity: 0.15, side: THREE.DoubleSide }), 0, -2.2, 0);
      g.add(beam);
      return {
        g, motion: 'cross', speed: [6, 10], y: [10, 20], wobble: 0.8,
        flap: t => { g.rotation.y = t * 2; lights.forEach((l, i) => l.material.color.setHSL(((t * 0.8 + i / 8) % 1), 1, 0.6)); beam.visible = Math.sin(t * 1.3) > 0.3; },
      };
    },
    comet(R) {
      const g = new THREE.Group();
      g.add(R.mesh(new THREE.IcosahedronGeometry(0.5, 0), R.glow(0xe8f4ff)));
      const tail = R.mesh(new THREE.ConeGeometry(0.45, 6, 12, 1, true), R.add(0x7ab8ff, { opacity: 0.5, side: THREE.DoubleSide }), 0, 0, 0);
      tail.rotation.z = Math.PI / 2; tail.position.x = 3;
      g.add(tail);
      return { g, motion: 'cross', speed: [30, 45], y: [25, 50], faceMotion: true, flap: () => {} };
    },
    jelly(R) {
      const g = new THREE.Group();
      const col = [0xff4d8a, 0xb04dff, 0xff7a3a][(rnd() * 3) | 0];
      g.add(R.mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, TAU, 0, Math.PI / 2), R.add(col, { opacity: 0.55, side: THREE.DoubleSide })));
      const tents = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU, t = R.mesh(new THREE.CylinderGeometry(0.03, 0.01, 1.6, 4), R.add(col, { opacity: 0.6 }), Math.cos(a) * 0.4, -0.8, Math.sin(a) * 0.4);
        g.add(t); tents.push(t);
      }
      const seed = rnd() * 10;
      return {
        g, motion: 'drift', y: [2, 12],
        flap: t => { const p = Math.sin(t * 2 + seed); g.children[0].scale.set(1 + p * 0.12, 1 - p * 0.15, 1 + p * 0.12); tents.forEach((x, i) => { x.rotation.x = Math.sin(t * 3 + i) * 0.3; }); },
      };
    },
    phoenix(R) {
      const c = CREATURES.parrot(R);
      c.g.traverse(o => { if (o.material) { o.material = R.glow(0xff7a1a); } });
      c.g.scale.setScalar(2.4);
      c.y = [9, 18]; c.trail = 0xff7a1a;
      return c;
    },
    watch(R, holo) {
      const { g, hands } = clock(R, !!holo);
      g.scale.setScalar(0.45);
      const ws = wings(R, g, holo ? R.add(0x9affff) : R.lam(0xffffff), 1.3, 0.6, 0.2);
      const seed = rnd() * 10;
      return {
        g, motion: 'drift', y: [2, 9], speed: [1.5, 3],
        flap: t => { flapWings(ws, Math.sin(t * 9 + seed) * 0.7); for (const h of hands) h.p.rotation.z = -(h.fast ? t * 6 : t / 2); },
      };
    },
    watchHolo: R => CREATURES.watch(R, true),
  };

  // ------------------------------------------------------------------
  // smoke presets: how and where puffs are emitted
  // ------------------------------------------------------------------
  const SMOKE = {
    mist: { rate: 6, colors: [0xffffff, 0xb07dff], size: [5, 10], life: 5, opacity: 0.22, at: 'sides', y: [0.2, 1.2], rise: 0.05 },
    nebula: { rate: 3, colors: [[0xff4da6, 0x3a6aff], [0xff3a1a, 0x7a0aff]], size: [20, 40], life: 7, opacity: 0.16, at: 'far', additive: true, rise: 0 },
    steam: { rate: 9, colors: [0xfff4e0, 0x9affff], size: [0.8, 4], life: 2, opacity: 0.5, at: 'edges', y: [0, 0.2], rise: 2.6 },
    toxic: { rate: 7, colors: [0x9aff5a, 0x5aff9a], size: [4, 9], life: 4, opacity: 0.3, at: 'sides', y: [0.1, 1], rise: 0.3 },
    volcano: { rate: 4, colors: [0x2a2220, 0x1a0a04], size: [12, 45], life: 7, opacity: 0.55, at: 'volcano', rise: 5, wind: 1.5 },
  };

  // ------------------------------------------------------------------
  // themed obstacle skins (Light World blocks); materials are created once by world.js
  // ------------------------------------------------------------------
  function skinMaterials() {
    const T = o => Object.assign(o, { transparent: true });
    const lam = c => T(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    return Object.assign({
      metal: lam(0x9aa0b8), beacon: T(new THREE.MeshBasicMaterial({ color: 0xff3a3a })),
      dish: lam(0xeeeeee), wood: lam(0x6a3a1a), brass: T(new THREE.MeshStandardMaterial({ color: 0xc8962a, metalness: 0.8, roughness: 0.35, flatShading: true })),
      face: T(new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex('clockFace') })), dark: lam(0x1a120a), iron: T(new THREE.MeshStandardMaterial({ color: 0x8a6a4a, metalness: 0.8, roughness: 0.4, flatShading: true })),
    }, DR.dress.extraSkinMaterials ? DR.dress.extraSkinMaterials(T, lam) : {});
  }
  // builds into group g; returns an optional per-frame animation (t) => void
  function skin(kind, g, S, G) {
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    if (SKINS[kind]) return SKINS[kind](g, S, G, add);
    if (kind === 'beacon') {
      add(G.mast, S.metal, 0, 1.4, 0);
      for (const y of [0.8, 1.6, 2.3]) add(G.crossbar, S.metal, 0, y, 0);
      const dish = add(G.dishGeo, S.dish, 0, 2.2, -0.2); dish.rotation.x = -1.1;
      const light = add(G.light, S.beacon, 0, 2.95, 0);
      return t => { light.visible = Math.sin(t * 6) > -0.3; };
    }
    if (kind === 'grandclock') {
      add(G.cabinet, S.wood, 0, 1.4, 0);
      add(G.cap, S.brass, 0, 2.85, 0);
      const f = add(G.faceGeo, S.face, 0, 2.2, 0.36);
      f.rotation.y = 0;
      const pend = new THREE.Group(); pend.position.set(0, 1.75, 0.37); g.add(pend);
      const rod = new THREE.Mesh(G.rod, S.brass); rod.position.y = -0.45; pend.add(rod);
      const bob = new THREE.Mesh(G.bob, S.brass); bob.position.y = -0.9; pend.add(bob);
      return t => { pend.rotation.z = Math.sin(t * 3.5) * 0.4; };
    }
    if (kind === 'gear') {
      const w = new THREE.Group(); w.position.y = 1.2; g.add(w);
      const disc = new THREE.Mesh(G.gearDisc, S.iron); disc.rotation.x = Math.PI / 2; w.add(disc);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, t = new THREE.Mesh(G.tooth, S.iron);
        t.position.set(Math.cos(a) * 1.18, Math.sin(a) * 1.18, 0); t.rotation.z = a + Math.PI / 2; w.add(t);
      }
      const hub = new THREE.Mesh(G.hub, S.brass); hub.rotation.x = Math.PI / 2; w.add(hub);
      const dir = rnd() < 0.5 ? -1 : 1;
      return (t) => { w.rotation.z = t * 1.5 * dir; };
    }
    return null;
  }
  function skinGeometries() {
    return Object.assign(DR.dress.extraSkinGeometries ? DR.dress.extraSkinGeometries() : {}, {
      mast: new THREE.CylinderGeometry(0.08, 0.14, 2.8, 6), crossbar: new THREE.BoxGeometry(0.7, 0.06, 0.06),
      dishGeo: new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), light: new THREE.SphereGeometry(0.16, 8, 8),
      cabinet: new THREE.BoxGeometry(1.0, 2.8, 0.7), cap: new THREE.BoxGeometry(1.15, 0.2, 0.8), faceGeo: new THREE.CircleGeometry(0.38, 32),
      rod: new THREE.BoxGeometry(0.04, 0.9, 0.02), bob: new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16).rotateX(Math.PI / 2),
      gearDisc: new THREE.CylinderGeometry(1.05, 1.05, 0.35, 20), tooth: new THREE.BoxGeometry(0.3, 0.32, 0.35), hub: new THREE.CylinderGeometry(0.3, 0.3, 0.5, 10),
    });
  }
  const SKINS = {};   // more obstacle skins, added by themes-wild.js

  // themes-wild.js extends these tables (more levels, textures, props, creatures, smoke, skins)
  DR.dress = { LEVEL_THEMES, PROPS, CREATURES, SMOKE, SKINS, MAKERS, canvasTex, tex, Res, wings, flapWings, skin, skinMaterials, skinGeometries, gear, clock };
})();
