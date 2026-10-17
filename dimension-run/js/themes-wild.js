/* Levels 6-8: Candy Kingdom, Neon Overdrive and the Monster Lair (with the Monster King boss).
   Extends the tables in themes.js: themes, textures, props, creatures, smoke, obstacle skins. */
(function () {
  'use strict';
  const DR = window.DR;
  const D = DR.dress;
  const rnd = Math.random;
  const TAU = Math.PI * 2;
  const range = (a, b) => a + rnd() * (b - a);
  const pick = a => a[(rnd() * a.length) | 0];
  const CANDY = [0xff6ab0, 0x7ae8ff, 0xffd84a, 0xb77dff, 0x8aff8a, 0xff8a3a];

  // ------------------------------------------------------------------
  // themes
  // ------------------------------------------------------------------
  Object.assign(D.LEVEL_THEMES, {
    6: {
      name: 'Candy Kingdom', accent: 0xff6ab0, ambient: [0xffffff, 0x9aff3a],
      light: { skyTop: '#ff8ad0', skyHor: '#fff0fa', fog: '#ffd8ef', fogNear: 45, fogFar: 260, hemiSky: '#ffffff', hemiGround: '#ffb0d8', hemiI: 2.0, sun: '#fff4fa', sunI: 2.0, ground: '#ffc8e4', abyss: '#ff5aa8' },
      dark: { skyTop: '#0a0014', skyHor: '#4a0a5a', fog: '#1a0628', fogNear: 18, fogFar: 140, hemiSky: '#c86aff', hemiGround: '#14052c', hemiI: 1.3, sun: '#9aff3a', sunI: 1, ground: '#1a0a22', abyss: '#05000c' },
      sky: { sunDir: [0.3, 0.35, -1], sunCol: '#ffffff', sunSize: 1.5, moonCol: '#9aff3a' },
      floor: { tex: 'candy', light: 0xffffff, curb: 0xffffff, dark: 0x9aff3a, darkTint: 0xd0b0ff, darkCurb: 0xff4dd2 },
      mats: { log: 0xf4e0c0, logRing: 0x8a4a2a, archWood: 0xff4d4d, flower: 0xffffff, flower2: 0x7ae8ff, vine: 0xffffff, crystal: 0x9aff3a, crystal2: 0xff4dd2, rune: 0xffe066, wraithRing: 0x9aff3a, gem: 0xff8ae0, spike: 0x9aff3a, obelisk: 0x2a0a3a },
      scn: { deadTrunk: 0x2a0a3a, crystal: 0x9aff3a, rockDark: 0x2a0a3a, cap: [0x9aff3a, 0xff4dd2, 0xffe066] },
      skins: { tree: 'lollipop', rock: 'gumdrop', crate: 'cake' },
      hide: { 0: [0, 1, 2, 'far'], 1: [0, 'far'] },
      props: [
        { kind: 'lollipop', world: 0, n: 24, place: 'near' }, { kind: 'candycane', world: 0, n: 18, place: 'near' }, { kind: 'gumdropProp', world: 0, n: 20, place: 'near' },
        { kind: 'cupcake', world: 0, n: 12, place: 'far' }, { kind: 'donutSky', world: 0, place: 'sky' },
        { kind: 'candycane', variant: 'sour', world: 1, n: 20, place: 'near' }, { kind: 'cupcake', variant: 'sour', world: 1, n: 10, place: 'far' },
      ],
      creatures: [{ kind: 'balloon', world: 0, n: 12 }, { kind: 'butterfly', world: 0, n: 10 }, { kind: 'ghost', world: 1, n: 10 }, { kind: 'bat', world: 1, n: 6 }],
      smoke: 'cotton',
      weather: { color: 0xffffff, size: 0.16, vel: [0.3, -1.6, 0], sway: 1, count: 500, additive: false, opacity: 1, rainbow: true },
    },
    7: {
      name: 'Rainbow Skies', accent: 0x7ac8ff, ambient: [0xffffff, 0xffe8a0], noGround: true,
      light: { skyTop: '#3aa8ff', skyHor: '#eaf8ff', fog: '#e4f6ff', fogNear: 60, fogFar: 300, hemiSky: '#ffffff', hemiGround: '#ffd8f0', hemiI: 2.1, sun: '#fff8e0', sunI: 2.2, abyss: '#bfe8ff' },
      dark: { skyTop: '#0a0a3a', skyHor: '#5a3a9a', fog: '#2a1a5a', fogNear: 40, fogFar: 220, hemiSky: '#d8c8ff', hemiGround: '#2a1a5a', hemiI: 1.5, sun: '#ffe8a0', sunI: 1.1, abyss: '#1a1040' },
      sky: { sunDir: [0.35, 0.42, -1], sunCol: '#fffbe0', sunSize: 1.7, mirror: 1, moonCol: '#fff4c0', neb: 0.6, nebL: ['#ffb0e0', '#b0f0ff'], nebD: ['#b07aff', '#ff9ad8'] },
      floor: { tex: 'cloud', light: 0xffffff, curb: 0xffffff, dark: 0xffd84a, darkTint: 0xd8d0ff, darkCurb: 0xffd84a },
      mats: { log: 0xffb0d8, logRing: 0xffffff, archWood: 0x7ac8ff, flower: 0xffd84a, flower2: 0xff8ad0, vine: 0xffffff, crystal: 0xffd84a, crystal2: 0xb77dff, rune: 0xffffff, wraithRing: 0xffd84a, gem: 0xffe066, spike: 0xffd84a, obelisk: 0x3a2a6a },
      skins: { rock: 'cloudpuff', tree: 'balloonbunch', crate: 'giftbox' },
      hide: { 0: [0, 1, 2, 'far'], 1: [0, 1, 2, 'far'] },
      props: [
        { kind: 'cloudProp', world: 0, n: 34, place: 'near' }, { kind: 'rainbow', world: 0, n: 6, place: 'far' }, { kind: 'hotairballoon', world: 0, n: 12, place: 'far' },
        { kind: 'cloudProp', variant: 'night', world: 1, n: 30, place: 'near' }, { kind: 'starProp', world: 1, n: 16, place: 'far' }, { kind: 'moonSky', world: 1, place: 'sky' },
      ],
      creatures: [{ kind: 'balloon', world: 0, n: 10 }, { kind: 'parrot', world: 0, n: 6 }, { kind: 'butterfly', world: 0, n: 8 }, { kind: 'firefly', world: 1, n: 18 }, { kind: 'comet', world: 1, n: 3 }],
      smoke: 'cotton',
      weather: { color: 0xffffff, size: 0.22, vel: [0, 0.8, 0], sway: 1.2, count: 260, additive: false, opacity: 0.8, rainbow: true },
    },
    8: {
      name: 'Monster Lair', accent: 0xff2a2a, ambient: [0xff6a4a, 0x9aff3a], lightning: true, monsters: true,
      light: { skyTop: '#120003', skyHor: '#9a1a12', fog: '#3a0806', fogNear: 25, fogFar: 180, hemiSky: '#ff9a8a', hemiGround: '#2a0505', hemiI: 1.5, sun: '#ff6a4a', sunI: 1.8, ground: '#1a0806', abyss: '#ff2a00' },
      dark: { skyTop: '#000000', skyHor: '#24083a', fog: '#0a0012', fogNear: 18, fogFar: 140, hemiSky: '#9a6aff', hemiGround: '#06000a', hemiI: 1.2, sun: '#7aff3a', sunI: 0.9, ground: '#06000a', abyss: '#1a0030' },
      sky: { sunDir: [-0.35, 0.32, -1], sunCol: '#ff2a1a', sunSize: 4, moonCol: '#9aff3a', starsL: 0.2 },
      floor: { tex: 'basalt', glow: 'lavaGlow', glowColor: 0xff2a2a, light: 0x9a8a8a, curb: 0x2a1a1a, dark: 0x9a3aff, darkTint: 0xb0a0c0, darkCurb: 0x9a3aff },
      mats: { log: 0xe8dcc0, logRing: 0xc8b898, archWood: 0xe8dcc0, flower: 0xff2a2a, flower2: 0xffcf3a, vine: 0x3a0a0a, crate: 0x3a2a2a, crateBand: 0x8a8a8a, crystal: 0x9a3aff, crystal2: 0xff2a5a, rune: 0xff2a2a, wraithRing: 0xff2a2a, gem: 0xff4a6a, spike: 0xff2a2a, obelisk: 0x1a0a14 },
      skins: { rock: 'monsterRock', tree: 'bonespike', crate: 'cage' },
      hide: { 0: [0, 1, 2, 'far'], 1: [0, 1, 'far'] },
      props: [
        { kind: 'skullrock', world: 0, n: 16, place: 'near' }, { kind: 'bonespikeProp', world: 0, n: 18, place: 'near' }, { kind: 'torch', world: 0, n: 14, place: 'near' },
        { kind: 'spire', world: 0, n: 16, place: 'far' },
        { kind: 'eyestalk', world: 1, n: 22, place: 'near' }, { kind: 'torch', variant: 'green', world: 1, n: 10, place: 'near' }, { kind: 'spire', variant: 'purple', world: 1, n: 14, place: 'far' },
      ],
      creatures: [{ kind: 'imp', world: 0, n: 10 }, { kind: 'imp', variant: 'purple', world: 1, n: 10 }],
      smoke: 'lair',
      weather: { color: 0xff3a1a, size: 0.14, vel: [0.4, 2.4, 1], sway: 1, count: 450, additive: true, opacity: 1 },
    },
  });

  // ------------------------------------------------------------------
  // textures
  // ------------------------------------------------------------------
  const cT = D.canvasTex;
  Object.assign(D.MAKERS, {
    candyFloor: () => cT(256, 256, (g, S) => {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
        g.fillStyle = (r + k) % 2 ? '#ffd0e6' : '#fff6ee'; g.fillRect(k * 128, r * 64, 128, 64);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(k * 128 + 4, r * 64 + 4, 120, 6);
      }
      for (let i = 0; i < 140; i++) {   // sprinkles
        g.save(); g.translate(rnd() * S, rnd() * S); g.rotate(rnd() * 3);
        g.fillStyle = ['#ff3a8a', '#3ac8ff', '#ffd84a', '#8aff6a', '#b77dff'][i % 5]; g.fillRect(-5, -1.5, 10, 3);
        g.restore();
      }
      for (let y = 0; y < S; y += 32) {   // candy-cane lane borders
        g.fillStyle = (y / 32) % 2 ? '#ff2a4a' : '#ffffff'; g.fillRect(0, y, 7, 32); g.fillRect(S - 7, y, 7, 32);
      }
    }),
    gridFloor: () => cT(256, 256, (g, S) => {
      g.fillStyle = '#0c0418'; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(255,58,168,0.35)'; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, S); g.stroke(); }
    }),
    gridGlow: () => cT(256, 256, (g, S) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.strokeStyle = '#ffffff'; g.shadowColor = '#ffffff'; g.shadowBlur = 8; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, S); g.stroke(); }
    }),
    swirl: () => cT(128, 128, (g, S) => {
      const c = S / 2;
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
      for (let r = 2; r < c; r += 1.5) {
        for (let k = 0; k < 6; k++) {
          const a0 = k / 6 * TAU + r * 0.11;
          g.strokeStyle = k % 2 ? '#ffffff' : '#ff2a6a'; g.lineWidth = 2.5;
          g.beginPath(); g.arc(c, c, r, a0, a0 + TAU / 6); g.stroke();
        }
      }
    }, false),
    caneStripes: () => cT(64, 256, (g, W, H) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff2a3a';
      for (let y = -W; y < H + W; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + W * 0.6); g.lineTo(W, y + W * 0.6 + 16); g.lineTo(0, y + 16); g.fill(); }
    }),
    cloudFloor: () => cT(256, 256, (g, S) => {
      g.fillStyle = '#eef8ff'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 70; i++) {   // soft fluffy bumps
        const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 26;
        const grd = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(190,220,255,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      const bands = ['#ff5a5a', '#ffa83a', '#ffe23a', '#5ad85a', '#3aa8ff', '#9a6aff'];
      bands.forEach((c, k) => { g.fillStyle = c; g.fillRect(k * 1.5, 0, 1.5, S); g.fillRect(S - 9 + k * 1.5, 0, 1.5, S); });
    }),
    windows: () => cT(64, 128, (g, W, H) => {
      g.fillStyle = '#0a0614'; g.fillRect(0, 0, W, H);
      for (let y = 4; y < H; y += 8) for (let x = 4; x < W; x += 8) {
        if (rnd() < 0.45) { g.fillStyle = pick(['#ff3aa8', '#39f3ff', '#ffcf3a', '#b77dff', '#ffffff']); g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(x, y, 5, 4); g.globalAlpha = 1; }
      }
    }),
  });

  // ------------------------------------------------------------------
  // props
  // ------------------------------------------------------------------
  Object.assign(D.PROPS, {
    lollipop(R) {
      const g = new THREE.Group();
      g.add(R.mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), R.lam(0xffffff), 0, 1.5, 0));
      const disc = R.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 32).rotateX(Math.PI / 2), R.lam(pick(CANDY), { map: D.tex('swirl') }), 0, 3.4, 0);
      g.add(disc);
      const spin = range(-1, 1);
      g.userData.y = [-0.2, -0.2]; g.userData.s = [0.8, 1.7];
      g.userData.anim = (o, t, dt) => { disc.rotation.z += dt * spin; o.rotation.y = o.userData.face; };
      return g;
    },
    candycane(R, variant) {
      const g = new THREE.Group();
      const tx = D.tex('caneStripes').clone(); tx.needsUpdate = true; tx.repeat.set(1, 3);
      const mat = R.lam(variant === 'sour' ? 0x9aff3a : 0xffffff, { map: R(tx) });
      g.add(R.mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.2, 12), mat, 0, 1.6, 0));
      const hook = R.mesh(new THREE.TorusGeometry(0.45, 0.13, 10, 16, Math.PI), mat, 0.45, 3.2, 0);
      g.add(hook);
      g.userData.y = [-0.2, -0.2]; g.userData.s = [0.8, 1.5];
      return g;
    },
    gumdropProp(R) {
      const g = new THREE.Group();
      const m = R.mesh(new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2), R.std(pick(CANDY), { roughness: 0.25, metalness: 0, flatShading: false }));
      m.scale.set(1, 1.3, 1); g.add(m);
      for (let i = 0; i < 10; i++) {
        const a = rnd() * TAU, h = rnd() * 0.9;
        g.add(R.mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), R.glow(0xffffff), Math.cos(a) * Math.cos(h) * 0.98, Math.sin(h) * 1.25, Math.sin(a) * Math.cos(h) * 0.98));
      }
      g.userData.y = [-0.2, -0.2]; g.userData.s = [0.5, 1.2];
      return g;
    },
    cupcake(R, variant) {
      const g = new THREE.Group();
      const sour = variant === 'sour';
      g.add(R.mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.8, 16), R.lam(sour ? 0x2a0a3a : pick([0xff9ad5, 0x9ad8ff, 0xffe08a])), 0, 0.4, 0));
      const fro = R.lam(sour ? 0x9aff3a : pick([0xffffff, 0xffc8e8, 0xc8ffd8]));
      [[0.85, 0.95], [0.65, 1.3], [0.42, 1.6]].forEach(([r, y]) => { const s = R.mesh(new THREE.SphereGeometry(r, 16, 10), fro, 0, y, 0); s.scale.y = 0.6; g.add(s); });
      g.add(R.mesh(new THREE.SphereGeometry(0.18, 12, 10), R.glow(sour ? 0xb04dff : 0xff1a3a), 0, 1.92, 0));
      for (let i = 0; i < 14; i++) { const a = rnd() * TAU; g.add(R.mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), R.glow(pick(CANDY)), Math.cos(a) * 0.6, 1.15 + rnd() * 0.3, Math.sin(a) * 0.6)); }
      g.userData.y = [-0.3, -0.3]; g.userData.s = [8, 16];
      return g;
    },
    donutSky(R) {
      const g = new THREE.Group();
      const d = new THREE.Group(); d.rotation.x = 0.7; g.add(d);
      d.add(R.mesh(new THREE.TorusGeometry(1, 0.45, 16, 40), R.glow(0xd8a060)));
      const icing = R.mesh(new THREE.TorusGeometry(1, 0.47, 16, 40, TAU), R.glow(0xff7ac8), 0, 0, 0.08); icing.scale.z = 0.7; d.add(icing);
      for (let i = 0; i < 50; i++) { const a = rnd() * TAU, r = 1 + (rnd() - 0.5) * 0.6; d.add(R.mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), R.glow(pick(CANDY)), Math.cos(a) * r, Math.sin(a) * r, 0.42)); }
      g.userData.offset = [130, 85, -280]; g.userData.s = [26, 26];
      g.userData.anim = (o, t, dt) => { d.rotation.z += dt * 0.08; };
      return g;
    },
    neonpalm(R, variant) {
      const g = new THREE.Group();
      const glow = R.glow(variant === 'cyan' ? 0x39f3ff : pick([0xff3aa8, 0x39f3ff]));
      let x = 0;
      for (let i = 0; i < 6; i++) {
        x += 0.06;
        g.add(R.mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), R.lam(0x140a24), x, 0.3 + i * 0.55, 0));
        g.add(R.mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), glow, x, 0.58 + i * 0.55, 0));
      }
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Group(); f.position.set(x, 3.4, 0); f.rotation.y = i / 7 * TAU; g.add(f);
        const leaf = R.mesh(new THREE.BoxGeometry(0.1, 0.04, 1.6), glow, 0, -0.25, 0.75); leaf.rotation.x = 0.45; f.add(leaf);
      }
      g.userData.y = [-0.2, -0.2]; g.userData.s = [1, 1.8];
      return g;
    },
    neonpole(R, variant) {
      const g = new THREE.Group();
      const col = variant === 'cyan' ? 0x39f3ff : pick([0xff3aa8, 0xffcf3a]);
      g.add(R.mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), R.lam(0x1a1a2a), 0, 2.1, 0));
      g.add(R.mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), R.lam(0x1a1a2a), 0.45, 4.15, 0));
      g.add(R.mesh(new THREE.BoxGeometry(0.4, 0.12, 0.25), R.glow(col), 0.85, 4.08, 0));
      g.add(R.mesh(new THREE.ConeGeometry(0.9, 3.8, 16, 1, true), R.add(col, { opacity: 0.09, side: THREE.DoubleSide }), 0.85, 2.1, 0));
      g.userData.y = [-0.2, -0.2]; g.userData.s = [1, 1.3];
      g.userData.anim = (o) => { o.rotation.y = o.userData.face + Math.PI / 2; };
      return g;
    },
    skyscraper(R, variant) {
      const g = new THREE.Group();
      const h = range(2, 6.5);
      const tx = D.tex('windows').clone(); tx.needsUpdate = true; tx.repeat.set(1, Math.round(h));
      const b = R.mesh(new THREE.BoxGeometry(1, h, 1), R.glow(0xffffff, { map: R(tx) }), 0, h / 2, 0);
      g.add(b);
      const edge = R.glow(variant === 'cyan' ? 0x39f3ff : pick([0xff3aa8, 0xb77dff, 0x39f3ff]));
      for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) g.add(R.mesh(new THREE.BoxGeometry(0.04, h, 0.04), edge, x, h / 2, z));
      g.add(R.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), R.lam(0x333333), 0, h + 0.3, 0));
      const blink = R.mesh(new THREE.SphereGeometry(0.06, 6, 6), R.glow(0xff2a2a), 0, h + 0.62, 0); g.add(blink);
      const seed = rnd() * 10;
      g.userData.y = [-0.3, -0.3]; g.userData.s = [5, 11];
      g.userData.anim = (o, t) => { blink.visible = Math.sin(t * 3 + seed) > 0.4; };
      return g;
    },
    wiremountain(R, variant) {
      const g = new THREE.Group();
      const geo = R(new THREE.ConeGeometry(1, 0.7, 7, 3));
      g.add(R.mesh(geo, R.glow(0x05000c), 0, 0.35, 0));
      const lines = new THREE.LineSegments(R(new THREE.EdgesGeometry(geo)), R(new THREE.LineBasicMaterial({ color: variant === 'cyan' ? 0x39f3ff : 0xff3aa8 })));
      lines.position.y = 0.35; lines.scale.setScalar(1.005); g.add(lines);
      g.userData.y = [-0.3, -0.3]; g.userData.s = [22, 42];
      return g;
    },
    cloudProp(R, variant) {
      const g = new THREE.Group();
      const night = variant === 'night';
      const mat = R.lam(night ? 0xb8a8ff : 0xffffff, { emissive: night ? 0x2a1a5a : 0x3a4a5a, flatShading: false });
      const n = 4 + (rnd() * 4 | 0);
      for (let i = 0; i < n; i++) {
        const r = range(0.6, 1.2), b = R.mesh(new THREE.SphereGeometry(r, 14, 10), mat, (i - n / 2) * 0.75 + rnd() * 0.3, rnd() * 0.5, (rnd() - 0.5) * 0.8);
        b.scale.y = 0.75; g.add(b);
      }
      const seed = rnd() * 10;
      g.userData.y = [-4, 4]; g.userData.s = [0.9, 2.2];
      g.userData.anim = (o, t) => { o.position.y = o.userData.base.y + Math.sin(t * 0.5 + seed) * 0.3; };
      return g;
    },
    rainbow(R) {
      const g = new THREE.Group();
      [0xff4a4a, 0xff9a2a, 0xffe03a, 0x4ad84a, 0x3a9aff, 0x8a5aff].forEach((c, k) => {
        g.add(R.mesh(new THREE.TorusGeometry(1 - k * 0.06, 0.032, 6, 48, Math.PI), R.glow(c, { transparent: true, opacity: 0.85 })));
      });
      for (const sx of [-1, 1]) {   // a cloud at each foot of the rainbow
        for (let i = 0; i < 3; i++) g.add(R.mesh(new THREE.SphereGeometry(0.14, 10, 8), R.lam(0xffffff, { emissive: 0x4a5a6a }), sx * 0.85 + (i - 1) * 0.1, 0.02 + (i % 2) * 0.05, 0));
      }
      g.userData.y = [-6, 2]; g.userData.s = [30, 55];
      g.userData.anim = (o) => { o.rotation.y = o.userData.face + Math.PI / 2; };
      return g;
    },
    hotairballoon(R) {
      const g = new THREE.Group();
      const cols = [pick(CANDY), pick(CANDY)];
      for (let k = 0; k < 8; k++) {   // striped envelope
        const seg = R.mesh(new THREE.SphereGeometry(1, 10, 12, k / 8 * TAU, TAU / 8), R.lam(cols[k % 2], { flatShading: false, side: THREE.DoubleSide }));
        seg.scale.set(1, 1.2, 1); g.add(seg);
      }
      for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(R.mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 3), R.lam(0x8a6a4a), x, -1.45, z));
      g.add(R.mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), R.lam(0xb07a3a), 0, -2.05, 0));
      const seed = rnd() * 10;
      g.userData.y = [8, 28]; g.userData.s = [2, 4.5]; g.userData.x = [18, 70];
      g.userData.anim = (o, t, dt) => { o.position.y = o.userData.base.y + Math.sin(t * 0.4 + seed) * 1.2; o.rotation.y += dt * 0.1; };
      return g;
    },
    starProp(R) {
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? 0.42 : 1; i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const star = R.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }), R.glow(pick([0xffe066, 0xfff4b0, 0xffd0f0])));
      g.add(star);
      g.add(R.mesh(new THREE.SphereGeometry(1.5, 12, 10), R.add(0xffe8a0, { opacity: 0.15 })));
      const seed = rnd() * 10;
      g.userData.y = [6, 26]; g.userData.s = [1.5, 3.5]; g.userData.x = [16, 70];
      g.userData.anim = (o, t) => { star.rotation.y = Math.sin(t * 0.8 + seed) * 0.6; star.rotation.z = t * 0.2 + seed; };
      return g;
    },
    moonSky(R) {
      const g = new THREE.Group();
      g.add(R.mesh(new THREE.SphereGeometry(1, 24, 16), R.glow(0xfff4c0)));
      g.add(R.mesh(new THREE.SphereGeometry(0.95, 24, 16), R.glow(0x3a2a7a), 0.42, 0.18, 0.4));   // crescent: a dark disc in front
      g.add(R.mesh(new THREE.SphereGeometry(1.5, 20, 14), R.add(0xfff4c0, { opacity: 0.12 })));
      g.userData.offset = [-120, 85, -270]; g.userData.s = [22, 22];
      return g;
    },
    skullrock(R) {
      const g = new THREE.Group();
      const bone = R.lam(0xb8ac98);
      g.add(R.mesh(new THREE.BoxGeometry(1.4, 1.1, 1.2), bone, 0, 0.9, 0));
      g.add(R.mesh(new THREE.BoxGeometry(1.1, 0.35, 1.0), bone, 0, 0.25, 0.05));
      const eyes = [];
      for (const sx of [-1, 1]) {
        g.add(R.mesh(new THREE.BoxGeometry(0.34, 0.3, 0.05), R.glow(0x0a0000), sx * 0.32, 1.0, 0.6));
        const e = R.mesh(new THREE.SphereGeometry(0.07, 8, 8), R.glow(0xff2a1a), sx * 0.32, 1.0, 0.62); g.add(e); eyes.push(e);
      }
      g.add(R.mesh(new THREE.BoxGeometry(0.16, 0.2, 0.05), R.glow(0x0a0000), 0, 0.65, 0.6));
      for (let i = 0; i < 5; i++) g.add(R.mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), R.lam(0xf4ecd8), -0.36 + i * 0.18, 0.42, 0.56));
      const seed = rnd() * 10;
      g.userData.y = [-0.2, -0.2]; g.userData.s = [0.8, 1.7];
      g.userData.anim = (o, t) => { o.rotation.y = o.userData.face; const on = Math.sin(t * 2 + seed) > -0.6; eyes.forEach(e => { e.visible = on; }); };
      return g;
    },
    bonespikeProp(R) {
      const g = new THREE.Group();
      const bone = R.lam(0xe8dcc0);
      for (let i = 0; i < 3; i++) {
        const t = R.mesh(new THREE.ConeGeometry(0.16, 2.2, 6), bone, (i - 1) * 0.4, 1.0, (rnd() - 0.5) * 0.4);
        t.rotation.z = (i - 1) * 0.35; t.rotation.x = (rnd() - 0.5) * 0.3; g.add(t);
      }
      g.userData.y = [-0.2, -0.2]; g.userData.s = [0.8, 1.6];
      return g;
    },
    torch(R, variant) {
      const g = new THREE.Group();
      const c1 = variant === 'green' ? 0x7aff3a : 0xff6a1a, c2 = variant === 'green' ? 0xd8ff8a : 0xffd84a;
      g.add(R.mesh(new THREE.CylinderGeometry(0.1, 0.16, 2, 6), R.lam(0x2a1a1a), 0, 1, 0));
      g.add(R.mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.35, 10), R.lam(0x3a2a2a), 0, 2.15, 0));
      const flames = [];
      for (let i = 0; i < 3; i++) { const f = R.mesh(new THREE.ConeGeometry(0.28 - i * 0.07, 0.9 - i * 0.15, 8), R.add(i ? c2 : c1, { opacity: 0.85 }), (rnd() - 0.5) * 0.15, 2.7, (rnd() - 0.5) * 0.15); g.add(f); flames.push(f); }
      const seed = rnd() * 10;
      g.userData.y = [-0.2, -0.2]; g.userData.s = [1, 1.3];
      g.userData.anim = (o, t) => { flames.forEach((f, i) => { f.scale.set(1, 0.8 + Math.sin(t * (12 + i * 3) + seed) * 0.25, 1); }); };
      return g;
    },
    spire(R, variant) {
      const g = new THREE.Group();
      const dark = R.lam(0x140808), glow = R.glow(variant === 'purple' ? 0x9a3aff : 0xff2a1a);
      for (let i = 0; i < 3; i++) {
        const c = R.mesh(new THREE.ConeGeometry(0.5 - i * 0.12, 2.2 - i * 0.4, 5), dark, (rnd() - 0.5) * 0.4, 1.1 + i * 0.9, (rnd() - 0.5) * 0.4);
        c.rotation.z = (rnd() - 0.5) * 0.3; g.add(c);
      }
      for (let i = 0; i < 4; i++) { const l = R.mesh(new THREE.BoxGeometry(0.03, 0.7, 0.03), glow, (rnd() - 0.5) * 0.5, 0.6 + rnd() * 2, 0.45); l.rotation.z = (rnd() - 0.5) * 0.8; g.add(l); }
      g.userData.y = [-0.3, -0.3]; g.userData.s = [9, 22];
      return g;
    },
    eyestalk(R) {
      const g = new THREE.Group();
      const stalk = R.lam(0x4a1a5a);
      for (let i = 0; i < 4; i++) g.add(R.mesh(new THREE.CylinderGeometry(0.12 - i * 0.015, 0.15 - i * 0.015, 0.6, 8), stalk, Math.sin(i) * 0.1, 0.3 + i * 0.58, 0));
      const eye = new THREE.Group(); eye.position.y = 2.6; g.add(eye);
      eye.add(R.mesh(new THREE.SphereGeometry(0.42, 16, 12), R.glow(0xfff4e0)));
      eye.add(R.mesh(new THREE.SphereGeometry(0.2, 12, 10), R.glow(0x7aff3a), 0, 0, 0.3));
      eye.add(R.mesh(new THREE.SphereGeometry(0.1, 10, 8), R.glow(0x000000), 0, 0, 0.42));
      const seed = rnd() * 10;
      g.userData.y = [-0.2, -0.2]; g.userData.s = [0.8, 1.5];
      g.userData.anim = (o, t) => {
        o.rotation.y = o.userData.face + Math.sin(t * 0.7 + seed) * 0.4;
        eye.scale.y = Math.sin(t * 1.3 + seed) > 0.97 ? 0.1 : 1;   // blinks
        eye.rotation.x = Math.sin(t * 0.9 + seed) * 0.3;
      };
      return g;
    },
  });

  // ------------------------------------------------------------------
  // creatures
  // ------------------------------------------------------------------
  Object.assign(D.CREATURES, {
    balloon(R) {
      const g = new THREE.Group();
      const col = pick(CANDY);
      const b = R.mesh(new THREE.SphereGeometry(0.5, 16, 12), R.std(col, { roughness: 0.2, metalness: 0.1, flatShading: false })); b.scale.y = 1.2; g.add(b);
      g.add(R.mesh(new THREE.ConeGeometry(0.08, 0.12, 6), R.lam(col), 0, -0.64, 0));
      g.add(R.mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6, 3), R.lam(0xffffff), 0, -1.45, 0));
      const seed = rnd() * 10;
      return { g, motion: 'drift', y: [3, 12], speed: [0.5, 1.4], flap: t => { g.rotation.z = Math.sin(t * 0.8 + seed) * 0.15; } };
    },
    ghost(R) {
      const g = new THREE.Group();
      const m = R.lam(0xf4f0ff, { emissive: 0x3a2a5a });
      g.add(R.mesh(new THREE.SphereGeometry(0.45, 14, 10), m, 0, 0.2, 0));
      g.add(R.mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.5, 14), m, 0, -0.1, 0));
      const tails = [];
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, c = R.mesh(new THREE.ConeGeometry(0.12, 0.3, 6), m, Math.cos(a) * 0.38, -0.45, Math.sin(a) * 0.38); c.rotation.x = Math.PI; g.add(c); tails.push(c); }
      for (const sx of [-1, 1]) g.add(R.mesh(new THREE.SphereGeometry(0.08, 8, 8), R.glow(0x1a0a2a), sx * 0.15, 0.3, -0.4));
      g.add(R.mesh(new THREE.SphereGeometry(0.07, 8, 8), R.glow(0x1a0a2a), 0, 0.12, -0.42));
      return { g, motion: 'drift', y: [1.5, 6], speed: [1, 2.5], flap: t => { tails.forEach((c, i) => { c.position.y = -0.45 + Math.sin(t * 6 + i) * 0.05; }); } };
    },
    car(R, variant) {
      const g = new THREE.Group();
      const col = variant === 'cyan' ? 0x39f3ff : pick([0xff3aa8, 0xffcf3a, 0xb77dff]);
      g.add(R.mesh(new THREE.BoxGeometry(0.9, 0.35, 2), R.lam(0x14101e), 0, 0, 0));
      g.add(R.mesh(new THREE.BoxGeometry(0.75, 0.3, 0.9), R.add(0x7ad8ff, { opacity: 0.5 }), 0, 0.3, 0.1));
      g.add(R.mesh(new THREE.BoxGeometry(0.95, 0.05, 2.05), R.glow(col), 0, -0.12, 0));
      g.add(R.mesh(new THREE.PlaneGeometry(1.4, 2.4).rotateX(-Math.PI / 2), R.add(col, { opacity: 0.35, side: THREE.DoubleSide }), 0, -0.4, 0));
      for (const sx of [-1, 1]) { g.add(R.mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), R.glow(0xff2a2a), sx * 0.3, 0.02, 1.01)); g.add(R.mesh(new THREE.BoxGeometry(0.18, 0.08, 0.04), R.glow(0xffffff), sx * 0.3, 0.02, -1.01)); }
      g.scale.setScalar(1.3);
      return { g, motion: 'cross', speed: [14, 22], y: [6, 16], wobble: 0.3, flap: () => {} };
    },
    imp(R, variant) {
      const g = new THREE.Group();
      const body = R.lam(variant === 'purple' ? 0x5a1a8a : 0xa01a1a);
      g.add(R.mesh(new THREE.SphereGeometry(0.32, 12, 10), body));
      for (const sx of [-1, 1]) {
        const h = R.mesh(new THREE.ConeGeometry(0.06, 0.25, 6), R.lam(0xe8dcc0), sx * 0.15, 0.32, 0); h.rotation.z = -sx * 0.4; g.add(h);
        g.add(R.mesh(new THREE.SphereGeometry(0.06, 8, 8), R.glow(variant === 'purple' ? 0x7aff3a : 0xffd84a), sx * 0.11, 0.06, -0.28));
      }
      const tail = R.mesh(new THREE.ConeGeometry(0.04, 0.5, 5), body, 0, -0.1, 0.4); tail.rotation.x = -1.2; g.add(tail);
      const ws = D.wings(R, g, R.lam(0x1a0a0a, { side: THREE.DoubleSide }), 0.7, 0.4, 0.05);
      g.scale.setScalar(1.5);
      return { g, motion: 'cross', speed: [8, 13], y: [3, 10], wobble: 1.2, flap: t => D.flapWings(ws, Math.sin(t * 22) * 1.0) };
    },
  });

  Object.assign(D.SMOKE, {
    cotton: { rate: 5, colors: [[0xffb0e0, 0xb0e8ff, 0xfff0a0], [0x9aff3a, 0xb04dff]], size: [5, 10], life: 5, opacity: 0.35, at: 'sides', y: [0.5, 3], rise: 0.2 },
    neonfog: { rate: 6, colors: [[0xff3aa8, 0x9a3aff], [0x39f3ff, 0x3a6aff]], size: [6, 12], life: 4, opacity: 0.16, at: 'sides', y: [0, 0.6], rise: 0.05, additive: true },
    lair: { rate: 7, colors: [0x5a0a0a, 0x2a0a3a], size: [5, 11], life: 4.5, opacity: 0.4, at: 'sides', y: [0, 1], rise: 0.4 },
  });

  // ------------------------------------------------------------------
  // obstacle skins for the Light World blocks (front faces +z, towards the runner)
  // ------------------------------------------------------------------
  D.extraSkinMaterials = (T, lam) => ({
    swirl: T(new THREE.MeshLambertMaterial({ map: D.tex('swirl'), color: 0xffd0e0 })), stick: lam(0xffffff),
    gum0: lam(0xff6ab0), gum1: lam(0x7ae8ff), gum2: lam(0xffd84a), gum3: lam(0x8aff8a), sugar: lam(0xffffff),
    sponge: lam(0xf0c890), icing: lam(0xff8ac8), cherry: T(new THREE.MeshBasicMaterial({ color: 0xd81b3a })),
    neonDark: lam(0x140a24), neonEdge: T(new THREE.LineBasicMaterial({ color: 0xff3aa8 })), neonPink: T(new THREE.MeshBasicMaterial({ color: 0xff3aa8 })), neonCyan: T(new THREE.MeshBasicMaterial({ color: 0x39f3ff })),
    monster: lam(0x4a1a2a), eye: T(new THREE.MeshBasicMaterial({ color: 0xfff4e0 })), pupil: T(new THREE.MeshBasicMaterial({ color: 0x111111 })),
    tooth: lam(0xf4ecd8), bone: lam(0xe8dcc0), cage: lam(0x3a3a44), glowRed: T(new THREE.MeshBasicMaterial({ color: 0xff2a2a })),
    cloud: T(new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a4a5a })), ribbon: lam(0xffd84a), wrap0: lam(0xff6ab0), wrap1: lam(0x5ab8ff), wrap2: lam(0x8ad85a), wrap3: lam(0xb77dff),
  });
  D.extraSkinGeometries = () => {
    const box = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    return {
      stick: new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8), swirlDisc: new THREE.CylinderGeometry(0.85, 0.85, 0.22, 32).rotateX(Math.PI / 2),
      gumdrop: new THREE.SphereGeometry(0.85, 16, 10, 0, TAU, 0, Math.PI / 2), sugar: new THREE.BoxGeometry(0.09, 0.09, 0.09),
      sponge: new THREE.CylinderGeometry(0.78, 0.78, 0.55, 20), icing: new THREE.CylinderGeometry(0.82, 0.82, 0.14, 20),
      sponge2: new THREE.CylinderGeometry(0.55, 0.55, 0.45, 20), icing2: new THREE.CylinderGeometry(0.58, 0.58, 0.12, 20), cherry: new THREE.SphereGeometry(0.15, 12, 10),
      cube: box, cubeEdges: new THREE.EdgesGeometry(new THREE.BoxGeometry(1.44, 1.44, 1.44)),
      palmSeg: new THREE.BoxGeometry(0.24, 0.5, 0.24), palmRing: new THREE.BoxGeometry(0.3, 0.05, 0.3), frond: new THREE.BoxGeometry(0.12, 0.05, 1.3),
      monRock: new THREE.DodecahedronGeometry(1, 0), eyeBall: new THREE.SphereGeometry(0.32, 16, 12), pupil: new THREE.SphereGeometry(0.13, 10, 8),
      toothCone: new THREE.ConeGeometry(0.08, 0.22, 4), tusk: new THREE.ConeGeometry(0.13, 1.3, 6), skullBox: new THREE.BoxGeometry(0.7, 0.55, 0.6),
      eyeHole: new THREE.BoxGeometry(0.15, 0.13, 0.02), cageBar: new THREE.CylinderGeometry(0.035, 0.035, 2.1, 6),
      cageRing: new THREE.TorusGeometry(0.72, 0.05, 6, 20).rotateX(Math.PI / 2), redEye: new THREE.SphereGeometry(0.08, 8, 8),
      cloudBall: new THREE.SphereGeometry(0.6, 14, 10), balloonBall: new THREE.SphereGeometry(0.38, 14, 10), string: new THREE.CylinderGeometry(0.012, 0.012, 1.5, 3),
      weight: new THREE.BoxGeometry(0.3, 0.25, 0.3), present: new THREE.BoxGeometry(1.3, 0.9, 1.0), present2: new THREE.BoxGeometry(0.9, 0.7, 0.8),
      ribbonA: new THREE.BoxGeometry(0.16, 0.94, 1.04), ribbonB: new THREE.BoxGeometry(1.34, 0.94, 0.16), bowLoop: new THREE.TorusGeometry(0.16, 0.05, 6, 12),
    };
  };
  Object.assign(D.SKINS, {
    lollipop(g, S, G, add) {
      add(G.stick, S.stick, 0, 1.15, 0);
      const d = add(G.swirlDisc, S.swirl, 0, 2.4, 0);
      const dir = rnd() < 0.5 ? -1 : 1;
      return t => { d.rotation.z = t * 1.2 * dir; };
    },
    gumdrop(g, S, G, add) {
      const m = add(G.gumdrop, S['gum' + ((rnd() * 4) | 0)], 0, 0, 0); m.scale.set(1, 2.2, 1);
      for (let i = 0; i < 12; i++) { const a = rnd() * TAU, h = rnd() * 1.1; add(G.sugar, S.sugar, Math.cos(a) * Math.cos(h) * 0.82, Math.sin(h) * 1.8, Math.sin(a) * Math.cos(h) * 0.82); }
      return null;
    },
    cake(g, S, G, add) {
      add(G.sponge, S.sponge, 0, 0.28, 0); add(G.icing, S.icing, 0, 0.6, 0);
      add(G.sponge2, S.sponge, 0, 0.9, 0); add(G.icing2, S.icing, 0, 1.17, 0);
      add(G.cherry, S.cherry, 0, 1.36, 0);
      return null;
    },
    neoncube(g, S, G, add) {
      const c = new THREE.Group(); c.position.y = 0.8; g.add(c);
      c.add(new THREE.Mesh(G.cube, S.neonDark));
      c.add(new THREE.LineSegments(G.cubeEdges, S.neonEdge));
      const seed = rnd() * 10;
      return t => { c.rotation.y = t * 0.8 + seed; c.position.y = 0.85 + Math.sin(t * 2 + seed) * 0.08; };
    },
    neonpalm(g, S, G, add) {
      for (let i = 0; i < 5; i++) { add(G.palmSeg, S.neonDark, i * 0.04, 0.25 + i * 0.5, 0); add(G.palmRing, S.neonPink, i * 0.04, 0.5 + i * 0.5, 0); }
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Group(); f.position.set(0.2, 2.6, 0); f.rotation.y = i / 6 * TAU; g.add(f);
        const leaf = new THREE.Mesh(G.frond, S.neonCyan); leaf.position.set(0, -0.2, 0.6); leaf.rotation.x = 0.45; f.add(leaf);
      }
      return null;
    },
    monsterRock(g, S, G, add) {
      const b = add(G.monRock, S.monster, 0, 1.05, 0); b.scale.set(0.95, 1.1, 0.85);
      const eye = new THREE.Group(); eye.position.set(0, 1.4, 0.68); g.add(eye);
      eye.add(new THREE.Mesh(G.eyeBall, S.eye));
      const p = new THREE.Mesh(G.pupil, S.pupil); p.position.z = 0.24; eye.add(p);
      for (let i = 0; i < 5; i++) { const tth = add(G.toothCone, S.tooth, -0.32 + i * 0.16, 0.72, 0.72); tth.rotation.x = Math.PI; }
      for (const sx of [-1, 1]) { const h = add(G.tusk, S.bone, sx * 0.5, 2.0, 0); h.scale.setScalar(0.6); h.rotation.z = -sx * 0.5; }
      const seed = rnd() * 10;
      return t => { eye.scale.y = Math.sin(t * 1.1 + seed) > 0.96 ? 0.15 : 1; p.position.x = Math.sin(t * 1.7 + seed) * 0.08; };
    },
    bonespike(g, S, G, add) {
      for (let i = 0; i < 3; i++) { const t = add(G.tusk, S.bone, (i - 1) * 0.35, 1.2, 0); t.scale.set(1.2, 1.8, 1.2); t.rotation.z = (i - 1) * 0.3; }
      add(G.skullBox, S.bone, 0, 0.32, 0.1);
      for (const sx of [-1, 1]) add(G.eyeHole, S.pupil, sx * 0.15, 0.38, 0.41);
      return null;
    },
    cloudpuff(g, S, G, add) {
      for (const [x, y, z, k] of [[0, 0.6, 0, 1.3], [-0.55, 0.5, 0.1, 1], [0.55, 0.5, -0.05, 1.05], [0, 1.35, 0.05, 1.05], [-0.3, 1.1, 0.25, 0.8], [0.35, 1.2, 0.2, 0.85]]) {
        const b = add(G.cloudBall, S.cloud, x, y, z); b.scale.setScalar(k);
      }
      return null;
    },
    balloonbunch(g, S, G, add) {
      add(G.weight, S.ribbon, 0, 0.12, 0);
      const balloons = [];
      [[0, 2.6, 0], [-0.45, 2.3, 0.1], [0.45, 2.35, -0.1], [-0.2, 2.95, -0.15], [0.25, 2.9, 0.15]].forEach(([x, y, z], i) => {
        const s = add(G.string, S.stick, x / 2, y / 2 + 0.25, z / 2); s.rotation.z = -x * 0.35;
        const b = add(G.balloonBall, S['wrap' + (i % 4)], x, y, z); b.scale.y = 1.2; balloons.push(b);
      });
      const seed = rnd() * 10;
      return t => { balloons.forEach((b, i) => { b.position.y += Math.sin(t * 2 + seed + i) * 0.002; }); };
    },
    giftbox(g, S, G, add) {
      const w = 'wrap' + ((rnd() * 4) | 0), w2 = 'wrap' + ((rnd() * 4) | 0);
      add(G.present, S[w], 0, 0.45, 0); add(G.ribbonA, S.ribbon, 0, 0.45, 0); add(G.ribbonB, S.ribbon, 0, 0.45, 0);
      add(G.present2, S[w2], 0.05, 1.25, 0); add(G.ribbonA, S.ribbon, 0.05, 1.25, 0).scale.set(1, 0.75, 0.8);
      for (const sx of [-1, 1]) { const l = add(G.bowLoop, S.ribbon, 0.05 + sx * 0.16, 1.7, 0); l.rotation.y = Math.PI / 2; }
      return null;
    },
    cage(g, S, G, add) {
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; add(G.cageBar, S.cage, Math.cos(a) * 0.7, 1.05, Math.sin(a) * 0.7); }
      add(G.cageRing, S.cage, 0, 0.05, 0); add(G.cageRing, S.cage, 0, 2.1, 0);
      const eyes = [add(G.redEye, S.glowRed, -0.12, 1.2, 0.2), add(G.redEye, S.glowRed, 0.12, 1.2, 0.2)];
      const seed = rnd() * 10;
      return t => { const on = Math.sin(t * 1.5 + seed) > -0.85; eyes.forEach(e => { e.visible = on; }); };
    },
  });

  // ------------------------------------------------------------------
  // little monsters (replace the wraiths in the Monster Lair). M: ghostable materials from world.js
  // ------------------------------------------------------------------
  let MG = null;
  D.minion = (M) => {
    MG = MG || {
      body: new THREE.SphereGeometry(0.75, 16, 12), eye: new THREE.SphereGeometry(0.3, 14, 10), pupil: new THREE.SphereGeometry(0.13, 10, 8),
      horn: new THREE.ConeGeometry(0.12, 0.5, 6), tooth: new THREE.ConeGeometry(0.07, 0.18, 4), arm: new THREE.ConeGeometry(0.12, 0.7, 5), foot: new THREE.SphereGeometry(0.22, 10, 8),
    };
    const body = new THREE.Group();
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
    const b = add(MG.body, M.monBody, 0, 1.15, 0); b.scale.set(1, 1.15, 0.95);
    add(MG.eye, M.monEye, 0, 1.4, 0.58);
    add(MG.pupil, M.monPupil, 0, 1.4, 0.84);
    for (const sx of [-1, 1]) {
      const h = add(MG.horn, M.monHorn, sx * 0.4, 1.95, 0); h.rotation.z = -sx * 0.45;
      const a = add(MG.arm, M.monBody, sx * 0.85, 1.1, 0.1); a.rotation.z = sx * 2.0;
      add(MG.foot, M.monBody, sx * 0.35, 0.25, 0.1);
    }
    for (let i = 0; i < 6; i++) { const t = add(MG.tooth, M.monTooth, -0.3 + i * 0.12, 0.88, 0.66); t.rotation.x = Math.PI; }
    return body;
  };

  // ------------------------------------------------------------------
  // the Monster King: a giant one-eyed horned beast with a crown and tentacles. Faces +z.
  // ------------------------------------------------------------------
  D.boss = (R) => {
    const g = new THREE.Group();
    const skin = R.std(0x4a0a2a, { emissive: 0x200008, roughness: 0.6, metalness: 0.1, flatShading: true });
    const body = R.mesh(new THREE.IcosahedronGeometry(1, 1), skin); body.scale.set(1.35, 1.15, 1.05); g.add(body);
    const belly = R.mesh(new THREE.SphereGeometry(0.8, 16, 12), R.lam(0x7a2a4a), 0, -0.25, 0.45); belly.scale.set(1, 0.8, 0.5); g.add(belly);
    // the eye looks at you
    const eye = new THREE.Group(); eye.position.set(0, 0.35, 0.82); g.add(eye);
    eye.add(R.mesh(new THREE.SphereGeometry(0.46, 20, 16), R.glow(0xfff4e0)));
    const iris = R.mesh(new THREE.SphereGeometry(0.24, 16, 12), R.glow(0xff2a1a), 0, 0, 0.3); eye.add(iris);
    eye.add(R.mesh(new THREE.SphereGeometry(0.11, 12, 10), R.glow(0x000000), 0, 0, 0.47));
    const lid = R.mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, TAU, 0, Math.PI / 2), skin); lid.rotation.x = -1.3; lid.scale.setScalar(1.02); eye.add(lid);
    // horns and a crown
    for (const sx of [-1, 1]) {
      const h = R.mesh(new THREE.ConeGeometry(0.2, 1.2, 8), R.lam(0xe8dcc0), sx * 0.85, 1.05, 0); h.rotation.z = -sx * 0.6; g.add(h);
    }
    const gold = R.std(0xffcf3a, { metalness: 0.9, roughness: 0.25, emissive: 0x5a3a00 });
    g.add(R.mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.2, 10, 1, true), gold, 0, 1.15, 0));
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.add(R.mesh(new THREE.ConeGeometry(0.09, 0.35, 4), gold, Math.cos(a) * 0.55, 1.4, Math.sin(a) * 0.55)); }
    g.add(R.mesh(new THREE.OctahedronGeometry(0.12), R.glow(0x7aff3a), 0, 1.2, 0.6));
    // mouth: upper teeth, a jaw that opens, and fire inside
    for (let i = 0; i < 7; i++) { const t = R.mesh(new THREE.ConeGeometry(0.07, 0.25, 4), R.lam(0xffffff), -0.42 + i * 0.14, -0.38, 0.86); t.rotation.x = Math.PI; g.add(t); }
    const jaw = new THREE.Group(); jaw.position.set(0, -0.45, 0.4); g.add(jaw);
    jaw.add(R.mesh(new THREE.BoxGeometry(1.1, 0.22, 0.6), skin, 0, -0.08, 0.25));
    for (let i = 0; i < 6; i++) jaw.add(R.mesh(new THREE.ConeGeometry(0.06, 0.2, 4), R.lam(0xffffff), -0.35 + i * 0.14, 0.1, 0.5));
    const mouth = R.mesh(new THREE.SphereGeometry(0.35, 12, 10), R.add(0xff4a1a, { opacity: 0.9 }), 0, -0.5, 0.65); g.add(mouth);
    // tentacles
    const tentacles = [];
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU, chain = new THREE.Group();
      chain.position.set(Math.cos(a) * 0.7, -0.8, Math.sin(a) * 0.5); g.add(chain);
      let parent = chain;
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Group(); seg.position.y = i ? -0.28 : 0; parent.add(seg);
        seg.add(R.mesh(new THREE.SphereGeometry(0.17 - i * 0.022, 8, 6), skin));
        parent = seg;
      }
      tentacles.push(chain);
    }
    const aura = R.mesh(new THREE.SphereGeometry(1.9, 20, 14), R.add(0xff1a3a, { opacity: 0.12 }));
    g.add(aura);
    g.scale.setScalar(4.2);
    return { g, skin, eye, iris, lid, jaw, mouth, tentacles, aura };
  };
})();
