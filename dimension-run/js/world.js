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

  // Every level has its own look (see themes.js). Level 1 uses the defaults above.
  const LEVEL_THEMES = DR.dress.LEVEL_THEMES;
  const themeKeys = (field) => [...new Set(Object.values(LEVEL_THEMES).flatMap(t => Object.keys(t[field] || {})))];
  const MAT_KEYS = themeKeys('mats'), SCN_KEYS = themeKeys('scn');

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
      // white lines: the level theme picks the glow colour through the emissive colour
      g.strokeStyle = '#ffffff'; g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        let x = rnd() * S, y = rnd() * S;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = '#cccccc';
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
  function dotTex() {
    return canvasTex(32, 32, (g, S) => {
      const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
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
        crack: crackTex(), blob: blobTex(), dot: dotTex(),
      };

      this._makeMaterials();
      this._makeGeometries();
      this._makeSky();
      this._makeGround();
      this._makeScenery();
      this._makeAmbient();
      this._makeWeather();
      this._makeSpeedLines();
      this._makeSmoke();
      this.runner = this._makeRunner();
      // shield bubble and magnet ring shown around the runner while active
      this.bubble = new THREE.Mesh(this.G.shieldBall, new THREE.MeshBasicMaterial({ color: 0x7ae8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.magnetFx = new THREE.Group();
      for (let k = 0; k < 2; k++) {
        const r = new THREE.Mesh(this.G.magnetRing, new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
        r.position.y = 0.15 + k * 0.9; this.magnetFx.add(r);
      }
      this.scene.add(this.bubble, this.magnetFx);
      this.landmarks = [];
      this.lightningT = 4;
      this.flashV = 0;
      this.meteorT = 2;
      this.eruptT = 1;
      this.lastD = 0;
      this.setTheme(1);
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
      const glow = (color, ei = 1, extra = {}) => {
        const m = T(new THREE.MeshStandardMaterial(Object.assign({ color, emissive: color, emissiveIntensity: ei, roughness: 0.4, metalness: 0.1, flatShading: true }, extra)));
        m.userData.glow = true;
        return m;
      };
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
      this.SK = DR.dress.skinMaterials();
      this.obMats[0].push(...Object.values(this.SK));
      // treasure chests: one material set per world so the inactive world's chests ghost
      // diamonds: one material per world so the other world's diamonds ghost
      this.gemMats = [0, 1].map(w => {
        const m = T(new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0x2ab8ff, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.08, flatShading: true }));
        this.obMats[w].push(m);
        return m;
      });
      this.chestMats = [0, 1].map(w => {
        const m = {
          wood: lam(w ? 0x3a2a5a : 0x8a5a2a), band: T(new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0x8a5a00, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 })),
          gem: glow(w ? 0xff4dd2 : 0x39f3ff, 1.4),
        };
        this.obMats[w].push(m.wood, m.band, m.gem);
        return m;
      });
      this.M.beamGlow.userData.baseOpacity = 0.3;
      this.obMats[1].push(this.M.beamGlow);
      Object.assign(this.M, { monBody: lam(0x5a1a7a), monEye: basic(0xfff4e0), monPupil: basic(0xff2a1a), monHorn: lam(0xe8dcc0), monTooth: lam(0xffffff) });
      this.obMats[1].push(this.M.monBody, this.M.monEye, this.M.monPupil, this.M.monHorn, this.M.monTooth);
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
      this.fxMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    }

    _makeGeometries() {
      Object.assign(this, { SKG: DR.dress.skinGeometries() });
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
        diamond: new THREE.OctahedronGeometry(0.42, 0).scale(1, 1.35, 1), diamondRing: new THREE.TorusGeometry(0.62, 0.035, 6, 28),
        diamondGlow: new THREE.SphereGeometry(0.85, 14, 10),
        pad: new THREE.PlaneGeometry(LW - 0.35, 2.4).rotateX(-Math.PI / 2),
        chest: new THREE.BoxGeometry(1.1, 0.6, 0.75), lid: new THREE.BoxGeometry(1.12, 0.22, 0.77),
        chestBand: new THREE.BoxGeometry(0.12, 0.64, 0.79), lock: new THREE.BoxGeometry(0.18, 0.2, 0.06),
        beam: new THREE.CylinderGeometry(0.5, 0.7, 14, 16, 1, true),
        spark: new THREE.BoxGeometry(0.14, 0.14, 0.14),
        torus: new THREE.TorusGeometry(1, 0.08, 8, 40),
        shieldBall: new THREE.SphereGeometry(1.25, 24, 16),
        magnetRing: new THREE.TorusGeometry(0.75, 0.05, 6, 32).rotateX(Math.PI / 2),
      };
    }

    _makeSky() {
      const uniforms = {
        lTop: { value: new THREE.Color(THEME[0].skyTop) }, lHor: { value: new THREE.Color(THEME[0].skyHor) },
        dTop: { value: new THREE.Color(THEME[1].skyTop) }, dHor: { value: new THREE.Color(THEME[1].skyHor) },
        uMix: { value: 0 }, uTime: { value: 0 }, uDanger: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.35, 0.32, -1).normalize() }, uSunCol: { value: new THREE.Color('#fff0c0') }, uSunSize: { value: 1 },
        uMoonCol: { value: new THREE.Color('#d8c0ff') }, uAurora: { value: 0 }, uFlash: { value: 0 }, uGlitch: { value: 0 },
        uMirror: { value: 0 }, uStarsL: { value: 0 }, uNeb: { value: 0 }, uVortex: { value: 0 },
        uNebL1: { value: new THREE.Color() }, uNebL2: { value: new THREE.Color() }, uNebD1: { value: new THREE.Color() }, uNebD2: { value: new THREE.Color() },
        uVortexL: { value: new THREE.Color() }, uVortexD: { value: new THREE.Color() }, uSynth: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 lTop, lHor, dTop, dHor, uSunDir, uSunCol, uMoonCol, uNebL1, uNebL2, uNebD1, uNebD2, uVortexL, uVortexD;
          uniform float uMix, uTime, uDanger, uSunSize, uAurora, uFlash, uGlitch, uMirror, uStarsL, uNeb, uVortex, uSynth; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
          void main(){
            // floating levels (space, time) have sky below the horizon too
            float h = mix(clamp(vDir.y, 0.0, 1.0), abs(vDir.y), uMirror);
            vec3 l = mix(lHor, lTop, pow(h, 0.55));
            float s = max(dot(vDir, uSunDir), 0.0);
            float se = 0.0025 * uSunSize;
            float sm = smoothstep(1.0 - se, 1.0 - se * 0.4, s);
            if (uSynth > 0.5) {
              // retro sunset sun: yellow to pink, sliced by stripes that widen towards the horizon
              float dy = vDir.y - uSunDir.y;
              vec3 sc = mix(vec3(1.0, 0.2, 0.6), vec3(1.0, 0.85, 0.25), smoothstep(-0.1, 0.12, dy));
              float gap = dy < 0.0 ? step(0.25 + (-dy) * 5.0, fract(-dy * 50.0)) : 1.0;
              l = mix(l, sc, sm * gap * 0.92) + vec3(1.0, 0.2, 0.55) * pow(s, 6.0) * 0.18;
            } else {
              l += uSunCol * (sm + pow(s, 8.0 / uSunSize) * 0.18 * uSunSize);
            }
            vec3 d = mix(dHor, dTop, pow(h, 0.5));
            vec3 cell = floor(vDir * 170.0); float sv = hash(cell);
            float st = step(0.995 - 0.004 * uStarsL, sv) * mix(smoothstep(0.04, 0.35, h), 1.0, uMirror) * (0.55 + 0.45 * sin(uTime * 3.0 + sv * 30.0));
            d += vec3(0.9, 0.85, 1.0) * st;
            l += vec3(0.95, 0.95, 1.0) * st * uStarsL;
            // nebula clouds (Deep Space)
            float n1 = sin(vDir.x * 3.1 + sin(vDir.y * 5.3 + uTime * 0.05) * 1.7) * sin(vDir.z * 2.3 + vDir.y * 4.1);
            float n2 = sin(vDir.x * 6.7 - vDir.z * 3.3 + 1.3) * sin(vDir.y * 7.9 + vDir.x * 2.1);
            float neb = smoothstep(0.05, 0.9, n1 * 0.65 + n2 * 0.35 + 0.15), neb2 = smoothstep(0.35, 1.0, n2);
            l += (uNebL1 * neb + uNebL2 * neb2) * 0.5 * uNeb;
            d += (uNebD1 * neb + uNebD2 * neb2) * 0.5 * uNeb;
            // swirling time vortex (Time Rift)
            if (uVortex > 0.0) {
              vec3 vd = normalize(vec3(0.0, 0.2, -1.0));
              vec3 ax1 = normalize(cross(vd, vec3(0.0, 1.0, 0.0))), ax2 = cross(ax1, vd);
              float r = acos(clamp(dot(vDir, vd), -1.0, 1.0)), a = atan(dot(vDir, ax2), dot(vDir, ax1));
              float sp = sin(a * 5.0 + r * 16.0 - uTime * 2.2) * 0.5 + 0.5;
              float vm = smoothstep(1.4, 0.05, r) * pow(sp, 2.0) * uVortex;
              l += uVortexL * vm * 0.7; d += uVortexD * vm * 0.9;
            }
            vec3 md = normalize(vec3(-0.4, 0.28, -1.0)); float m = max(dot(vDir, md), 0.0);
            d += uMoonCol * smoothstep(0.9982, 0.9992, m) + uMoonCol * 0.5 * pow(m, 24.0) * 0.4;
            // aurora curtains (Frozen Peaks)
            float ab = smoothstep(0.1, 0.32, h) * smoothstep(0.8, 0.42, h);
            float wave = sin(vDir.x * 5.0 + uTime * 0.35 + sin(vDir.z * 3.0 + uTime * 0.25) * 2.2);
            float band = smoothstep(0.45, 1.0, wave) * (0.65 + 0.35 * sin(vDir.x * 40.0 + uTime * 1.7));
            vec3 aur = mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.3, 1.0), smoothstep(0.2, 0.7, h)) * band * ab * uAurora;
            l += aur * 0.3; d += aur;
            vec3 col = mix(l, d, uMix);
            col = mix(col, vec3(0.55, 0.06, 0.12) * (0.6 + 0.4 * (1.0 - h)), uDanger * 0.55);
            // reality tearing (Toxic Chaos): horizontal colour-shifted bands
            float gb = step(0.82, fract(sin(floor(vDir.y * 36.0 + floor(uTime * 14.0)) * 1.7) * 437.5)) * uGlitch;
            col = mix(col, col.gbr * 1.4 + vec3(0.1, 0.0, 0.15), gb);
            col += vec3(1.0, 0.92, 0.96) * uFlash * 0.85;
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
      const glow = c => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, flatShading: true }); m.userData.glow = true; return m; };
      const S = (this.S = {
        trunk: lam(0x6b4527), leafA: lam(0x3f9a3a), leafB: lam(0x6cc24a), leafC: lam(0x2f7d38),
        bush: lam(0x4fae45), petal: [lam(0xff6fa8), lam(0xffd84a), lam(0xffffff), lam(0x8fd3ff)], stone: lam(0xa69a8a),
        hill: lam(0x63b850), deadTrunk: lam(0x221a2e), stem: lam(0xd8cfe8), cap: [glow(0x39f3ff), glow(0xff4dd2), glow(0x9b4dff)],
        crystal: glow(0x7a4dff), rockDark: lam(0x2a2140),
      });
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
          g.userData.kind = kind;
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
          g.userData.kind = 'far';
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

    // level weather: leaves, sandstorm, snow, spores or embers (one particle system, restyled per level)
    _makeWeather() {
      const N = 700;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { pos[i * 3] = (rnd() - 0.5) * 50; pos[i * 3 + 1] = rnd() * 18; pos[i * 3 + 2] = -rnd() * 110 + 10; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const col = new Float32Array(N * 3), c = new THREE.Color();
      for (let i = 0; i < N; i++) { c.setHSL(rnd(), 0.9, 0.62); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ map: this.tex.dot, size: 0.2, transparent: true, depthWrite: false });
      this.weather = new THREE.Points(g, m);
      this.weather.frustumCulled = false;
      this.scene.add(this.weather);
    }

    // streaks that rush past the camera at high speed
    _makeSpeedLines() {
      const N = 60;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
      this.speedSeeds = [];
      for (let i = 0; i < N; i++) this.speedSeeds.push({ a: rnd() * Math.PI * 2, r: 2.6 + rnd() * 4, z: -rnd() * 60, len: 2 + rnd() * 4 });
      const m = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      this.speedLines = new THREE.LineSegments(g, m);
      this.speedLines.frustumCulled = false;
      this.camera.add(this.speedLines);
      this.scene.add(this.camera);
    }

    _tint(mat, hex) {
      if (mat.userData.orig === undefined) mat.userData.orig = mat.color.getHex();
      const c = hex ?? mat.userData.orig;
      mat.color.setHex(c);
      if (mat.userData.glow) mat.emissive.setHex(c);
    }

    setTheme(id) {
      const T = LEVEL_THEMES[id] || LEVEL_THEMES[1];
      if (this.themeId === id) return;
      this.themeId = id;
      this.lt = T;
      this.themeName = T.name;
      this.theme = [Object.assign({}, THEME[0], T.light), Object.assign({}, THEME[1], T.dark)];
      this.themeCol = this.theme.map(t => {
        const o = {};
        for (const k in t) if (typeof t[k] === 'string') o[k] = new THREE.Color(t[k]);
        return o;
      });
      const u = this.sky.material.uniforms, sk = T.sky || {};
      u.lTop.value.set(this.theme[0].skyTop); u.lHor.value.set(this.theme[0].skyHor);
      u.dTop.value.set(this.theme[1].skyTop); u.dHor.value.set(this.theme[1].skyHor);
      u.uSunDir.value.set(...(sk.sunDir || [0.35, 0.32, -1])).normalize();
      u.uSunCol.value.set(sk.sunCol || '#fff0c0');
      u.uSunSize.value = sk.sunSize || 1;
      u.uMoonCol.value.set(sk.moonCol || '#d8c0ff');
      u.uAurora.value = sk.aurora || 0;
      u.uMirror.value = sk.mirror || 0;
      u.uStarsL.value = sk.starsL || 0;
      u.uNeb.value = sk.neb || 0;
      const nl = sk.nebL || ['#000000', '#000000'], nd = sk.nebD || nl;
      u.uNebL1.value.set(nl[0]); u.uNebL2.value.set(nl[1]); u.uNebD1.value.set(nd[0]); u.uNebD2.value.set(nd[1]);
      u.uVortex.value = sk.vortex || 0;
      u.uVortexL.value.set(sk.vortexL || '#ffffff'); u.uVortexD.value.set(sk.vortexD || '#ffffff');
      u.uSynth.value = sk.synth || 0;
      this.groundL.visible = this.groundR.visible = !T.noGround;

      // floors
      const fl = T.floor;
      const FT = {
        stone: this.tex.lightFloor, metal: DR.dress.tex('metalFloor'), clock: DR.dress.tex('clockFloor'), basalt: DR.dress.tex('basaltFloor'),
        candy: DR.dress.tex('candyFloor'), grid: DR.dress.tex('gridFloor'), cloud: DR.dress.tex('cloudFloor'), holo: DR.dress.tex('holoFloor'),
      };
      const glowName = fl.glow || (fl.tex === 'basalt' ? 'lavaGlow' : null);
      const glow = glowName ? DR.dress.tex(glowName) : null;
      for (const m of [this.F[0].top]) {
        m.map = FT[fl.tex] || FT.stone;
        m.emissiveMap = glow;
        m.emissive.setHex(glow ? (fl.glowColor || 0xffffff) : 0x000000);
        m.needsUpdate = true;
      }
      // a glowing grid on the ground that runs to the horizon (Neon Overdrive)
      if (!this.groundGrid) {
        this.groundGrid = DR.dress.tex('gridGlow').clone();
        this.groundGrid.needsUpdate = true;
        this.groundGrid.repeat.set(70, 90);
      }
      this.groundMat.emissiveMap = T.groundGlow ? this.groundGrid : null;
      this.groundMat.emissive.setHex(T.groundGlow ? T.groundGlow[0] : 0x000000);
      this.groundMat.needsUpdate = true;
      this.F[0].crack.map = this.F[0].top.map; this.F[0].crack.needsUpdate = true;
      this.F[0].top.color.setHex(fl.light); this.F[0].crack.color.setHex(fl.light);
      this.F[0].curb.color.setHex(fl.curb);
      this.F[1].top.emissive.setHex(fl.dark); this.F[1].top.color.setHex(fl.darkTint);
      this.F[1].curb.color.setHex(fl.darkCurb);
      // obstacles & scenery
      for (const k of MAT_KEYS) this._tint(this.M[k], T.mats && T.mats[k]);
      for (const k of SCN_KEYS) {
        const v = T.scn && T.scn[k];
        if (Array.isArray(this.S[k])) this.S[k].forEach((m, i) => this._tint(m, v && v[i]));
        else this._tint(this.S[k], v);
      }
      this.ambient[0].material.color.setHex(T.ambient[0]);
      this.ambient[1].material.color.setHex(T.ambient[1]);
      // weather
      const wt = T.weather, wm = this.weather.material;
      wm.color.setHex(wt.rainbow ? 0xffffff : wt.color); wm.size = wt.size; wm.opacity = wt.opacity;
      wm.vertexColors = !!wt.rainbow;
      wm.blending = wt.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      wm.needsUpdate = true;
      this.weather.geometry.setDrawRange(0, wt.count);
      this.speedLines.material.color.setHex(T.accent);
      this._buildProps(T);
      this._buildCreatures(T);
      this.smokePreset = T.smoke ? DR.dress.SMOKE[T.smoke] : null;
      this.mixShown = -1;
    }

    // themed scenery: hides default pools the theme does not want and builds its own props
    _buildProps(T) {
      for (const g of this.props || []) (g.userData.sky ? this.scene : this.scene).remove(g);
      if (this.propRes) this.propRes.dispose();
      for (let w = 0; w < 2; w++) {
        this.scenery[w] = this.scenery[w].filter(g => !g.userData.prop);
        const hide = (T.hide && T.hide[w]) || [];
        for (const g of this.scenery[w]) g.userData.hidden = hide.includes(g.userData.kind);
      }
      const R = (this.propRes = DR.dress.Res());
      this.props = [];
      this.skyProps = [];
      for (const p of T.props || []) {
        const n = p.place === 'sky' ? 1 : p.n;
        for (let i = 0; i < n; i++) {
          const g = DR.dress.PROPS[p.kind](R, p.variant);
          const ud = g.userData, side = i % 2 ? 1 : -1;
          const sr = ud.s || [1, 1], s = sr[0] + rnd() * (sr[1] - sr[0]);
          const yr = ud.y || [0, 0], y = yr[0] + rnd() * (yr[1] - yr[0]);
          ud.prop = true; ud.world = p.world;
          if (p.place === 'sky') {
            ud.sky = true;
            g.traverse(o => { if (o.material) o.material.fog = false; });
            g.scale.setScalar(s);
            ud.base = { s };
            this.skyProps.push(g);
          } else {
            let x;
            if (p.place === 'path') x = 0;
            else if (ud.x) x = side * (ud.x[0] + rnd() * (ud.x[1] - ud.x[0]));
            else if (p.place === 'far') x = side * (45 + rnd() * 70);
            else x = side * (PATH_W / 2 + 2.2 + Math.pow(rnd(), 1.3) * 16);
            ud.base = { x, y, z: -(i / n) * SCENERY_SPAN + 20 + rnd() * 3, s };
            ud.far = p.place === 'far';
            ud.face = side > 0 ? -Math.PI / 2 : Math.PI / 2;   // clocks turn towards the path
            g.position.set(x, y, ud.base.z);
            g.rotation.y = ud.faceSide ? Math.PI / 2 : (ud.anim ? 0 : rnd() * 6.28);
            this.scenery[p.world].push(g);
          }
          this.scene.add(g);
          this.props.push(g);
        }
      }
    }

    // animals and other flying things
    _buildCreatures(T) {
      for (const c of this.creatures || []) this.scene.remove(c.g);
      if (this.creatureRes) this.creatureRes.dispose();
      const R = (this.creatureRes = DR.dress.Res());
      this.creatures = [];
      for (const spec of T.creatures || []) {
        for (let i = 0; i < spec.n; i++) {
          const c = DR.dress.CREATURES[spec.kind](R, spec.variant);
          c.world = spec.world;
          c.seed = rnd() * 100;
          c.vel = new THREE.Vector3();
          c.fresh = true;
          this.scene.add(c.g);
          this.creatures.push(c);
        }
      }
    }

    // ---------------- the runner ----------------
    _makeRunner() {
      const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
      const skin = lam(0xe8b98f), shirt = lam(0xf2f2f2), pants = lam(0x34405e), boots = lam(0x2a1c14), hair = lam(0x3a2414);
      this.shirtMat = shirt; this.pantsMat = pants;
      this.scarfBase = new THREE.Color(0xffb020);
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
      const hatSlot = new THREE.Group(); hatSlot.position.y = 0.25; head.add(hatSlot);
      const backSlot = new THREE.Group(); backSlot.position.set(0, 1.33, 0.2); body.add(backSlot);
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
      // the pet runs a little behind and to the right; it rides on the root, so it jumps and changes lanes with you
      const petSlot = new THREE.Group(); petSlot.position.set(1.05, 0, 0.3); petSlot.scale.setScalar(1.3); root.add(petSlot);
      return { root, body, head, armL, armR, legL, legR, shadow, hatSlot, backSlot, petSlot, phase: 0, scale: 1 };
    }

    /** 3D pieces that make each outfit more than a colour: masks, robes, boots, stripes... */
    _outfitDetails(id, X) {
      const R = this.runner;
      for (const m of this.outfitParts || []) if (m.parent) m.parent.remove(m);
      this.outfitParts = [];
      const add = (parent, w, h, d, c, x, y, z) => {
        const m = X.mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? X.lam(c) : c, x, y, z);
        parent.add(m);
        this.outfitParts.push(m);
        return m;
      };
      const body = R.body, head = R.head, arms = [R.armL, R.armR], legs = [R.legL, R.legR];
      // body coordinates: torso spans y 0.98..1.68, front face at z -0.17; head centre y 1.88, face at z -0.19
      // arm pivots hang 0.6 down; leg pivots hang 0.9 down with the boot at the bottom
      switch (id) {
        case 'explorer':
          add(body, 0.62, 0.08, 0.36, 0x6a4422, 0, 1.03, 0);              // belt
          add(body, 0.14, 0.13, 0.07, 0x8a5a2a, 0.19, 1.0, -0.2);         // pouch
          add(body, 0.06, 0.06, 0.02, 0xffcf3a, 0.19, 1.03, -0.24);
          break;
        case 'ninja': {
          add(head, 0.4, 0.17, 0.4, 0x1c1c26, 0, -0.11, 0);               // face mask (eyes stay visible)
          add(head, 0.41, 0.07, 0.41, 0xff2a3a, 0, 0.08, 0);              // headband
          for (const sx of [-1, 1]) {
            const t = add(head, 0.06, 0.32, 0.03, 0xff2a3a, sx * 0.06, -0.08, 0.24);
            t.rotation.x = 0.5; t.rotation.z = sx * 0.25;
          }
          add(body, 0.63, 0.09, 0.37, 0xff2a3a, 0, 1.03, 0);              // sash
          add(body, 0.1, 0.22, 0.04, 0xff2a3a, 0.22, 0.9, -0.17);
          for (const a of arms) add(a, 0.17, 0.2, 0.18, 0x55555f, 0, -0.42, 0);   // arm wraps
          for (const l of legs) add(l, 0.23, 0.12, 0.24, 0x55555f, 0, -0.72, 0);
          break;
        }
        case 'royal':
          add(body, 0.66, 0.46, 0.4, 0x6a2a9a, 0, 0.8, 0);                 // robe over the legs
          add(body, 0.68, 0.06, 0.42, 0xffcf3a, 0, 0.58, 0);              // gold hem
          add(body, 0.07, 0.86, 0.02, 0xffcf3a, 0, 1.16, -0.205);         // gold trim down the front
          for (const sx of [-1, 1]) add(body, 0.18, 0.07, 0.38, 0xffcf3a, sx * 0.33, 1.7, 0);   // shoulder pieces
          add(body, 0.52, 0.12, 0.42, 0xfaf6ee, 0, 1.73, 0);              // white fur collar
          for (const x of [-0.12, 0.04, 0.16]) add(body, 0.03, 0.03, 0.01, 0x111111, x, 1.73, -0.215);
          break;
        case 'astro': {
          add(body, 0.32, 0.22, 0.04, 0x9aa0b0, 0, 1.4, -0.19);           // chest control panel
          [0xff3a3a, 0x3aff7a, 0x3a9aff].forEach((c, i) => add(body, 0.05, 0.05, 0.02, X.glow(c), -0.09 + i * 0.09, 1.43, -0.215));
          add(body, 0.22, 0.03, 0.02, X.glow(0x7affd8), 0, 1.34, -0.215);
          for (const sx of [-1, 1]) add(body, 0.2, 0.12, 0.38, 0xf4f4f8, sx * 0.34, 1.66, 0);   // shoulder pads
          for (const a of arms) add(a, 0.17, 0.06, 0.17, 0xff7a1a, 0, -0.16, 0);                 // orange arm stripes
          for (const l of legs) { add(l, 0.3, 0.22, 0.42, 0xf4f4f8, 0, -0.8, -0.06); add(l, 0.24, 0.08, 0.24, 0xc8c8d4, 0, -0.42, -0.02); }   // moon boots, knee pads
          break;
        }
        case 'pirate': {
          for (let i = 0; i < 4; i++) add(body, 0.61, 0.06, 0.35, 0xf4f0e8, 0, 1.1 + i * 0.14, 0);   // striped shirt
          add(body, 0.62, 0.08, 0.36, 0x1a1a1a, 0, 1.03, 0);              // belt
          add(body, 0.12, 0.1, 0.02, 0xffcf3a, 0, 1.03, -0.19);           // buckle
          add(head, 0.11, 0.09, 0.02, 0x111111, -0.09, 0.02, -0.2);       // eyepatch
          const strap = add(head, 0.42, 0.025, 0.42, 0x111111, 0, 0.04, 0); strap.rotation.z = 0.3;
          for (const l of legs) add(l, 0.26, 0.12, 0.27, 0x5a3a1a, 0, -0.68, 0);   // boot cuffs
          break;
        }
        case 'jungle': {
          for (let i = 0; i < 10; i++) {                                    // leaf skirt
            const a = i / 10 * Math.PI * 2;
            const leaf = add(body, 0.13, 0.42, 0.03, i % 2 ? 0xc8e83a : 0x9adc2a, Math.sin(a) * 0.34, 0.8, Math.cos(a) * 0.22);
            leaf.rotation.y = a; leaf.rotation.x = Math.cos(a) * 0.25; leaf.rotation.z = -Math.sin(a) * 0.25;   // flared out
          }
          add(body, 0.62, 0.07, 0.36, 0x6a4a1a, 0, 1.0, 0);               // rope belt
          for (const a of arms) { add(a, 0.17, 0.05, 0.17, 0x3a8a2a, 0, -0.3, 0); add(a, 0.17, 0.05, 0.17, 0x3a8a2a, 0, -0.45, 0); }   // vine bracelets
          for (const sx of [-1, 1]) for (const y of [-0.04, -0.09]) add(head, 0.08, 0.025, 0.02, 0xff8a1a, sx * 0.12, y, -0.195);   // face paint
          break;
        }
        case 'ice': {
          add(body, 0.68, 0.15, 0.42, 0xffffff, 0, 1.68, 0);              // fur collar
          for (const a of arms) add(a, 0.2, 0.09, 0.2, 0xffffff, 0, -0.55, 0);   // fur cuffs
          for (const l of legs) add(l, 0.27, 0.11, 0.28, 0xffffff, 0, -0.7, 0);  // fur boot tops
          for (let i = 0; i < 3; i++) { const f = add(body, 0.2, 0.025, 0.02, X.glow(0x39d8ff), 0, 1.36, -0.19); f.rotation.z = i * Math.PI / 3; }   // snowflake badge
          break;
        }
      }
    }

    /** Dress the runner: { hat, outfit, back } ids from DR.COSMETICS. */
    applyOutfit(eq) {
      const R = this.runner, find = (slot, id) => DR.COSMETICS[slot].find(i => i.id === id) || DR.COSMETICS[slot][0];
      if (this.outfitRes) this.outfitRes.dispose();
      const X = (this.outfitRes = DR.dress.Res());
      R.hatSlot.clear(); R.backSlot.clear(); R.petSlot.clear();
      this.pet = eq.pet && eq.pet !== 'none' ? DR.pets.build(eq.pet, X) : null;
      if (this.pet) R.petSlot.add(this.pet.g);
      this.backAnim = null;
      const o = find('outfit', eq.outfit);
      this.shirtMat.color.setHex(o.shirt); this.pantsMat.color.setHex(o.pants); this.scarfBase.setHex(o.scarf);
      this._outfitDetails(o.id, X);
      const gold = X.std(0xffcf3a, { metalness: 0.9, roughness: 0.25, emissive: 0x6a4a00 });
      const hat = R.hatSlot, back = R.backSlot;
      switch (eq.hat) {
        case 'crown':
          hat.add(X.mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.14, 10, 1, true), X.std(0xffcf3a, { metalness: 0.9, roughness: 0.25, emissive: 0x6a4a00, side: THREE.DoubleSide }), 0, 0.05, 0));
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; hat.add(X.mesh(new THREE.ConeGeometry(0.05, 0.14, 4), gold, Math.cos(a) * 0.22, 0.18, Math.sin(a) * 0.22)); }
          hat.add(X.mesh(new THREE.OctahedronGeometry(0.05), X.glow(0xff2a55), 0, 0.06, -0.24));
          break;
        case 'cowboy':
          hat.add(X.mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 16), X.lam(0x8a5a2a), 0, 0.01, 0));
          hat.add(X.mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.24, 10), X.lam(0x8a5a2a), 0, 0.13, 0));
          hat.add(X.mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.05, 10), X.lam(0x2a1a0a), 0, 0.05, 0));
          break;
        case 'wizard': {
          hat.add(X.mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 16), X.lam(0x3a2a8a), 0, 0.01, 0));
          const c = X.mesh(new THREE.ConeGeometry(0.24, 0.7, 10), X.lam(0x3a2a8a), 0, 0.36, 0); c.rotation.z = 0.15; hat.add(c);
          for (let i = 0; i < 4; i++) hat.add(X.mesh(new THREE.OctahedronGeometry(0.04), X.glow(0xffe066), Math.cos(i * 1.7) * 0.17, 0.12 + i * 0.12, Math.sin(i * 1.7) * 0.17 - 0.04));
          break;
        }
        case 'tophat':
          hat.add(X.mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), X.lam(0x111111), 0, 0.01, 0));
          hat.add(X.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 14), X.lam(0x111111), 0, 0.22, 0));
          hat.add(X.mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.07, 14), X.lam(0xc8302a), 0, 0.07, 0));
          break;
        case 'helmet':
          hat.add(X.mesh(new THREE.SphereGeometry(0.36, 18, 12), X.add(0x9ad8ff, { opacity: 0.35 }), 0, -0.23, 0));
          hat.add(X.mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 20).rotateX(Math.PI / 2), X.lam(0xf4f4f8), 0, -0.52, 0));
          hat.add(X.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 4), X.lam(0xcccccc), 0.2, 0.12, 0));
          hat.add(X.mesh(new THREE.SphereGeometry(0.04, 6, 6), X.glow(0xff3a3a), 0.2, 0.25, 0));
          break;
        case 'viking':
          hat.add(X.mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), X.std(0x9aa0a8, { metalness: 0.8, roughness: 0.4 }), 0, -0.05, 0));
          for (const sx of [-1, 1]) { const h = X.mesh(new THREE.ConeGeometry(0.06, 0.32, 8), X.lam(0xf4ecd8), sx * 0.27, 0.1, 0); h.rotation.z = -sx * 0.9; hat.add(h); }
          break;
        case 'party': {
          const c = X.mesh(new THREE.ConeGeometry(0.17, 0.45, 12), X.lam(0xff4da6), 0, 0.22, 0); hat.add(c);
          hat.add(X.mesh(new THREE.SphereGeometry(0.06, 8, 6), X.lam(0xffe066), 0, 0.46, 0));
          for (let i = 0; i < 3; i++) hat.add(X.mesh(new THREE.TorusGeometry(0.15 - i * 0.045, 0.015, 4, 12).rotateX(Math.PI / 2), X.lam(0x39f3ff), 0, 0.06 + i * 0.12, 0));
          break;
        }
      }
      switch (eq.back) {
        case 'backpack':
          back.add(X.mesh(new THREE.BoxGeometry(0.42, 0.48, 0.18), X.lam(0x6a4a8a), 0, 0, 0.06));
          break;
        case 'cape': {
          const pivot = new THREE.Group(); pivot.position.set(0, 0.3, 0.02); back.add(pivot);
          pivot.add(X.mesh(new THREE.BoxGeometry(0.72, 1.3, 0.04), X.lam(0xc8202a), 0, -0.65, 0));
          pivot.add(X.mesh(new THREE.BoxGeometry(0.74, 0.08, 0.06), X.lam(0xffcf3a), 0, -1.28, 0));
          // negative x-rotation swings the bottom out behind the runner; it flies higher when running
          this.backAnim = (t, run) => { pivot.rotation.x = -(0.12 + Math.sin(t * 2.5) * 0.05 + run * (0.6 + Math.sin(t * 14) * 0.12)); };
          break;
        }
        case 'jetpack': {
          const metal = X.std(0xb8c0cc, { metalness: 0.8, roughness: 0.3 });
          const flames = [];
          for (const sx of [-0.13, 0.13]) {
            back.add(X.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), metal, sx, 0, 0.12));
            const f = X.mesh(new THREE.ConeGeometry(0.08, 0.35, 8), X.add(0xff8a1a), sx, -0.42, 0.12); f.rotation.x = Math.PI; back.add(f); flames.push(f);
          }
          this.backAnim = (t, run) => { for (const f of flames) f.scale.set(1, 0.6 + run * 0.6 + Math.sin(t * 40 + f.position.x * 9) * 0.25, 1); };
          break;
        }
        case 'wings': {
          const ws = [];
          for (const sx of [-1, 1]) {
            const pv = new THREE.Group(); pv.position.set(sx * 0.1, 0.1, 0.08); back.add(pv);
            const w = X.mesh(new THREE.BoxGeometry(0.7, 0.35, 0.03), X.lam(0xffffff), sx * 0.38, 0.08, 0); w.rotation.z = sx * 0.35; pv.add(w);
            const w2 = X.mesh(new THREE.BoxGeometry(0.45, 0.25, 0.03), X.lam(0xf0f4ff), sx * 0.3, -0.15, 0); w2.rotation.z = sx * 0.6; pv.add(w2);
            ws.push(pv);
          }
          this.backAnim = (t) => { const a = Math.sin(t * 5) * 0.3; ws[0].rotation.y = 0.4 + a; ws[1].rotation.y = -0.4 - a; };
          break;
        }
        case 'shield':
          back.add(X.mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 18).rotateX(Math.PI / 2), X.std(0x8a90a0, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0.06));
          back.add(X.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12).rotateX(Math.PI / 2), gold, 0, 0, 0.08));
          break;
      }
    }

    // ---------------- level construction ----------------
    buildLevel(track) {
      if (this.levelGroup) this._disposeLevel();
      this.track = track;
      this.setTheme(track.cfg.id);
      this.lastD = 0;
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
      this.spinners = [];
      this.padMeshes = [];
      this.chestMeshes = [];
      this.portal = null;
      if (this.boss) this.scene.remove(this.boss.g);
      if (this.bossRes) { this.bossRes.dispose(); this.bossRes = null; }
      this.boss = null;
      this.bossRows = new Map();
      this.bossThrown = new Set();
      if (track.cfg.boss) {
        this.bossRes = DR.dress.Res();
        this.boss = DR.dress.boss(this.bossRes);
        this.scene.add(this.boss.g);
        this.bossHP = 1; this.bossHitT = 0; this.bossDying = -1; this.bossThrowT = 0; this.bossSoundT = 0;
      }

      this.gemMeshes = [];
      this.target = L;
      this.chunks = [];
      this.cur = { row: 0, coin: 0, shard: 0, pad: 0, chest: 0, gem: 0 };
      this._floorSetup(track);
      this.builtTo = -Infinity;
      if (track.cfg.endless) this._buildAhead(320);
      else this._buildAhead(Infinity);
      this.mixShown = -1;
    }

    /** Builds everything up to distance `to`. The Infinite World does this in chunks as you run. */
    _buildAhead(to) {
      const track = this.track, endless = track.cfg.endless;
      while (this.builtTo < to) {
        const a = this.builtTo, b = endless ? (a === -Infinity ? 150 : a + 150) : Infinity;
        let chunk = null;
        const lists = ['movers', 'enemies', 'collapseTiles', 'beams', 'rifts', 'spinners'];
        const before = {};
        if (endless) {
          chunk = { group: new THREE.Group(), end: b, floorKids: [], idx: {} };
          this.levelGroup.add(chunk.group);
          this.target = chunk.group;
          this.floorKids = chunk.floorKids;
          for (const k of lists) before[k] = this[k].length;
          for (const k in this.cur) chunk.idx[k] = this.cur[k];
        }
        this._floorUpTo(b === Infinity ? track.length + 120 : b);
        const rows = track.rows;
        while (this.cur.row < rows.length && rows[this.cur.row].d < b) {
          const row = rows[this.cur.row++];
          if (row.kind === 'rift') { this._buildRift(row); continue; }
          if (row.kind === 'finish') { this._buildFinish(track, row); continue; }
          for (let w = 0; w < 2; w++) for (let l = 0; l < 3; l++) { const c = row.cells[w][l]; if (c) this._buildCell(row, w, l - 1, c); }
        }
        const T = this.target;
        for (const c of track.coins.slice(this.cur.coin)) {
          if (c.d >= b) break;
          const m = new THREE.Mesh(c.world === 0 ? this.G.coin : this.G.gem, c.world === 0 ? this.M.coin : this.M.gem);
          m.position.set(c.lane * LW, c.y, -c.d);
          m.rotation.y = rnd() * 3;
          T.add(m);
          this.coinMeshes[this.cur.coin++] = m;
        }
        for (const sh of track.shards.slice(this.cur.shard)) {
          if (sh.d >= b) break;
          const g = new THREE.Group();
          const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: sh.world === 0 ? 0x66ddff : 0xff66ee, emissiveIntensity: 1.6, transparent: true, flatShading: true });
          g.add(new THREE.Mesh(this.G.shard, mat));
          g.add(new THREE.Mesh(this.G.shardRing, mat));
          g.position.set(sh.lane * LW, sh.y, -sh.d);
          g.userData.world = sh.world;
          g.userData.mat = mat;
          mat.userData.own = true;
          T.add(g);
          this.shardMeshes[this.cur.shard++] = g;
        }
        for (const pd of (track.pads || []).slice(this.cur.pad)) {
          if (pd.d >= b) break;
          const m = new THREE.Mesh(this.G.pad, new THREE.MeshBasicMaterial({
            map: DR.dress.tex(pd.kind === 'fast' ? 'padFast' : 'padSlow').clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          m.material.map.needsUpdate = true;
          m.userData.ownMat = true;
          m.userData.kind = pd.kind;
          m.position.set(pd.lane * LW, 0.07, -pd.d);
          T.add(m);
          this.padMeshes[this.cur.pad++] = m;
        }
        for (const c of (track.chests || []).slice(this.cur.chest)) {
          if (c.d >= b) break;
          const M = this.chestMats[c.world], G = this.G;
          const g = new THREE.Group();
          const box = new THREE.Mesh(G.chest, M.wood); box.position.y = 0.32; g.add(box);
          const lid = new THREE.Group(); lid.position.set(0, 0.62, 0.37); g.add(lid);
          const lt = new THREE.Mesh(G.lid, M.wood); lt.position.set(0, 0.11, -0.37); lid.add(lt);
          for (const x of [-0.38, 0.38]) { const bd = new THREE.Mesh(G.chestBand, M.band); bd.position.set(x, 0.38, 0); g.add(bd); }
          const lock = new THREE.Mesh(G.lock, M.band); lock.position.set(0, 0.55, -0.4); g.add(lock);
          const sparkle = new THREE.Mesh(G.gem, M.gem); sparkle.position.y = 1.5; g.add(sparkle);
          const beam = new THREE.Mesh(G.beam, new THREE.MeshBasicMaterial({ color: c.world ? 0xff8af0 : 0xffe066, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
          beam.position.y = 7; beam.userData.ownMat = true; g.add(beam);
          g.position.set(c.lane * LW, 0, -c.d);
          Object.assign(g.userData, { lid, beam, sparkle, world: c.world, vis: 1 });
          T.add(g);
          this.chestMeshes[this.cur.chest++] = g;
        }
        for (const gm of (track.gems || []).slice(this.cur.gem)) {   // diamonds
          if (gm.d >= b) break;
          const g = new THREE.Group();
          g.add(new THREE.Mesh(this.G.diamond, this.gemMats[gm.world]));
          const ring = new THREE.Mesh(this.G.diamondRing, this.gemMats[gm.world]); g.add(ring);
          const glow = new THREE.Mesh(this.G.diamondGlow, new THREE.MeshBasicMaterial({ color: 0x7ae8ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
          glow.userData.ownMat = true; g.add(glow);
          g.position.set(gm.lane * LW, gm.y, -gm.d);
          Object.assign(g.userData, { ring, glow, world: gm.world });
          T.add(g);
          this.gemMeshes[this.cur.gem++] = g;
        }
        if (chunk) {
          for (const k of lists) for (let n = before[k]; n < this[k].length; n++) this[k][n].chunk = chunk;
          for (const k in this.cur) chunk.idx[k] = [chunk.idx[k], this.cur[k]];
          this.chunks.push(chunk);
          this.target = this.levelGroup;
          this.floorKids = null;
        }
        this.builtTo = b;
        this.mixShown = -1;
      }
    }

    /** Infinite World: build ahead of the runner and throw away what is far behind. */
    _streamLevel(P) {
      if (!this.track.cfg.endless) return;
      if (P.d + 320 > this.builtTo) this._buildAhead(P.d + 320);
      while (this.chunks.length && this.chunks[0].end < P.d - 70) {
        const ch = this.chunks.shift();
        const free = o => { if (o.userData.ownGeo) o.geometry.dispose(); if (o.userData.ownMat || (o.material && o.material.userData.own)) o.material.dispose(); };
        ch.group.traverse(free);
        this.levelGroup.remove(ch.group);
        for (const k of ch.floorKids) { k.traverse(free); if (k.parent) k.parent.remove(k); }
        for (const k of ['movers', 'enemies', 'collapseTiles', 'beams', 'rifts', 'spinners']) this[k] = this[k].filter(e => e.chunk !== ch);
        const nul = (arr, [a, b]) => { for (let n = a; n < b; n++) arr[n] = null; };
        nul(this.coinMeshes, ch.idx.coin); nul(this.shardMeshes, ch.idx.shard); nul(this.padMeshes, ch.idx.pad);
        nul(this.chestMeshes, ch.idx.chest); nul(this.gemMeshes, ch.idx.gem);
      }
    }

    hideGem(i) {
      const g = this.gemMeshes[i];
      if (!g) return;
      g.visible = false;
      this.burst(g.position, 0x7ae8ff, 22, { speed: 7, up: 3, life: 0.6, grav: 2 });
      this.burst(g.position, 0xffffff, 10, { speed: 4, up: 2, life: 0.4, grav: 0 });
      const ring = new THREE.Mesh(this.G.torus, this.fxMat(0x7ae8ff));
      ring.position.copy(g.position); this.scene.add(ring);
      this.fx.push({ mesh: ring, t: 0, dur: 0.45, update: (m, u) => { m.scale.setScalar(0.3 + u * 3); m.material.opacity = 1 - u; } });
    }

    _disposeLevel() {
      this.levelGroup.traverse(o => {
        if (o.userData.ownGeo) o.geometry.dispose();
        if (o.userData.ownMat) o.material.dispose();
      });
      this.scene.remove(this.levelGroup);
      this.levelGroup = null;
    }

    _floorSetup(track) {
      // holes per world and lane, sorted along the track; built piece by piece with cursors
      this.fl = { start: -45, end: track.length + 120, holes: [], from: [], idx: [] };
      for (let w = 0; w < 2; w++) {
        this.fl.holes[w] = []; this.fl.from[w] = []; this.fl.idx[w] = [];
        for (let l = -1; l <= 1; l++) {
          const holes = [];
          for (const row of track.rows) {
            const c = row.cells[w] && row.cells[w][l + 1];
            if (c && c.type === 'gap') holes.push({ a: row.d - C.DEPTH.gap / 2, b: row.d + C.DEPTH.gap / 2, collapse: c.collapse, d: row.d });
          }
          this.fl.holes[w][l + 1] = holes;
          this.fl.from[w][l + 1] = this.fl.start;
          this.fl.idx[w][l + 1] = 0;
        }
      }
      this.fl.curbFrom = this.fl.start;
    }

    _floorUpTo(to) {
      const fl = this.fl;
      to = Math.min(to, fl.end);
      for (let w = 0; w < 2; w++) {
        const F = this.F[w];
        for (let l = -1; l <= 1; l++) {
          const holes = fl.holes[w][l + 1];
          let from = fl.from[w][l + 1], k = fl.idx[w][l + 1];
          while (from < to) {
            const h = holes[k];
            if (h && h.a < to) {
              if (h.a - from > 0.05) this._floorStrip(w, l, from, h.a, F.top, F.slab, this.floor[w]);
              if (h.collapse) {
                const tile = this._floorStrip(w, l, h.a, h.b, F.crack, F.slab, this.floor[w]);
                this.collapseTiles.push({ mesh: tile, d: h.d, t: -1, baseX: tile.position.x });
              }
              // ghost marker so the other world can see this hole
              const gm = new THREE.Mesh(this.G.ghostGap, this.ghostMats[w]);
              gm.position.set(l * LW, 0.04, -h.d);
              this.target.add(gm);
              from = Math.max(from, h.b); k++;
            } else {
              this._floorStrip(w, l, from, to, F.top, F.slab, this.floor[w]);
              from = to;
            }
          }
          fl.from[w][l + 1] = from; fl.idx[w][l + 1] = k;
        }
      }
      // curbs along the path edges
      const a = fl.curbFrom, len = to - a;
      if (len > 0.05) {
        for (let w = 0; w < 2; w++) {
          const curbGeo = new THREE.BoxGeometry(0.35, w === 0 ? 0.35 : 0.08, len);
          for (const side of [-1, 1]) {
            const m = new THREE.Mesh(curbGeo, this.F[w].curb);
            m.position.set(side * (PATH_W / 2 - 0.1), w === 0 ? 0.08 : 0.04, -(a + to) / 2);
            m.userData.ownGeo = side === 1;
            this.floor[w].add(m);
            if (this.floorKids) this.floorKids.push(m);
          }
        }
        fl.curbFrom = to;
      }
    }

    _floorStrip(w, lane, a, b, topMat, slabMat, parent) {
      // long strips are split into short pieces: huge triangles cause depth-precision flicker
      const MAX = 50;
      if (b - a > MAX) {
        const n = Math.ceil((b - a) / MAX);
        let last = null;
        for (let i = 0; i < n; i++) last = this._floorStrip(w, lane, a + (b - a) * i / n, a + (b - a) * (i + 1) / n, topMat, slabMat, parent);
        return last;
      }
      const len = b - a;
      const g = new THREE.Group();
      const extra = lane === 0 ? 0 : 0.4;      // outer lanes reach the curbs
      const width = LW + extra;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(width, len).rotateX(-Math.PI / 2), topMat);
      const uv = top.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (width / LW), uv.getY(i) * (len / LW));
      top.userData.ownGeo = true;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, len), slabMat);
      slab.position.y = -0.7;     // top face 10 cm below the walking surface
      slab.userData.ownGeo = true;
      g.add(top, slab);
      g.position.set(lane * LW + Math.sign(lane) * extra / 2, 0, -(a + b) / 2);
      parent.add(g);
      if (this.floorKids) this.floorKids.push(g);
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
      const skinKind = c.type === 'block' && w === 0 && this.lt.skins && this.lt.skins[variant];
      if (skinKind) {
        const anim = DR.dress.skin(skinKind, g, this.SK, this.SKG);
        if (anim) this.spinners.push(anim);
      } else if (c.type === 'block') {
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
        } else if (variant === 'wraith' && this.lt.monsters) {
          const body = DR.dress.minion(M);
          g.add(body);
          add(G.ring, M.wraithRing, 0, 0.12, 0);
          this.enemies.push({ body, seed: rnd() * 10 });
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
      this.target.add(g);
      if (this.boss) {
        g.visible = false;
        g.userData.homeY = 0;
        if (!this.bossRows.has(row)) this.bossRows.set(row, []);
        this.bossRows.get(row).push(g);
      }
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
      this.target.add(g);
      this.rifts.push({ g, ring, inner, d: row.d });
    }

    _buildFinish(track, row) {
      const g = new THREE.Group();
      g.position.z = -row.d;
      if (track.cfg.final) {
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
      this.target.add(g);
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
      // wardrobe: the runner turns slowly like on a turntable, and swings round to show a new back item
      if (view.wardrobe) {
        this.showBackT = Math.max(0, (this.showBackT || 0) - dt);
        let a = this.turnA || 0;
        if (this.showBackT > 0) {
          const back = Math.PI + Math.round((a - Math.PI) / (Math.PI * 2)) * Math.PI * 2;
          a = U.lerp(a, back, U.damp(5, dt));
        } else a += dt * 0.8;
        this.turnA = a;
      } else {
        this.turnA = U.lerp(this.turnA || 0, Math.round((this.turnA || 0) / (Math.PI * 2)) * Math.PI * 2, U.damp(6, dt));
      }
      R.root.rotation.y = this.turnA;
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
      // ghost (after a shield or a revive): the runner blinks while passing through obstacles
      R.root.visible = !(sim.ghostT > 0 && view.mode === 'play' && Math.sin(t * 30) < 0);
      const active = view.mode === 'play' || view.mode === 'countdown';
      this.bubble.visible = active && sim.shields > 0;
      if (this.bubble.visible) {
        this.bubble.position.set(x, y + 1.1, z);
        this.bubble.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
        this.bubble.material.opacity = 0.14 + Math.sin(t * 3) * 0.05;
      }
      this.magnetFx.visible = active && sim.magnet;
      if (this.magnetFx.visible) {
        this.magnetFx.position.set(x, y, z);
        this.magnetFx.children.forEach((r, k) => { const u = (t * 1.2 + k * 0.5) % 1; r.scale.setScalar(0.6 + u * 1.6); r.material.opacity = 0.6 * (1 - u); });
      }
      if (this.backAnim) this.backAnim(t, running ? 1 : 0);
      if (this.pet) DR.pets.animate(this.pet, t, running && P.grounded ? 1 : 0, R.phase);
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
          g.visible = s > 0.02 && !g.userData.hidden;
          if (!g.visible) continue;
          if (g.userData.prop) {
            g.scale.setScalar(b.s * Math.max(0.01, s));
            if (g.userData.anim) g.userData.anim(g, t, dt);
          } else if (g.userData.far) {
            if (w === 0) g.scale.set(b.s, b.s * 0.45 * s, b.s);
            else g.scale.set(b.s, b.s * s, b.s);
          } else {
            g.scale.set(b.s, b.s * s, b.s);
          }
        }
      }
      this.groundL.position.z = this.groundR.position.z = this.abyss.position.z = z - 150;
      // giant sky objects (planet, black hole, sky clock) stay at the horizon
      for (const g of this.skyProps) {
        const o = g.userData.offset, s = U.smooth(g.userData.world === 0 ? 1 - mix : mix);
        g.visible = s > 0.02;
        if (!g.visible) continue;
        g.position.set(this.camera.position.x + o[0], o[1], this.camera.position.z + o[2]);
        g.scale.setScalar(g.userData.base.s * s);
        g.lookAt(this.camera.position);
        if (g.userData.anim) g.userData.anim(g, t, dt);
      }
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
      this._updateLevelFx(dt, t, view, sim, x, z);

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
        if (u >= 1) {
          this.scene.remove(f.mesh); f.mesh.material.dispose();
          if (f.mesh.userData.ownGeo) f.mesh.geometry.dispose();
          this.fx.splice(i, 1);
          continue;
        }
        f.update(f.mesh, u);
      }

      this._updateCamera(dt, t, view, sim);
      this.sky.position.copy(this.camera.position);
      this.sky.material.uniforms.uTime.value = t;
      this.sky.material.uniforms.uDanger.value = U.lerp(this.sky.material.uniforms.uDanger.value, view.danger || 0, U.damp(2, dt));
      this.sky.material.uniforms.uFlash.value = this.flashV;
      this.sky.material.uniforms.uGlitch.value = this.lt.sky && this.lt.sky.glitch ? Math.min(1, this.glitch * 6) : 0;
      this.sun.position.set(x + 8, 20, z + 6);
      this.sun.target.position.set(x, 0, z - 10);
    }

    _applyMix(ms, mix) {
      const A = this.themeCol[0], B = this.themeCol[1];
      const lc = (k, out) => out.copy(A[k]).lerp(B[k], ms);
      const TH = this.theme;
      lc('fog', this.scene.fog.color);
      this.scene.fog.near = U.lerp(TH[0].fogNear, TH[1].fogNear, ms);
      this.scene.fog.far = U.lerp(TH[0].fogFar, TH[1].fogFar, ms);
      lc('hemiSky', this.hemi.color); lc('hemiGround', this.hemi.groundColor);
      this.hemi.intensity = U.lerp(TH[0].hemiI, TH[1].hemiI, ms) + this.flashV * 2.5;
      lc('sun', this.sun.color);
      this.sun.intensity = U.lerp(TH[0].sunI, TH[1].sunI, ms);
      lc('ground', this.groundMat.color);
      if (this.lt.groundGlow) this.groundMat.emissive.setHex(this.lt.groundGlow[0]).lerp(new THREE.Color(this.lt.groundGlow[1]), ms);
      lc('abyss', this.abyssMat.color);
      this.sky.material.uniforms.uMix.value = ms;
      this.scarfMat.color.copy(this.scarfBase).lerp(new THREE.Color(0xb04dff), ms);
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
      for (const s of this.shardMeshes || []) if (s) s.userData.mat.opacity = s.userData.world === 0 ? op[0] : op[1];
      for (const c of this.chestMeshes || []) if (c) c.userData.vis = c.userData.world === 0 ? op[0] : op[1];
      for (const g of this.gemMeshes || []) if (g) g.userData.vis = g.userData.world === 0 ? op[0] : op[1];
    }

    _updateLevelObjects(dt, t, sim) {
      const P = sim.player, speed = sim.speed;
      this._streamLevel(P);
      if (this.boss) this._updateBoss(dt, t, sim);
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
        if (!m) continue;
        if (m.position.z < -P.d - 150) break;
        m.rotation.y += dt * 3;
      }
      for (const g of this.gemMeshes) {
        if (!g || !g.visible) continue;
        g.rotation.y += dt * 2.5;
        g.position.y = 1.25 + Math.sin(t * 2.5 + g.position.z) * 0.15;
        g.userData.ring.rotation.x = t * 2;
        g.userData.glow.material.opacity = (0.2 + Math.sin(t * 5) * 0.08) * g.userData.vis;
      }
      for (const s of this.shardMeshes) {
        if (!s) continue;
        s.rotation.y += dt * 2;
        s.children[1].rotation.x += dt * 3;
        s.position.y = 1.2 + Math.sin(t * 3) * 0.15;
      }
    }

    // per-level atmosphere: weather, speed streaks, lightning, meteors, eruptions
    _updateLevelFx(dt, t, view, sim, x, z) {
      const T = this.lt, P = sim.player;
      const dz = U.clamp(P.d - this.lastD, 0, 5);   // distance run this frame (particles stay put in the world)
      this.lastD = P.d;

      // weather
      const wt = T.weather, wp = this.weather.geometry.attributes.position;
      this.weather.position.set(x, 0, z);
      for (let i = 0; i < wt.count; i++) {
        const ph = i * 1.37;
        let px = wp.getX(i) + (wt.vel[0] + Math.sin(t * 1.3 + ph) * wt.sway) * dt;
        let py = wp.getY(i) + wt.vel[1] * dt * (0.7 + (i % 7) * 0.08);
        let pz = wp.getZ(i) + (wt.vel[2] + Math.cos(t * 1.1 + ph) * wt.sway * 0.5) * dt + dz;
        if (px > 25) px -= 50; else if (px < -25) px += 50;
        if (py > 18) py -= 18; else if (py < 0) py += 18;
        if (pz > 10) pz -= 110; else if (pz < -100) pz += 110;
        wp.setXYZ(i, px, py, pz);
      }
      wp.needsUpdate = true;
      // embers / spores flicker
      if (wt.additive) this.weather.material.opacity = wt.opacity * (0.75 + 0.25 * Math.sin(t * 9));

      // speed streaks grow with speed
      const playing = view.mode === 'play';
      const fastWarp = sim.warp && sim.warp.kind === 'fast';
      const sOp = playing ? Math.max(U.clamp((sim.speed - 13) / 13, 0, 1) * 0.55, fastWarp ? 0.9 : 0) : 0;
      const lm = this.speedLines.material;
      lm.opacity = U.lerp(lm.opacity, sOp, U.damp(4, dt));
      this.speedLines.visible = lm.opacity > 0.01;
      if (this.speedLines.visible) {
        const sp = this.speedLines.geometry.attributes.position;
        this.speedSeeds.forEach((s, i) => {
          s.z += sim.speed * (fastWarp ? 3 : 1.8) * dt;
          if (s.z > 1) { s.z = -60 - rnd() * 10; s.a = rnd() * Math.PI * 2; }
          const cx = Math.cos(s.a) * s.r, cy = Math.sin(s.a) * s.r * 0.65;
          sp.setXYZ(i * 2, cx, cy, s.z);
          sp.setXYZ(i * 2 + 1, cx, cy, s.z - s.len * (sim.speed / 15));
        });
        sp.needsUpdate = true;
      }

      // lightning storm
      this.flashV = Math.max(0, this.flashV - dt * 5);
      if (T.lightning && dt > 0) {
        this.lightningT -= dt;
        if (this.lightningT <= 0) {
          this.flashV = 1;
          this._bolt(x, z);
          if (this.onThunder && this.flashV === 1 && this.lightningT !== 0.15) this.onThunder();
          this.lightningT = rnd() < 0.3 ? 0.15 : 2.5 + rnd() * 4;   // sometimes a double strike
        }
      }
      // meteors falling in the distance
      if (T.meteors && dt > 0 && view.mode !== 'menu') {
        this.meteorT -= dt;
        if (this.meteorT <= 0) { this.meteorT = 0.9 + rnd() * 1.6; this._meteor(x, z); }
      }
      // volcano eruptions
      const volcanoTop = () => {
        const vis = this.props.filter(g => g.userData.top && g.visible && g.position.z < z - 30 && g.position.z > z - 200);
        const v = vis[(rnd() * vis.length) | 0];
        return v && new THREE.Vector3(v.position.x, v.position.y + v.userData.base.s * v.userData.top, v.position.z);
      };
      if (T.smoke === 'volcano' && dt > 0 && sim.dim.mix < 0.5) {
        this.eruptT -= dt;
        if (this.eruptT <= 0) {
          this.eruptT = 0.5 + rnd() * 0.8;
          const top = volcanoTop();
          if (top) this.burst(top, rnd() < 0.5 ? 0xff5a1a : 0xffb04d, 8, { speed: 8, up: 9, grav: 7, life: 1.8, size: 5 });
        }
      }
      this._updateSmoke(dt, x, z, sim.dim.mix, volcanoTop);
      this._updateCreatures(dt, t, x, z, sim.dim.mix);
      for (const f of this.spinners || []) f(t);
      // time pads glow and scroll
      for (const p of this.padMeshes || []) {
        if (!p || !p.visible) continue;
        p.material.map.offset.y = p.userData.kind === 'fast' ? -t * 1.5 : t * 0.4;
        p.material.opacity = 0.75 + 0.25 * Math.sin(t * 8);
      }
      for (const c of this.chestMeshes || []) {
        if (!c || c.userData.opened) continue;
        c.userData.beam.material.opacity = (0.25 + 0.15 * Math.sin(t * 4)) * c.userData.vis;
        c.rotation.y = Math.sin(t * 1.5) * 0.25;
        c.userData.sparkle.rotation.y += dt * 2;
      }
    }

    // ---------------- smoke ----------------
    _makeSmoke() {
      this.smoke = [];
      const tex = DR.dress.tex('smoke');
      for (let i = 0; i < 90; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
        m.visible = false;
        this.scene.add(m);
        this.smoke.push({ m, life: 0 });
      }
      this.smokeAcc = 0;
    }
    puff(pos, o) {
      const p = this.smoke.find(q => q.life <= 0);
      if (!p) return;
      Object.assign(p, { life: o.life, max: o.life, s0: o.size[0], s1: o.size[1], op: o.opacity, vel: o.vel || new THREE.Vector3(0, o.rise || 0, 0), spin: (rnd() - 0.5) * 0.6 });
      p.m.position.copy(pos);
      p.m.material.color.setHex(o.color);
      p.m.material.blending = o.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      p.m.material.fog = !o.noFog;
      p.m.material.rotation = rnd() * 6.28;
      p.m.material.needsUpdate = true;
      p.m.visible = true;
    }
    _updateSmoke(dt, x, z, mix, volcanoTop) {
      const S = this.smokePreset;
      if (S && dt > 0) {
        this.smokeAcc += dt * S.rate;
        while (this.smokeAcc >= 1) {
          this.smokeAcc -= 1;
          const w = mix < 0.5 ? 0 : 1, side = rnd() < 0.5 ? -1 : 1;
          let col = S.colors[w];
          if (Array.isArray(col)) col = col[(rnd() * col.length) | 0];
          const o = { color: col, size: S.size, life: S.life * (0.7 + rnd() * 0.6), opacity: S.opacity, additive: S.additive, rise: S.rise };
          let pos = null;
          if (S.at === 'sides') pos = new THREE.Vector3(x + side * (PATH_W / 2 + 1 + rnd() * 9), S.y[0] + rnd() * (S.y[1] - S.y[0]), z - 8 - rnd() * 80);
          else if (S.at === 'edges') pos = new THREE.Vector3(side * (PATH_W / 2 + 0.4), 0.1, z - 12 - rnd() * 60);
          else if (S.at === 'far') { pos = new THREE.Vector3(x + side * (25 + rnd() * 50), -15 + rnd() * 45, z - 60 - rnd() * 150); o.noFog = true; }
          else if (S.at === 'volcano') {
            if (w === 0) pos = volcanoTop();
            o.vel = new THREE.Vector3(S.wind, S.rise, 0);
            if (!pos) { pos = new THREE.Vector3(x + side * (PATH_W / 2 + 2 + rnd() * 6), 0.3, z - 10 - rnd() * 60); o.size = [2, 6]; o.life = 3; o.vel.set(0, 1, 0); o.opacity = 0.35; }
          }
          if (pos) this.puff(pos, o);
        }
      }
      for (const p of this.smoke) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.m.visible = false; continue; }
        const u = 1 - p.life / p.max;
        p.m.position.addScaledVector(p.vel, dt);
        p.m.scale.setScalar(p.s0 + (p.s1 - p.s0) * u);
        p.m.material.rotation += p.spin * dt;
        p.m.material.opacity = p.op * Math.min(1, u * 5) * (1 - u);
      }
    }

    // ---------------- creatures ----------------
    _spawnCreature(c, x, z) {
      const side = rnd() < 0.5 ? -1 : 1, y = c.y[0] + rnd() * (c.y[1] - c.y[0]);
      const g = c.g;
      if (c.motion === 'cross') {
        const sp = c.speed[0] + rnd() * (c.speed[1] - c.speed[0]);
        g.position.set(x + side * (30 + rnd() * 20), y, z - 25 - rnd() * 90);
        c.vel.set(-side * sp, 0, (rnd() - 0.5) * 3);
      } else if (c.motion === 'hover') {
        g.position.set(x + side * (PATH_W / 2 + 0.6 + rnd() * 6), y, z - 15 - rnd() * 90);
        c.vel.set((rnd() - 0.5) * 1.5, 0, (rnd() - 0.5) * 1.5);
      } else {
        const sp = c.speed ? c.speed[0] + rnd() * (c.speed[1] - c.speed[0]) : 0.8;
        g.position.set(x + side * (4 + rnd() * 22), y, z - 25 - rnd() * 100);
        c.vel.set(-side * sp * rnd(), 0, (rnd() - 0.5) * sp);
      }
      c.baseY = y;
      if (c.fresh) { g.position.z += 30 - rnd() * 60; c.fresh = false; }
    }
    _updateCreatures(dt, t, x, z, mix) {
      const camZ = this.camera.position.z;
      for (const c of this.creatures) {
        const s = U.smooth(c.world === 0 ? 1 - mix : c.world === 1 ? mix : 1);
        const g = c.g;
        if (c.fresh || g.position.z > camZ + 4 || Math.abs(g.position.x - x) > 60 || g.position.z < z - 260) this._spawnCreature(c, x, z);
        g.visible = s > 0.05;
        if (!g.visible) continue;
        g.position.addScaledVector(c.vel, dt);
        const wob = c.wobble || 0.4;
        g.position.y = c.baseY + Math.sin(t * 2 * wob + c.seed) * wob;
        if (c.motion === 'hover') {
          c.vel.x += Math.sin(t * 1.7 + c.seed) * dt * 2;
          c.vel.z += Math.cos(t * 1.3 + c.seed) * dt * 2;
          c.vel.clampLength(0, 2);
        }
        // face the direction of flight
        if (c.motion === 'drift') g.rotation.y = Math.sin(t * 0.5 + c.seed) * 0.8;
        else if (c.vel.lengthSq() > 0.01) g.rotation.y = Math.atan2(-c.vel.x, -c.vel.z) + (c.faceMotion ? -Math.PI / 2 : 0);
        const base = g.userData.baseScale || (g.userData.baseScale = g.scale.x);
        g.scale.setScalar(base * s);
        c.flap(t + c.seed);
        if (c.trail && rnd() < 0.5) this.burst(g.position, c.trail, 1, { speed: 1, up: 0, grav: 0, life: 0.5, size: 3 });
      }
    }

    _bolt(x, z) {
      const pts = [];
      let bx = x + (rnd() - 0.5) * 120, by = 70;
      const bz = z - 120 - rnd() * 60;
      while (by > 0) { pts.push(new THREE.Vector3(bx, by, bz)); bx += (rnd() - 0.5) * 9; by -= 4 + rnd() * 6; }
      pts.push(new THREE.Vector3(bx, 0, bz));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfff4e0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      line.userData.ownGeo = true;
      line.frustumCulled = false;
      this.scene.add(line);
      this.fx.push({ mesh: line, t: 0, dur: 0.35, update: (m, u) => { m.material.opacity = (1 - u) * (u < 0.3 ? 1 : 0.5 + 0.5 * Math.sin(u * 60)); } });
    }

    _meteor(x, z) {
      const side = rnd() < 0.5 ? -1 : 1;
      const from = new THREE.Vector3(x + side * (15 + rnd() * 40), 55 + rnd() * 20, z - 70 - rnd() * 70);
      const to = new THREE.Vector3(from.x - side * (12 + rnd() * 10), 0, from.z + 15);
      const m = new THREE.Mesh(this.G.shard, this.fxMat(0xffb04d));
      m.scale.setScalar(1.6);
      m.position.copy(from);
      this.scene.add(m);
      let hit = false, trail = 0;
      this.fx.push({
        mesh: m, t: 0, dur: 1.5,
        update: (mesh, u) => {
          mesh.position.lerpVectors(from, to, Math.min(1, u * 1.15));
          mesh.rotation.x += 0.2;
          if (++trail % 2 === 0) this.burst(mesh.position, 0xff5a1a, 1, { speed: 1, up: 0, grav: 0, life: 0.7, size: 4 });
          if (!hit && u > 0.87) {
            hit = true;
            mesh.visible = false;
            if (this.onBoom) this.onBoom();
            this.burst(to, 0xff7a1a, 18, { speed: 14, up: 6, grav: 10, life: 1.2, size: 4 });
            this.burst(to, 0xffe0a0, 8, { speed: 6, up: 2, grav: 0, life: 0.5, size: 8 });
          }
        },
      });
    }

    // ---------------- the Monster King ----------------
    _updateBoss(dt, t, sim) {
      const B = this.boss, P = sim.player, g = B.g;
      const rz = -P.d, rage = this.bossHP < 0.35 ? 1 : 0;
      if (this.bossDying >= 0) {   // defeated: spins, shrinks and falls, exploding
        this.bossDying += dt;
        const u = this.bossDying;
        g.rotation.z += dt * (2 + u * 4);
        g.position.y -= dt * u * 6;
        g.scale.setScalar(4.2 * Math.max(0.01, 1 - u / 2.4));
        B.skin.emissive.setHex(Math.sin(u * 40) > 0 ? 0xffffff : 0xff2a00);
        if ((u * 8 | 0) !== ((u - dt) * 8 | 0) && u < 2.4) {
          const p = g.position.clone().add(new THREE.Vector3((rnd() - 0.5) * 8, (rnd() - 0.5) * 6, (rnd() - 0.5) * 4));
          this.burst(p, rnd() < 0.5 ? 0xff6a1a : 0xffe066, 18, { speed: 12, up: 2, life: 0.9, size: 3, grav: 2 });
          this.shake = Math.max(this.shake, 0.35);
        }
        if (u > 2.4) g.visible = false;
        return;
      }
      // hovers ahead of you, swaying, angrier when hurt
      const speed = 1 + rage * 0.8;
      g.position.set(Math.sin(t * 0.45 * speed) * 4.5, 8.5 + Math.sin(t * 1.3 * speed) * 0.9, rz - 44);
      g.rotation.z = Math.sin(t * 0.7) * 0.12;
      g.rotation.y = Math.sin(t * 0.45 * speed) * -0.25;
      B.eye.lookAt(this.runner.root.position.x, 1.5, this.runner.root.position.z);
      B.lid.rotation.x = Math.sin(t * 0.9) > 0.97 ? 0 : -1.3 - rage * 0.25;   // blinks; narrows its eye when angry
      B.tentacles.forEach((c, k) => {
        let seg = c;
        for (let i = 0; seg && i < 8; i++) {
          seg.rotation.x = Math.sin(t * 2.2 * speed + k + i * 0.6) * 0.35;
          seg.rotation.z = Math.cos(t * 1.7 * speed + k * 2 + i * 0.5) * 0.25;
          seg = seg.children.find(o => o.isGroup);
        }
      });
      B.aura.material.opacity = 0.1 + Math.sin(t * 3) * 0.04 + rage * 0.12;
      B.aura.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
      this.bossHitT = Math.max(0, this.bossHitT - dt);
      B.skin.emissive.setHex(this.bossHitT > 0 ? 0xffffff : rage ? 0x5a0000 : 0x200008);
      // throws the next rows of obstacles: they fly from its mouth and land on their lanes
      this.bossThrowT = Math.max(0, this.bossThrowT - dt);
      B.jaw.rotation.x = this.bossThrowT > 0 ? 0.6 : 0.05 + Math.sin(t * 2) * 0.05;
      B.mouth.visible = this.bossThrowT > 0;
      const mouth = B.mouth.getWorldPosition(new THREE.Vector3());
      for (const [row, groups] of this.bossRows) {
        if (this.bossThrown.has(row)) continue;
        if (row.d - P.d > sim.speed * 2.4) continue;
        this.bossThrown.add(row);
        this.bossThrowT = 0.5;
        if (this.onBossThrow && this.bossSoundT <= 0) { this.onBossThrow(); this.bossSoundT = 0.45; }
        for (const gr of groups) {
          gr.visible = true;
          const from = mouth.clone(), toZ = gr.position.z;
          const ring = new THREE.Mesh(this.G.ring, this.fxMat(0xff2a2a));
          ring.position.set(gr.position.x, 0.08, toZ);
          this.scene.add(ring);
          this.fx.push({ mesh: ring, t: 0, dur: 1.0, update: (m, u) => { m.scale.setScalar(1.4 - u * 0.4 + Math.sin(u * 30) * 0.08); m.material.opacity = u < 0.85 ? 0.9 : (1 - u) * 6; m.position.x = gr.position.x; } });
          gr.userData.flight = { from, toZ, t: 0 };
        }
      }
      this.bossSoundT -= dt;
      for (const groups of this.bossRows.values()) {
        for (const gr of groups) {
          const f = gr.userData.flight;
          if (!f) continue;
          f.t += dt / 0.85;
          const u = Math.min(1, f.t);
          gr.position.z = U.lerp(f.from.z, f.toZ, u);
          gr.position.y = U.lerp(f.from.y, 0, u) + Math.sin(u * Math.PI) * 6;
          gr.rotation.x = (1 - u) * 6;
          gr.scale.setScalar(0.4 + u * 0.6);
          if (u >= 1) {
            gr.userData.flight = null;
            gr.position.y = 0; gr.rotation.x = 0; gr.scale.setScalar(1);
            this.burst(new THREE.Vector3(gr.position.x, 0.3, gr.position.z), 0xff8a4a, 10, { speed: 6, up: 3, life: 0.5, grav: 10 });
            this.shake = Math.max(this.shake, 0.12);
          }
        }
      }
    }
    bossHit() {
      if (!this.boss) return;
      this.bossHitT = 0.25;
      this.burst(this.boss.g.position, 0xffffff, 30, { speed: 14, up: 2, life: 0.7, size: 2.5, grav: 0 });
      this.burst(this.boss.g.position, 0x7affd8, 20, { speed: 10, up: 2, life: 0.6, size: 2, grav: 0 });
      this.shake = Math.max(this.shake, 0.3);
      // a bolt of light from the runner to the boss
      const pts = [this.playerPos(1.2), this.boss.g.position.clone()];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9affff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      line.userData.ownGeo = true;
      this.scene.add(line);
      this.fx.push({ mesh: line, t: 0, dur: 0.35, update: (m, u) => { m.material.opacity = 1 - u; } });
    }
    bossDefeat() {
      if (!this.boss || this.bossDying >= 0) return;
      this.bossDying = 0;
      this.bossHP = 0;
      this.flashV = 1;
    }

    // progress milestone: a shockwave on the floor in the level's colour
    milestoneFx() {
      const color = this.lt.accent;
      const p = this.playerPos(0.1);
      for (const [delay, w] of [[0, 1], [0.12, 0.6]]) {
        const ring = new THREE.Mesh(this.G.torus, this.fxMat(color));
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(p);
        ring.visible = false;
        this.scene.add(ring);
        this.fx.push({ mesh: ring, t: -delay, dur: 0.8, update: (m, u) => { m.visible = u > 0; m.position.z = this.runner.root.position.z; m.scale.setScalar(0.5 + Math.max(0, u) * 9 * w); m.material.opacity = 1 - Math.max(0, u); } });
      }
      this.burst(this.playerPos(1), color, 30, { speed: 10, up: 4, life: 0.9, size: 1.4, grav: 8 });
      this.camera.fov += 6; this.camera.updateProjectionMatrix();
      this.shake = Math.max(this.shake, 0.15);
    }

    _updateCamera(dt, t, view, sim) {
      const P = sim.player, cam = this.camera;
      const x = P.lat, z = -P.d;
      if (view.mode === 'menu' && view.wardrobe) {
        // close-up of the runner, framed on the left so the wardrobe panel fits on the right
        const a = Math.PI;
        const target = new THREE.Vector3(x + Math.sin(a) * 3.6, 2.1, z + Math.cos(a) * 3.6);
        cam.position.lerp(target, U.damp(4, dt));
        cam.lookAt(x + Math.cos(a) * 1.1, 1.45, z - Math.sin(a) * 1.1);
        return;
      }
      if (view.mode === 'menu') {
        const a = Math.PI + Math.sin(t * 0.22) * 0.55;
        cam.position.set(x + Math.sin(a) * 6, 2.3 + Math.sin(t * 0.4) * 0.3, z + Math.cos(a) * 6);
        cam.lookAt(x, 1.4, z);
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
      // from level 4 the world rocks slowly from side to side, like a ship; stronger every level
      const sway = inst * Math.sin(t * 1.05);
      cam.position.x += sway * 0.7;
      const roll = sway * 0.07 + (this.glitch > 0 ? (rnd() - 0.5) * 0.04 : 0);   // (a short shake only when a rift flips you)
      this.camRoll = U.lerp(this.camRoll, roll, U.damp(6, dt));
      cam.rotateZ(this.camRoll);
      const warpFov = sim.warp ? (sim.warp.kind === 'fast' ? 10 : -6) : 0;
      const fov = this.baseFov + Math.max(0, sim.speed - 11) * 0.35 + warpFov;
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
    hideCoin(i, fly) {
      const m = this.coinMeshes[i];
      if (!m) return;
      m.visible = false;
      if (fly) {   // magnet: the coin zips over to the runner
        const c = new THREE.Mesh(m.geometry, this.fxMat(m.material === this.M.coin ? 0xffd84a : 0xd08aff));
        const from = m.position.clone();
        c.position.copy(from);
        this.scene.add(c);
        this.fx.push({ mesh: c, t: 0, dur: 0.25, update: (o, u) => { o.position.lerpVectors(from, this.playerPos(1), u * u); o.scale.setScalar(1 - u * 0.6); } });
        return;
      }
      this.burst(m.position, m.material === this.M.coin ? 0xffd84a : 0xd08aff, 6, { speed: 4, life: 0.35 });
    }
    hideShard(i) {
      const s = this.shardMeshes[i];
      if (!s) return;
      s.visible = false;
      this.burst(s.position, 0xffffff, 26, { speed: 8, life: 0.7 });
    }
    openChest(i) {
      const c = this.chestMeshes[i];
      if (!c) return;
      c.userData.opened = true;
      c.userData.beam.visible = false;
      c.userData.sparkle.visible = false;
      const p = c.position.clone(); p.y += 0.8;
      this.burst(p, 0xffd84a, 30, { speed: 9, up: 7, life: 1.1, size: 1.3, grav: 12 });
      this.burst(p, 0xffffff, 16, { speed: 6, up: 3, life: 0.6, grav: 0 });
      const ring = new THREE.Mesh(this.G.torus, this.fxMat(0xffd84a));
      ring.position.copy(p); this.scene.add(ring);
      this.fx.push({ mesh: ring, t: 0, dur: 0.6, update: (m, u) => { m.scale.setScalar(0.5 + u * 6); m.material.opacity = 1 - u; } });
      // lid flips open, then the chest sinks away behind you
      this.fx.push({ mesh: new THREE.Object3D(), t: 0, dur: 1.4, update: (m, u) => {
        c.userData.lid.rotation.x = Math.min(1, u * 4) * 1.9;
        if (u > 0.6) c.scale.setScalar(Math.max(0.01, 1 - (u - 0.6) * 2.5));
      } });
      this.fx[this.fx.length - 1].mesh.material = { dispose() {} };
      this.shake = Math.max(this.shake, 0.2);
    }
    padFx(i, kind) {
      const m = this.padMeshes[i];
      const color = kind === 'fast' ? 0x3affc0 : 0xc86aff;
      if (m) m.visible = false;
      const ring = new THREE.Mesh(this.G.torus, this.fxMat(color));
      ring.position.copy(this.playerPos(1));
      this.scene.add(ring);
      this.fx.push({ mesh: ring, t: 0, dur: 0.5, update: (r, u) => { r.position.z = this.runner.root.position.z; r.scale.setScalar(0.5 + u * 5); r.material.opacity = 1 - u; } });
      this.burst(this.playerPos(0.5), color, 20, { speed: 7, up: 3, life: 0.6, grav: 4 });
      this.camera.fov += kind === 'fast' ? 9 : -5; this.camera.updateProjectionMatrix();
    }
    shieldFx() {
      const p = this.playerPos(1.1);
      for (const [delay, w] of [[0, 1], [0.1, 0.7]]) {
        const s = new THREE.Mesh(this.G.shieldBall, this.fxMat(0x7ae8ff));
        s.position.copy(p); this.scene.add(s);
        this.fx.push({ mesh: s, t: -delay, dur: 0.6, update: (o, u) => { o.visible = u > 0; o.position.z = this.runner.root.position.z; o.scale.setScalar(1 + Math.max(0, u) * 3 * w); o.material.opacity = 0.6 * (1 - Math.max(0, u)); } });
      }
      this.burst(p, 0x7ae8ff, 26, { speed: 9, up: 3, life: 0.6, grav: 0 });
      this.shake = Math.max(this.shake, 0.5);
    }
    reviveFx() {
      const p = this.playerPos(0.1);
      for (const [delay, w] of [[0, 1], [0.15, 0.7], [0.3, 0.45]]) {
        const ring = new THREE.Mesh(this.G.torus, this.fxMat(0xffffff));
        ring.rotation.x = Math.PI / 2; ring.position.copy(p); ring.visible = false; this.scene.add(ring);
        this.fx.push({ mesh: ring, t: -delay, dur: 0.7, update: (o, u) => { o.visible = u > 0; o.scale.setScalar(0.3 + Math.max(0, u) * 5 * w); o.material.opacity = 1 - Math.max(0, u); } });
      }
      this.burst(this.playerPos(1), 0xfff2b0, 30, { speed: 6, up: 6, life: 0.9, grav: 4 });
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
