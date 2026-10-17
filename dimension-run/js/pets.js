/* Pets: little blocky animals that run beside the runner. Each model faces -z (the way
   the runner runs) and returns its moving parts so world.js can animate them. */
(function () {
  'use strict';
  const DR = window.DR;

  /** X is a DR.dress.Res() tracker. Returns { g, legs, tail, head, wings }. */
  function build(id, X) {
    const g = new THREE.Group();
    const box = (w, h, d, c, x, y, z, parent = g) => {
      const m = X.mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? X.lam(c) : c, x, y, z);
      parent.add(m);
      return m;
    };
    const head = new THREE.Group();
    g.add(head);
    const legs = [], out = { g, legs, head, tail: null, wings: null };
    const eyes = (y, z, gap = 0.09, c = 0x111111) => { for (const s of [-1, 1]) box(0.05, 0.06, 0.02, c, s * gap, y, z, head); };
    // four legs that swing from the hip
    const fourLegs = (c, w, h, sx, z1, z2, y) => {
      for (const [x, z] of [[-sx, z1], [sx, z1], [-sx, z2], [sx, z2]]) {
        const p = new THREE.Group(); p.position.set(x, y, z); g.add(p);
        box(w, h, w, c, 0, -h / 2, 0, p);
        legs.push(p);
      }
    };
    const tailPivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); out.tail = p; return p; };

    if (id === 'panda') {
      const W = 0xf4f4f0, K = 0x1a1a1e;
      box(0.42, 0.32, 0.5, W, 0, 0.36, 0);
      box(0.44, 0.16, 0.18, K, 0, 0.4, -0.12);          // black shoulder band
      fourLegs(K, 0.13, 0.2, 0.13, -0.16, 0.16, 0.22);
      head.position.set(0, 0.6, -0.3);
      box(0.36, 0.32, 0.3, W, 0, 0, 0, head);
      for (const s of [-1, 1]) { box(0.1, 0.1, 0.06, K, s * 0.15, 0.18, 0, head); box(0.1, 0.09, 0.02, K, s * 0.08, 0.02, -0.155, head); }
      eyes(0.03, -0.17, 0.08, 0xffffff);
      box(0.07, 0.05, 0.03, K, 0, -0.07, -0.16, head);
      box(0.08, 0.08, 0.06, W, 0, 0.42, 0.27);
    } else if (id === 'corgi') {
      // what makes a corgi: long low body, tiny legs, big pointed ears, fox snout, white blaze and fluffy rear
      const O = 0xe8923a, W = 0xfaf2e4, P = 0xffa8b8;
      box(0.32, 0.22, 0.66, O, 0, 0.27, 0);
      box(0.28, 0.08, 0.56, W, 0, 0.17, -0.02);           // white belly
      box(0.26, 0.2, 0.08, W, 0, 0.3, -0.33);             // white chest
      box(0.3, 0.18, 0.06, W, 0, 0.27, 0.34);             // fluffy white rear
      fourLegs(W, 0.09, 0.1, 0.1, -0.22, 0.22, 0.17);
      head.position.set(0, 0.47, -0.37);
      box(0.27, 0.22, 0.24, O, 0, 0, 0, head);
      box(0.05, 0.2, 0.02, W, 0, 0.03, -0.125, head);     // white blaze up the forehead
      box(0.14, 0.1, 0.18, W, 0, -0.06, -0.19, head);     // long fox-like snout
      box(0.06, 0.05, 0.04, 0x1a1a1e, 0, -0.03, -0.29, head);   // nose on the tip
      for (const s of [-1, 1]) {                           // big upright triangle ears
        const e = X.mesh(new THREE.ConeGeometry(0.08, 0.24, 4), X.lam(O), s * 0.085, 0.21, 0.01);
        e.rotation.y = Math.PI / 4; e.rotation.z = -s * 0.22; head.add(e);
        const inner = X.mesh(new THREE.ConeGeometry(0.045, 0.15, 4), X.lam(P), s * 0.08, 0.19, -0.035);
        inner.rotation.y = Math.PI / 4; inner.rotation.z = -s * 0.22; head.add(inner);
      }
      eyes(0.04, -0.125, 0.075);
      const t = tailPivot(0, 0.34, 0.37); box(0.06, 0.06, 0.05, O, 0, 0, 0.02, t);   // tiny stub tail
    } else if (id === 'chick') {
      const Y = 0xffd83a, O = 0xff9a1a;
      box(0.34, 0.3, 0.34, Y, 0, 0.3, 0);
      for (const s of [-1, 1]) {
        const p = new THREE.Group(); p.position.set(s * 0.08, 0.15, 0); g.add(p);
        box(0.04, 0.12, 0.04, O, 0, -0.06, 0, p); box(0.1, 0.03, 0.12, O, 0, -0.12, -0.03, p);
        legs.push(p);
      }
      const wings = [];
      for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.17, 0.36, 0); g.add(p); box(0.04, 0.16, 0.2, 0xffc81a, s * 0.02, -0.06, 0, p); wings.push(p); }
      out.wings = wings;
      head.position.set(0, 0.55, -0.04);
      box(0.28, 0.24, 0.26, Y, 0, 0, 0, head);
      box(0.1, 0.06, 0.1, O, 0, -0.03, -0.16, head);     // beak
      box(0.04, 0.08, 0.04, 0xffc81a, 0, 0.15, 0, head); // tuft
      eyes(0.04, -0.135, 0.07);
    } else if (id === 'cat') {
      const G = 0x9a9aa6, S = 0x5a5a66, P = 0xff9ab0;
      box(0.3, 0.26, 0.52, G, 0, 0.34, 0);
      for (const z of [-0.12, 0.04, 0.18]) box(0.31, 0.04, 0.05, S, 0, 0.47, z);   // stripes
      fourLegs(G, 0.08, 0.2, 0.1, -0.18, 0.18, 0.22);
      head.position.set(0, 0.56, -0.3);
      box(0.28, 0.24, 0.24, G, 0, 0, 0, head);
      for (const s of [-1, 1]) { const e = X.mesh(new THREE.ConeGeometry(0.07, 0.12, 4), X.lam(G), s * 0.09, 0.17, 0); e.rotation.y = Math.PI / 4; head.add(e); }
      eyes(0.03, -0.125, 0.07, 0x3adc6a);
      box(0.04, 0.03, 0.02, P, 0, -0.04, -0.125, head);
      for (const s of [-1, 1]) for (const y of [-0.03, -0.06]) box(0.12, 0.008, 0.008, 0xffffff, s * 0.12, y, -0.12, head);   // whiskers
      const t = tailPivot(0, 0.4, 0.26);
      box(0.06, 0.06, 0.32, G, 0, 0.1, 0.12, t).rotation.x = -0.9;
      box(0.065, 0.065, 0.06, S, 0, 0.22, 0.2, t);
    } else if (id === 'koala') {
      const G = 0x9aa0aa, L = 0xe8e8ec, K = 0x2a2a30;
      box(0.38, 0.34, 0.4, G, 0, 0.36, 0);
      box(0.24, 0.24, 0.05, L, 0, 0.34, -0.2);           // pale tummy
      fourLegs(G, 0.12, 0.18, 0.12, -0.12, 0.12, 0.2);
      head.position.set(0, 0.64, -0.12);
      box(0.36, 0.3, 0.28, G, 0, 0, 0, head);
      for (const s of [-1, 1]) {   // big fluffy ears
        box(0.16, 0.16, 0.08, G, s * 0.21, 0.12, 0, head);
        box(0.1, 0.1, 0.02, L, s * 0.21, 0.12, -0.045, head);
      }
      box(0.09, 0.12, 0.05, K, 0, -0.04, -0.155, head);  // big nose
      eyes(0.05, -0.145, 0.1);
    } else if (id === 'raccoon') {
      const G = 0x8a8a92, D = 0x2a2a30, L = 0xe8e8ec;
      box(0.34, 0.28, 0.5, G, 0, 0.34, 0);
      fourLegs(D, 0.09, 0.2, 0.11, -0.17, 0.17, 0.22);
      head.position.set(0, 0.56, -0.3);
      box(0.3, 0.24, 0.26, G, 0, 0, 0, head);
      box(0.31, 0.07, 0.02, D, 0, 0.03, -0.13, head);    // bandit mask
      box(0.12, 0.08, 0.1, L, 0, -0.07, -0.15, head);
      box(0.04, 0.03, 0.02, D, 0, -0.05, -0.205, head);
      eyes(0.035, -0.142, 0.08, 0xffffff);
      for (const s of [-1, 1]) box(0.08, 0.1, 0.04, G, s * 0.11, 0.15, 0.02, head);
      const t = tailPivot(0, 0.4, 0.25);
      for (let i = 0; i < 5; i++) box(0.12 - i * 0.008, 0.12 - i * 0.008, 0.09, i % 2 ? D : G, 0, 0.02 * i, 0.05 + i * 0.085, t);   // ringed tail
      t.rotation.x = 0.35;
    }
    return out;
  }

  /** Animates a pet. run: 0 idle .. 1 running; phase: the runner's stride phase. */
  function animate(p, t, run, phase) {
    if (run > 0.5) {
      p.g.position.y = Math.abs(Math.sin(phase)) * 0.18;
      p.legs.forEach((l, i) => { l.rotation.x = Math.sin(phase * 2 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.9; });
      p.head.rotation.x = Math.sin(phase * 2) * 0.08;
      p.head.rotation.y = 0;
    } else {
      p.g.position.y = Math.abs(Math.sin(t * 3)) * 0.04;
      p.legs.forEach(l => { l.rotation.x *= 0.85; });
      p.head.rotation.y = Math.sin(t * 0.9) * 0.5;   // looks around
      p.head.rotation.x = Math.sin(t * 1.7) * 0.06;
    }
    if (p.tail) p.tail.rotation.y = Math.sin(t * (run > 0.5 ? 14 : 7)) * 0.5;
    if (p.wings) p.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (run > 0.5 ? 0.3 + Math.abs(Math.sin(t * 20)) * 0.6 : Math.abs(Math.sin(t * 3)) * 0.15); });
  }

  DR.pets = { build, animate };
})();
