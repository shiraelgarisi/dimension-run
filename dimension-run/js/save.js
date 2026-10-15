/* Save system: unlocked levels, completed levels and best scores in localStorage,
   so progress survives closing and reopening the game. Corrupt or tampered data
   is sanitised instead of crashing the game. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const KEY = 'dimensionRun.save';
  const VERSION = 1;
  const LEVEL_COUNT = 5;

  const defaults = () => ({ v: VERSION, unlocked: 1, best: {}, completed: {}, muted: false });

  function sanitise(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    const u = Math.floor(Number(raw.unlocked));
    d.unlocked = Number.isFinite(u) ? Math.max(1, Math.min(LEVEL_COUNT, u)) : 1;
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const b = Number(raw.best && raw.best[i]);
      if (Number.isFinite(b) && b > 0) d.best[i] = Math.floor(b);
      if (raw.completed && raw.completed[i] === true) d.completed[i] = true;
    }
    d.muted = raw.muted === true;
    return d;
  }

  const save = {
    data: defaults(),
    load() {
      try { this.data = sanitise(JSON.parse(localStorage.getItem(KEY))); }
      catch (e) { this.data = defaults(); }
      return this.data;
    },
    write() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage blocked: keep playing */ }
    },
    reset() {
      const muted = this.data.muted;
      this.data = defaults();
      this.data.muted = muted;
      this.write();
    },
    isUnlocked(n) { return n <= this.data.unlocked; },
    isCompleted(n) { return this.data.completed[n] === true; },
    best(n) { return this.data.best[n] || 0; },
    bestTotal() { let t = 0; for (let i = 1; i <= LEVEL_COUNT; i++) t += this.best(i); return t; },
    /** Returns true when this is a new best for the level. */
    recordScore(n, score) {
      const isBest = score > this.best(n);
      if (isBest) { this.data.best[n] = Math.floor(score); this.write(); }
      return isBest;
    },
    /** Marks a level complete, unlocks the next one and records the score. */
    completeLevel(n, score) {
      this.data.completed[n] = true;
      if (n < LEVEL_COUNT) this.data.unlocked = Math.max(this.data.unlocked, n + 1);
      const isBest = this.recordScore(n, score);
      this.write();
      return isBest;
    },
    setMuted(m) { this.data.muted = !!m; this.write(); },
  };

  save.load();
  DR.save = save;
})(typeof window !== 'undefined' ? window : globalThis);
