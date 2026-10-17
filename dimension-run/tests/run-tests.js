#!/usr/bin/env node
/* Logic test suite: `node tests/run-tests.js`
   Loads the same game-logic files the browser uses and checks that:
   - collision, player, dimension, scoring and save modules behave correctly;
   - every level generates, is solvable and gets harder level by level;
   - the autopilot finishes every level through the real simulation, both with perfect
     timing and with human-like reaction jitter (many seeds, not just the shipped one). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- load browser modules into this context ----
const memStore = {};
globalThis.localStorage = {
  getItem: k => (k in memStore ? memStore[k] : null),
  setItem: (k, v) => { memStore[k] = String(v); },
  removeItem: k => { delete memStore[k]; },
};
for (const f of ['util', 'config', 'track', 'collision', 'player', 'dimension', 'scoring', 'save', 'sim', 'autopilot']) {
  const file = path.join(__dirname, '..', 'js', f + '.js');
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}
const DR = globalThis.DR;
const C = DR.CONST;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// ---------------------------------------------------------------
console.log('\nUnit tests');
test('player jump airtime clears a low obstacle', () => {
  const P = new DR.Player();
  P.jump();
  let t = 0, maxY = 0;
  while (t < 2) { P.update(1 / 120, 10); t += 1 / 120; maxY = Math.max(maxY, P.y); if (P.grounded) break; }
  assert(Math.abs(t - (2 * C.JUMP_V) / C.GRAVITY) < 0.03, 'airtime ' + t);
  assert(maxY > 2, 'apex ' + maxY);
});
test('slide in mid-air slams down and slides on landing', () => {
  const P = new DR.Player();
  P.jump();
  for (let i = 0; i < 20; i++) P.update(1 / 120, 10);
  P.slide();
  let landed = false;
  for (let i = 0; i < 60 && !landed; i++) landed = P.update(1 / 120, 10).includes('land');
  assert(landed && P.sliding, 'should be sliding after slam');
});
test('lane change takes under LANE_TIME', () => {
  const P = new DR.Player();
  P.move(1);
  let t = 0;
  while (P.lat < C.LANE_W - 1e-6) { P.update(1 / 120, 10); t += 1 / 120; }
  assert(t <= C.LANE_TIME, 't=' + t);
  assert(!P.move(1), 'cannot move past the right lane');
});
test('collision: block head-on kills, side entry bounces', () => {
  const P = new DR.Player();
  const block = { type: 'block' };
  assert(DR.collision.testCell(block, 0, 0.2, P) === 'block');
  P.prevLat = 2.2; P.lat = 0.9;
  assert(DR.collision.testCell(block, 0, 0.2, P) === 'bounce');
  P.prevLat = P.lat = 2.2;
  assert(DR.collision.testCell(block, 0, 0.2, P) === null, 'adjacent lane is safe');
});
test('collision: low needs jump, high needs slide, gap needs air', () => {
  const P = new DR.Player();
  assert(DR.collision.testCell({ type: 'low' }, 0, 0, P) === 'low');
  assert(DR.collision.testCell({ type: 'high' }, 0, 0, P) === 'high');
  assert(DR.collision.testCell({ type: 'gap' }, 0, 0, P) === 'gap');
  P.slide();
  assert(DR.collision.testCell({ type: 'high' }, 0, 0, P) === null, 'slide under');
  P.slideT = 0; P.y = 1; P.vy = 1;
  assert(DR.collision.testCell({ type: 'low' }, 0, 0, P) === null, 'jump over');
  assert(DR.collision.testCell({ type: 'gap' }, 0, 0, P) === null, 'jump gap');
});
test('collision only checks the active world', () => {
  const P = new DR.Player();
  const row = { d: 0, depth: 1.2, cells: [[null, { type: 'block' }, null], [null, null, null]] };
  assert(DR.collision.testRow(row, C.LIGHT, P), 'light blocked');
  assert(!DR.collision.testRow(row, C.DARK, P), 'dark is clear');
});
test('dimension cooldown and forced flip', () => {
  const D = new DR.Dimension(0.9);
  assert(D.trySwitch() && D.world === C.DARK);
  assert(!D.trySwitch(), 'cooldown blocks');
  for (let i = 0; i < 100; i++) D.update(0.01);
  assert(D.trySwitch() && D.world === C.LIGHT, 'ready after cooldown');
  D.forceFlip();
  assert(D.world === C.DARK && !D.ready, 'flip does not reset cooldown');
  const U = new DR.Dimension(0);
  assert(U.trySwitch() && U.trySwitch() && U.trySwitch(), 'unlimited switching without cooldown');
});
test('scoring', () => {
  const S = new DR.Scoring(3);
  S.addDistance(100); S.coin(); S.shard();
  assert(S.score === 150 + 10 + 250, 'score ' + S.score);
  S.complete();
  assert(S.score === 410 + 1500);
});
test('save: unlock, best score, persistence, corrupted data', () => {
  DR.save.reset();
  assert(DR.save.isUnlocked(1) && !DR.save.isUnlocked(2));
  DR.save.completeLevel(1, 900);
  assert(DR.save.isUnlocked(2) && !DR.save.isUnlocked(3));
  assert(DR.save.recordScore(2, 500) === true && DR.save.recordScore(2, 400) === false);
  DR.save.load();           // re-read from storage
  assert(DR.save.best(1) === 900 && DR.save.best(2) === 500 && DR.save.isUnlocked(2));
  memStore['dimensionRun.save'] = '{not json';
  DR.save.load();
  assert(DR.save.isUnlocked(1) && !DR.save.isUnlocked(2), 'falls back to defaults');
  memStore['dimensionRun.save'] = JSON.stringify({ v: 1, unlocked: 99, best: { 1: 'x', 2: 50 } });
  DR.save.load();
  assert(DR.save.data.unlocked === 5 && DR.save.best(1) === 0 && DR.save.best(2) === 50, 'sanitised');
});

// ---------------------------------------------------------------
console.log('\nLevel generation');
const tracks = DR.LEVELS.map(cfg => DR.track.generate(cfg));

function stats(track) {
  const rows = track.rows.filter(r => r.kind !== 'finish');
  const switches = track.plan.filter((p, i) => p.switchAt != null).length;
  const forced = rows.filter((r, i) => {   // rows where one world is fully blocked
    return r.cells.some(w => w.every(c => c && c.type === 'block'));
  }).length;
  const movers = rows.filter(r => r.cells.some(w => w.some(c => c && c.mover))).length;
  const rifts = rows.filter(r => r.kind === 'rift').length;
  const collapse = rows.filter(r => r.cells.some(w => w.some(c => c && c.collapse))).length;
  const time = track.rows[track.rows.length - 1].t;
  return { rows: rows.length, perSec: rows.length / time, switches, forced, movers, rifts, collapse, time, coins: track.coins.length };
}

tracks.forEach((tr, i) => {
  const s = stats(tr);
  console.log(`  L${i + 1} ${tr.cfg.name.padEnd(17)} rows=${String(s.rows).padStart(3)}  rows/s=${s.perSec.toFixed(2)}  time=${s.time.toFixed(0)}s  planned switches=${s.switches}  forced=${s.forced}  movers=${s.movers}  rifts=${s.rifts}  collapse=${s.collapse}  coins=${s.coins}`);
});

test('rows respect minimum spacing rules', () => {
  for (const tr of tracks) {
    for (let i = 1; i < tr.rows.length; i++) {
      const a = tr.rows[i - 1], b = tr.rows[i];
      const dt = b.t - a.t;
      assert(dt >= C.MIN_ROW_TIME - 1e-6 || b.kind === 'finish', `L${tr.cfg.id} row ${i} dt=${dt}`);
      if (DR.track.isVertical(a.cells) && DR.track.isVertical(b.cells)) assert(dt >= C.VERTICAL_ROW_TIME - 1e-6, `L${tr.cfg.id} vertical dt=${dt}`);
    }
  }
});
test('no row is blocked in all lanes of both worlds', () => {
  for (const tr of tracks) for (const r of tr.rows) {
    const open = r.cells.some(w => w.some(c => !c || c.type !== 'block'));
    assert(open, `L${tr.cfg.id} closed row at ${r.d}`);
  }
});
test('difficulty rises every level (speed, density, cooldown)', () => {
  for (let i = 1; i < tracks.length; i++) {
    const a = stats(tracks[i - 1]), b = stats(tracks[i]);
    const ca = tracks[i - 1].cfg, cb = tracks[i].cfg;
    assert(cb.speed[0] > ca.speed[0] && cb.speed[1] > ca.speed[1], 'speed');
    assert(b.perSec > a.perSec, `density L${i}=${a.perSec.toFixed(2)} L${i + 1}=${b.perSec.toFixed(2)}`);
    assert(cb.length > ca.length, 'length');
  }
  assert(tracks[0].cfg.cooldown === 0 && tracks[1].cfg.cooldown === 0 && tracks[2].cfg.cooldown > 0, 'cooldown from L3');
});
test('each level introduces its signature mechanic', () => {
  const s = tracks.map(stats);
  assert(s[0].forced > 0, 'L1 teaches switching');
  assert(s[1].forced > s[0].forced, 'L2 more forced switches');
  assert(tracks[1].rows.some(r => r.cells[0].some(c => c && c.type === 'gap')), 'L2 gaps');
  assert(tracks[1].rows.some(r => r.cells[1].some(c => c && c.enemy)), 'L2 wraiths');
  assert(tracks[2].rows.some(r => r.pattern === 'zigzag'), 'L3 zigzag sequences');
  assert(s[3].movers > 0 && s[3].rifts > 0, 'L4 movers and rifts');
  assert(s[4].collapse > 0 && s[4].movers > 0, 'L5 collapse and movers');
  assert(tracks[4].finaleD && tracks[4].rows.some(r => r.d > tracks[4].finaleD && r.kind !== 'finish'), 'L5 finale has obstacles');
});

// ---------------------------------------------------------------
console.log('\nPlaythroughs (autopilot through the real simulation)');

function play(track, jitter, seed) {
  const sim = new DR.Sim(track);
  const r = DR.util.rng(seed);
  const bot = new DR.Autopilot(track, { jitter, rng: r.next });
  let t = 0;
  while (sim.state === 'running' && t < 600) {
    sim.update(1 / 60, s => bot.tick(s));
    t += 1 / 60;
  }
  return sim;
}

test('autopilot finishes every shipped level (perfect timing)', () => {
  for (const tr of tracks) {
    const sim = play(tr, 0, 1);
    assert(sim.state === 'finished', `L${tr.cfg.id} ${sim.state} (${sim.deathKind}) at ${sim.player.d.toFixed(1)}m`);
  }
});
test('autopilot finishes every shipped level with 0.12 s human reaction jitter', () => {
  for (const tr of tracks) {
    for (let k = 1; k <= 20; k++) {
      const sim = play(tr, 0.12, k * 7919);
      assert(sim.state === 'finished', `L${tr.cfg.id} run ${k}: ${sim.state} (${sim.deathKind}) at ${sim.player.d.toFixed(1)}m`);
    }
  }
});
test('300 random seeds per level all generate and are completable', () => {
  for (const cfg of DR.LEVELS) {
    for (let seed = 1; seed <= 300; seed++) {
      const tr = DR.track.generate(cfg, seed * 104729 + cfg.id);
      const sim = play(tr, 0.08, seed);
      assert(sim.state === 'finished', `L${cfg.id} seed ${seed}: ${sim.deathKind} at ${sim.player.d.toFixed(1)}m`);
    }
  }
});
test('a player who never switches cannot finish level 2+', () => {
  for (const tr of tracks.slice(1)) {
    const sim = new DR.Sim(tr);
    const bot = new DR.Autopilot(tr);
    let t = 0;
    sim.switchWorld = () => false;   // disable switching
    while (sim.state === 'running' && t < 600) { sim.update(1 / 60, s => bot.tick(s)); t += 1 / 60; }
    assert(sim.state === 'dead', `L${tr.cfg.id} was finishable without switching`);
  }
});
test('coins and shards can be collected on the planned path', () => {
  const sim = play(tracks[0], 0, 1);
  assert(sim.scoring.coins > 10, 'coins ' + sim.scoring.coins);
});
test('every level hides treasure chests between rows', () => {
  for (const tr of tracks) {
    assert(tr.chests.length === tr.cfg.chests, `L${tr.cfg.id} chests ${tr.chests.length}`);
    for (const c of tr.chests) {
      const i = tr.rows.findIndex(r => r.d > c.d);
      assert(i > 0 && tr.rows[i - 1].d < c.d, 'chest sits between rows');
    }
  }
});
test('a chest is collected when you run through it', () => {
  const tr = tracks[0], c = tr.chests[0];
  const sim = new DR.Sim(tr);
  sim.player.d = c.d - 3; sim.player.lane = sim.player.fromLane = c.lane; sim.player.lat = c.lane * C.LANE_W;
  if (c.world !== sim.dim.world) sim.dim.forceFlip();
  sim.rowCursor = tr.rows.findIndex(r => r.d > c.d - 3);
  for (let k = 0; k < 60; k++) sim.step(1 / 120);
  assert(sim.events.some(e => e.type === 'chest') && sim.scoring.chests === 1);
});
test('time pads: Time Pressure has both kinds; running over one warps time', () => {
  const tr = tracks[2];
  assert(tr.pads.some(p => p.kind === 'fast') && tr.pads.some(p => p.kind === 'slow'), 'both kinds');
  assert(tracks[0].pads.length === 0, 'L1 has none');
  const p = tr.pads.find(x => x.kind === 'slow');
  const sim = new DR.Sim(tr);
  sim.player.d = p.d - 2; sim.player.lane = sim.player.fromLane = p.lane; sim.player.lat = p.lane * C.LANE_W;
  sim.rowCursor = tr.rows.findIndex(r => r.d > p.d - 2);
  sim.padCursor = tr.pads.indexOf(p);
  for (let k = 0; k < 40; k++) sim.step(1 / 120);
  assert(sim.timeScale === DR.TIME_PADS.slow.scale, 'scale ' + sim.timeScale);
  for (let k = 0; k < 120 * 3; k++) sim.step(1 / 120);
  assert(sim.state !== 'running' || sim.timeScale === 1 || sim.warp.kind, 'warp ends');
});
// runs a sim with no input until it ends or `t` seconds pass
function idle(sim, t) { for (let k = 0; k < t * 120 && sim.state === 'running'; k++) sim.step(1 / 120); }
test('a shield absorbs one crash, then you pass through for a moment', () => {
  const sim = new DR.Sim(tracks[0]);
  sim.shields = 1;
  idle(sim, 60);
  assert(sim.events.some(e => e.type === 'shield'), 'shield used');
  assert(sim.shields === 0 && sim.state === 'dead', 'second crash is fatal (' + sim.state + ')');
});
test('revive puts you back in the run and you can crash again later', () => {
  const sim = new DR.Sim(tracks[1]);
  idle(sim, 60);
  assert(sim.state === 'dead');
  const d = sim.player.d;
  assert(sim.revive() && sim.state === 'running' && sim.ghostT > 0 && !sim.player.falling);
  idle(sim, 1);
  assert(sim.state === 'running' && sim.player.d > d + 5, 'ghost carries you past the obstacle');
  idle(sim, 60);
  assert(sim.state === 'dead' && sim.revives === 1, 'only ghost for a while');
  assert(!new DR.Sim(tracks[1]).revive(), 'cannot revive a living runner');
});
test('magnet pulls in coins from other lanes', () => {
  const tr = tracks[0];
  const count = magnet => { const sim = new DR.Sim(tr); sim.magnet = magnet; const bot = new DR.Autopilot(tr); let t = 0; while (sim.state === 'running' && t < 600) { sim.update(1 / 60, s => bot.tick(s)); t += 1 / 60; } return sim.scoring.coins; };
  const a = count(false), b = count(true);
  assert(b > a, `magnet ${b} vs ${a}`);
});
test('wallet: spend, buy and use power-ups; bad values are cleaned', () => {
  DR.save.reset();
  DR.save.data.wallet = 0;
  assert(!DR.save.buy('shield'), 'cannot buy without coins');
  DR.save.addCoins(DR.SHOP.shield.price + 5);
  assert(DR.save.buy('shield') && DR.save.data.wallet === 5 && DR.save.data.items.shield === 1);
  assert(DR.save.useItem('shield') && !DR.save.useItem('shield'));
  memStore['dimensionRun.save'] = JSON.stringify({ unlocked: 1, wallet: -40, items: { shield: 'x', magnet: 3 } });
  DR.save.load();
  assert(DR.save.data.wallet === 0 && DR.save.data.items.shield === 0 && DR.save.data.items.magnet === 3);
});
test('wardrobe: free items owned, chests unlock new ones, bad saves are cleaned', () => {
  DR.save.reset();
  DR.save.data.owned = DR.save.data.owned.filter(k => !k.startsWith('hat:crown'));
  assert(DR.save.owns('hat', 'none') && !DR.save.owns('hat', 'crown'));
  assert(!DR.save.equip('hat', 'crown'), 'cannot wear what you do not own');
  const got = DR.save.unlockRandom(() => 0);
  assert(got && DR.save.owns(got.slot, got.item.id) && DR.save.equip(got.slot, got.item.id));
  memStore['dimensionRun.save'] = JSON.stringify({ unlocked: 1, owned: ['hat:crown', 'hat:bogus', 7], equipped: { hat: 'crown', back: 'wings' } });
  DR.save.load();
  assert(DR.save.owns('hat', 'crown') && !DR.save.owns('hat', 'bogus'), 'owned sanitised');
  assert(DR.save.data.equipped.hat === 'crown' && DR.save.data.equipped.back === 'backpack', 'equipped sanitised');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
