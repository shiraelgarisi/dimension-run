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
      this.stumbleT = 0;
      this.events = [];
      this.acc = 0;
    }

    get speed() { return this.track.speedAt(this.player.d); }
    get progress() { return Math.min(1, this.player.d / this.track.length); }
    get world() { return this.dim.world; }

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
      this.scoring.addDistance(speed * dt);
      this.stumbleT = Math.max(0, this.stumbleT - dt);

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
        return;
      }
    }

    _die(kind, cell) {
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
      for (let i = this.coinCursor; i < coins.length && coins[i].d < P.d + 1.5; i++) {
        if (this.coinTaken[i]) continue;
        const c = coins[i];
        if (c.world !== this.dim.world) continue;
        if (Math.abs(c.d - P.d) < 1 && Math.abs(c.lane * C.LANE_W - P.lat) < 1.1 && Math.abs(c.y - (P.y + 0.9)) < 1.3) {
          this.coinTaken[i] = 1;
          this.scoring.coin();
          this.events.push({ type: 'coin', index: i });
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
    }
  }

  Sim.STEP = STEP;
  DR.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
