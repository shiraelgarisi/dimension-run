/* Rendering with Three.js: both worlds' environments, obstacle meshes, the runner,
   the dimension transformation and visual effects. It only READS the simulation
   (DR.Sim); it never changes gameplay state. */
(function () {
  'use strict';
  const DR = window.DR;
  const U = DR.util;
  const C = DR.CONST;
  const LW = C.LANE_W;
  const PATH_W = LW * 3 + 0.8;
  const GHOST = 0.2;               // opacity of the inactive world's obstacles
  const SCENERY_SPAN = 230;

  const THEME = [
    { // Light World
      skyTop: '#2f86e8', skyHor: '#c4ecff', fog: '#cdeefe', fogNear: 45, fogFar: 230,
      hemiSky: '#ffffff', hemiGround: '#7aa858', hemiI: 1.9, sun: '#fff0c8', sunI: 2.3,
      ground: '#5aa845', abyss: '#2d1f12',
    },
    { // Dark World
      skyTop: '#05010f', skyHor: '#3b1670', fog: '#1d0c3a', fogNear: 18, fogFar: 140,
      hemiSky: '#8a6cff', hemiGround: '#14052c', hemiI: 1.25, sun: '#a083ff', sunI: 0.9,
      ground: '#170c2a', abyss: '#05000c',
    },
  ];

  // ------------------------------------------------------------------
  // procedural textures
  // ------------------------------------------------------------------
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const rnd = Math.random;

  function lightFloorTex() {
    return canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#b89c73'; g.fillRect(0, 0, S, S);
      // flagstones
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        let x = r % 2 ? -40 : 0;
        while (x < S) {
          const w = 70 + rnd() * 60;
          const l = 150 + rnd() * 40 | 0;
          g.fillStyle = `rgb(${l + 40},${l + 18},${l - 18})`;
          g.fillRect(x + 4, r * 64 + 4, w - 8, 56);
          g.fillStyle = 'rgba(255,255,230,0.12)';
          g.fillRect(x + 4, r * 64 + 4, w - 8, 5);
          x += w;
        }
      }
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
        g.fillRect(rnd() * S, rnd() * S, 2, 2);
      }
      // grass tufts in the cracks
      for (let i = 0; i < 30; i++) {
        g.fillStyle = `rgba(90,${150 + rnd() * 60 | 0},60,0.5)`;
        g.beginPath(); g.arc(rnd() * S, (rnd() * rows | 0) * 64 + 2, 3 + rnd() * 5, 0, 7); g.fill();
      }
      // lane borders
      g.fillStyle = 'rgba(70,50,30,0.55)';
      g.fillRect(0, 0, 5, S); g.fillRect(S - 5, 0, 5, S);
    });
  }
  function darkFloorTex() {
    return canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#1c1430'; g.fillRect(0, 0, S, S);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const l = 34 + rnd() * 16 | 0;
        g.fillStyle = `rgb(${l},${l - 8},${l + 26})`;
        g.fillRect(c * 128 + 4, r * 64 + 4, 120, 56);
      }
      for (let i = 0; i < 2000; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(160,120,255,0.05)';
        g.fillRect(rnd() * S, rnd() * S, 2, 2);
      }
      g.fillStyle = 'rgba(120,60,255,0.5)';
      g.fillRect(0, 0, 4, S); g.fillRect(S - 4, 0, 4, S);
    });
  }
  function darkGlowTex() {
    return canvasTex(256, 256, (g, S) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.strokeStyle = '#9b4dff'; g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        let x = rnd() * S, y = rnd() * S;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = '#7a3cff';
      g.fillRect(0, 0, 3, S); g.fillRect(S - 3, 0, 3, S);
    });
  }
  function crackTex() {
    return canvasTex(128, 128, (g, S) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.strokeStyle = '#ff5a2a'; g.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        let x = S / 2, y = S / 2;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y); }
        g.stroke();
      }
    });
  }
  function blobTex() {
    return canvasTex(64, 64, (g, S) => {
      const grd = g.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
    });
  }
  function textTex(text, bg, fg) {
    const t = canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#111' : '#eee'; g.fillRect(i * 32, 0, 32, 14); g.fillRect(i * 32 + 16 * (i % 2 ? -1 : 1), h - 14, 32, 14); }
      g.fillStyle = fg; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 4);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  // ------------------------------------------------------------------
  class World {
    constructor(canvas) {
      const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.outputColorSpace = THREE.SRGBColorSpace;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
      this.scene.fog = new THREE.Fog(THEME[0].fog, THEME[0].fogNear, THEME[0].fogFar);
      this.themeCol = THEME.map(t => {
        const o = {};
        for (const k in t) if (typeof t[k] === 'string') o[k] = new THREE.Color(t[k]);
        return o;
      });

      this.hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 1);
      this.sun = new THREE.DirectionalLight(0xffffff, 1);
      this.sun.position.set(8, 20, 6);
      this.scene.add(this.hemi, this.sun, this.sun.target);

      this.tex = {
        lightFloor: lightFloorTex(), darkFloor: darkFloorTex(), darkGlow: darkGlowTex(false),
        crack: crackTex(), blob: blobTex(),
      };

      this._makeMaterials();
      this._makeGeometries();
      this._makeSky();
      this._makeGround();
      this._makeScenery();
      this._makeAmbient();
      this.runner = this._makeRunner();
      this.fx = [];        // short-lived effect meshes
      this.sparks = [];
      this.levelGroup = null;
      this.mixShown = -1;
      this.shake = 0;
      this.glitch = 0;
      this.time = 0;
      this.camRoll = 0;

      window.addEventListener('resize', () => this.resize());
      this.resize();
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.baseFov = w < h ? 78 : 62;
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }

    // ---------------- materials & geometry ----------------
    _makeMaterials() {
      const T = (o) => Object.assign(o, { transparent: true });
      const lam = (color, extra = {}) => T(new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra)));
      const glow = (color, ei = 1, extra = {}) => T(new THREE.MeshStandardMaterial(Object.assign({ color, emissive: color, emissiveIntensity: ei, roughness: 0.4, metalness: 0.1, flatShading: true }, extra)));
      const basic = (color, extra = {}) => T(new THREE.MeshBasicMaterial(Object.assign({ color }, extra)));
      this.M = {
        // Light World obstacles
        rock: lam(0x8f8478), moss: lam(0x5fae3e), trunk: lam(0x6b4527), leaf: lam(0x3f9a3a), leaf2: lam(0x63c24a),
        crate: lam(0xb7823f), crateBand: lam(0x6e4b22), log: lam(0x7a4a26), logRing: lam(0xd9b07a),
        archWood: lam(0x8a5a2e), flower: lam(0xff6fa8), flower2: lam(0xffd84a), vine: lam(0x3f8f35),
        coin: T(new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0x8a5a00, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.3 })),
        // Dark World obstacles
        crystal: glow(0xb04dff, 0.9), crystal2: glow(0x5a7bff, 0.8), obelisk: lam(0x1a1428), rune: glow(0x39f3ff, 1.4),
        wraith: lam(0x150c26), wraithEye: basic(0xff2a55), wraithRing: basic(0x9b4dff),
        spikePlate: lam(0x231a33), spike: glow(0xff3366, 0.9), beam: basic(0x39f3ff), beamGlow: basic(0x39f3ff, { opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
        emitter: lam(0x2a2140), gem: glow(0xc77dff, 1.1),
        // ghost-only markers for gaps of the inactive world
        ghostGap0: basic(0xff8a3a, { opacity: 0, depthWrite: false }),
        ghostGap1: basic(0xb35cff, { opacity: 0, depthWrite: false }),
        moverRing0: basic(0xffe066, { opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
        moverRing1: basic(0xff4dd2, { opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
      };
      this.obMats = [
        ['rock', 'moss', 'trunk', 'leaf', 'leaf2', 'crate', 'crateBand', 'log', 'logRing', 'archWood', 'flower', 'flower2', 'vine', 'coin', 'moverRing0'].map(k => this.M[k]),
        ['crystal', 'crystal2', 'obelisk', 'rune', 'wraith', 'wraithEye', 'wraithRing', 'spikePlate', 'spike', 'beam', 'emitter', 'gem', 'moverRing1'].map(k => this.M[k]),
      ];
      this.M.beamGlow.userData.baseOpacity = 0.3;
      this.obMats[1].push(this.M.beamGlow);
      this.ghostMats = [this.M.ghostGap0, this.M.ghostGap1];

      // floors (not ghosted: only the active world's floor is shown)
      this.F = [
        {
          top: new THREE.MeshLambertMaterial({ map: this.tex.lightFloor }),
          slab: new THREE.MeshLambertMaterial({ color: 0x7a5e3d }),
          curb: new THREE.MeshLambertMaterial({ color: 0xcbb48a, flatShading: true }),
          crack: new THREE.MeshLambertMaterial({ map: this.tex.lightFloor, emissive: 0xff5a2a, emissiveMap: this.tex.crack, emissiveIntensity: 1 }),
        },
        {
          top: new THREE.MeshStandardMaterial({ map: this.tex.darkFloor, emissive: 0xffffff, emissiveMap: this.tex.darkGlow, emissiveIntensity: 0.8, roughness: 0.6 }),
          slab: new THREE.MeshLambertMaterial({ color: 0x120a22 }),
          curb: new THREE.MeshBasicMaterial({ color: 0x8a4dff }),
          crack: new THREE.MeshStandardMaterial({ map: this.tex.darkFloor, emissive: 0xff3a7a, emissiveMap: this.tex.crack, emissiveIntensity: 1.2 }),
        },
      ];
      this.fxMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    }

    _makeGeometries() {
      this.G = {
        rock: new THREE.DodecahedronGeometry(1, 0),
        trunk: new THREE.CylinderGeometry(0.28, 0.4, 2.2, 7),
        canopy: new THREE.IcosahedronGeometry(1.1, 0),
        crate: new THREE.BoxGeometry(1.5, 1.05, 1.1),
        band: new THREE.BoxGeometry(1.56, 0.12, 1.16),
        log: new THREE.CylinderGeometry(0.36, 0.36, LW - 0.15, 10).rotateZ(Math.PI / 2),
        logEnd: new THREE.CylinderGeometry(0.37, 0.37, 0.04, 10).rotateZ(Math.PI / 2),
        post: new THREE.BoxGeometry(0.22, 2.6, 0.3),
        bar: new THREE.BoxGeometry(LW, 0.55, 0.42),
        flower: new THREE.IcosahedronGeometry(0.14, 0),
        vine: new THREE.BoxGeometry(0.06, 1, 0.06),
        crystal: new THREE.OctahedronGeometry(0.85, 0),
        obelisk: new THREE.BoxGeometry(1.2, 2.9, 1.0),
        rune: new THREE.BoxGeometry(0.14, 2.2, 0.06),
        cloak: new THREE.ConeGeometry(0.75, 2.1, 8, 1, true),
        hood: new THREE.SphereGeometry(0.42, 10, 8),
        eye: new THREE.SphereGeometry(0.07, 6, 6),
        arm: new THREE.ConeGeometry(0.12, 1.0, 5),
        ring: new THREE.TorusGeometry(0.85, 0.06, 6, 24).rotateX(Math.PI / 2),
        plate: new THREE.BoxGeometry(LW - 0.15, 0.1, 1.0),
        spike: new THREE.ConeGeometry(0.14, 0.6, 5),
        emitter: new THREE.BoxGeometry(0.3, 2.4, 0.3),
        beam: new THREE.BoxGeometry(LW, 0.22, 0.22),
        beamGlow: new THREE.BoxGeometry(LW, 0.6, 0.6),
        coin: new THREE.CylinderGeometry(0.4, 0.4, 0.09, 18).rotateX(Math.PI / 2),
        gem: new THREE.OctahedronGeometry(0.38, 0),
        shard: new THREE.IcosahedronGeometry(0.5, 0),
        shardRing: new THREE.TorusGeometry(0.8, 0.05, 6, 28),
        ghostGap: new THREE.PlaneGeometry(LW - 0.2, C.DEPTH.gap).rotateX(-Math.PI / 2),
        spark: new THREE.BoxGeometry(0.14, 0.14, 0.14),
        torus: new THREE.TorusGeometry(1, 0.08, 8, 40),
      };
    }

    _makeSky() {
      const uniforms = {
        lTop: { value: new THREE.Color(THEME[0].skyTop) }, lHor: { value: new THREE.Color(THEME[0].skyHor) },
        dTop: { value: new THREE.Color(THEME[1].skyTop) }, dHor: { value: new THREE.Color(THEME[1].skyHor) },
        uMix: { value: 0 }, uTime: { value: 0 }, uDanger: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 lTop, lHor, dTop, dHor; uniform float uMix, uTime, uDanger; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
          void main(){
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 l = mix(lHor, lTop, pow(h, 0.55));
            vec3 sd = normalize(vec3(0.35, 0.32, -1.0)); float s = max(dot(vDir, sd), 0.0);
            l += vec3(1.0, 0.92, 0.65) * (smoothstep(0.9975, 0.999, s) + pow(s, 8.0) * 0.18);
            vec3 d = mix(dHor, dTop, pow(h, 0.5));
            vec3 cell = floor(vDir * 170.0); float st = step(0.995, hash(cell)) * smoothstep(0.04, 0.35, h);
            d += vec3(0.9, 0.85, 1.0) * st * (0.55 + 0.45 * sin(uTime * 3.0 + hash(cell) * 30.0));
            vec3 md = normalize(vec3(-0.4, 0.28, -1.0)); float m = max(dot(vDir, md), 0.0);
            d += vec3(0.85, 0.7, 1.0) * smoothstep(0.9982, 0.9992, m) + vec3(0.45, 0.25, 0.9) * pow(m, 24.0) * 0.4;
            vec3 col = mix(l, d, uMix);
            col = mix(col, vec3(0.55, 0.06, 0.12) * (0.6 + 0.4 * (1.0 - h)), uDanger * 0.55);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      });
      this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
      this.sky.renderOrder = -1;
      this.scene.add(this.sky);
    }

    _makeGround() {
      // terrain on both sides of the path, and a deep abyss under it (seen through gaps)
      this.groundMat = new THREE.MeshLambertMaterial({ color: THEME[0].ground });
      const side = new THREE.PlaneGeometry(400, 500).rotateX(-Math.PI / 2);
      this.groundL = new THREE.Mesh(side, this.groundMat);
      this.groundR = new THREE.Mesh(side, this.groundMat);
      this.groundL.position.set(-(PATH_W / 2 + 200 + 0.6), -0.25, 0);
      this.groundR.position.set(PATH_W / 2 + 200 + 0.6, -0.25, 0);
      this.abyssMat = new THREE.MeshBasicMaterial({ color: THEME[0].abyss });
      this.abyss = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W + 2, 500).rotateX(-Math.PI / 2), this.abyssMat);
      this.abyss.position.y = -9;
      this.scene.add(this.groundL, this.groundR, this.abyss);
    }

    // ---------------- scenery (recycled pools that follow the runner) ----------------
    _makeScenery() {
      const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
      const glow = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, flatShading: true });
      const S = {
        trunk: lam(0x6b4527), leafA: lam(0x3f9a3a), leafB: lam(0x6cc24a), leafC: lam(0x2f7d38),
        bush: lam(0x4fae45), petal: [lam(0xff6fa8), lam(0xffd84a), lam(0xffffff), lam(0x8fd3ff)], stone: lam(0xa69a8a),
        hill: lam(0x63b850), deadTrunk: lam(0x221a2e), stem: lam(0xd8cfe8), cap: [glow(0x39f3ff), glow(0xff4dd2), glow(0x9b4dff)],
        crystal: glow(0x7a4dff), rockDark: lam(0x2a2140),
      };
      const pools = [[], []];
      const geo = {
        trunk: new THREE.CylinderGeometry(0.3, 0.45, 4, 6), canopy: new THREE.IcosahedronGeometry(1.8, 0),
        bush: new THREE.IcosahedronGeometry(0.9, 0), petal: new THREE.IcosahedronGeometry(0.22, 0), stone: new THREE.DodecahedronGeometry(0.8, 0),
        hill: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        branch: new THREE.CylinderGeometry(0.08, 0.16, 2.4, 5), stem: new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6),
        cap: new THREE.SphereGeometry(0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), crystal: new THREE.OctahedronGeometry(1, 0),
      };
      const mk = (g, m, x, y, z, s = 1) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.setScalar(s); return o; };
      const light = (kind) => {
        const g = new THREE.Group();
        if (kind === 0) {
          g.add(mk(geo.trunk, S.trunk, 0, 2, 0));
          g.add(mk(geo.canopy, rnd() < 0.5 ? S.leafA : S.leafC, 0, 4.6, 0, 1 + rnd() * 0.4));
          g.add(mk(geo.canopy, S.leafB, 0.6, 5.6, 0.3, 0.6 + rnd() * 0.3));
        } else if (kind === 1) {
          g.add(mk(geo.bush, S.bush, 0, 0.4, 0, 0.8 + rnd() * 0.5));
          for (let i = 0; i < 5; i++) g.add(mk(geo.petal, S.petal[i % 4], (rnd() - 0.5) * 1.6, 0.7 + rnd() * 0.6, (rnd() - 0.5) * 1.4));
        } else {
          g.add(mk(geo.stone, S.stone, 0, 0.3, 0, 0.6 + rnd() * 0.8));
          for (let i = 0; i < 3; i++) g.add(mk(geo.petal, S.petal[(i + 1) % 4], (rnd() - 0.5) * 2, 0.2, (rnd() - 0.5) * 2));
        }
        return g;
      };
      const dark = (kind) => {
        const g = new THREE.Group();
        if (kind === 0) {
          g.add(mk(geo.trunk, S.deadTrunk, 0, 2, 0));
          for (let i = 0; i < 3; i++) {
            const b = mk(geo.branch, S.deadTrunk, 0, 3 + i * 0.6, 0);
            b.rotation.z = (i % 2 ? 1 : -1) * (0.7 + rnd() * 0.4); b.rotation.y = rnd() * 3;
            b.position.x = Math.sin(b.rotation.z) * -0.8;
            g.add(b);
          }
        } else if (kind === 1) {
          const n = 1 + (rnd() * 3 | 0);
          for (let i = 0; i < n; i++) {
            const s = 0.6 + rnd() * 0.9, x = (rnd() - 0.5) * 2, z = (rnd() - 0.5) * 2;
            g.add(mk(geo.stem, S.stem, x, 0.6 * s, z, s));
            g.add(mk(geo.cap, S.cap[(rnd() * 3) | 0], x, 1.2 * s, z, s));
          }
        } else {
          for (let i = 0; i < 3; i++) {
            const c = mk(geo.crystal, i ? S.crystal : S.rockDark, (rnd() - 0.5) * 1.5, 0.8, (rnd() - 0.5) * 1.5, 0.5 + rnd() * 0.7);
            c.scale.y *= 2; c.rotation.z = (rnd() - 0.5) * 0.6;
            g.add(c);
          }
        }
        return g;
      };
      for (let w = 0; w < 2; w++) {
        for (let i = 0; i < 70; i++) {
          const kind = i % 3;
          const g = w === 0 ? light(kind) : dark(kind);
          const side = i % 2 ? 1 : -1;
          g.userData.base = { x: side * (PATH_W / 2 + 1.6 + Math.pow(rnd(), 1.5) * 16), z: -(i / 70) * SCENERY_SPAN + 20, s: 0.8 + rnd() * 0.6 };
          g.position.set(g.userData.base.x, -0.25, g.userData.base.z);
          g.rotation.y = rnd() * 6.28;
          this.scene.add(g);
          pools[w].push(g);
        }
        // distant hills / spires
        for (let i = 0; i < 16; i++) {
          const g = new THREE.Group();
          const side = i % 2 ? 1 : -1;
          if (w === 0) g.add(mk(geo.hill, S.hill, 0, 0, 0, 1));
          else { const c = mk(geo.crystal, S.rockDark, 0, 6, 0, 1); c.scale.set(3, 9, 3); g.add(c); }
          const s = w === 0 ? 14 + rnd() * 18 : 1 + rnd() * 1.2;
          g.userData.base = { x: side * (45 + rnd() * 70), z: -(i / 16) * SCENERY_SPAN + 20, s };
          g.userData.far = true;
          g.position.set(g.userData.base.x, -0.3, g.userData.base.z);
          if (w === 0) g.scale.set(s, s * 0.45, s);
          this.scene.add(g);
          pools[w].push(g);
        }
      }
      this.scenery = pools;
    }

    _makeAmbient() {
      const mk = (color, size, n) => {
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { pos[i * 3] = (rnd() - 0.5) * 40; pos[i * 3 + 1] = rnd() * 9; pos[i * 3 + 2] = -rnd() * 120; }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
        const p = new THREE.Points(g, m);
        p.frustumCulled = false;
        this.scene.add(p);
        return p;
      };
      this.ambient = [mk(0xfff3b0, 0.12, 220), mk(0xb07dff, 0.16, 320)];
    }

    // ---------------- the runner ----------------
    _makeRunner() {
      const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
      const skin = lam(0xe8b98f), shirt = lam(0xf2f2f2), pants = lam(0x34405e), boots = lam(0x2a1c14), hair = lam(0x3a2414);
      this.scarfMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 0.5 });
      this.amuletMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe066, emissiveIntensity: 1.5 });
      const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
      const root = new THREE.Group(), body = new THREE.Group();
      root.add(body);
      body.add(box(0.6, 0.7, 0.34, shirt, 0, 1.33, 0));
      body.add(box(0.64, 0.16, 0.38, this.scarfMat, 0, 1.64, 0));     // scarf
      const tail = box(0.16, 0.5, 0.06, this.scarfMat, 0.14, 1.45, 0.22);
      tail.rotation.x = 0.5;
      body.add(tail);
      const amulet = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), this.amuletMat);
      amulet.position.set(0, 1.42, -0.19);
      body.add(amulet);
      body.add(box(0.62, 0.12, 0.36, boots, 0, 0.98, 0));
      const head = new THREE.Group();
      head.position.y = 1.88;
      head.add(box(0.38, 0.4, 0.38, skin));
      head.add(box(0.4, 0.14, 0.4, hair, 0, 0.18, 0.02));
      head.add(box(0.4, 0.3, 0.1, hair, 0, 0.05, 0.17));
      body.add(head);
      body.add(box(0.42, 0.48, 0.18, lam(0x6a4a8a), 0, 1.33, 0.26)); // backpack
      const limb = (x, y, w, h, m, foot) => {
        const p = new THREE.Group();
        p.position.set(x, y, 0);
        p.add(box(w, h, w + 0.02, m, 0, -h / 2, 0));
        if (foot) p.add(box(w + 0.04, 0.15, w + 0.16, foot, 0, -h + 0.04, -0.06));
        body.add(p);
        return p;
      };
      const armL = limb(-0.41, 1.62, 0.15, 0.6, skin), armR = limb(0.41, 1.62, 0.15, 0.6, skin);
      const legL = limb(-0.15, 0.95, 0.21, 0.9, pants, boots), legR = limb(0.15, 0.95, 0.21, 0.9, pants, boots);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.tex.blob, transparent: true, depthWrite: false }));
      shadow.position.y = 0.03;
      this.scene.add(root, shadow);
      return { root, body, head, armL, armR, legL, legR, shadow, phase: 0, scale: 1 };
    }

    // ---------------- level construction ----------------
    buildLevel(track) {
      if (this.levelGroup) this._disposeLevel();
      this.track = track;
      const L = (this.levelGroup = new THREE.Group());
      this.scene.add(L);
      this.floor = [new THREE.Group(), new THREE.Group()];
      L.add(this.floor[0], this.floor[1]);
      this.movers = [];
      this.enemies = [];
      this.collapseTiles = [];
      this.beams = [];
      this.rifts = [];
      this.coinMeshes = [];
      this.shardMeshes = [];
      this.portal = null;

      this._buildFloor(track);
      track.rows.forEach((row, i) => {
        if (row.kind === 'rift') return this._buildRift(row);
        if (row.kind === 'finish') return this._buildFinish(track, row);
        for (let w = 0; w < 2; w++) {
          for (let l = 0; l < 3; l++) {
            const c = row.cells[w][l];
            if (c) this._buildCell(row, w, l - 1, c);
          }
        }
      });
      for (const c of track.coins) {
        const m = new THREE.Mesh(c.world === 0 ? this.G.coin : this.G.gem, c.world === 0 ? this.M.coin : this.M.gem);
        m.position.set(c.lane * LW, c.y, -c.d);
        m.rotation.y = rnd() * 3;
        L.add(m);
        this.coinMeshes.push(m);
      }
      for (const s of track.shards) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: s.world === 0 ? 0x66ddff : 0xff66ee, emissiveIntensity: 1.6, transparent: true, flatShading: true });
        g.add(new THREE.Mesh(this.G.shard, mat));
        g.add(new THREE.Mesh(this.G.shardRing, mat));
        g.position.set(s.lane * LW, s.y, -s.d);
        g.userData.world = s.world;
        g.userData.mat = mat;
        L.add(g);
        this.shardMeshes.push(g);
      }
      this.mixShown = -1;
    }

    _disposeLevel() {
      this.levelGroup.traverse(o => {
        if (o.userData.ownGeo) o.geometry.dispose();
        if (o.userData.ownMat) o.material.dispose();
      });
      this.scene.remove(this.levelGroup);
      this.levelGroup = null;
    }

    _buildFloor(track) {
      const start = -45, end = track.length + 120;
      for (let w = 0; w < 2; w++) {
        const F = this.F[w];
        for (let l = -1; l <= 1; l++) {
          const holes = [];
          for (const row of track.rows) {
            const c = row.cells[w] && row.cells[w][l + 1];
            if (c && c.type === 'gap') holes.push({ a: row.d - C.DEPTH.gap / 2, b: row.d + C.DEPTH.gap / 2, collapse: c.collapse, d: row.d });
          }
          let from = start;
          for (const h of holes.concat([{ a: end, b: end }])) {
            if (h.a - from > 0.05) this._floorStrip(w, l, from, h.a, F.top, F.slab, this.floor[w]);
            if (h.b > h.a) {
              if (h.collapse) {
                const tile = this._floorStrip(w, l, h.a, h.b, F.crack, F.slab, this.floor[w]);
                this.collapseTiles.push({ mesh: tile, d: h.d, t: -1, baseX: tile.position.x });
              }
              // ghost marker so the other world can see this hole
              const gm = new THREE.Mesh(this.G.ghostGap, this.ghostMats[w]);
              gm.position.set(l * LW, 0.04, -h.d);
              this.levelGroup.add(gm);
            }
            from = h.b;
          }
        }
        // curbs along the path edges
        const len = end - start;
        const curbGeo = new THREE.BoxGeometry(0.35, w === 0 ? 0.35 : 0.08, len);
        for (const side of [-1, 1]) {
          const m = new THREE.Mesh(curbGeo, F.curb);
          m.position.set(side * (PATH_W / 2 - 0.1), w === 0 ? 0.08 : 0.04, -(start + end) / 2);
          m.userData.ownGeo = side === 1;
          this.floor[w].add(m);
        }
      }
    }

    _floorStrip(w, lane, a, b, topMat, slabMat, parent) {
      const len = b - a;
      const g = new THREE.Group();
      const extra = lane === 0 ? 0 : 0.4;      // outer lanes reach the curbs
      const width = LW + extra;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(width, len).rotateX(-Math.PI / 2), topMat);
      const uv = top.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (width / LW), uv.getY(i) * (len / LW));
      top.userData.ownGeo = true;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, len), slabMat);
      slab.position.y = -0.61;
      slab.userData.ownGeo = true;
      g.add(top, slab);
      g.position.set(lane * LW + Math.sign(lane) * extra / 2, 0, -(a + b) / 2);
      parent.add(g);
      return g;
    }

    _buildCell(row, w, lane, c) {
      const M = this.M, G = this.G;
      const g = new THREE.Group();
      const add = (geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z); m.scale.set(sx, sy, sz);
        g.add(m);
        return m;
      };
      const variant = c.enemy ? 'wraith' : c.variant;
      if (c.type === 'block') {
        if (variant === 'rock') {
          add(G.rock, M.rock, 0, 1.05, 0, 0.95, 1.15, 0.8).rotation.set(rnd(), rnd(), 0);
          add(G.rock, M.moss, 0, 2.0, 0, 0.55, 0.25, 0.5);
        } else if (variant === 'tree') {
          add(G.trunk, M.trunk, 0, 1.1, 0);
          add(G.canopy, M.leaf, 0, 2.6, 0, 1.0);
          add(G.canopy, M.leaf2, 0.3, 3.2, 0.2, 0.6);
        } else if (variant === 'crate') {
          add(G.crate, M.crate, 0, 0.53, 0); add(G.band, M.crateBand, 0, 0.53, 0);
          add(G.crate, M.crate, 0.05, 1.6, 0, 0.85); add(G.band, M.crateBand, 0.05, 1.6, 0, 0.85);
        } else if (variant === 'crystal') {
          add(G.crystal, M.crystal, 0, 1.35, 0, 0.9, 1.65, 0.9);
          add(G.crystal, M.crystal2, -0.55, 0.5, 0.1, 0.35, 0.7, 0.35).rotation.z = 0.4;
          add(G.crystal, M.crystal2, 0.5, 0.45, -0.1, 0.3, 0.6, 0.3).rotation.z = -0.4;
        } else if (variant === 'obelisk') {
          add(G.obelisk, M.obelisk, 0, 1.45, 0);
          add(G.rune, M.rune, 0, 1.45, -0.52);
        } else if (variant === 'wraith') {
          const body = new THREE.Group();
          g.add(body);
          const m1 = new THREE.Mesh(G.cloak, M.wraith); m1.position.y = 1.15; body.add(m1);
          const h = new THREE.Mesh(G.hood, M.wraith); h.position.y = 2.25; body.add(h);
          for (const x of [-0.15, 0.15]) { const e = new THREE.Mesh(G.eye, M.wraithEye); e.position.set(x, 2.27, -0.36); body.add(e); }
          for (const x of [-0.6, 0.6]) { const a = new THREE.Mesh(G.arm, M.wraith); a.position.set(x, 1.5, -0.2); a.rotation.z = x > 0 ? 2.2 : -2.2; a.rotation.x = -0.5; body.add(a); }
          add(G.ring, M.wraithRing, 0, 0.12, 0);
          this.enemies.push({ body, seed: rnd() * 10 });
        }
      } else if (c.type === 'low') {
        if (w === 0) {
          add(G.log, M.log, 0, 0.36, 0);
          for (const x of [-(LW - 0.15) / 2, (LW - 0.15) / 2]) add(G.logEnd, M.logRing, x, 0.36, 0);
          if (rnd() < 0.5) add(G.flower, M.flower2, (rnd() - 0.5) * 1.2, 0.75, 0);
        } else {
          add(G.plate, M.spikePlate, 0, 0.05, 0);
          for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) add(G.spike, M.spike, -0.8 + i * 0.4, 0.35, -0.22 + j * 0.44);
        }
      } else if (c.type === 'high') {
        if (w === 0) {
          for (const x of [-LW / 2 + 0.12, LW / 2 - 0.12]) add(G.post, M.archWood, x, 1.3, 0);
          add(G.bar, M.archWood, 0, 1.55, 0);
          for (let i = 0; i < 6; i++) {
            add(G.flower, i % 2 ? M.flower : M.flower2, -0.9 + i * 0.36, 1.86, -0.2);
            const v = add(G.vine, M.vine, -0.9 + i * 0.36 + 0.15, 1.05, -0.1, 1, 0.35 + rnd() * 0.3, 1);
            v.position.y = 1.27 - v.scale.y / 2;
          }
        } else {
          for (const x of [-LW / 2 + 0.15, LW / 2 - 0.15]) add(G.emitter, M.emitter, x, 1.2, 0);
          add(G.beam, M.beam, 0, 1.5, 0);
          const glow = add(G.beamGlow, M.beamGlow, 0, 1.5, 0);
          this.beams.push(glow);
        }
      } else {
        return;   // gaps are holes in the floor
      }
      if (c.mover) {
        const ring = new THREE.Mesh(G.ring, w === 0 ? M.moverRing0 : M.moverRing1);
        ring.position.y = 0.06;
        g.add(ring);
        this.movers.push({ g, ring, row, from: c.mover.from, to: lane, rock: variant === 'rock' ? g.children[0] : null });
        g.position.set(c.mover.from * LW, 0, -row.d);
      } else {
        g.position.set(lane * LW, 0, -row.d);
      }
      this.levelGroup.add(g);
    }

    _buildRift(row) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(this.G.torus, new THREE.MeshBasicMaterial({ color: 0xff66ff }));
      ring.scale.setScalar(4.6);
      ring.userData.ownMat = true;
      const inner = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform float uTime; varying vec2 vUv;
          void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
            float sw = sin(a * 5.0 + r * 12.0 - uTime * 5.0) * 0.5 + 0.5;
            vec3 c = mix(vec3(1.0, 0.75, 0.25), vec3(0.6, 0.25, 1.0), sw);
            gl_FragColor = vec4(c, (0.18 + 0.25 * sw) * smoothstep(1.0, 0.6, r)); }`,
      }));
      inner.userData.ownGeo = inner.userData.ownMat = true;
      g.add(ring, inner);
      g.position.set(0, 1.4, -row.d);
      this.levelGroup.add(g);
      this.rifts.push({ g, ring, inner, d: row.d });
    }

    _buildFinish(track, row) {
      const g = new THREE.Group();
      g.position.z = -row.d;
      if (track.cfg.finale) {
        // the final portal out of the collapsing dimensions
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
        const ring = new THREE.Mesh(this.G.torus, ringMat);
        ring.scale.setScalar(5.2); ring.position.y = 3; ring.userData.ownMat = true;
        const disc = new THREE.Mesh(new THREE.CircleGeometry(5.1, 48), new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.DoubleSide,
          uniforms: { uTime: { value: 0 } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: `uniform float uTime; varying vec2 vUv;
            void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
              float sw = sin(a * 7.0 - r * 16.0 + uTime * 6.0) * 0.5 + 0.5;
              vec3 c = mix(vec3(1.0), mix(vec3(0.5, 0.9, 1.0), vec3(1.0, 0.6, 1.0), sw), r);
              gl_FragColor = vec4(c, smoothstep(1.0, 0.85, r) * (0.75 + 0.25 * sw)); }`,
        }));
        disc.position.y = 3; disc.userData.ownGeo = disc.userData.ownMat = true;
        g.add(ring, disc);
        this.portal = { g, ring, disc };
      } else {
        const post = new THREE.MeshLambertMaterial({ color: 0xffffff });
        post.userData = {};
        for (const x of [-PATH_W / 2 - 0.2, PATH_W / 2 + 0.2]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), post);
          p.position.set(x, 2.5, 0); p.userData.ownGeo = true;
          g.add(p);
        }
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W + 0.9, 1.6), new THREE.MeshBasicMaterial({ map: textTex('FINISH', '#ffcf3a', '#222'), side: THREE.DoubleSide }));
        banner.position.set(0, 4.4, 0); banner.userData.ownGeo = banner.userData.ownMat = true;
        g.add(banner);
      }
      this.levelGroup.add(g);
    }

    // ---------------- per-frame update ----------------
    /**
     * view: { sim, mode: 'menu'|'countdown'|'play'|'paused'|'dead'|'finish'|'victory', modeT, instability, danger }
     */
    update(dt, view) {
      this.time += dt;
      const t = this.time;
      const sim = view.sim, P = sim.player;
      const mix = sim.dim.mix;
      const ms = U.smooth(mix);
      this._applyMix(ms, mix);

      // ---- runner pose ----
      const R = this.runner;
      const x = P.lat, y = P.y, z = -P.d;
      R.root.position.set(x, y, z);
      const running = view.mode === 'play';
      if (running) R.phase += dt * sim.speed * 0.62;
      let legL = 0, legR = 0, armL = 0, armR = 0, bodyX = -0.15, bodyY = 0;
      if (view.mode === 'menu' || view.mode === 'countdown') {
        bodyY = Math.sin(t * 2) * 0.03; armL = 0.1 * Math.sin(t * 2); armR = -armL; bodyX = 0;
      } else if (view.mode === 'dead') {
        if (sim.deathKind === 'gap') { legL = Math.sin(t * 20) * 0.6; legR = -legL; armL = armR = -2.7; bodyX = 0; }
        else { bodyX = Math.min(1.45, sim.deathT * 5); }
      } else if (view.mode === 'finish' || view.mode === 'victory') {
        R.phase += dt * 6 * Math.max(0.2, 1 - view.modeT);
        armL = armR = -2.8 + Math.sin(t * 8) * 0.2; legL = Math.sin(R.phase) * 0.5; legR = -legL; bodyX = 0;
      } else if (P.sliding) {
        bodyX = 1.15; bodyY = 0.15; legL = legR = -1.2; armL = armR = -0.6;
      } else if (P.y > 0.01) {
        legL = 0.7; legR = -0.3; armL = armR = -2.4; bodyX = -0.1;
      } else {
        legL = Math.sin(R.phase) * 0.95; legR = -legL;
        armL = -Math.sin(R.phase) * 0.85; armR = -armL;
        bodyY = Math.abs(Math.cos(R.phase)) * 0.1;
      }
      const k = U.damp(18, dt);
      R.legL.rotation.x = U.lerp(R.legL.rotation.x, legL, k); R.legR.rotation.x = U.lerp(R.legR.rotation.x, legR, k);
      R.armL.rotation.x = U.lerp(R.armL.rotation.x, armL, k); R.armR.rotation.x = U.lerp(R.armR.rotation.x, armR, k);
      R.body.position.y = U.lerp(R.body.position.y, bodyY, k);
      R.body.rotation.x = U.lerp(R.body.rotation.x, bodyX, U.damp(14, dt));
      R.body.rotation.z = U.lerp(R.body.rotation.z, U.clamp((P.lane * LW - P.lat) * -0.12, -0.3, 0.3), U.damp(10, dt));
      R.root.scale.setScalar(R.scale);
      R.shadow.position.set(x, 0.03, z);
      R.shadow.visible = !P.falling && R.scale > 0.2;
      R.shadow.scale.setScalar(Math.max(0.3, 1 - y * 0.25));

      // ---- level objects ----
      if (this.levelGroup) this._updateLevelObjects(dt, t, sim);

      // ---- scenery follows the runner ----
      const camZ = this.camera.position.z;
      for (let w = 0; w < 2; w++) {
        const s = U.smooth(w === 0 ? 1 - mix : mix);
        for (const g of this.scenery[w]) {
          const b = g.userData.base;
          while (g.position.z > camZ + 12) g.position.z -= SCENERY_SPAN;
          while (g.position.z < camZ - SCENERY_SPAN + 12) g.position.z += SCENERY_SPAN;
          g.visible = s > 0.02;
          if (!g.visible) continue;
          if (g.userData.far) {
            if (w === 0) g.scale.set(b.s, b.s * 0.45 * s, b.s);
            else g.scale.set(b.s, b.s * s, b.s);
          } else {
            g.scale.set(b.s, b.s * s, b.s);
          }
        }
      }
      this.groundL.position.z = this.groundR.position.z = this.abyss.position.z = z - 150;
      // ambient motes drift around the runner
      for (let w = 0; w < 2; w++) {
        const p = this.ambient[w];
        p.position.set(x * 0.5, 0, z + 10);
        p.material.opacity = (w === 0 ? 1 - ms : ms) * 0.85;
        p.visible = p.material.opacity > 0.02;
        p.rotation.y = 0;
        const pos = p.geometry.attributes.position;
        const fall = w === 0 ? -0.15 : 0.45;
        for (let i = 0; i < pos.count; i++) {
          let py = pos.getY(i) + fall * dt * (0.5 + (i % 5) * 0.2);
          if (py > 9) py = 0; if (py < 0) py = 9;
          pos.setY(i, py);
          pos.setX(i, pos.getX(i) + Math.sin(t + i) * dt * 0.3);
        }
        pos.needsUpdate = true;
      }

      // ---- sparks & effects ----
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.life -= dt;
        if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.material.dispose(); this.sparks.splice(i, 1); continue; }
        p.vel.y -= (p.grav ?? 12) * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.01, p.life / p.max) * (p.size || 1));
        p.mesh.rotation.x += dt * 7;
      }
      for (let i = this.fx.length - 1; i >= 0; i--) {
        const f = this.fx[i];
        f.t += dt;
        const u = f.t / f.dur;
        if (u >= 1) { this.scene.remove(f.mesh); f.mesh.material.dispose(); this.fx.splice(i, 1); continue; }
        f.update(f.mesh, u);
      }

      this._updateCamera(dt, t, view, sim);
      this.sky.position.copy(this.camera.position);
      this.sky.material.uniforms.uTime.value = t;
      this.sky.material.uniforms.uDanger.value = U.lerp(this.sky.material.uniforms.uDanger.value, view.danger || 0, U.damp(2, dt));
      this.sun.position.set(x + 8, 20, z + 6);
      this.sun.target.position.set(x, 0, z - 10);
    }

    _applyMix(ms, mix) {
      const A = this.themeCol[0], B = this.themeCol[1];
      const lc = (k, out) => out.copy(A[k]).lerp(B[k], ms);
      lc('fog', this.scene.fog.color);
      this.scene.fog.near = U.lerp(THEME[0].fogNear, THEME[1].fogNear, ms);
      this.scene.fog.far = U.lerp(THEME[0].fogFar, THEME[1].fogFar, ms);
      lc('hemiSky', this.hemi.color); lc('hemiGround', this.hemi.groundColor);
      this.hemi.intensity = U.lerp(THEME[0].hemiI, THEME[1].hemiI, ms);
      lc('sun', this.sun.color);
      this.sun.intensity = U.lerp(THEME[0].sunI, THEME[1].sunI, ms);
      lc('ground', this.groundMat.color);
      lc('abyss', this.abyssMat.color);
      this.sky.material.uniforms.uMix.value = ms;
      this.scarfMat.color.setHex(0xffb020).lerp(new THREE.Color(0xb04dff), ms);
      this.scarfMat.emissive.copy(this.scarfMat.color);
      this.amuletMat.emissive.setHex(0xffe066).lerp(new THREE.Color(0xd08aff), ms);

      if (Math.abs(this.mixShown - mix) < 1e-4) return;
      this.mixShown = mix;
      const op = [U.lerp(1, GHOST, ms), U.lerp(GHOST, 1, ms)];
      for (let w = 0; w < 2; w++) {
        for (const m of this.obMats[w]) {
          const base = m.userData.baseOpacity ?? 1;
          m.opacity = op[w] * base;
          m.depthWrite = op[w] > 0.6 && base === 1;
        }
        // gap markers only show while that world is the inactive one
        this.ghostMats[w].opacity = 0.45 * (w === 0 ? ms : 1 - ms);
      }
      if (this.floor) {
        this.floor[0].visible = mix < 0.5;
        this.floor[1].visible = mix >= 0.5;
      }
      for (const s of this.shardMeshes || []) s.userData.mat.opacity = s.userData.world === 0 ? op[0] : op[1];
    }

    _updateLevelObjects(dt, t, sim) {
      const P = sim.player, speed = sim.speed;
      for (const mv of this.movers) {
        const tA = (mv.row.d - P.d) / speed;
        // same timing the solver assumes: settled MOVER_SETTLE seconds before you arrive
        const p = 1 - U.clamp((tA - C.MOVER_SETTLE) / C.MOVER_DURATION, 0, 1);
        const lat = U.lerp(mv.from, mv.to, U.smooth(p)) * LW;
        if (mv.rock && mv.g.position.x !== lat) mv.rock.rotation.z -= (lat - mv.g.position.x) * 0.9;
        mv.g.position.x = lat;
        mv.ring.scale.setScalar(1 + 0.15 * Math.sin(t * 10));
      }
      for (const e of this.enemies) {
        e.body.position.y = 0.15 + Math.sin(t * 2.4 + e.seed) * 0.15;
        e.body.rotation.y = Math.sin(t * 1.3 + e.seed) * 0.25;
      }
      for (const b of this.beams) b.scale.set(1, 0.8 + Math.sin(t * 14) * 0.25, 0.8 + Math.sin(t * 14) * 0.25);
      for (const r of this.rifts) {
        r.ring.rotation.z += dt * 1.5;
        r.ring.material.color.setHSL((t * 0.25) % 1, 0.9, 0.65);
        r.inner.material.uniforms.uTime.value = t;
      }
      if (this.portal) {
        this.portal.ring.rotation.z -= dt;
        this.portal.disc.material.uniforms.uTime.value = t;
      }
      for (const tile of this.collapseTiles) {
        const dd = tile.d - P.d;
        if (tile.t < 0) {
          if (dd < speed * 1.35) tile.t = 0;
          else if (dd < speed * 3) tile.mesh.position.x = tile.baseX + Math.sin(t * 60 + tile.d) * 0.03;
        } else if (tile.t < 3) {
          tile.t += dt;
          tile.mesh.position.y = -9 * tile.t * tile.t;
          tile.mesh.rotation.x = tile.t * 0.8;
          tile.mesh.visible = tile.t < 2.5;
        }
      }
      const c0 = sim.coinCursor;
      for (let i = Math.max(0, c0 - 5); i < this.coinMeshes.length; i++) {
        const m = this.coinMeshes[i];
        if (m.position.z < -P.d - 150) break;
        m.rotation.y += dt * 3;
      }
      for (const s of this.shardMeshes) {
        s.rotation.y += dt * 2;
        s.children[1].rotation.x += dt * 3;
        s.position.y = 1.2 + Math.sin(t * 3) * 0.15;
      }
    }

    _updateCamera(dt, t, view, sim) {
      const P = sim.player, cam = this.camera;
      const x = P.lat, z = -P.d;
      if (view.mode === 'menu') {
        const a = Math.PI + Math.sin(t * 0.22) * 0.55;
        cam.position.set(x + Math.sin(a) * 6, 2.3 + Math.sin(t * 0.4) * 0.3, z + Math.cos(a) * 6);
        cam.lookAt(x, 1.4, z);
        cam.rotation.z = 0;
        return;
      }
      if (view.mode === 'finish' || view.mode === 'victory') {
        // swing round to face the runner
        const u = U.smooth(Math.min(1, view.modeT / 1.6));
        const a = U.lerp(0, Math.PI * 0.85, u);
        const dist = view.mode === 'victory' ? U.lerp(7, 13, u) : 6.5;
        const tx = x + Math.sin(a) * dist, tz = z + Math.cos(a) * dist, ty = view.mode === 'victory' ? U.lerp(3.6, 4.5, u) : U.lerp(3.6, 2.4, u);
        cam.position.lerp(new THREE.Vector3(tx, ty, tz), U.damp(5, dt));
        cam.lookAt(x, view.mode === 'victory' ? 2.6 : 1.3, z);
        return;
      }
      const alive = view.mode !== 'dead';
      const tx = x * 0.6, ty = 3.5 + (alive ? P.y * 0.3 : Math.max(P.y, -2) * 0.25), tz = z + 6.8;
      cam.position.x = U.lerp(cam.position.x, tx, U.damp(10, dt));
      cam.position.y = U.lerp(cam.position.y, ty, U.damp(8, dt));
      cam.position.z = alive ? tz : U.lerp(cam.position.z, tz, U.damp(3, dt));
      if (this.shake > 0) {
        cam.position.x += (rnd() - 0.5) * this.shake * 0.6;
        cam.position.y += (rnd() - 0.5) * this.shake * 0.6;
        this.shake = Math.max(0, this.shake - dt * 1.6);
      }
      cam.lookAt(x * 0.35, 1.3 + P.y * 0.25, z - 9);
      // Chaos/Final levels: the world feels unstable
      const inst = view.instability || 0;
      if (this.glitch > 0) this.glitch = Math.max(0, this.glitch - dt);
      const roll = inst * (Math.sin(t * 1.3) * 0.035 + Math.sin(t * 3.7) * 0.012) + (this.glitch > 0 ? (rnd() - 0.5) * 0.06 : 0);
      this.camRoll = U.lerp(this.camRoll, roll, U.damp(6, dt));
      cam.rotation.z += this.camRoll;
      const fov = this.baseFov + Math.max(0, sim.speed - 11) * 0.45 + inst * Math.sin(t * 0.9) * 1.5;
      if (Math.abs(cam.fov - fov) > 0.02) { cam.fov = U.lerp(cam.fov, fov, U.damp(3, dt)); cam.updateProjectionMatrix(); }
    }

    // ---------------- effects ----------------
    burst(pos, color, n = 10, opts = {}) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(this.G.spark, this.fxMat(color));
        m.position.copy(pos);
        this.scene.add(m);
        const sp = opts.speed || 5;
        this.sparks.push({
          mesh: m, life: opts.life || 0.5, max: opts.life || 0.5, size: opts.size || 1, grav: opts.grav,
          vel: new THREE.Vector3((rnd() - 0.5) * sp, rnd() * sp * 0.9 + (opts.up || 1), (rnd() - 0.5) * sp),
        });
      }
    }
    playerPos(yOff = 1) { const p = this.runner.root.position; return new THREE.Vector3(p.x, p.y + yOff, p.z); }
    hideCoin(i) {
      const m = this.coinMeshes[i];
      if (!m) return;
      m.visible = false;
      this.burst(m.position, m.material === this.M.coin ? 0xffd84a : 0xd08aff, 6, { speed: 4, life: 0.35 });
    }
    hideShard(i) {
      const s = this.shardMeshes[i];
      if (!s) return;
      s.visible = false;
      this.burst(s.position, 0xffffff, 26, { speed: 8, life: 0.7 });
    }
    switchFx(world) {
      const color = world === C.DARK ? 0xb04dff : 0xffd84a;
      const ring = new THREE.Mesh(this.G.torus, this.fxMat(color));
      ring.position.copy(this.playerPos(1));
      this.scene.add(ring);
      this.fx.push({ mesh: ring, t: 0, dur: 0.45, update: (m, u) => { m.scale.setScalar(0.5 + u * 7); m.material.opacity = 1 - u; } });
      this.burst(this.playerPos(1), color, 14, { speed: 7, life: 0.4, grav: 0 });
      this.camera.fov += 4; this.camera.updateProjectionMatrix();
    }
    riftFx() { this.shake = Math.max(this.shake, 0.3); this.glitch = 0.25; this.burst(this.playerPos(1.2), 0xff66ff, 24, { speed: 9, life: 0.5, grav: 0 }); }
    crashFx(kind) {
      this.shake = 0.8;
      if (kind !== 'gap') this.burst(this.playerPos(1), 0xffffff, 16, { speed: 6 });
    }
    bounceFx() { this.shake = 0.4; this.burst(this.playerPos(1), 0xffaa66, 8, { speed: 4 }); }
    pulseGlitch() { this.glitch = 0.18; this.shake = Math.max(this.shake, 0.12); }
    confetti() {
      const cols = [0xff6fa8, 0xffd84a, 0x6cc24a, 0x39f3ff, 0xb04dff];
      for (let i = 0; i < 5; i++) this.burst(this.playerPos(2.5), cols[i], 14, { speed: 9, up: 5, life: 1.8, size: 1.3, grav: 6 });
    }
    fireworks() {
      const cols = [0xfff2b0, 0xb04dff, 0x39f3ff, 0xff66ee, 0xffd84a];
      const p = this.playerPos(0);
      const c = new THREE.Vector3(p.x + (rnd() - 0.5) * 14, 6 + rnd() * 6, p.z - 4 - rnd() * 8);
      this.burst(c, cols[(rnd() * cols.length) | 0], 30, { speed: 11, up: 0, life: 1.4, size: 1.2, grav: 3 });
    }
    render() { this.renderer.render(this.scene, this.camera); }
  }

  DR.World = World;
})();
