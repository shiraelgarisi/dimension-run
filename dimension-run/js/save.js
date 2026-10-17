/* Save system: unlocked levels, completed levels and best scores in localStorage,
   so progress survives closing and reopening the game. Corrupt or tampered data
   is sanitised instead of crashing the game. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const KEY = 'dimensionRun.save';
  const VERSION = 1;
  const LEVEL_COUNT = (DR.LEVELS || []).length || 5;

  const COS = () => DR.COSMETICS || {};
  const freeItems = () => Object.keys(COS()).flatMap(slot => COS()[slot].filter(i => i.free).map(i => slot + ':' + i.id));
  const firstFree = slot => (COS()[slot].find(i => i.free) || COS()[slot][0]).id;
  const defaults = () => ({
    v: VERSION, unlocked: 1, best: {}, completed: {}, muted: false, wallet: 0, items: { shield: 0, magnet: 0 },
    owned: freeItems(),
    equipped: Object.fromEntries(Object.keys(COS()).map(slot => [slot, firstFree(slot)])),
  });
  const exists = key => { const [slot, id] = String(key).split(':'); return !!(COS()[slot] && COS()[slot].some(i => i.id === id)); };

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
    const w = Math.floor(Number(raw.wallet));
    if (Number.isFinite(w) && w > 0) d.wallet = Math.min(w, 1e7);
    for (const k in d.items) {
      const n = Math.floor(Number(raw.items && raw.items[k]));
      if (Number.isFinite(n) && n > 0) d.items[k] = Math.min(n, 99);
    }
    if (Array.isArray(raw.owned)) for (const k of raw.owned) if (exists(k) && !d.owned.includes(k)) d.owned.push(k);
    if (raw.equipped && typeof raw.equipped === 'object') {
      for (const slot in d.equipped) {
        const id = raw.equipped[slot];
        if (d.owned.includes(slot + ':' + id)) d.equipped[slot] = id;
      }
    }
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
      const { muted, owned, equipped, wallet, items } = this.data;
      this.data = defaults();
      Object.assign(this.data, { muted, owned, equipped, wallet, items });   // found items and coins are kept
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
    addCoins(n) { this.data.wallet += n; },          // written with the next write()
    /** Spend coins; false (and nothing changes) if you cannot afford it. */
    spend(n) {
      if (this.data.wallet < n) return false;
      this.data.wallet -= n;
      this.write();
      return true;
    },
    buy(item) {
      const it = DR.SHOP[item];
      if (!it || !this.spend(it.price)) return false;
      this.data.items[item]++;
      this.write();
      return true;
    },
    /** Takes one of a power-up for this run, if you have any. */
    useItem(item) {
      if (!(this.data.items[item] > 0)) return false;
      this.data.items[item]--;
      this.write();
      return true;
    },
    owns(slot, id) { return this.data.owned.includes(slot + ':' + id); },
    /** Unlocks a random item you do not own yet; returns { slot, item } or null when you own everything. */
    unlockRandom(rand = Math.random) {
      const all = Object.keys(COS()).flatMap(slot => COS()[slot].map(item => ({ slot, item })));
      const left = all.filter(x => !this.owns(x.slot, x.item.id));
      if (!left.length) return null;
      const pick = left[Math.floor(rand() * left.length)];
      this.data.owned.push(pick.slot + ':' + pick.item.id);
      this.write();
      return pick;
    },
    equip(slot, id) {
      if (!this.owns(slot, id)) return false;
      this.data.equipped[slot] = id;
      this.write();
      return true;
    },
  };

  save.load();
  DR.save = save;
})(typeof window !== 'undefined' ? window : globalThis);
