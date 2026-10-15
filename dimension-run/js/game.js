/* Game controller: the state machine (menu → countdown → play → result), input,
   level management and the main loop. Wires the simulation to rendering, sound and UI. */
(function () {
  'use strict';
  const DR = window.DR;
  const C = DR.CONST;
  const U = DR.util;
  const UI = DR.UI, Sound = DR.Sound, save = DR.save;

  const params = new URLSearchParams(location.search);
  const AUTOPILOT = params.has('autopilot');
  const TEST = params.has('test');

  const world = new DR.World(document.getElementById('game'));
  const trackCache = {};
  const getTrack = n => trackCache[n] || (trackCache[n] = DR.track.generate(DR.LEVELS[n - 1]));

  // mode: menu | countdown | play | paused | dead | finish | victory | result
  let mode = 'menu', modeT = 0, pausedFrom = null, viewMode = 'menu';
  let level = 1, track = null, sim = null, bot = null;
  let countdownStep = -1, finaleShown = false, glitchT = 4, debrisT = 0, fireworkT = 0, victoryFx = false, menuSwitchT = 0;

  function setMode(m) { mode = m; modeT = 0; if (m !== 'paused' && m !== 'result') viewMode = m; }

  function loadLevel(n) {
    level = n;
    track = getTrack(n);
    sim = new DR.Sim(track);
    world.buildLevel(track);
    world.runner.scale = 1;
  }

  function nextLevelToPlay() {
    for (let i = 1; i <= DR.LEVELS.length; i++) if (save.isUnlocked(i) && !save.isCompleted(i)) return i;
    return save.data.unlocked;
  }

  // ------------------------------------------------------------------
  // screens
  // ------------------------------------------------------------------
  function toMenu() {
    loadLevel(1);
    setMode('menu');
    victoryFx = false;
    UI.hud(false);
    UI.vignette(false);
    UI.renderMenu(save, nextLevelToPlay());
    UI.show('menu');
    Sound.setIntensity(0);
    Sound.musicStart(100);
    Sound.setTempo(100);
  }

  function showLevels() {
    UI.renderLevels(save, n => startLevel(n));
    UI.show('levels');
  }

  function startLevel(n) {
    if (!save.isUnlocked(n)) return;
    Sound.init();
    loadLevel(n);
    bot = AUTOPILOT ? new DR.Autopilot(track) : null;
    setMode('countdown');
    countdownStep = -1;
    finaleShown = false;
    victoryFx = false;
    glitchT = 3 + Math.random() * 3;
    UI.show(null);
    UI.hud(true);
    UI.startLevel(track.cfg, save.best(n));
    UI.vignette(false);
    Sound.setIntensity(0);
    Sound.musicStart(108 + n * 8);
    Sound.setTempo(108 + n * 8);
    UI.banner(`LEVEL ${n}<small>${track.cfg.name.toUpperCase()} · ${track.cfg.subtitle}</small>`, '', 1100);
  }

  function pause() {
    if (mode !== 'play' && mode !== 'countdown') return;
    pausedFrom = mode;
    mode = 'paused';
    Sound.musicStop();
    UI.show('pause');
  }
  function resume() {
    if (mode !== 'paused') return;
    mode = pausedFrom;
    UI.show(null);
    Sound.musicStart(108 + level * 8);
  }

  function toggleMute() {
    Sound.init();
    const m = !Sound.muted;
    Sound.setMuted(m);
    save.setMuted(m);
    UI.setMuted(m);
  }

  function exitGame() {
    // Browsers only let a page close windows that scripts opened, so fall back to a goodbye screen.
    try { window.close(); } catch (e) { /* ignore */ }
    setTimeout(() => UI.show('exit'), 150);
  }

  UI.init({
    start: () => startLevel(nextLevelToPlay()),
    levels: showLevels,
    exit: exitGame,
    menu: toMenu,
    resetProgress: () => { save.reset(); showLevels(); UI.renderMenu(save, 1); },
    resume,
    pause: () => (mode === 'paused' ? resume() : pause()),
    retry: () => startLevel(level),
    next: () => startLevel(Math.min(DR.LEVELS.length, level + 1)),
    mute: toggleMute,
  });
  Sound.setMuted(save.data.muted);
  UI.setMuted(save.data.muted);

  // ------------------------------------------------------------------
  // input
  // ------------------------------------------------------------------
  const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
  window.addEventListener('keydown', e => {
    const k = e.key;
    Sound.init();
    if (k === 'm' || k === 'M') { toggleMute(); return; }

    if (mode === 'play' || mode === 'countdown') {
      if (GAME_KEYS.includes(k)) e.preventDefault();
      if (k === 'Escape' || k === 'p' || k === 'P') { pause(); return; }
      if (mode !== 'play' || bot || e.repeat) return;
      switch (k) {
        case 'ArrowLeft': case 'a': case 'A': sim.left(); break;
        case 'ArrowRight': case 'd': case 'D': sim.right(); break;
        case 'ArrowUp': case 'w': case 'W': sim.jump(); break;
        case 'ArrowDown': case 's': case 'S': sim.slide(); break;
        case ' ': sim.switchWorld(); break;
      }
      return;
    }
    if (mode === 'paused' && (k === 'Escape' || k === 'p' || k === 'P')) { e.preventDefault(); resume(); return; }
    // menus: arrows move focus, Enter/Space press the focused button (native behaviour)
    if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); UI.navigate(1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); UI.navigate(-1); }
    else if (k === 'Escape' && (UI.current === 'levels' || UI.current === 'exit')) toMenu();
  });
  window.addEventListener('pointerdown', () => Sound.init());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => pause());

  // ------------------------------------------------------------------
  // gameplay events -> sound, visuals, UI
  // ------------------------------------------------------------------
  function handleEvents() {
    for (const e of sim.events) {
      switch (e.type) {
        case 'jump': Sound.jump(); break;
        case 'slide': Sound.slide(); break;
        case 'move': Sound.move(); break;
        case 'switch': Sound.switchTo(e.world); world.switchFx(e.world); UI.flash(e.world === C.DARK ? 'd' : 'l'); break;
        case 'switchDenied': Sound.denied(); UI.denied(); break;
        case 'ready': if (track.cfg.cooldown > 0) Sound.ready(); break;
        case 'rift': Sound.rift(); world.riftFx(); UI.flash(e.world === C.DARK ? 'd' : 'l'); UI.glitch(); break;
        case 'coin': Sound.coin(track.coins[e.index].world); world.hideCoin(e.index); break;
        case 'shard': Sound.shard(); world.hideShard(e.index); UI.banner('✦ +250<small>DIMENSION SHARD</small>', '', 900); break;
        case 'bounce': Sound.bounce(); world.bounceFx(); UI.flash('r'); break;
        case 'death':
          if (e.kind === 'gap') Sound.fall(); else Sound.crash();
          world.crashFx(e.kind);
          UI.flash('r');
          Sound.musicStop();
          setMode('dead');
          break;
        case 'finish':
          if (track.cfg.finale) { setMode('victory'); Sound.musicStop(); Sound.victory(); UI.flash('w'); world.runner.scale = 1; }
          else { setMode('finish'); Sound.finish(); world.confetti(); }
          UI.hint('');
          break;
      }
    }
    sim.events.length = 0;
  }

  const DEATH = {
    block: ['You crashed into an obstacle!', 'You shattered against a dark crystal!'],
    low: ['You tripped over a log!', 'Spikes! You forgot to jump!'],
    high: ['You forgot to slide under the arch!', 'Zapped by an energy beam!'],
    gap: ['You fell into a gap!', 'The void swallowed you!'],
  };
  function deathMessage() {
    const k = sim.deathKind, c = sim.deathCell, w = sim.dim.world;
    if (k === 'stumble') return 'You stumbled one time too many!';
    if (c && c.enemy) return 'A wraith caught you!';
    if (k === 'block' && w === C.LIGHT && c) return { rock: 'You ran into a rock!', tree: 'You ran into a tree!', crate: 'You smashed into crates!' }[c.variant] || DEATH.block[0];
    return (DEATH[k] || DEATH.block)[w];
  }

  function currentHint() {
    const P = sim.player, rows = track.rows;
    for (let i = sim.rowCursor; i < rows.length; i++) {
      const r = rows[i];
      if (r.d - P.d > sim.speed * 3) break;
      if (r.hint && r.d + r.depth / 2 > P.d) return r.hint;
    }
    return '';
  }

  // ------------------------------------------------------------------
  // per-frame logic
  // ------------------------------------------------------------------
  function update(dt) {
    modeT += dt;
    switch (mode) {
      case 'menu': {
        // the title screen shows off both worlds
        menuSwitchT += dt;
        if (menuSwitchT > 4) { menuSwitchT = 0; sim.dim.trySwitch(); world.switchFx(sim.dim.world); }
        sim.dim.update(dt);
        break;
      }
      case 'countdown': {
        const steps = [1.0, 1.5, 2.0, 2.5];
        while (countdownStep + 1 < steps.length && modeT >= steps[countdownStep + 1]) {
          countdownStep++;
          const go = countdownStep === 3;
          UI.banner(go ? 'GO!' : String(3 - countdownStep), '', go ? 600 : 480);
          Sound.beep(go);
        }
        if (modeT >= 2.5) setMode('play');
        sim.dim.update(dt);
        break;
      }
      case 'play': {
        sim.update(dt, bot ? s => bot.tick(s) : null);
        handleEvents();
        if (mode !== 'play') break;
        UI.hint(currentHint());
        // final escape
        if (track.finaleD && sim.player.d > track.finaleD && !finaleShown) {
          finaleShown = true;
          UI.banner('FINAL ESCAPE!<small>THE DIMENSIONS ARE COLLAPSING · RUN!</small>', 'danger', 2200);
          UI.vignette(true);
          Sound.setIntensity(1);
          Sound.setTempo(160);
        }
        if (finaleShown) {
          debrisT -= dt;
          if (debrisT <= 0) {
            debrisT = 0.12;
            const p = world.playerPos(0);
            const side = Math.random() < 0.5 ? -1 : 1;
            world.burst(new THREE.Vector3(p.x + side * (5 + Math.random() * 12), 16, p.z - 20 - Math.random() * 50), 0x2a1c3a, 1, { speed: 1, up: -6, grav: 14, life: 2.2, size: 5 });
          }
        }
        // chaos levels: occasional reality glitches (purely visual)
        const inst = track.cfg.instability;
        if (inst > 0.3) {
          glitchT -= dt;
          if (glitchT <= 0) { glitchT = (2.5 + Math.random() * 4) / inst; world.pulseGlitch(); UI.glitch(); }
        }
        break;
      }
      case 'dead':
        sim.update(dt);
        if (modeT > 1.4) {
          const score = sim.scoring.score;
          const isBest = save.recordScore(level, score);
          UI.hud(false);
          UI.gameOver({ cfg: track.cfg, message: deathMessage(), progress: sim.progress, score, coins: sim.scoring.coins, best: save.best(level), isBest });
          mode = 'result';
        }
        break;
      case 'finish':
        sim.update(dt);
        if (modeT > 2.3) showComplete();
        break;
      case 'victory':
        sim.update(dt);
        world.runner.scale = Math.max(0, 1 - modeT * 1.6);
        if (modeT > 0.2 && modeT - dt <= 0.2) world.burst(world.playerPos(1), 0xffffff, 40, { speed: 10, life: 0.9, grav: 0 });
        victoryFx = true;
        if (modeT > 4.8) showComplete();
        break;
    }
    if (victoryFx) {
      fireworkT -= dt;
      if (fireworkT <= 0) { fireworkT = 0.35; world.fireworks(); }
    }
    Sound.setWorldMix(sim.dim.mix);
  }

  function showComplete() {
    const s = sim.scoring;
    const wasUnlocked = save.data.unlocked;
    const isBest = save.completeLevel(level, s.score);
    UI.hud(false);
    UI.vignette(false);
    if (track.cfg.finale) {
      UI.victory({ score: s.score, coins: s.coins, total: save.bestTotal(), isBest });
    } else {
      UI.complete({
        cfg: track.cfg, distance: track.length, coins: s.coins, shards: s.shards, totalShards: track.shards.length,
        bonus: s.bonus, score: s.score, isBest, unlockedNew: save.data.unlocked > wasUnlocked,
      });
    }
    mode = 'result';
  }

  function frame(dt) {
    if (mode !== 'paused') update(dt);
    if (mode === 'play' || mode === 'countdown' || mode === 'paused') {
      UI.updateHud({
        score: sim.scoring.score, coins: sim.scoring.coins, shards: sim.scoring.shards, progress: sim.progress,
        world: sim.dim.world, readiness: sim.dim.readiness, cooldownOn: track.cfg.cooldown > 0,
      });
    }
    world.update(mode === 'paused' ? 0 : dt, {
      sim, mode: viewMode, modeT: viewMode === mode ? modeT : 99,
      instability: mode === 'menu' ? 0 : track.cfg.instability, danger: finaleShown && mode !== 'menu' ? 1 : 0,
    });
    world.render();
  }

  // ------------------------------------------------------------------
  // boot
  // ------------------------------------------------------------------
  toMenu();
  if (params.has('level')) {
    const n = U.clamp(parseInt(params.get('level'), 10) || 1, 1, DR.LEVELS.length);
    if (TEST || AUTOPILOT) save.data.unlocked = Math.max(save.data.unlocked, n);   // dev/test only, not written to storage
    startLevel(n);
  }

  // Exposed for the browser smoke test (?test) and for debugging in the console.
  window.__dr = { frame, startLevel, toMenu, world, get mode() { return mode; }, get sim() { return sim; }, get track() { return track; } };

  if (TEST) {
    const s = document.createElement('script');
    s.src = 'tests/smoke.js';
    document.body.appendChild(s);
  } else {
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();
