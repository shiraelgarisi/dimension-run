/* Shared helpers. Every logic module registers itself on the global DR namespace.
   Logic files (util, config, track, collision, player, dimension, scoring, autopilot)
   never touch the DOM or Three.js, so the Node test suite can load them too. */
(function (root) {
  'use strict';
  const DR = (root.DR = root.DR || {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt);   // frame-rate independent smoothing
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const moveToward = (v, target, maxStep) =>
    Math.abs(target - v) <= maxStep ? target : v + Math.sign(target - v) * maxStep;

  // Small, fast, seedable PRNG (mulberry32). Levels use a fixed seed so every
  // run of a level has the same, learnable layout.
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      range: (a, b) => a + next() * (b - a),
      int: (a, b) => a + Math.floor(next() * (b - a + 1)),
      pick: arr => arr[Math.floor(next() * arr.length)],
      chance: p => next() < p,
      shuffle(arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      },
      weighted(table) {             // table: { key: weight }
        let total = 0;
        for (const k in table) total += table[k];
        let r = next() * total;
        for (const k in table) { r -= table[k]; if (r <= 0) return k; }
        return Object.keys(table)[0];
      },
    };
  }

  DR.util = { clamp, lerp, damp, smooth, moveToward, rng };
})(typeof window !== 'undefined' ? window : globalThis);
