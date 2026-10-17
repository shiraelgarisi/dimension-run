/* Track generation: turns a level config into a list of obstacle rows.

   A ROW sits at distance `d` along the track and holds cells[world][laneIndex]:
     null              free
     {type:'block'}    tall obstacle (rock, tree, crystal, wraith): only dodging works
     {type:'low'}      log / spike trap: jump
     {type:'high'}     branch arch / energy beam: slide
     {type:'gap'}      hole in the floor: jump
   Optional flags: mover:{from}, a block that slides in from another lane;
   enemy:true, drawn as a wraith; collapse:true, a gap whose floor falls away as you approach.
   Rows of kind 'rift' are gates that flip your world as you pass them.

   FAIRNESS: every row is accepted only if a solver proves the level is still
   completable. The solver tracks every reachable (lane, world) state together with
   the earliest time the next dimension switch is available (cooldown), and honours
   lane-change time, reaction margin and jump landing time. If a pattern would break
   solvability it is rejected and another one is tried, so impossible sequences cannot
   be generated. The winning path (`plan`) is stored and also drives the autopilot
   used by the test suite. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const U = DR.util;
  const C = DR.CONST;

  const NEED = { block: 'none', low: 'jump', gap: 'jump', high: 'slide' };
  const ALL = [0, 1, 2];
  const except = f => ALL.filter(x => x !== f);

  // ---------- speed profile ----------
  function speedAt(cfg, d) {
    if (cfg.finale && d >= cfg.length - cfg.finale.length) {
      const f = (d - (cfg.length - cfg.finale.length)) / cfg.finale.length;
      return U.lerp(cfg.speed[1], cfg.finale.speed, U.clamp(f * 3, 0, 1));
    }
    return U.lerp(cfg.speed[0], cfg.speed[1], U.clamp(d / cfg.length, 0, 1));
  }
  // seconds needed to run from d0 to d1 (midpoint integration in 4 m steps)
  function timeBetween(cfg, d0, d1) {
    const n = Math.max(1, Math.ceil((d1 - d0) / 4));
    const h = (d1 - d0) / n;
    let t = 0;
    for (let i = 0; i < n; i++) t += h / speedAt(cfg, d0 + (i + 0.5) * h);
    return t;
  }

  // ---------- cell helpers ----------
  const E = () => [[null, null, null], [null, null, null]];
  const B = extra => Object.assign({ type: 'block' }, extra);
  const LOW = () => ({ type: 'low' });
  const HIGH = () => ({ type: 'high' });
  const GAP = extra => Object.assign({ type: 'gap' }, extra);
  const fill = (cells, w, make, lanes = ALL) => { for (const l of lanes) cells[w][l] = make(); return cells; };

  const isVertical = cells => cells.some(row => row.some(c => c && c.type !== 'block'));
  function rowDepth(cells, kind) {
    if (kind === 'rift') return 0.8;
    let m = 0.6;
    for (const w of cells) for (const c of w) if (c) m = Math.max(m, C.DEPTH[c.type]);
    return m;
  }

  // ---------- pattern library ----------
  // Each pattern returns steps: { cells, dt? (seconds after the previous step), kind?, hint? }
  const PATTERNS = {
    lane(r, x) { const c = E(); c[x.side()][r.int(0, 2)] = B(); return [{ cells: c }]; },
    lane2(r, x) {
      const c = E(), w = x.side();
      fill(c, w, B, except(r.int(0, 2)));
      if (x.level >= 2 && r.chance(0.5)) c[1 - w][r.int(0, 2)] = B();
      return [{ cells: c }];
    },
    jump(r, x) {
      const c = E(), w = x.side();
      fill(c, w, LOW);
      if (x.level >= 2 && r.chance(0.4)) c[1 - w][r.int(0, 2)] = B();
      return [{ cells: c }];
    },
    slide(r, x) {
      const c = E(), w = x.side();
      fill(c, w, HIGH);
      if (x.level >= 2 && r.chance(0.4)) c[1 - w][r.int(0, 2)] = B();
      return [{ cells: c }];
    },
    wall(r, x) {
      const c = E(), w = x.side(), o = 1 - w;
      fill(c, w, B);
      const mode = x.level === 1 ? r.pick(['none', 'one']) : r.pick(['one', 'two', 'low']);
      if (mode === 'one') c[o][r.int(0, 2)] = B();
      else if (mode === 'two') fill(c, o, B, except(r.int(0, 2)));
      else if (mode === 'low') fill(c, o, LOW);
      return [{ cells: c }];
    },
    split(r, x) {
      const c = E(), w = x.side();
      const f1 = r.int(0, 2), f2 = r.pick(except(f1));
      fill(c, w, B, except(f1));
      fill(c, 1 - w, B, except(f2));
      return [{ cells: c }];
    },
    gap(r) {
      const c = fill(E(), 0, GAP);
      const mode = r.pick(['none', 'block', 'spike']);
      if (mode === 'block') c[1][r.int(0, 2)] = B();
      else if (mode === 'spike') c[1][r.int(0, 2)] = LOW();
      return [{ cells: c }];
    },
    darkGap(r) {
      const c = fill(E(), 1, GAP);
      c[0][r.int(0, 2)] = r.chance(0.5) ? B() : LOW();
      return [{ cells: c }];
    },
    trap(r) {
      const c = fill(E(), 1, LOW);
      fill(c, 0, B, except(r.int(0, 2)));
      return [{ cells: c }];
    },
    beamTrap(r) {
      const c = fill(E(), 1, HIGH);
      if (r.chance(0.5)) fill(c, 0, B, except(r.int(0, 2)));
      else c[0][r.int(0, 2)] = B();
      return [{ cells: c }];
    },
    combo(r, x) {
      const w = x.side();
      const a = fill(E(), w, LOW);
      const b = fill(E(), w, B);
      b[1 - w][r.int(0, 2)] = B();
      return [{ cells: a }, { cells: b, dt: Math.max(0.9, x.cooldown + 0.35) }];
    },
    zigzag(r, x) {
      const n = r.int(3, x.level >= 5 ? 5 : 4);
      const dt = Math.max(0.6, x.cooldown + 0.3);
      let w = x.side();
      const steps = [];
      for (let i = 0; i < n; i++) {
        const c = fill(E(), w, B);
        if (r.chance(0.5)) c[1 - w][r.int(0, 2)] = B();
        steps.push(i ? { cells: c, dt } : { cells: c });
        w = 1 - w;
      }
      return steps;
    },
    zigzag2(r, x) {
      const dt = Math.max(1.0, x.cooldown + 0.4);
      return [{ cells: fill(E(), 0, B) }, { cells: fill(E(), 1, B), dt }];
    },
    timing(r, x) {
      const w = x.side();
      const a = fill(fill(E(), w, LOW), 1 - w, HIGH);
      const b = fill(fill(E(), w, HIGH), 1 - w, LOW);
      if (r.chance(0.5)) b[r.int(0, 1)][r.int(0, 2)] = B();
      return [{ cells: a }, { cells: b, dt: 0.9 }];
    },
    slalom(r, x) {
      const w = x.side();
      let f = r.int(0, 2);
      const steps = [];
      for (let i = 0; i < 3; i++) {
        const c = fill(E(), w, B, except(f));
        if (r.chance(0.5)) fill(c, 1 - w, B);
        else fill(c, 1 - w, B, except(r.int(0, 2)));
        steps.push(i ? { cells: c, dt: 0.62 } : { cells: c });
        f = f === 0 ? 1 : f === 2 ? 1 : r.pick([0, 2]);
      }
      return steps;
    },
    mover(r, x) {
      const c = E(), w = x.side();
      const final = r.int(0, 2), from = r.pick(except(final));
      c[w][final] = B({ mover: { from }, enemy: w === 1 && r.chance(0.5) });
      const other = except(final).filter(l => l !== from)[0];
      if (other !== undefined && r.chance(0.4)) c[w][other] = B();
      if (r.chance(0.5)) fill(c, 1 - w, B);
      else c[1 - w][r.int(0, 2)] = B();
      return [{ cells: c }];
    },
    enemy(r, x) {
      const c = E();
      const lanes = r.shuffle(ALL).slice(0, r.int(1, 2));
      lanes.forEach((l, i) => {
        const free = except(l).filter(k => !lanes.includes(k));
        const move = x.movingEnemies && i === 0 && free.length && r.chance(0.65);
        c[1][l] = B({ enemy: true, mover: move ? { from: r.pick(free) } : undefined });
      });
      if (r.chance(0.6)) c[0][r.int(0, 2)] = B();
      return [{ cells: c }];
    },
    rift(r, x) {
      const w = x.side();
      const after = fill(E(), w, B);
      after[1 - w][r.int(0, 2)] = B();
      return [{ cells: E(), kind: 'rift' }, { cells: after, dt: Math.max(0.85, x.cooldown + 0.3) }];
    },
    collapse(r, x) {
      const c = E(), w = x.side();
      const fw = r.int(0, 2), fo = r.pick(except(fw));
      fill(c, w, () => GAP({ collapse: true }), except(fw));
      fill(c, 1 - w, () => GAP({ collapse: true }), except(fo));
      if (r.chance(0.5)) c[w][fw] = B();
      return [{ cells: c }];
    },
    gauntlet(r, x) {
      const w = x.side();
      const s1 = fill(E(), w, B);
      const s2 = PATTERNS.split(r, x)[0].cells;
      const s3 = fill(E(), 1 - w, B);
      const s4 = PATTERNS.collapse(r, x)[0].cells;
      const dt = Math.max(0.65, x.cooldown + 0.25);
      return [{ cells: s1 }, { cells: s2, dt }, { cells: s3, dt }, { cells: s4, dt: 0.8 }];
    },

    // ----- scripted introductions (fixed layouts) -----
    tutLane: () => { const c = E(); c[0][1] = B(); return [{ cells: c }]; },
    tutJump: () => [{ cells: fill(E(), 0, LOW) }],
    tutSlide: () => [{ cells: fill(E(), 0, HIGH) }],
    tutWallLight: () => [{ cells: fill(E(), 0, B) }],
    tutWallDark: () => [{ cells: fill(E(), 1, B) }],
    tutGhost: () => { const c = E(); fill(c, 0, B, [0, 1]); fill(c, 1, B, [1, 2]); return [{ cells: c }]; },
    introGap: () => [{ cells: fill(E(), 0, GAP) }],
    introSpikes: () => [{ cells: fill(fill(E(), 1, LOW), 0, B) }],
    introBeam: () => [{ cells: fill(fill(E(), 1, HIGH), 0, B) }],
    introWraith: () => { const c = fill(E(), 0, B, [1, 2]); c[1][0] = B({ enemy: true }); c[1][1] = B({ enemy: true }); return [{ cells: c }]; },
    introMover: () => { const c = fill(E(), 1, B); c[0][1] = B({ mover: { from: 0 } }); return [{ cells: c }]; },
    introRift: () => [{ cells: E(), kind: 'rift' }],
    introCollapse: () => { const c = E(); fill(c, 0, () => GAP({ collapse: true }), [0, 1]); fill(c, 1, () => GAP({ collapse: true }), [1, 2]); return [{ cells: c }]; },
  };

  // ---------- solver ----------
  // states: [{ lane, world, ready, parent, worldAt, switchAt, action }]
  function advance(states, prev, row, cfg) {
    const freeFrom = prev ? prev.t + prev.zoneT : 0;
    const mustBy = row.t - row.zoneT - C.REACT_MARGIN;
    const best = new Map();
    states.forEach((s, si) => {
      for (const sw of [false, true]) {
        let w = s.world, ready = s.ready, switchAt = null;
        if (sw) {
          if (!cfg.switchAllowed) continue;
          const at = Math.max(ready, freeFrom);
          if (at > mustBy) continue;
          w = 1 - w; ready = at + cfg.cooldown; switchAt = at;
        }
        for (let l = 0; l < 3; l++) {
          if (freeFrom + Math.abs(l - s.lane) * C.LANE_TIME > mustBy) continue;
          const c = row.cells[w][l];
          if (c && c.type === 'block') continue;
          const wAfter = row.kind === 'rift' ? 1 - w : w;
          const key = l * 2 + wAfter;
          const cur = best.get(key);
          if (!cur || ready < cur.ready) {
            best.set(key, { lane: l, world: wAfter, worldAt: w, ready, parent: si, switchAt, action: c ? NEED[c.type] : null });
          }
        }
      }
    });
    return [...best.values()];
  }

  // ---------- generator ----------
  function generate(cfg, seed = cfg.seed) {
    const r = U.rng(seed);
    const level = cfg.id;
    const ctx = {
      level, cooldown: cfg.cooldown, movingEnemies: !!cfg.movingEnemies,
      side: () => (r.chance(level === 1 ? 0.62 : 0.5) ? 0 : 1),
    };
    const solveCfg = { cooldown: cfg.cooldown, switchAllowed: true };
    const finaleD = cfg.finale ? cfg.length - cfg.finale.length : Infinity;
    const endClear = speedAt(cfg, cfg.length) * 2.2;
    const limit = cfg.length - endClear;

    const rows = [];
    const layers = [];
    let states = [{ lane: 1, world: C.LIGHT, ready: -Infinity, parent: -1 }];

    function makeRow(step, d, prev) {
      const kind = step.kind || 'normal';
      const depth = rowDepth(step.cells, kind);
      const t = prev ? prev.t + timeBetween(cfg, prev.d, d) : timeBetween(cfg, 0, d);
      return {
        d, t, kind, depth, cells: step.cells,
        zoneT: (depth / 2 + 0.4) / speedAt(cfg, d),
        hint: step.hint || null,
      };
    }

    // place a sequence of steps after the last row; commit only if all stay solvable
    function tryPlace(steps, name, extraDt) {
      let prev = rows[rows.length - 1] || null;
      let st = states;
      const newRows = [], newLayers = [];
      for (let k = 0; k < steps.length; k++) {
        const step = steps[k];
        let d;
        if (step.at != null) {
          d = step.at;
        } else {
          let dt = step.dt != null ? step.dt : r.range(cfg.rowTime[0], cfg.rowTime[1]) * (prev && prev.d > finaleD ? 0.92 : 1);
          if (k === 0) dt += extraDt;
          if (prev && isVertical(prev.cells) && isVertical(step.cells)) dt = Math.max(dt, C.VERTICAL_ROW_TIME);
          dt = Math.max(dt, C.MIN_ROW_TIME);
          const from = prev ? prev.d : 0;
          d = from + dt * speedAt(cfg, from);
          // speed changes along the way: correct d so the real travel time is exactly dt
          for (let k2 = 0; k2 < 3; k2++) d += (dt - timeBetween(cfg, from, d)) * speedAt(cfg, d);
          if (prev) d = Math.max(d, prev.d + (prev.depth + rowDepth(step.cells, step.kind)) / 2 + 2);
        }
        if (d > limit) return 'end';
        const row = makeRow(step, d, prev);
        row.pattern = name;
        const nst = advance(st, prev, row, solveCfg);
        if (!nst.length) return 'fail';
        newRows.push(row); newLayers.push(nst);
        prev = row; st = nst;
      }
      rows.push(...newRows); layers.push(...newLayers);
      states = st;
      return 'ok';
    }

    // scripted introductions first
    for (const it of cfg.intro || []) {
      const steps = PATTERNS[it.pattern](r, ctx).map((s, i) => Object.assign({}, s, i === 0 ? { at: it.at, hint: it.hint } : {}));
      const res = tryPlace(steps, it.pattern, 0);
      if (res !== 'ok') throw new Error(`Level ${level}: intro "${it.pattern}" is not solvable (${res})`);
    }

    // then procedurally chosen patterns
    let guard = 0;
    outer: while (guard++ < 5000) {
      let extra = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        const last = rows[rows.length - 1];
        const table = last && last.d > finaleD ? cfg.finale.patterns : cfg.patterns;
        const name = r.weighted(table);
        let extraDt = extra;
        if (attempt === 0 && r.chance(0.12)) extraDt += cfg.rowTime[1] * 0.6;   // occasional breather
        const res = tryPlace(PATTERNS[name](r, ctx), name, extraDt);
        if (res === 'ok') continue outer;
        if (res === 'end') break outer;
        if (attempt % 4 === 3) extra += 0.25;   // give the player more room and retry
      }
      throw new Error(`Level ${level}: generator could not place a solvable row`);
    }

    // finish line (free in both worlds)
    const last = rows[rows.length - 1];
    const finish = makeRow({ cells: E(), kind: 'finish' }, cfg.length, last);
    finish.pattern = 'finish';
    const finalStates = advance(states, last, finish, solveCfg);
    if (!finalStates.length) throw new Error(`Level ${level}: finish unreachable`);
    rows.push(finish); layers.push(finalStates);

    // reconstruct one winning path
    const plan = new Array(rows.length);
    let idx = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const s = layers[i][idx];
      plan[i] = { lane: s.lane - 1, world: s.worldAt, worldAfter: s.world, switchAt: s.switchAt, action: s.action };
      idx = s.parent;
    }

    // convert lane indices to lanes -1..1 and pick visual variants
    for (const row of rows) {
      for (let w = 0; w < 2; w++) {
        for (let l = 0; l < 3; l++) {
          const c = row.cells[w][l];
          if (!c) continue;
          if (c.mover) c.mover = { from: c.mover.from - 1 };
          if (c.type === 'block' && !c.enemy) c.variant = w === C.LIGHT ? r.pick(['rock', 'rock', 'tree', 'crate']) : r.pick(['crystal', 'crystal', 'obelisk']);
          if (c.enemy) c.variant = 'wraith';
        }
      }
    }

    const coins = placeCoins(r, cfg, rows, plan);
    const shards = placeShards(r, cfg, rows, plan);
    const chests = placeChests(r, cfg, rows, plan, shards);
    const pads = placePads(r, cfg, rows, chests);
    return { cfg, rows, plan, coins, shards, chests, pads, length: cfg.length, finaleD: cfg.finale ? finaleD : null, speedAt: d => speedAt(cfg, d) };
  }

  function gapsBetweenRows(rows) {
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const prev = rows[i - 1];
      const a = prev ? prev.d + prev.depth / 2 + 2.5 : 14;
      const b = rows[i].d - rows[i].depth / 2 - 2.5;
      if (b - a >= 6) out.push({ i, a, b });
    }
    return out;
  }

  function placeCoins(r, cfg, rows, plan) {
    const coins = [];
    for (const g of gapsBetweenRows(rows)) {
      if (!r.chance(cfg.coinRate)) continue;
      const onPath = r.chance(0.65);
      const lane = onPath ? plan[g.i].lane : r.int(-1, 1);
      const world = onPath ? plan[g.i].world : r.int(0, 1);
      const n = Math.min(10, Math.floor((g.b - g.a) / 2.4));
      const step = (g.b - g.a) / n;
      for (let j = 0; j < n; j++) coins.push({ d: g.a + step * (j + 0.5), lane, world, y: 1.0 });
    }
    // arcs that reward jumping on the planned path
    rows.forEach((row, i) => {
      if (plan[i].action !== 'jump' || !r.chance(0.45)) return;
      for (let off = -4; off <= 4; off += 2) {
        coins.push({ d: row.d + off, lane: plan[i].lane, world: plan[i].world, y: 1.0 + 1.6 * (1 - (off / 5) ** 2) });
      }
    });
    coins.sort((a, b) => a.d - b.d);
    return coins;
  }

  // Dimension shards (rare, high value) sit off the planned path: a reward for risky switching.
  function placeShards(r, cfg, rows, plan) {
    const gaps = r.shuffle(gapsBetweenRows(rows).filter(g => g.i > 2));
    const out = [];
    for (const g of gaps.slice(0, cfg.shards)) {
      const p = plan[g.i];
      out.push({ d: (g.a + g.b) / 2, lane: r.pick(except(p.lane + 1)) - 1, world: 1 - p.world, y: 1.2 });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  // Treasure chests: hidden off the planned path (another lane, sometimes the other world).
  function placeChests(r, cfg, rows, plan, shards) {
    const out = [];
    const used = d => shards.some(s => Math.abs(s.d - d) < 12);
    const gaps = r.shuffle(gapsBetweenRows(rows).filter(g => g.i > 3 && !used((g.a + g.b) / 2)));
    for (const g of gaps.slice(0, cfg.chests || 0)) {
      const p = plan[g.i];
      const otherWorld = r.chance(0.4);
      const lane = otherWorld ? r.int(-1, 1) : r.pick(except(p.lane + 1)) - 1;
      out.push({ d: (g.a + g.b) / 2, lane, world: otherWorld ? 1 - p.world : p.world });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  // Time pads lie on the floor in free stretches and work in both worlds.
  function placePads(r, cfg, rows, chests) {
    const out = [];
    if (!cfg.timePads) return out;
    for (const g of gapsBetweenRows(rows)) {
      if (g.i < 2 || !r.chance(cfg.timePads)) continue;
      const d = g.a + (g.b - g.a) * r.range(0.3, 0.7);
      if (chests.some(c => Math.abs(c.d - d) < 6)) continue;
      out.push({ d, lane: r.int(-1, 1), kind: r.chance(0.55) ? 'fast' : 'slow' });
    }
    return out;
  }

  DR.track = { generate, speedAt, timeBetween, advance, PATTERNS, NEED, isVertical };
})(typeof window !== 'undefined' ? window : globalThis);
