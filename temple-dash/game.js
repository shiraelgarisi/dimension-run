/* Temple Dash — an endless temple runner. Pure client-side: HTML + CSS + JS + Three.js. */
(() => {
'use strict';

// ============================================================
// Constants & helpers
// ============================================================
const W = 6;              // path width
const LANE = 2;           // distance between lanes
const GRAVITY = 34;
const JUMP_V = 11.5;
const SLIDE_TIME = 0.75;
const VIEW_AHEAD = 260;   // how much path to keep generated ahead
const CHASE_FAR = 14;     // demons distance when you're doing fine
const CHASE_NEAR = 2.6;   // demons distance after a stumble

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([x, z]) => new THREE.Vector3(x, 0, z));
const yawOf = d => Math.atan2(-DIRS[d].x, -DIRS[d].z);

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const lerpAngle = (a, b, t) => {
  const d = (((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d * t;
};
const $ = id => document.getElementById(id);

const store = {
  get(k, def) { try { const v = localStorage.getItem('templeDash.' + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem('templeDash.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// ============================================================
// Renderer, scene, camera, lights
// ============================================================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const FOG = 0xe3a876;
scene.fog = new THREE.Fog(FOG, 35, 150);
scene.background = skyTexture();

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xfff0d8, 0x3a4a2a, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd6a0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // widen the view on portrait phones so lanes stay visible
  camera.fov = w < h ? 80 : 65;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ============================================================
// Procedural textures (no image files needed)
// ============================================================
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function stoneTexture(base, mortar, rows) {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = mortar;
  g.fillRect(0, 0, S, S);
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rand(20, 60) : 0;
    while (x < S) {
      const w = rand(50, 110);
      g.fillStyle = shade(base, rand(-22, 18));
      for (const off of [-S, 0, S]) g.fillRect(x + off + 3, r * rh + 3, w - 6, rh - 6);
      // subtle highlight on top edge of each stone
      g.fillStyle = 'rgba(255,240,210,0.08)';
      for (const off of [-S, 0, S]) g.fillRect(x + off + 3, r * rh + 3, w - 6, 4);
      x += w;
    }
  }
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)';
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  // moss
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(70,110,40,${rand(0.08, 0.25)})`;
    g.beginPath();
    g.arc(Math.random() * S, Math.random() * S, rand(3, 12), 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
function skyTexture() {
  const [c, g] = makeCanvas(4, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#41639a');
  grd.addColorStop(0.45, '#c99a86');
  grd.addColorStop(0.62, '#e8a874');
  grd.addColorStop(1, '#e3a876');
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

const TEX = {
  floor: stoneTexture('#a39478', '#4e4436', 4),
  wall: stoneTexture('#837866', '#352e25', 6),
};

const MAT = {
  floor: new THREE.MeshLambertMaterial({ map: TEX.floor }),
  slab: new THREE.MeshLambertMaterial({ color: 0x5c5040 }),
  wall: new THREE.MeshLambertMaterial({ map: TEX.wall }),
  trim: new THREE.MeshLambertMaterial({ color: 0x7a6a52 }),
  log: new THREE.MeshLambertMaterial({ color: 0x6b4423 }),
  logRing: new THREE.MeshLambertMaterial({ color: 0xc7a06a }),
  coin: new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0x8a5a00, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.35 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc23a, emissive: 0x6a4000, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.3 }),
  leaf1: new THREE.MeshLambertMaterial({ color: 0x2f6b2a, flatShading: true }),
  leaf2: new THREE.MeshLambertMaterial({ color: 0x3f8a35, flatShading: true }),
  leaf3: new THREE.MeshLambertMaterial({ color: 0x24521f, flatShading: true }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x4a3220, flatShading: true }),
  ground: new THREE.MeshLambertMaterial({ color: 0x2c4a25 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffa030 }),
  flameCore: new THREE.MeshBasicMaterial({ color: 0xfff0a0 }),
  demon: new THREE.MeshLambertMaterial({ color: 0x241a14, flatShading: true }),
  demonFur: new THREE.MeshLambertMaterial({ color: 0x5a3a24, flatShading: true }),
  eye: new THREE.MeshBasicMaterial({ color: 0xff3020 }),
  magnet: new THREE.MeshLambertMaterial({ color: 0xe0352a, emissive: 0x501010 }),
  magnetTip: new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffe27a }),
  vine: new THREE.MeshLambertMaterial({ color: 0x3d7a2e, flatShading: true }),
};

const GEO = {
  coin: new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20).rotateX(Math.PI / 2),
  log: new THREE.CylinderGeometry(0.42, 0.42, W + 1, 10).rotateZ(Math.PI / 2),
  logEnd: new THREE.CylinderGeometry(0.43, 0.43, 0.04, 10).rotateZ(Math.PI / 2),
  beam: scaleUV(new THREE.BoxGeometry(W + 1.8, 1.1, 0.9), 2, 0.4),
  post: scaleUV(new THREE.BoxGeometry(0.9, 10, 0.9), 0.4, 3),
  block: scaleUV(new THREE.BoxGeometry(1.8, 2.6, 1.6), 0.6, 0.8),
  blockTop: new THREE.BoxGeometry(2.0, 0.3, 1.8),
  pillar: scaleUV(new THREE.BoxGeometry(0.9, 9, 0.9), 0.4, 3),
  cap: new THREE.BoxGeometry(1.3, 0.35, 1.3),
  bowl: new THREE.CylinderGeometry(0.38, 0.2, 0.3, 8),
  flame: new THREE.ConeGeometry(0.24, 0.6, 6),
  flameCore: new THREE.ConeGeometry(0.12, 0.35, 6),
  trunk: new THREE.CylinderGeometry(0.35, 0.6, 16, 6),
  canopy: new THREE.IcosahedronGeometry(2.6, 0),
  magnet: new THREE.TorusGeometry(0.42, 0.14, 8, 16, Math.PI),
  magnetTip: new THREE.BoxGeometry(0.3, 0.22, 0.3),
  spark: new THREE.BoxGeometry(0.14, 0.14, 0.14),
  emblem: new THREE.TorusGeometry(1.1, 0.18, 8, 24),
  vine: new THREE.BoxGeometry(0.08, 1, 0.08),
};

// Big jungle floor far below the path
const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), MAT.ground);
ground.position.y = -14;
scene.add(ground);

// ============================================================
// Audio — synthesized with WebAudio, zero sound files
// ============================================================
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null, musicTimer = null, nextBeat = 0, step = 0;
  let muted = store.get('muted', false);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(freq, dur, type = 'square', vol = 0.1, to = null, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq = 1200, type = 'bandpass', at = null) {
    if (!ctx) return;
    const t = at ?? ctx.currentTime;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function drum(freq, to, dur, vol, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // tribal drum loop, scheduled slightly ahead for tight timing
  const KICK = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const TOM = [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1];
  function schedule() {
    const stepDur = 60 / 132 / 2;
    while (nextBeat < ctx.currentTime + 0.12) {
      const i = step % 16;
      if (KICK[i]) drum(110, 42, 0.28, 0.55, nextBeat);
      if (TOM[i]) drum(i % 2 ? 210 : 170, 120, 0.16, 0.22, nextBeat);
      noise(0.04, i % 2 ? 0.03 : 0.06, 7000, 'highpass', nextBeat);
      nextBeat += stepDur;
      step++;
    }
  }
  return {
    init,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      store.set('muted', muted);
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    musicStart() {
      if (!ctx || musicTimer) return;
      nextBeat = ctx.currentTime + 0.05; step = 0;
      musicTimer = setInterval(schedule, 40);
    },
    musicStop() { clearInterval(musicTimer); musicTimer = null; },
    coin() { tone(1320, 0.07, 'square', 0.05); tone(1980, 0.12, 'square', 0.05, null, 0.05); },
    jump() { tone(260, 0.18, 'triangle', 0.18, 620); },
    slide() { noise(0.3, 0.25, 900); },
    swish() { noise(0.12, 0.12, 2400); },
    turn() { tone(520, 0.05, 'sine', 0.12); tone(780, 0.08, 'sine', 0.1, null, 0.04); },
    stumble() { tone(140, 0.3, 'sawtooth', 0.18, 60); noise(0.2, 0.2, 300); },
    death() { tone(240, 0.8, 'sawtooth', 0.22, 35); noise(0.6, 0.3, 200, 'lowpass'); },
    power() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.07, null, i * 0.07)); },
    roar() { noise(0.7, 0.25, 180, 'lowpass'); tone(90, 0.6, 'sawtooth', 0.12, 55); },
  };
})();

// ============================================================
// Characters (built from boxes)
// ============================================================
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function makeRunner() {
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0b48a });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xcfae72 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x4f5d3a });
  const boots = new THREE.MeshLambertMaterial({ color: 0x3a2616 });
  const hat = new THREE.MeshLambertMaterial({ color: 0x6a4524 });
  const belt = new THREE.MeshLambertMaterial({ color: 0x2c1c10 });

  const root = new THREE.Group();     // sits at the feet
  const body = new THREE.Group();     // gets the lean / bob
  root.add(body);

  body.add(box(0.62, 0.72, 0.36, shirt, 0, 1.33, 0));
  body.add(box(0.64, 0.1, 0.38, belt, 0, 0.98, 0));
  const head = new THREE.Group();
  head.position.y = 1.86;
  head.add(box(0.38, 0.4, 0.38, skin));
  head.add(box(0.06, 0.06, 0.02, belt, -0.09, 0.03, -0.2));
  head.add(box(0.06, 0.06, 0.02, belt, 0.09, 0.03, -0.2));
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16), hat);
  brim.position.y = 0.22; brim.castShadow = true;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.24, 16), hat);
  crown.position.y = 0.36; crown.castShadow = true;
  head.add(brim, crown);
  body.add(head);

  // backpack with the stolen idol peeking out
  body.add(box(0.44, 0.5, 0.2, boots, 0, 1.36, 0.27));
  const idol = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), MAT.gold);
  idol.position.set(0, 1.7, 0.28);
  body.add(idol);

  const limb = (x, y, w, h, mat, footMat) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(box(w, h, w + 0.02, mat, 0, -h / 2, 0));
    if (footMat) pivot.add(box(w + 0.04, 0.16, w + 0.16, footMat, 0, -h + 0.04, -0.06));
    body.add(pivot);
    return pivot;
  };
  const armL = limb(-0.42, 1.64, 0.16, 0.62, shirt);
  const armR = limb(0.42, 1.64, 0.16, 0.62, shirt);
  armL.children[0].material = armR.children[0].material = skin;
  const legL = limb(-0.16, 0.95, 0.22, 0.92, pants, boots);
  const legR = limb(0.16, 0.95, 0.22, 0.92, pants, boots);

  scene.add(root);
  return { root, body, head, armL, armR, legL, legR };
}

function makeDemon() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(box(0.9, 0.9, 1.0, MAT.demonFur, 0, 1.25, 0.1));
  body.add(box(0.7, 0.6, 0.6, MAT.demon, 0, 1.75, -0.3));
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), MAT.eye);
  eyeL.position.set(-0.15, 1.82, -0.61);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.15;
  body.add(eyeL, eyeR);
  body.add(box(0.3, 0.12, 0.1, MAT.demon, 0, 1.6, -0.62)); // jaw
  for (const x of [-0.42, 0.42]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 4), MAT.demonFur);
    ear.position.set(x, 2.1, -0.25);
    ear.rotation.z = -x * 0.9;
    body.add(ear);
  }
  const tail = box(0.12, 0.12, 1.1, MAT.demonFur, 0, 1.5, 0.95);
  tail.rotation.x = -0.7;
  body.add(tail);
  const limb = (x, y, h) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    p.add(box(0.24, h, 0.24, MAT.demon, 0, -h / 2, 0));
    body.add(p);
    return p;
  };
  const armL = limb(-0.58, 1.6, 1.4), armR = limb(0.58, 1.6, 1.4);
  const legL = limb(-0.25, 0.85, 0.85), legR = limb(0.25, 0.85, 0.85);
  root.scale.setScalar(0.95);
  scene.add(root);
  return { root, body, armL, armR, legL, legR, phase: Math.random() * 6 };
}

const runner = makeRunner();
const demons = [makeDemon(), makeDemon(), makeDemon()];
const DEMON_SLOTS = [{ back: 0, lat: -1.5 }, { back: 1.2, lat: 1.5 }, { back: 2.6, lat: 0 }];

// ============================================================
// World generation
// ============================================================
let segs = [];   // active path segments
let ci = 0;      // index of the segment the player is on

function worldAt(seg, dist, lat, y, out = new THREE.Vector3()) {
  out.copy(seg.start).addScaledVector(seg.fwd, dist).addScaledVector(seg.right, lat);
  out.y = y;
  return out;
}

// a group placed on the path: local -Z = forward, +X = right
function anchor(seg, dist, lat = 0, y = 0) {
  const g = new THREE.Group();
  worldAt(seg, dist, lat, y, g.position);
  g.rotation.y = seg.yaw;
  seg.group.add(g);
  return g;
}
function addMesh(parent, geo, mat, x, y, z, shadow = true, own = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.userData.own = own;
  parent.add(m);
  return m;
}

function farFromPath(p, extra) {
  const tmp = new THREE.Vector3();
  for (const s of [...segs, extra]) {
    tmp.copy(p).sub(s.start);
    const t = clamp(tmp.dot(s.fwd), -W, s.length + W);
    const cx = s.start.x + s.fwd.x * t, cz = s.start.z + s.fwd.z * t;
    if (Math.hypot(p.x - cx, p.z - cz) < 8) return false;
  }
  return true;
}

function buildSegment(start, dir, length, isFirst) {
  // Only ever head N, E or W so the path can never loop back onto itself.
  let turn;
  if (dir === 0) turn = Math.random() < 0.5 ? -1 : 1;
  else if (dir === 1) turn = -1;
  else turn = 1;

  const seg = {
    start: start.clone(), dir, length, turn,
    fwd: DIRS[dir], right: DIRS[(dir + 1) % 4], yaw: yawOf(dir),
    group: new THREE.Group(),
    obstacles: [], coins: [], items: [], gaps: [], flames: [],
  };
  seg.end = seg.start.clone().addScaledVector(seg.fwd, length);
  scene.add(seg.group);

  const diff = clamp(runTime / 110, 0, 1);

  // ---------- obstacles ----------
  let d = isFirst ? 48 : 18;
  const limit = length - 18;
  while (d < limit) {
    const r = Math.random();
    let type = r < 0.27 ? 'log' : r < 0.5 ? 'arch' : r < 0.82 ? 'block' : 'gap';
    if (type === 'gap' && diff < 0.1) type = 'log';
    const o = { type, dist: d, depth: 1.0 };
    if (type === 'block') {
      const two = Math.random() < lerp(0.3, 0.75, diff);
      const all = [-1, 0, 1];
      o.lanes = two ? (() => { const free = pick(all); return all.filter(l => l !== free); })() : [pick(all)];
      o.free = all.filter(l => !o.lanes.includes(l));
      o.depth = 1.6;
    } else if (type === 'gap') {
      o.depth = 3.6;
      seg.gaps.push([d - o.depth / 2, d + o.depth / 2]);
    } else if (type === 'arch') {
      o.depth = 0.9;
    }
    seg.obstacles.push(o);
    // never closer than ~0.8s of running at the speed you'll have when you get here,
    // so a jump always lands before the next obstacle
    const estSpeed = 14 + 18 * (1 - Math.exp(-(runTime + 10) / 90));
    const minGap = Math.max(lerp(24, 14, diff), estSpeed * 0.8);
    d += rand(minGap, minGap + lerp(10, 6, diff));
  }

  // ---------- floor (split around gaps) ----------
  const floorStart = isFirst ? -45 : W / 2;
  const floorEnd = length + W / 2;
  let cuts = [floorStart];
  for (const [a, b] of seg.gaps) cuts.push(a, b);
  cuts.push(floorEnd);
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i], b = cuts[i + 1], len = b - a;
    const g = anchor(seg, (a + b) / 2);
    const top = addMesh(g, scaleUV(new THREE.PlaneGeometry(W, len).rotateX(-Math.PI / 2), 1, len / W), MAT.floor, 0, 0, 0, false, true);
    top.receiveShadow = true;
    addMesh(g, new THREE.BoxGeometry(W, 1.6, len), MAT.slab, 0, -0.81, 0, false, true);
    // edge trims (left / right); stop the trim on the turning side at the junction
    for (const side of [-1, 1]) {
      const tEnd = side === turn ? Math.min(b, length - W / 2) : b;
      const tLen = tEnd - a;
      if (tLen <= 0.2) continue;
      const tg = anchor(seg, (a + tEnd) / 2);
      addMesh(tg, new THREE.BoxGeometry(0.35, 0.3, tLen), MAT.trim, side * (W / 2 - 0.17), 0.15, 0, false, true);
    }
  }

  // ---------- junction walls (show where the path turns) ----------
  {
    const jw = anchor(seg, length);
    // wall on the side you can NOT turn to
    addMesh(jw, scaleUV(new THREE.BoxGeometry(1, 13, W + 2), 1, 2), MAT.wall, -turn * (W / 2 + 0.5), -1.5, 0, true, true);
    // wall straight ahead
    addMesh(jw, scaleUV(new THREE.BoxGeometry(W + 3, 13, 1), 1.5, 2), MAT.wall, 0, -1.5, -(W / 2 + 0.5), true, true);
    const em = addMesh(jw, GEO.emblem, MAT.gold, 0, 2.4, -(W / 2 - 0.02));
    em.castShadow = false;
    addMesh(jw, GEO.cap, MAT.gold, 0, 2.4, -(W / 2 - 0.05), false).scale.set(0.5, 1.6, 0.3);
    // torches flanking the emblem
    for (const x of [-2.4, 2.4]) addTorch(seg, jw, x, 1.6, -(W / 2 - 0.3));
  }

  // ---------- pillars with torches ----------
  let k = 0;
  for (let p = 9; p < length - 8; p += 11) {
    const nearArch = seg.obstacles.some(o => o.type === 'arch' && Math.abs(o.dist - p) < 3);
    if (nearArch) continue;
    for (const side of [-1, 1]) {
      const g = anchor(seg, p, side * (W / 2 + 0.75));
      addMesh(g, GEO.pillar, MAT.wall, 0, -3.3, 0, true);
      addMesh(g, GEO.cap, MAT.trim, 0, 1.3, 0, true);
      if (k % 2 === 0) addTorch(seg, g, 0, 1.6, 0);
    }
    k++;
  }

  // ---------- obstacle meshes ----------
  for (const o of seg.obstacles) {
    const g = anchor(seg, o.dist);
    if (o.type === 'log') {
      addMesh(g, GEO.log, MAT.log, 0, 0.42, 0);
      for (const x of [-(W + 1) / 2, (W + 1) / 2]) addMesh(g, GEO.logEnd, MAT.logRing, x, 0.42, 0, false);
    } else if (o.type === 'arch') {
      addMesh(g, GEO.beam, MAT.wall, 0, 2.0, 0);
      for (const x of [-(W / 2 + 0.6), W / 2 + 0.6]) addMesh(g, GEO.post, MAT.wall, x, -2.3, 0);
      // hanging vines make the "duck!" read instantly
      for (let i = 0; i < 7; i++) {
        const v = addMesh(g, GEO.vine, MAT.vine, rand(-W / 2, W / 2), 1.2, rand(-0.3, 0.3), false);
        v.scale.y = rand(0.5, 1.1);
        v.position.y = 1.45 - v.scale.y / 2;
      }
    } else if (o.type === 'block') {
      for (const l of o.lanes) {
        addMesh(g, GEO.block, MAT.wall, l * LANE, 1.3, 0);
        addMesh(g, GEO.blockTop, MAT.trim, l * LANE, 2.72, 0);
      }
    }
  }

  // ---------- coins & power-ups ----------
  const obs = seg.obstacles;
  let placedMagnet = false;
  for (let i = 0; i <= obs.length; i++) {
    const a = i === 0 ? (isFirst ? 14 : 8) : obs[i - 1].dist + 4;
    const b = i === obs.length ? length - 12 : obs[i].dist - 4;
    if (b - a < 6) continue;
    const next = obs[i];
    if (!placedMagnet && Math.random() < 0.09 && !isFirst) {
      placedMagnet = true;
      addItem(seg, 'magnet', (a + b) / 2, randi(-1, 1), 1.2);
      continue;
    }
    if (Math.random() < 0.3) continue;
    const lane = next && next.type === 'block' ? pick(next.free) : randi(-1, 1);
    const n = Math.min(8, Math.floor((b - a) / 2));
    const s = b - n * 2;
    for (let j = 0; j < n; j++) addCoin(seg, s + j * 2 + 1, lane, 1.0);
  }
  // coin arcs over logs and gaps
  for (const o of obs) {
    if ((o.type === 'log' || o.type === 'gap') && Math.random() < 0.5) {
      const lane = randi(-1, 1);
      for (let off = -4; off <= 4; off += 2) addCoin(seg, o.dist + off, lane, 1.0 + 1.7 * (1 - (off / 5) ** 2));
    }
  }

  // ---------- jungle ----------
  const leafs = [MAT.leaf1, MAT.leaf2, MAT.leaf3];
  const from = isFirst ? -45 : -4;
  const nTrees = Math.floor((length - from) / 5);
  for (let i = 0; i < nTrees; i++) {
    const dd = rand(from, length + 4);
    const side = Math.random() < 0.5 ? -1 : 1;
    if (side === turn && dd > length - 14) continue;
    const p = worldAt(seg, dd, side * rand(12, 26), -14);
    if (!farFromPath(p, seg)) continue;
    const t = new THREE.Group();
    t.position.copy(p);
    const s = rand(0.8, 1.5);
    addMesh(t, GEO.trunk, MAT.trunk, 0, 8 * s, 0, false).scale.set(s, s, s);
    const c1 = addMesh(t, GEO.canopy, pick(leafs), 0, 16 * s + rand(0, 1), 0, false);
    c1.scale.setScalar(s * rand(1, 1.4));
    c1.rotation.set(rand(0, 3), rand(0, 3), 0);
    const c2 = addMesh(t, GEO.canopy, pick(leafs), rand(-1.5, 1.5), 16 * s - 1.5, rand(-1.5, 1.5), false);
    c2.scale.setScalar(s * rand(0.7, 1.1));
    seg.group.add(t);
  }

  return seg;
}

function addTorch(seg, parent, x, y, z) {
  addMesh(parent, GEO.bowl, MAT.trim, x, y, z, false);
  const f = addMesh(parent, GEO.flame, MAT.flame, x, y + 0.42, z, false);
  const c = addMesh(f, GEO.flameCore, MAT.flameCore, 0, -0.08, 0, false);
  c.receiveShadow = false;
  f.receiveShadow = false;
  f.userData.seed = Math.random() * 10;
  seg.flames.push(f);
}

function addCoin(seg, dist, lane, y) {
  const m = new THREE.Mesh(GEO.coin, MAT.coin);
  worldAt(seg, dist, lane * LANE, y, m.position);
  m.rotation.y = Math.random() * Math.PI;
  m.castShadow = true;
  seg.group.add(m);
  seg.coins.push({ dist, lane, y, mesh: m, taken: false });
}

function addItem(seg, kind, dist, lane, y) {
  const g = new THREE.Group();
  worldAt(seg, dist, lane * LANE, y, g.position);
  addMesh(g, GEO.magnet, MAT.magnet, 0, 0, 0).rotation.z = Math.PI;
  addMesh(g, GEO.magnetTip, MAT.magnetTip, -0.42, 0.02, 0);
  addMesh(g, GEO.magnetTip, MAT.magnetTip, 0.42, 0.02, 0);
  seg.group.add(g);
  seg.items.push({ kind, dist, lane, y, mesh: g, taken: false });
}

function disposeSegment(seg) {
  seg.group.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); });
  scene.remove(seg.group);
}

function ensureAhead() {
  let ahead = -P.dist;
  for (let i = ci; i < segs.length; i++) ahead += segs[i].length;
  while (ahead < VIEW_AHEAD) {
    const last = segs[segs.length - 1];
    const dir = (last.dir + (last.turn === 1 ? 1 : 3)) % 4;
    // E/W stretches must be long enough that parallel N stretches stay apart
    const len = dir === 0 ? randi(55, 100) : randi(48, 80);
    const s = buildSegment(last.end, dir, len, false);
    segs.push(s);
    ahead += len;
  }
}

// ============================================================
// Game state
// ============================================================
let state = 'menu';    // menu | playing | paused | over
let runTime = 0;
let speed = 14;
let coins = 0;
let shake = 0;
let turnsDone = 0;
let best = store.get('best', 0);
const hinted = new Set();
const particles = [];
const flying = [];    // coins being pulled in by the magnet
const trail = [];     // recent path positions, so demons can follow around corners

const P = {
  dist: 0, lat: 0, lane: 0, fromLane: 0, y: 0, vy: 0,
  slide: 0, slideQueued: false, jumpBuf: 0,
  buffered: 0, alive: true, deathKind: '', deathT: 0,
  totalDist: 0, stumbleT: 0, chase: 2.5, introT: 0, magnet: 0,
  visOff: new THREE.Vector3(), phase: 0, yaw: 0, camYaw: 0,
};

function logicalPos(out = new THREE.Vector3()) {
  return worldAt(segs[ci], P.dist, P.lat, P.y, out);
}

function resetWorld() {
  for (const s of segs) disposeSegment(s);
  segs = []; ci = 0;
  for (const c of flying) scene.remove(c.mesh);
  flying.length = 0;
  for (const p of particles) scene.remove(p.mesh);
  particles.length = 0;

  runTime = 0; speed = 14; coins = 0; shake = 0; turnsDone = 0;
  Object.assign(P, {
    dist: 0, lat: 0, lane: 0, fromLane: 0, y: 0, vy: 0, slide: 0, slideQueued: false, jumpBuf: 0,
    buffered: 0, alive: true, deathKind: '', deathT: 0, totalDist: 0, stumbleT: 0, chase: 2.2, introT: 0, magnet: 0,
    phase: 0, yaw: 0, camYaw: 0,
  });
  P.visOff.set(0, 0, 0);
  runner.root.rotation.set(0, 0, 0);
  runner.body.rotation.set(0, 0, 0);

  segs.push(buildSegment(new THREE.Vector3(0, 0, 0), 0, 75, true));
  ensureAhead();

  trail.length = 0;
  for (let d = -30; d <= 0; d += 0.5) trail.push({ t: d, p: new THREE.Vector3(0, 0, -d) });

  const pos = logicalPos();
  camera.position.set(pos.x, 4.2, pos.z + 6.5);
  camera.lookAt(pos.x, 1, pos.z - 8);
}

// ============================================================
// Input
// ============================================================
function turnWindow() { return 7 + speed * 0.15; }

function steer(side) {
  if (state !== 'playing' || !P.alive) return;
  const cur = segs[ci];
  const toEnd = cur.length - P.dist;
  if (side === cur.turn && toEnd < turnWindow()) { doTurn(); return; }
  if (side === cur.turn && toEnd < turnWindow() + speed * 0.5) { P.buffered = side; return; }
  const nl = clamp(P.lane + side, -1, 1);
  if (nl !== P.lane) {
    P.fromLane = P.lane;
    P.lane = nl;
    Sound.swish();
  }
}

function doTurn() {
  const next = segs[ci + 1];
  const oldPos = logicalPos();
  ci++;
  const rel = oldPos.clone().sub(next.start);
  P.dist = rel.dot(next.fwd);
  P.lat = clamp(rel.dot(next.right), -W / 2 + 0.6, W / 2 - 0.6);
  P.lane = P.fromLane = clamp(Math.round(P.lat / LANE), -1, 1);
  P.visOff.add(oldPos.sub(logicalPos()));
  P.buffered = 0;
  turnsDone++;
  Sound.turn();
  // keep exactly one segment behind us (it's still on screen while the camera swings)
  while (ci > 1) { disposeSegment(segs.shift()); ci--; }
  ensureAhead();
}

function jump() {
  if (state !== 'playing' || !P.alive) return;
  if (P.y <= 0.001 && P.vy <= 0) {
    P.vy = JUMP_V;
    P.slide = 0;
    P.slideQueued = false;
    Sound.jump();
  } else {
    P.jumpBuf = 0.15;
  }
}

function slide() {
  if (state !== 'playing' || !P.alive) return;
  if (P.y <= 0.001) {
    if (P.slide <= 0) Sound.slide();
    P.slide = SLIDE_TIME;
  } else {
    P.vy = Math.min(P.vy, -24);   // slam down, then slide on landing
    P.slideQueued = true;
  }
}

window.addEventListener('keydown', e => {
  const k = e.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (state === 'menu' || state === 'over') {
    if (k === 'Enter' || k === ' ') startGame();
    return;
  }
  if (state === 'paused') {
    if (k === 'p' || k === 'P' || k === 'Escape' || k === 'Enter' || k === ' ') resume();
    return;
  }
  switch (k) {
    case 'ArrowLeft': case 'a': case 'A': steer(-1); break;
    case 'ArrowRight': case 'd': case 'D': steer(1); break;
    case 'ArrowUp': case 'w': case 'W': case ' ': jump(); break;
    case 'ArrowDown': case 's': case 'S': slide(); break;
    case 'p': case 'P': case 'Escape': pause(); break;
    case 'm': case 'M': toggleMute(); break;
  }
});

// swipe controls: fire as soon as the finger has moved far enough
let touch = null;
window.addEventListener('touchstart', e => {
  if (state !== 'playing' || e.target.closest('button')) return;
  const t = e.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY, fired: false };
  e.preventDefault();
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (!touch || touch.fired) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.hypot(dx, dy) < 28) return;
  touch.fired = true;
  if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
  else slide();
  e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', () => { touch = null; });

document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });

// ============================================================
// UI
// ============================================================
const ui = {
  hud: $('hud'), score: $('score'), dist: $('dist'), coins: $('coins'),
  power: $('power'), powerFill: $('powerFill'), hint: $('hint'), flash: $('flash'),
  start: $('start'), over: $('over'), paused: $('paused'),
  mute: $('muteBtn'),
};
$('bestStart').textContent = best;
$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', resume);
$('pauseBtn').addEventListener('click', () => (state === 'playing' ? pause() : resume()));
ui.mute.addEventListener('click', toggleMute);
ui.mute.classList.toggle('off', Sound.muted);

function toggleMute() { ui.mute.classList.toggle('off', Sound.toggleMute()); }

function startGame() {
  Sound.init();
  resetWorld();
  state = 'playing';
  ui.start.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.paused.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  Sound.roar();
  Sound.musicStart();
  last = performance.now();
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  ui.paused.classList.remove('hidden');
  Sound.musicStop();
}
function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  ui.paused.classList.add('hidden');
  Sound.musicStart();
  last = performance.now();
}

const DEATH_MSG = {
  wall: 'You ran into a wall!',
  fall: 'You fell into the abyss!',
  trip: 'You tripped over a log!',
  smash: 'You smashed into stone!',
  duck: 'You forgot to duck!',
  caught: 'The demons caught you!',
};
function gameOver() {
  state = 'over';
  Sound.musicStop();
  const score = currentScore();
  const isBest = score > best;
  if (isBest) { best = score; store.set('best', best); }
  $('deathMsg').textContent = DEATH_MSG[P.deathKind] || 'Game over';
  $('finalScore').textContent = score;
  $('finalDist').textContent = Math.floor(P.totalDist) + ' m';
  $('finalCoins').textContent = coins;
  $('bestOver').textContent = best;
  $('bestStart').textContent = best;
  $('newBest').classList.toggle('hidden', !isBest);
  ui.hint.classList.add('hidden');
  ui.power.classList.add('hidden');
  ui.over.classList.remove('hidden');
}

function currentScore() { return Math.floor(P.totalDist + coins * 10); }

let hintText = '';
function setHint(text) {
  if (text === hintText) return;
  hintText = text;
  ui.hint.textContent = text;
  ui.hint.classList.toggle('hidden', !text);
}

function flash() {
  ui.flash.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => ui.flash.classList.remove('on')));
}

// ============================================================
// Simulation
// ============================================================
function die(kind) {
  if (!P.alive) return;
  P.alive = false;
  P.deathKind = kind;
  P.deathT = 0;
  if (kind !== 'fall') P.vy = 0;
  shake = 0.7;
  flash();
  Sound.death();
  Sound.musicStop();
}

function stumble() {
  if (P.stumbleT > 0) { die('caught'); return; }
  P.stumbleT = 6;
  shake = 0.45;
  flash();
  Sound.stumble();
  Sound.roar();
}

function inGap(seg, d) {
  for (const [a, b] of seg.gaps) if (d > a + 0.35 && d < b - 0.35) return true;
  return false;
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

function update(dt) {
  const cur = segs[ci];
  runTime += dt;

  if (P.alive) {
    speed = 14 + 18 * (1 - Math.exp(-runTime / 90));
    P.stumbleT = Math.max(0, P.stumbleT - dt);
    P.magnet = Math.max(0, P.magnet - dt);

    // --- vertical ---
    if (P.y > 0 || P.vy > 0) {
      P.vy -= GRAVITY * dt;
      P.y += P.vy * dt;
      if (P.y <= 0) {
        P.y = 0; P.vy = 0;
        if (P.slideQueued) { P.slideQueued = false; P.slide = SLIDE_TIME; Sound.slide(); }
        if (P.jumpBuf > 0) { P.jumpBuf = 0; P.vy = JUMP_V; Sound.jump(); }
      }
    }
    P.jumpBuf = Math.max(0, P.jumpBuf - dt);
    P.slide = Math.max(0, P.slide - dt);

    // --- forward / lateral ---
    const step = speed * dt;
    P.dist += step;
    P.totalDist += step;
    const prevLat = P.lat;
    P.lat = lerp(P.lat, P.lane * LANE, damp(16, dt));

    // --- turning ---
    const toEnd = cur.length - P.dist;
    if (P.buffered && toEnd < turnWindow()) doTurn();
    else if (P.dist > cur.length + W / 2 - 0.9) die('wall');

    // hint: tell first-time players about turns
    const segNow = segs[ci];
    const toEndNow = segNow.length - P.dist;
    let hint = '';
    if (turnsDone < 2 && toEndNow < turnWindow() + speed * 0.9 && toEndNow > -2) {
      hint = segNow.turn === 1 ? 'TURN RIGHT ➜' : '⬅ TURN LEFT';
    }

    // --- obstacles ---
    if (P.alive) {
      for (const o of segNow.obstacles) {
        const dd = o.dist - P.dist;
        // first-time hints
        if (!hint && !hinted.has(o.type) && dd > 0 && dd < speed * 1.1) {
          hint = { log: 'JUMP! ↑', gap: 'JUMP! ↑', arch: 'SLIDE! ↓', block: '⬅ DODGE ➜' }[o.type];
          if (dd < 2) hinted.add(o.type);
        }
        if (Math.abs(dd) > o.depth / 2 + 0.35) continue;
        if (o.type === 'log' && P.y < 0.55) die('trip');  // small grace margin
        else if (o.type === 'arch' && P.slide <= 0) die('duck');
        else if (o.type === 'block') {
          for (const l of o.lanes) {
            const bx = l * LANE;
            if (Math.abs(P.lat - bx) < 1.25) {
              if (Math.abs(prevLat - bx) >= 1.25 && Math.abs(dd) < o.depth / 2 + 0.3) {
                // side-swipe: bounce back to the lane we came from
                P.lane = P.fromLane;
                P.lat = prevLat;
                stumble();
              } else die('smash');
              break;
            }
          }
        }
        if (!P.alive) break;
      }
    }
    if (P.alive && P.y <= 0 && inGap(segNow, P.dist)) { die('fall'); P.vy = -2; }
    setHint(P.alive ? hint : '');

    // --- coins & items ---
    for (const c of segNow.coins) {
      if (c.taken) continue;
      const dd = c.dist - P.dist;
      if (P.magnet > 0 && dd > -1 && dd < 16) {
        c.taken = true;
        scene.attach(c.mesh);
        flying.push(c);
        continue;
      }
      if (Math.abs(dd) < 0.9 && Math.abs(c.lane * LANE - P.lat) < 1.2 && Math.abs(c.y - (P.y + 1)) < 1.4) {
        c.taken = true;
        collectCoin(c.mesh);
      }
    }
    for (const it of segNow.items) {
      if (it.taken) continue;
      if (Math.abs(it.dist - P.dist) < 1 && Math.abs(it.lane * LANE - P.lat) < 1.3) {
        it.taken = true;
        it.mesh.visible = false;
        P.magnet = 10;
        Sound.power();
        burst(it.mesh.position, 14);
      }
    }
  } else {
    // --- death animation ---
    P.deathT += dt;
    if (P.deathKind === 'fall') {
      P.vy -= GRAVITY * dt;
      P.y += P.vy * dt;
      P.dist += speed * dt * Math.max(0, 1 - P.deathT * 1.5);
    } else if (P.deathT < 0.35) {
      P.dist -= 5 * dt;  // knocked back
    }
    if (P.deathT > 1.6 && state === 'playing') gameOver();
  }

  // --- magnet pull ---
  const target = logicalPos(_w).add(P.visOff);
  target.y += 1;
  for (let i = flying.length - 1; i >= 0; i--) {
    const c = flying[i];
    c.mesh.position.lerp(target, damp(10, dt));
    if (c.mesh.position.distanceTo(target) < 0.9) {
      flying.splice(i, 1);
      scene.remove(c.mesh);
      collectCoin(null, target);
    }
  }

  // --- demons chase ---
  if (P.alive) {
    P.introT += dt;
    const want = P.introT < 1.6 ? 2.6 : P.stumbleT > 0 ? CHASE_NEAR : CHASE_FAR;
    P.chase = lerp(P.chase, want, damp(P.introT < 1.6 ? 4 : 1.2, dt));
  } else {
    P.chase = lerp(P.chase, P.deathKind === 'fall' ? 2.5 : 1.0, damp(3, dt));
  }
  const lp = logicalPos(_v);
  if (!trail.length || P.totalDist - trail[trail.length - 1].t >= 0.5) {
    trail.push({ t: P.totalDist, p: new THREE.Vector3(lp.x, 0, lp.z) });
    while (trail.length > 140) trail.shift();
  }

  P.visOff.multiplyScalar(1 - damp(9, dt));
  shake = Math.max(0, shake - dt);
}

function collectCoin(mesh, at) {
  coins++;
  Sound.coin();
  const pos = mesh ? mesh.position.clone() : at.clone();
  if (mesh) mesh.visible = false;
  burst(pos, 6);
}

function burst(pos, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(GEO.spark, MAT.spark);
    m.position.copy(pos);
    scene.add(m);
    particles.push({
      mesh: m, life: 0.45,
      vel: new THREE.Vector3(rand(-4, 4), rand(2, 6), rand(-4, 4)),
    });
  }
}

// position on the recent trail `back` metres behind the player
function trailPoint(td, out, dirOut) {
  let i = trail.length - 2;
  while (i > 0 && trail[i].t > td) i--;
  const a = trail[Math.max(0, i)], b = trail[Math.max(0, i) + 1] || a;
  const span = b.t - a.t || 1;
  out.copy(a.p).lerp(b.p, clamp((td - a.t) / span, 0, 1));
  dirOut.copy(b.p).sub(a.p);
  if (dirOut.lengthSq() < 1e-6) dirOut.set(0, 0, -1);
  dirOut.normalize();
}

// ============================================================
// Rendering / animation of visuals
// ============================================================
const _d = new THREE.Vector3(), _r = new THREE.Vector3(), _c = new THREE.Vector3(), _l = new THREE.Vector3();

function animate(dt, t) {
  const cur = segs[ci];
  const pos = logicalPos(_v).add(P.visOff);

  // ---- runner ----
  runner.root.position.copy(pos);
  if (state === 'playing' || state === 'over') P.yaw = lerpAngle(P.yaw, cur.yaw, damp(14, dt));
  runner.root.rotation.y = P.yaw;
  const R = runner;
  const moving = state === 'playing' && P.alive;
  if (moving) P.phase += dt * speed * 0.6;

  let legSwing = 0, armSwing = 0, lean = 0, bodyY = 0, bodyRotX = 0;
  if (state === 'menu') {
    // idle breathing while on the title screen
    bodyY = Math.sin(t * 2) * 0.03;
    armSwing = 0.08 * Math.sin(t * 2);
  } else if (!P.alive) {
    if (P.deathKind === 'fall') { legSwing = Math.sin(t * 20) * 0.6; armSwing = -2.6; }
    else { bodyRotX = Math.min(1.45, P.deathT * 5); bodyY = 0; }
  } else if (P.slide > 0) {
    bodyRotX = 1.2; bodyY = 0.2; legSwing = -1.2; armSwing = -0.6;
  } else if (P.y > 0.01) {
    legSwing = 0.7; armSwing = -2.4;
  } else {
    legSwing = Math.sin(P.phase) * 0.95;
    armSwing = -Math.sin(P.phase) * 0.85;
    bodyY = Math.abs(Math.cos(P.phase)) * 0.1;
    lean = -0.18;
  }
  if (P.slide > 0 && P.alive) {
    R.legL.rotation.x = R.legR.rotation.x = legSwing;
    R.armL.rotation.x = R.armR.rotation.x = armSwing;
  } else if (P.y > 0.01 && P.alive && state === 'playing') {
    R.legL.rotation.x = legSwing; R.legR.rotation.x = -0.3;
    R.armL.rotation.x = R.armR.rotation.x = armSwing;
  } else {
    R.legL.rotation.x = legSwing; R.legR.rotation.x = -legSwing;
    R.armL.rotation.x = armSwing; R.armR.rotation.x = -armSwing;
  }
  R.body.position.y = lerp(R.body.position.y, bodyY, damp(20, dt));
  R.body.rotation.x = lerp(R.body.rotation.x, bodyRotX || lean, damp(16, dt));
  // tilt into lane changes
  R.body.rotation.z = lerp(R.body.rotation.z, clamp((P.lane * LANE - P.lat) * -0.12, -0.3, 0.3), damp(10, dt));

  // ---- demons ----
  for (let i = 0; i < demons.length; i++) {
    const D = demons[i], slot = DEMON_SLOTS[i];
    const back = P.chase + slot.back;
    trailPoint(P.totalDist - back, _c, _d);
    _r.set(-_d.z, 0, _d.x);    // right vector of trail direction
    D.root.position.copy(_c).addScaledVector(_r, slot.lat).add(P.visOff);
    D.root.visible = state !== 'menu' && back < 16;
    D.root.rotation.y = Math.atan2(-_d.x, -_d.z);
    D.phase += dt * (state === 'playing' ? speed * 0.55 : 3);
    const s = Math.sin(D.phase);
    D.legL.rotation.x = s * 0.9; D.legR.rotation.x = -s * 0.9;
    D.armL.rotation.x = -s * 1.1 - 0.4; D.armR.rotation.x = s * 1.1 - 0.4;
    D.body.position.y = Math.abs(Math.cos(D.phase)) * 0.18;
    D.body.rotation.x = -0.35;
    if (!P.alive && P.deathT > 0.4) {  // pounce!
      D.armL.rotation.x = D.armR.rotation.x = -2.6 + Math.sin(t * 18) * 0.3;
    }
  }

  // ---- props ----
  for (const s of segs) {
    for (const c of s.coins) if (!c.taken) c.mesh.rotation.y += dt * 3;
    for (const it of s.items) if (!it.taken) { it.mesh.rotation.y += dt * 2.5; it.mesh.position.y = it.y + Math.sin(t * 3) * 0.15; }
    for (const f of s.flames) {
      const k = 1 + Math.sin(t * 13 + f.userData.seed) * 0.12 + Math.sin(t * 29 + f.userData.seed * 2) * 0.08;
      f.scale.set(1, k, 1);
    }
  }
  for (const c of flying) c.mesh.rotation.y += dt * 12;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
    p.vel.y -= 14 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.scale.setScalar(p.life / 0.45);
    p.mesh.rotation.x += dt * 8;
  }

  // ---- camera ----
  if (state === 'menu') {
    // slow orbit showing off the runner in front of the temple
    const a = Math.PI + Math.sin(t * 0.25) * 0.5;
    camera.position.set(pos.x + Math.sin(a) * 5.5, 2.4 + Math.sin(t * 0.4) * 0.3, pos.z + Math.cos(a) * 5.5);
    camera.lookAt(pos.x, 1.4, pos.z);
  } else {
    P.camYaw = lerpAngle(P.camYaw, cur.yaw, damp(5.5, dt));
    _d.set(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    const followY = P.alive ? pos.y * 0.35 : Math.max(pos.y, -1) * 0.2;
    _c.copy(pos).addScaledVector(_d, -6.8);
    _c.y = 4.3 + followY;
    camera.position.lerp(_c, damp(P.alive ? 12 : 3, dt));
    if (shake > 0) {
      camera.position.x += rand(-1, 1) * shake * 0.4;
      camera.position.y += rand(-1, 1) * shake * 0.4;
    }
    _l.copy(pos).addScaledVector(_d, 7);
    _l.y = 1.2 + (P.alive ? pos.y * 0.3 : pos.y * 0.5);
    camera.lookAt(_l);
    // a touch more FOV at high speed sells the velocity
    const base = window.innerWidth < window.innerHeight ? 80 : 65;
    const fov = base + (speed - 14) * 0.45;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, damp(3, dt)); camera.updateProjectionMatrix(); }
  }

  // ---- sun & ground follow the player ----
  sun.position.set(pos.x + 14, 30, pos.z + 10);
  sun.target.position.set(pos.x, 0, pos.z);
  ground.position.x = pos.x;
  ground.position.z = pos.z;

  // ---- HUD ----
  if (state === 'playing') {
    const sc = String(currentScore());
    if (ui.score.textContent !== sc) ui.score.textContent = sc;
    const dm = Math.floor(P.totalDist) + ' m';
    if (ui.dist.textContent !== dm) ui.dist.textContent = dm;
    const cc = String(coins);
    if (ui.coins.textContent !== cc) ui.coins.textContent = cc;
    ui.power.classList.toggle('hidden', P.magnet <= 0);
    if (P.magnet > 0) ui.powerFill.style.width = (P.magnet / 10 * 100) + '%';
  }
}

// ============================================================
// Main loop
// ============================================================
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (state === 'playing') update(dt);
  animate(state === 'paused' ? 0 : dt, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resetWorld();
requestAnimationFrame(frame);

// tiny debug hook for testing in the console
window.__temple = {
  P, startGame,
  get segs() { return segs; }, get cur() { return segs[ci]; }, get state() { return state; }, get speed() { return speed; },
  step(dt, t) { if (state === 'playing') update(dt); animate(dt, t); },
};
})();
