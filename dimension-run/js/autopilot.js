/* Autopilot: plays a level by following the solver's planned path through the real
   simulation. The test suite uses it (optionally with human-like timing jitter) to
   prove every level can be finished; in the browser, add ?autopilot to the URL to watch it. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const C = DR.CONST;

  const AIRTIME = (2 * C.JUMP_V) / C.GRAVITY;

  class Autopilot {
    /** opts.jitter: max random reaction delay / timing error in seconds; opts.rng: () => [0,1) */
    constructor(track, opts = {}) {
      this.track = track;
      this.jitter = opts.jitter || 0;
      this.rand = opts.rng || Math.random;
      this.i = 0;
      this.delay = this._roll();
      this.jumpErr = this._sym();
      this.slideErr = this._sym();
    }
    _roll() { return this.rand() * this.jitter; }
    _sym() { return (this.rand() * 2 - 1) * this.jitter * 0.5; }

    tick(sim) {
      if (sim.state !== 'running') return;
      const rows = this.track.rows, plan = this.track.plan, P = sim.player;
      // current target: the first row whose hitbox (plus margin) we have not cleared yet
      // (a rift gate has no hitbox and flips the world at its centre, so it counts as cleared there)
      const cleared = r => (r.kind === 'rift' ? P.d >= r.d : P.d > r.d + r.depth / 2 + 0.4);
      while (this.i < rows.length - 1 && cleared(rows[this.i])) {
        this.i++;
        this.delay = this._roll();
        this.jumpErr = this._sym();
        this.slideErr = this._sym();
      }
      const row = rows[this.i], p = plan[this.i], prev = rows[this.i - 1];
      const speed = sim.speed;
      // human reaction: wait a little after clearing the previous row
      const clearedAt = !prev ? 0 : prev.kind === 'rift' ? prev.d : prev.d + prev.depth / 2 + 0.4;
      if (P.d < clearedAt + this.delay * speed) return;

      if (P.lane < p.lane) sim.right();
      else if (P.lane > p.lane) sim.left();
      if (sim.dim.world !== p.world && sim.dim.ready) sim.switchWorld();

      const timeTo = (row.d - P.d) / speed;
      if (p.action === 'jump' && P.grounded && timeTo <= AIRTIME / 2 + this.jumpErr && timeTo > -0.05) sim.jump();
      if (p.action === 'slide' && P.slideT <= 0 && timeTo <= 0.22 + this.slideErr && timeTo > -0.05) sim.slide();
    }
  }

  DR.Autopilot = Autopilot;
})(typeof window !== 'undefined' ? window : globalThis);
