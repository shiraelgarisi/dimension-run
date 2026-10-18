/* Level 0, the Infinite World: a look of its own, unlike every other level. A pearly,
   iridescent dream sky with an aurora; ring gates you run through, floating crystal prisms,
   giant infinity knots, a glowing infinity sign in the sky and gliding manta rays.
   The Dark World turns it into a deep void with neon versions of the same. */
(function () {
  'use strict';
  const DR = window.DR;
  const D = DR.dress;
  const rnd = Math.random;
  const TAU = Math.PI * 2;
  const range = (a, b) => a + rnd() * (b - a);

  D.LEVEL_THEMES[0] = {
    name: 'Infinite World', accent: 0xb07aff, ambient: [0xffffff, 0x9affff], noGround: true,
    light: { skyTop: '#4a9cff', skyHor: '#ffe4fa', fog: '#efe2ff', fogNear: 90, fogFar: 380, hemiSky: '#ffffff', hemiGround: '#e8d8ff', hemiI: 2.0, sun: '#ffffff', sunI: 2.0, abyss: '#e8e0ff' },
    dark: { skyTop: '#01000a', skyHor: '#14083a', fog: '#0a0420', fogNear: 40, fogFar: 240, hemiSky: '#9affff', hemiGround: '#14083a', hemiI: 1.4, sun: '#c8a8ff', sunI: 1, abyss: '#000000' },
    sky: { sunDir: [0.2, 0.5, -1], sunCol: '#ffffff', sunSize: 1.2, mirror: 1, aurora: 1, starsL: 0.3, moonCol: '#9affff' },
    floor: { tex: 'holo', light: 0xffffff, curb: 0xffffff, dark: 0x9affff, darkTint: 0xc8c0ff, darkCurb: 0xb07aff },
    mats: { log: 0xc8b8ff, logRing: 0xffffff, archWood: 0xb8e8ff, flower: 0xff9ae8, flower2: 0x9affff, vine: 0xffffff, crystal: 0x9affff, crystal2: 0xff9ae8, rune: 0xffffff, wraithRing: 0x9affff, gem: 0xb07aff, spike: 0x9affff, obelisk: 0x1a1040 },
    skins: { rock: 'prism', tree: 'infinityPillar', crate: 'glassCube' },
    hide: { 0: [0, 1, 2, 'far'], 1: [0, 1, 2, 'far'] },
    props: [
      { kind: 'ringGate', world: 0, n: 6, place: 'path' }, { kind: 'prismFloat', world: 0, n: 30, place: 'near' },
      { kind: 'knot', world: 0, n: 8, place: 'far' }, { kind: 'infinitySky', world: 0, place: 'sky' },
      { kind: 'ringGate', variant: 'neon', world: 1, n: 6, place: 'path' }, { kind: 'prismFloat', variant: 'neon', world: 1, n: 30, place: 'near' },
      { kind: 'knot', variant: 'neon', world: 1, n: 8, place: 'far' }, { kind: 'infinitySky', variant: 'neon', world: 1, place: 'sky' },
    ],
    creatures: [{ kind: 'manta', world: 0, n: 6 }, { kind: 'manta', variant: 'neon', world: 1, n: 6 }, { kind: 'firefly', world: 1, n: 12 }],
    smoke: 'shimmer',
    weather: { color: 0xffffff, size: 0.1, vel: [0, -0.6, 0], sway: 0.8, count: 400, additive: true, opacity: 0.9 },
  };

  // iridescent tiles with a soft white grid and rainbow edges
  D.MAKERS.holoFloor = () => D.canvasTex(256, 256, (g, S) => {
    const grd = g.createLinearGradient(0, 0, S, S);
    ['#cfe8ff', '#f4d0ff', '#fff0d0', '#d0fff0', '#cfe8ff'].forEach((c, k, a) => grd.addColorStop(k / (a.length - 1), c));
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(S, i * 64); g.stroke(); }
    g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(rnd() * S, rnd() * S, 2, 2); }
    ['#ff8ad8', '#ffd08a', '#8affd0', '#8ad0ff', '#c08aff'].forEach((c, k) => { g.fillStyle = c; g.fillRect(k * 1.6, 0, 1.6, S); g.fillRect(S - 8 + k * 1.6, 0, 1.6, S); });
  });

  // a figure-eight (lemniscate) curve for the infinity sign
  class Lemniscate extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * TAU, d = 1 + Math.sin(a) ** 2;
      return target.set(Math.cos(a) / d * 1.6, Math.sin(a) * Math.cos(a) / d * 1.6, 0);
    }
  }
  const hue = (m, h, s = 0.75, l = 0.68) => { m.color.setHSL(((h % 1) + 1) % 1, s, l); if (m.emissive) m.emissive.setHSL(((h % 1) + 1) % 1, s, l * 0.5); };

  Object.assign(D.PROPS, {
    ringGate(R, variant) {
      const g = new THREE.Group();
      const neon = variant === 'neon';
      const ring = R.mesh(new THREE.TorusGeometry(7.6, 0.22, 10, 64), R.glow(0xffffff));
      const inner = R.mesh(new THREE.TorusGeometry(7.25, 0.05, 6, 64), R.add(0xffffff, { opacity: 0.6 }));
      g.add(ring, inner);
      const orbs = [];
      for (let i = 0; i < 8; i++) { const o = R.mesh(new THREE.SphereGeometry(0.28, 10, 8), R.glow(0xffffff)); g.add(o); orbs.push(o); }
      const seed = rnd();
      g.userData.y = [3, 3]; g.userData.s = [1, 1];
      g.userData.anim = (o, t) => {
        o.rotation.y = 0;
        hue(ring.material, seed + t * 0.05, neon ? 1 : 0.7, neon ? 0.55 : 0.75);
        hue(inner.material, seed + t * 0.05 + 0.5, 1, 0.6);
        orbs.forEach((b, i) => { const a = i / 8 * TAU + t * 0.6; b.position.set(Math.cos(a) * 7.6, Math.sin(a) * 7.6, 0); });
      };
      return g;
    },
    prismFloat(R, variant) {
      const g = new THREE.Group();
      const neon = variant === 'neon';
      const mat = R.std(0xffffff, { metalness: 0.3, roughness: 0.08, emissive: 0x4a2a8a, emissiveIntensity: neon ? 1.4 : 0.5 });
      const main = R.mesh(new THREE.OctahedronGeometry(1, 0), mat); main.scale.set(0.55, 1.4, 0.55); g.add(main);
      const minis = [];
      for (let i = 0; i < 3; i++) { const m = R.mesh(new THREE.OctahedronGeometry(0.22, 0), mat); g.add(m); minis.push(m); }
      const seed = rnd(), spin = range(0.3, 0.9);
      g.userData.y = [-3, 9]; g.userData.s = [0.6, 1.7];
      g.userData.anim = (o, t) => {
        main.rotation.y = t * spin;
        hue(mat, seed + t * 0.04, neon ? 1 : 0.6, neon ? 0.55 : 0.8);
        minis.forEach((m, i) => { const a = t * 1.2 + i * TAU / 3; m.position.set(Math.cos(a) * 1.3, Math.sin(t + i) * 0.4, Math.sin(a) * 1.3); });
        o.position.y = o.userData.base.y + Math.sin(t * 0.7 + seed * 10) * 0.5;
      };
      return g;
    },
    knot(R, variant) {
      const g = new THREE.Group();
      const neon = variant === 'neon';
      const mat = R.std(0xffffff, { metalness: 0.5, roughness: 0.15, emissive: 0x3a1a6a, emissiveIntensity: neon ? 1.6 : 0.6, flatShading: false });
      g.add(R.mesh(new THREE.TorusKnotGeometry(1, 0.28, 120, 14, 2, 3), mat));
      const seed = rnd();
      g.userData.y = [10, 34]; g.userData.s = [4, 9]; g.userData.x = [30, 90];
      g.userData.anim = (o, t, dt) => { o.rotation.x += dt * 0.15; o.rotation.y += dt * 0.2; hue(mat, seed + t * 0.03, neon ? 1 : 0.55, neon ? 0.5 : 0.75); };
      return g;
    },
    infinitySky(R, variant) {
      const g = new THREE.Group();
      const neon = variant === 'neon';
      const core = R.mesh(new THREE.TubeGeometry(new Lemniscate(), 200, 0.09, 10, true), R.glow(0xffffff));
      const halo = R.mesh(new THREE.TubeGeometry(new Lemniscate(), 200, 0.28, 10, true), R.add(0xffffff, { opacity: neon ? 0.45 : 0.3 }));
      g.add(core, halo);
      g.userData.offset = [0, 95, -280]; g.userData.s = [38, 38];
      g.userData.anim = (o, t) => { hue(halo.material, t * 0.05, 1, 0.6); core.material.color.setHSL((t * 0.05 + 0.5) % 1, neon ? 1 : 0.3, neon ? 0.7 : 0.95); };
      return g;
    },
  });

  D.CREATURES.manta = (R, variant) => {
    const g = new THREE.Group();
    const neon = variant === 'neon';
    const mat = R.glow(neon ? 0x39f3ff : 0xffffff, { transparent: true, opacity: neon ? 0.9 : 0.85, side: THREE.DoubleSide });
    g.add(R.mesh(new THREE.SphereGeometry(0.45, 12, 8), mat)).children[0].scale.set(0.8, 0.3, 1.4);
    const wing = sx => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, sx * 1.8, 0, 0.1, 0, 0, 0.6], 3));
      geo.computeVertexNormals();
      const p = new THREE.Group(); p.add(new THREE.Mesh(R(geo), mat)); g.add(p);
      return p;
    };
    const ws = [wing(-1), wing(1)];
    const tail = R.mesh(new THREE.CylinderGeometry(0.02, 0.005, 1.6, 4), mat, 0, 0, 1.3); tail.rotation.x = Math.PI / 2; g.add(tail);
    g.scale.setScalar(1.6);
    return { g, motion: 'drift', y: [4, 14], speed: [2, 4], flap: t => { const a = Math.sin(t * 2.2) * 0.45; ws[0].rotation.z = a; ws[1].rotation.z = -a; } };
  };

  D.SMOKE.shimmer = { rate: 3, colors: [[0xffb0f0, 0xb0f0ff, 0xfff0b0], [0x7a5aff, 0x3affd8]], size: [18, 36], life: 7, opacity: 0.14, at: 'far', additive: true, rise: 0 };

  // obstacle skins for the Light World blocks
  const prevMats = D.extraSkinMaterials, prevGeos = D.extraSkinGeometries;
  D.extraSkinMaterials = (T, lam) => {
    const glass = T(new THREE.MeshStandardMaterial({ color: 0xd8f4ff, metalness: 0.2, roughness: 0.05, opacity: 0.5 }));
    glass.userData.baseOpacity = 0.5;   // stays see-through when the world is active
    return Object.assign(prevMats ? prevMats(T, lam) : {}, {
      prism: T(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.08, emissive: 0x6a4aff, emissiveIntensity: 0.35, flatShading: true })),
      pearl: T(new THREE.MeshStandardMaterial({ color: 0xfff4ff, metalness: 0.3, roughness: 0.2 })),
      prismGlow: T(new THREE.MeshBasicMaterial({ color: 0xff8ae0 })), prismGlow2: T(new THREE.MeshBasicMaterial({ color: 0x8ae8ff })),
      glass,
    });
  };
  D.extraSkinGeometries = () => Object.assign(prevGeos ? prevGeos() : {}, {
    prismBody: new THREE.CylinderGeometry(0.6, 0.6, 2.3, 6), prismTip: new THREE.OctahedronGeometry(0.45, 0),
    pillar: new THREE.CylinderGeometry(0.32, 0.42, 2.7, 10), pillarRing: new THREE.TorusGeometry(0.75, 0.07, 8, 28).rotateX(Math.PI / 2),
    glassCube: new THREE.BoxGeometry(1.4, 1.4, 1.4), core: new THREE.OctahedronGeometry(0.38, 0),
  });
  Object.assign(D.SKINS, {
    prism(g, S, G, add) {
      const b = add(G.prismBody, S.prism, 0, 1.15, 0);
      const tip = add(G.prismTip, S.prismGlow, 0, 2.55, 0); tip.scale.y = 1.4;
      const seed = rnd() * 10;
      return t => { b.rotation.y = t * 0.5 + seed; tip.rotation.y = -t + seed; };
    },
    infinityPillar(g, S, G, add) {
      add(G.pillar, S.pearl, 0, 1.35, 0);
      const r1 = add(G.pillarRing, S.prismGlow2, 0, 1.6, 0), r2 = add(G.pillarRing, S.prismGlow, 0, 2.3, 0);
      const seed = rnd() * 10;
      return t => { r1.position.y = 1.4 + Math.sin(t * 2 + seed) * 0.4; r2.position.y = 2.2 + Math.sin(t * 2 + seed + 2) * 0.35; r1.rotation.z = Math.sin(t + seed) * 0.3; };
    },
    glassCube(g, S, G, add) {
      add(G.glassCube, S.glass, 0, 0.75, 0);
      const c = add(G.core, S.prismGlow, 0, 0.75, 0);
      const seed = rnd() * 10;
      return t => { c.rotation.y = t * 2 + seed; c.rotation.x = t + seed; c.scale.setScalar(1 + Math.sin(t * 4 + seed) * 0.15); };
    },
  });
})();
