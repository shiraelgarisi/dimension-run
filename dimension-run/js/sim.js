/* The gameplay simulation for one level run: ties together the player, dimension
   switching, collisions, pickups, rift gates and the finish line. It has no rendering,
   so the browser game and the Node tests run exactly the same rules.
   Rendering and sound react to `sim.events`, which the game drains every frame. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const C = DR.CONST;

  const STEP = 1 / 120;          // fixed physics step: nothing gets tunnelled at 29 m/s
  const STUMBLE_WINDOW = 3;      // two side-bounces within this many seconds = crash

  class Sim {
    constructor(track) {
      this.track = track;
      this.player = new DR.Player();
      this.dim = new DR.Dimension(track.cfg.cooldown);
      this.scoring = new DR.Scoring(track.cfg.id);
      this.reset();
    }

    reset() {
      this.player.reset();
      this.dim.reset(this.track.cfg.cooldown);
      this.scoring.reset(this.track.cfg.id);
      this.state = 'running';      // running | dead | finished
      this.time = 0;
      this.deathKind = null;
      this.deathT = 0;
      this.rowCursor = 0;
      this.coinCursor = 0;
      this.coinTaken = new Uint8Array(this.track.coins.length);
      this.shardTaken = new Uint8Array(this.track.shards.length);
      this.riftDone = new Set();
      this.chestTaken = new Uint8Array((this.track.chests || []).length);
      this.padCursor = 0;
      this.padTaken = new Uint8Array((this.track.pads || []).length);
      this.warp = null;            // active time pad: { kind, t }
      this.ghostT = 0;             // > 0: you pass through obstacles (after a shield or a revive)
      this.shields = 0;            // crashes you can still survive this run
      this.magnet = false;         // pulls in coins from every lane
      this.revives = 0;
      this.stumbleT = 0;
      this.events = [];
      this.acc = 0;
    }

    get speed() { return this.track.speedAt(this.player.d); }
    get progress() { return Math.min(1, this.player.d / this.track.length); }
    get world() { return this.dim.world; }
    /** How fast time flows (time pads). The game multiplies its frame time by this. */
    get timeScale() { return this.warp && this.state === 'running' ? DR.TIME_PADS[this.warp.kind].scale : 1; }

    // ----- input -----
    left() { return this._act(() => this.player.move(-1), 'move'); }
    right() { return this._act(() => this.player.move(1), 'move'); }
    jump() { return this._act(() => this.player.jump(), 'jump'); }
    slide() { return this._act(() => this.player.slide(), 'slide'); }
    switchWorld() {
      if (this.state !== 'running') return false;
      if (this.dim.trySwitch()) { this.events.push({ type: 'switch', world: this.dim.world }); return true; }
      this.events.push({ type: 'switchDenied' });
      return false;
    }
    _act(fn, name) {
      if (this.state !== 'running') return false;
      const ok = fn();
      if (ok) this.events.push({ type: name });
      return ok;
    }

    /** Advance by a frame's dt using fixed sub-steps. `beforeStep` lets the autopilot act. */
    update(dt, beforeStep) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        if (beforeStep) beforeStep(this);
        this.step(STEP);
      }
    }

    step(dt) {
      const P = this.player;
      if (this.state === 'dead') {
        this.deathT += dt;
        P.update(dt, this.deathKind === 'gap' ? this.speed * Math.max(0, 1 - this.deathT * 2) : 0);
        return;
      }
      if (this.state === 'finished') {
        // coast and slow down after the finish line
        this.deathT += dt;
        P.update(dt, this.speed * Math.max(0, 1 - this.deathT * 0.6));
        return;
      }

      this.time += dt;
      const speed = this.speed;
      if (this.dim.update(dt)) this.events.push({ type: 'ready' });
      for (const e of P.update(dt, speed)) this.events.push({ type: e });
      const warpCfg = this.warp && DR.TIME_PADS[this.warp.kind];
      this.scoring.addDistance(speed * dt * (warpCfg ? warpCfg.pointsMult : 1));
      if (this.warp && (this.warp.t -= dt) <= 0) { this.warp = null; this.events.push({ type: 'warpEnd' }); }
      this.stumbleT = Math.max(0, this.stumbleT - dt);
      if (this.ghostT > 0) {
        this.ghostT -= dt;
        // only become solid again with some room before the next obstacle
        if (this.ghostT <= 0 && this._rowSoon(0.8)) this.ghostT = 0.01;
        if (this.ghostT <= 0) { this.ghostT = 0; this.events.push({ type: 'solid' }); }
      }

      this._collide();
      if (this.state !== 'running') return;
      this._pickups();

      if (P.d >= this.track.length) {
        this.state = 'finished';
        this.deathT = 0;
        this.scoring.complete();
        this.events.push({ type: 'finish' });
      }
    }

    _collide() {
      const P = this.player, rows = this.track.rows;
      while (this.rowCursor < rows.length && rows[this.rowCursor].d + rows[this.rowCursor].depth / 2 + 1 < P.d) this.rowCursor++;
      for (let i = this.rowCursor; i < rows.length; i++) {
        const row = rows[i];
        if (row.d - row.depth / 2 - 1 > P.d) break;
        if (row.kind === 'rift') {
          if (P.d >= row.d && !this.riftDone.has(i)) {
            this.riftDone.add(i);
            this.dim.forceFlip();
            this.events.push({ type: 'rift', world: this.dim.world });
          }
          continue;
        }
        if (this.ghostT > 0) continue;
        const res = DR.collision.testRow(row, this.dim.world, P);
        if (!res) continue;
        if (res.hit === 'bounce') {
          P.lane = P.fromLane;
          P.lat = P.prevLat;
          if (this.stumbleT > 0) { this._die('stumble'); return; }
          this.stumbleT = STUMBLE_WINDOW;
          this.events.push({ type: 'bounce' });
          continue;
        }
        this._die(res.hit, res.cell);
        if (this.state !== 'running' || this.ghostT > 0) return;
      }
    }

    // is an obstacle row (or the one you are in) closer than `sec` seconds?
    _rowSoon(sec) {
      const P = this.player;
      for (let i = this.rowCursor; i < this.track.rows.length; i++) {
        const r = this.track.rows[i];
        if (r.kind === 'rift' || r.kind === 'finish') continue;
        if (r.d + r.depth / 2 + 0.5 < P.d) continue;
        return r.d - r.depth / 2 - P.d < this.speed * sec;
      }
      return false;
    }

    /** Continue after a crash: back on your feet, passing through obstacles for a moment. */
    revive() {
      if (this.state !== 'dead') return false;
      const P = this.player;
      this.state = 'running';
      this.deathKind = null;
      this.deathCell = null;
      P.y = 0; P.vy = 0; P.falling = false; P.slideT = 0; P.slideQueued = false; P.jumpBuf = 0;
      P.lat = P.lane * C.LANE_W; P.fromLane = P.lane;
      this.stumbleT = 0;
      this.warp = null;
      this.ghostT = DR.GHOST_TIME.revive;
      this.revives++;
      this.events.push({ type: 'revive' });
      return true;
    }

    _die(kind, cell) {
      if (this.shields > 0) {   // the shield takes the hit
        this.shields--;
        this.ghostT = DR.GHOST_TIME.shield;
        this.stumbleT = 0;
        this.events.push({ type: 'shield', kind });
        return;
      }
      this.state = 'dead';
      this.deathKind = kind;
      this.deathCell = cell || null;
      this.deathT = 0;
      if (kind === 'gap') this.player.falling = true;
      else this.player.vy = Math.min(this.player.vy, 0);
      this.events.push({ type: 'death', kind, enemy: !!(cell && cell.enemy) });
    }

    _pickups() {
      const P = this.player, coins = this.track.coins;
      while (this.coinCursor < coins.length && coins[this.coinCursor].d < P.d - 1.5) this.coinCursor++;
      const reach = this.magnet ? 7 : 1.5;
      for (let i = this.coinCursor; i < coins.length && coins[i].d < P.d + reach; i++) {
        if (this.coinTaken[i]) continue;
        const c = coins[i];
        if (c.world !== this.dim.world) continue;
        const near = Math.abs(c.d - P.d) < 1 && Math.abs(c.lane * C.LANE_W - P.lat) < 1.1 && Math.abs(c.y - (P.y + 0.9)) < 1.3;
        const pulled = this.magnet && c.d - P.d < 7 && c.d - P.d > -1;
        if (near || pulled) {
          this.coinTaken[i] = 1;
          this.scoring.coin();
          this.events.push({ type: 'coin', index: i, magnet: !near });
        }
      }
      const shards = this.track.shards;
      for (let i = 0; i < shards.length; i++) {
        if (this.shardTaken[i]) continue;
        const s = shards[i];
        if (s.world === this.dim.world && Math.abs(s.d - P.d) < 1.1 && Math.abs(s.lane * C.LANE_W - P.lat) < 1.2) {
          this.shardTaken[i] = 1;
          this.scoring.shard();
          this.events.push({ type: 'shard', index: i });
        }
      }
      const chests = this.track.chests || [];
      for (let i = 0; i < chests.length; i++) {
        if (this.chestTaken[i]) continue;
        const c = chests[i];
        if (c.world === this.dim.world && Math.abs(c.d - P.d) < 1.1 && Math.abs(c.lane * C.LANE_W - P.lat) < 1.2) {
          this.chestTaken[i] = 1;
          this.scoring.chest();
          this.events.push({ type: 'chest', index: i });
        }
      }
      // time pads trigger when you run over them (not while jumping over)
      const pads = this.track.pads || [];
      while (this.padCursor < pads.length && pads[this.padCursor].d < P.d - 1) this.padCursor++;
      for (let i = this.padCursor; i < pads.length && pads[i].d < P.d + 1; i++) {
        const p = pads[i];
        if (this.padTaken[i] || Math.abs(p.d - P.d) > 0.9 || Math.abs(p.lane * C.LANE_W - P.lat) > 1.1 || P.y > 0.6) continue;
        this.padTaken[i] = 1;
        this.warp = { kind: p.kind, t: DR.TIME_PADS[p.kind].duration };
        this.events.push({ type: 'pad', kind: p.kind, index: i });
      }
    }
  }

  Sim.STEP = STEP;
  DR.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
