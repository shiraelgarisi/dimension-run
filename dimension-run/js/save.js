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
    v: VERSION, unlocked: 1, best: {}, completed: {}, muted: false, wallet: 0, gems: 0, endlessBest: 0, tutorialDone: false, newItems: [], stars: {}, bestProgress: {},
    daily: { last: '', streak: 0 }, missions: { date: '', list: [], bonus: 'none' }, onboard: { gift: false, wardrobe: 0 }, items: { shield: 0, magnet: 0 },
    owned: freeItems(),
    equipped: Object.fromEntries(Object.keys(COS()).map(slot => [slot, firstFree(slot)])),
  });
  const starCount = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
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
    // players who already have progress never need the tutorial
    d.tutorialDone = raw.tutorialDone === true || d.unlocked > 1 || Object.keys(d.best).length > 0;
    // first-time guides: gift = shown how to open a gift; wardrobe 0 none, 1 to show, 2 shown
    if (raw.onboard && typeof raw.onboard === 'object') {
      d.onboard.gift = raw.onboard.gift === true;
      d.onboard.wardrobe = [0, 1, 2].includes(raw.onboard.wardrobe) ? raw.onboard.wardrobe : 0;
    }
    for (let i = 0; i <= LEVEL_COUNT; i++) {
      const m = Math.floor(Number(raw.stars && raw.stars[i]));
      if (m > 0 && m < 8) d.stars[i] = m;
    }
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const bp = Number(raw.bestProgress && raw.bestProgress[i]);
      if (bp > 0 && bp <= 1) d.bestProgress[i] = bp;
    }
    if (raw.daily && /^\d{4}-\d\d-\d\d$/.test(raw.daily.last)) {
      d.daily.last = raw.daily.last;
      d.daily.streak = Math.max(0, Math.min(7, Math.floor(Number(raw.daily.streak)) || 0));
    }
    if (raw.missions && /^\d{4}-\d\d-\d\d$/.test(raw.missions.date) && Array.isArray(raw.missions.list)) {
      const list = raw.missions.list.filter(m => m && DR.MISSIONS.some(x => x.type === m.type) && m.target > 0).slice(0, 3)
        .map(m => ({ type: m.type, target: Math.floor(m.target), progress: Math.max(0, Number(m.progress) || 0), done: m.done === true }));
      if (list.length === 3) d.missions = { date: raw.missions.date, list, bonus: ['none', 'ready', 'claimed'].includes(raw.missions.bonus) ? raw.missions.bonus : 'none' };
    }
    if (Array.isArray(raw.newItems)) d.newItems = raw.newItems.filter(k => typeof k === 'string' && exists(k)).slice(0, 50);
    const gm = Math.floor(Number(raw.gems));
    if (Number.isFinite(gm) && gm > 0) d.gems = Math.min(gm, 1e6);
    const eb = Math.floor(Number(raw.endlessBest));
    if (Number.isFinite(eb) && eb > 0) d.endlessBest = eb;
    const b0 = Number(raw.best && raw.best[0]);
    if (Number.isFinite(b0) && b0 > 0) d.best[0] = Math.floor(b0);
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
    addGems(n) { this.data.gems += n; },             // written with the next write()
    /** Buys a pet (or any priced item) with diamonds. */
    buyItem(slot, id) {
      const item = (COS()[slot] || []).find(i => i.id === id);
      if (!item || !item.price || this.owns(slot, id) || this.data.gems < item.price) return false;
      this.data.gems -= item.price;
      this.data.owned.push(slot + ':' + id);
      this.write();
      return true;
    },
    /** Opens a treasure chest: { kind: 'item', slot, item } | { kind: 'coins' | 'gems', amount }. Applied and saved. */
    openChest(rand = Math.random, boost = false) {
      const C = DR.CHEST;
      const weighted = list => { let t = 0; for (const [, w] of list) t += w; let x = rand() * t; for (const [v, w] of list) { if ((x -= w) < 0) return v; } return list[list.length - 1][0]; };
      const itemsLeft = this.findable().length > 0;
      // a boosted chest (the day-7 gift) gives an item or diamonds, and favours rare items
      const kind = weighted([['item', itemsLeft ? (boost ? 70 : C.item) : 0], ['coins', boost ? 0 : C.coins], ['gems', C.gems]]);
      if (kind === 'item') {
        const got = this.unlockRandom(rand, boost);
        this.data.newItems.push(got.slot + ':' + got.item.id);
        this.write();
        return Object.assign({ kind }, got);
      }
      const amount = weighted(kind === 'coins' ? C.coinAmounts : C.gemAmounts);
      if (kind === 'coins') this.addCoins(amount); else this.addGems(amount);
      this.write();
      return { kind, amount };
    },
    /** Items chests can still give you (pets are not in chests: they are bought with diamonds). */
    findable() {
      return Object.keys(COS()).flatMap(slot => COS()[slot].map(item => ({ slot, item }))).filter(x => !x.item.price && !this.owns(x.slot, x.item.id));
    },
    recordEndless(meters) {
      const isBest = meters > this.data.endlessBest;
      if (isBest) { this.data.endlessBest = Math.floor(meters); this.write(); }
      return isBest;
    },
    /** Stars earned on a level (bitmask 1 finish, 2 all shards, 4 no hits). Returns the newly earned ones. */
    addStars(level, mask) {
      const had = this.data.stars[level] || 0, gained = mask & ~had;
      if (gained) {
        this.data.stars[level] = had | mask;
        this.data.gems += DR.STARS.reward * starCount(gained);
        this.write();
      }
      return gained;
    },
    // ---------- best progress (for the "one more run" screen) ----------
    recordProgress(level, p) {
      const before = this.data.bestProgress[level] || 0;
      if (p > before) this.data.bestProgress[level] = Math.min(1, p);
      return before;
    },

    // ---------- daily reward ----------
    /** { available, day (1-7), broken: the streak was lost } for the date 'YYYY-MM-DD'. */
    dailyStatus(today) {
      const D = this.data.daily;
      if (D.last === today) return { available: false, day: D.streak, broken: false };
      const gap = D.last ? Math.round((Date.parse(today) - Date.parse(D.last)) / 864e5) : Infinity;
      return { available: true, day: gap === 1 ? (D.streak % 7) + 1 : 1, broken: !!D.last && gap > 1 };
    },
    /** Claims today's reward; returns { day, reward, gift? } (gift: what a day-7 mystery gift held). */
    claimDaily(today, rand = Math.random) {
      const st = this.dailyStatus(today);
      if (!st.available) return null;
      this.data.daily = { last: today, streak: st.day };
      const reward = DR.DAILY[st.day - 1];
      if (reward.coins) this.addCoins(reward.coins);
      if (reward.gems) this.addGems(reward.gems);
      if (reward.items) for (const k in reward.items) this.data.items[k] += reward.items[k];
      const gift = reward.gift ? this.openChest(rand, true) : null;
      this.write();
      return { day: st.day, reward, gift };
    },

    // ---------- daily missions ----------
    /** Makes sure today's three missions exist (the same three all day). */
    ensureMissions(today) {
      if (this.data.missions.date === today) return this.data.missions;
      let h = 0;
      for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
      const pool = DR.MISSIONS.slice(), list = [];
      while (list.length < 3) {
        const def = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        list.push({ type: def.type, target: def.targets[Math.floor(rnd() * 3)], progress: 0, done: false });
      }
      this.data.missions = { date: today, list, bonus: 'none' };
      this.write();
      return this.data.missions;
    },
    missionDef(m) { return DR.MISSIONS.find(x => x.type === m.type); },
    /** Adds progress (or keeps the best, for 'max' missions). Returns the missions just completed (rewards paid). */
    missionProgress(type, amount) {
      const done = [];
      for (const m of this.data.missions.list) {
        if (m.done || m.type !== type) continue;
        const def = this.missionDef(m);
        m.progress = def.max ? Math.max(m.progress, amount) : m.progress + amount;
        if (m.progress >= m.target) {
          m.done = true;
          m.progress = m.target;
          if (def.reward.coins) this.addCoins(def.reward.coins);
          if (def.reward.gems) this.addGems(def.reward.gems);
          done.push(m);
        }
      }
      if (done.length) {
        if (this.data.missions.list.every(m => m.done) && this.data.missions.bonus === 'none') this.data.missions.bonus = 'ready';
        this.write();
      }
      return done;
    },
    /** All three done: the bonus gift. */
    claimMissionBonus(rand = Math.random) {
      if (this.data.missions.bonus !== 'ready') return null;
      this.data.missions.bonus = 'claimed';
      return this.openChest(rand);
    },

    starsOf(level) { return this.data.stars[level] || 0; },
    totalStars() { let t = 0; for (const k in this.data.stars) t += starCount(this.data.stars[k]); return t; },
    unlockRandom(rand = Math.random, boost = false) {
      const all = Object.keys(COS()).flatMap(slot => COS()[slot].filter(item => !item.price).map(item => ({ slot, item })));
      const left = all.filter(x => !this.owns(x.slot, x.item.id));
      if (!left.length) return null;
      // rarer items come out less often
      const BOOSTED = { common: 10, rare: 30, legendary: 60 };
      const w = x => (boost ? BOOSTED[x.item.rarity || 'common'] : (DR.RARITY[x.item.rarity] || DR.RARITY.common).weight);
      let r = rand() * left.reduce((t, x) => t + w(x), 0), pick = left[left.length - 1];
      for (const x of left) { if ((r -= w(x)) < 0) { pick = x; break; } }
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
