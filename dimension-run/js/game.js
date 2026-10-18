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
  const getCfg = n => (n === 0 ? DR.ENDLESS : DR.LEVELS[n - 1]);   // level 0 is the Infinite World
  const getTrack = n => trackCache[n] || (trackCache[n] = DR.track.generate(getCfg(n)));

  // mode: menu | countdown | play | paused | dead | finish | victory | result
  let mode = 'menu', modeT = 0, pausedFrom = null, viewMode = 'menu';
  let level = 1, track = null, sim = null, bot = null;
  let bossHits = 0;
  let tut = null;   // the guided tutorial: { then: level to play next, done: Set of rows, waiting: row or null }
  let wardrobeOpen = false, padHints = {}, prizes = [];   // prizes: items won in this run, revealed at the end
  let countdownStep = -1, milestone = 0, finaleShown = false, debrisT = 0, fireworkT = 0, victoryFx = false, menuSwitchT = 0;

  function setMode(m) { mode = m; modeT = 0; if (m !== 'paused' && m !== 'result') viewMode = m; }

  // every run gets a new random layout (obstacles, coins, chests, pads); the solver keeps each one fair.
  // ?seed=123 pins a layout, for testing.
  function randomTrack(n) {
    const cfg = getCfg(n);
    const seed = params.has('seed') ? parseInt(params.get('seed'), 10) : (Math.random() * 1e9) | 0;
    try { return DR.track.generate(cfg, seed); } catch (e) { return getTrack(n); }   // never expected, but never stuck
  }

  function loadLevel(n, fresh, cfg) {
    level = n;
    track = cfg ? DR.track.generate(cfg) : fresh ? randomTrack(n) : getTrack(n);
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
    wardrobeOpen = false;
    setWarpClass(null);
    save.write();   // bank the coins of an unfinished run
    UI.hud(false);
    UI.vignette(false);
    document.body.dataset.level = '1';
    UI.renderMenu(save, nextLevelToPlay());
    UI.show('menu');
    menuGuide();
    Sound.setIntensity(0);
    Sound.setSong('menu');
    Sound.musicStart();
  }

  function showWardrobe() {
    wardrobeOpen = true;
    const render = () => UI.renderWardrobe(save, (slot, id) => {
      if (save.equip(slot, id)) { world.applyOutfit(save.data.equipped); if (slot === 'back') world.showBackT = 3; world.burst(world.playerPos(1.6), 0xffd84a, 14, { speed: 4, up: 2, life: 0.5 }); render(); }
    }, (slot, id) => {   // buying a pet with diamonds
      if (save.buyItem(slot, id)) {
        Sound.chest(); save.equip(slot, id); world.applyOutfit(save.data.equipped);
        world.burst(world.playerPos(0.8), 0x7ae8ff, 30, { speed: 6, up: 4, life: 0.8 });
        render(); UI.renderMenu(save, nextLevelToPlay());
      } else Sound.denied();
    });
    render();
    UI.show('wardrobe');
    // dressing up happens in the Light World; the button flips it only when you ask
    if (sim.dim.world !== C.LIGHT) { sim.dim.forceFlip(); world.switchFx(sim.dim.world); }
    UI.wardrobeWorld(sim.dim.world);
  }

  function toggleWardrobeWorld() {
    sim.dim.forceFlip();
    world.switchFx(sim.dim.world);
    Sound.switchTo(sim.dim.world);
    UI.wardrobeWorld(sim.dim.world);
  }

  function showShop() {
    const render = () => UI.renderShop(save, item => {
      if (save.buy(item)) { Sound.chest(); render(); UI.renderMenu(save, nextLevelToPlay()); } else Sound.denied();
    });
    render();
    UI.show('shop');
  }

  // keep running after a crash, for coins
  function reviveCost() { return DR.REVIVE_COST[Math.min(sim.revives, DR.REVIVE_COST.length - 1)]; }
  function continueRun() {
    if (mode !== 'result' || sim.state !== 'dead' || !save.spend(reviveCost())) { Sound.denied(); return; }
    sim.revive();
    sim.events.length = 0;
    Sound.revive();
    world.reviveFx();
    UI.flash('w');
    UI.show(null);
    UI.hud(true);
    setMode('countdown');
    countdownStep = -1;
    Sound.musicStart();
  }

  function showLevels() {
    UI.renderLevels(save, n => startLevel(n));
    UI.show('levels');
    if (!save.data.tutorialDone && !TEST) UI.coach('#levelGrid [data-level="1"]', 'Start with Level 1!');
  }

  // first-time guides on the main menu: where to start, and where a won item went
  function menuGuide() {
    if (TEST || AUTOPILOT) return;
    if (!save.data.tutorialDone) UI.coach('#levelsBtn', 'Tap here to choose a level');
    else if (save.data.onboard.wardrobe === 1) {
      UI.coach('#wardrobeBtn', 'Your new item is waiting in the WARDROBE!', () => { save.data.onboard.wardrobe = 2; save.write(); });
    }
  }

  function startLevel(n) {
    if (!save.isUnlocked(n)) return;
    Sound.init();
    // the very first game is the guided tutorial; after it, whatever level was picked
    const tutorial = !save.data.tutorialDone && !TEST && !AUTOPILOT;
    loadLevel(n, true, tutorial ? DR.TUTORIAL : null);
    tut = tutorial ? { then: n, done: new Set(), waiting: null } : null;
    UI.tutorial(null);
    // power-ups from the shop are used up at the start of a run (not in the tutorial)
    sim.shields = !tutorial && save.useItem('shield') ? 1 : 0;
    sim.magnet = !tutorial && save.useItem('magnet');
    bot = AUTOPILOT ? new DR.Autopilot(track) : null;
    setMode('countdown');
    countdownStep = -1;
    milestone = 0;
    padHints = {};
    prizes = [];
    setWarpClass(null);
    finaleShown = false;
    document.body.dataset.level = String(track.cfg.id);
    victoryFx = false;
    UI.show(null);
    UI.hud(true);
    UI.startLevel(track.cfg, track.cfg.endless ? save.data.endlessBest : save.best(n));
    if (track.cfg.endless) sim.scoring.mult = 1.5;
    bossHits = 0;
    UI.bossBar(track.cfg.boss ? track.cfg.boss.name : null, 1);
    UI.vignette(false);
    Sound.setIntensity(0);
    Sound.setSong(track.cfg.id);
    Sound.musicStart();
    if (tut) UI.banner('TUTORIAL<small>LET\'S LEARN THE MOVES</small>', '', 1600);
    else if (track.cfg.endless) UI.banner('∞ INFINITE WORLD<small>HOW FAR CAN YOU GO?</small>', '', 1300);
    else UI.banner(`LEVEL ${n}<small>${track.cfg.name.toUpperCase()} · ${track.cfg.subtitle}</small><small class="theme">${world.themeName.toUpperCase()}</small>`, '', 1100);
    UI.flash('w');
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
    Sound.musicStart();
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
    shop: showShop,
    continueRun,
    wardrobe: showWardrobe,
    wardrobeWorld: toggleWardrobeWorld,
    exit: exitGame,
    menu: toMenu,
    info: () => UI.show('info'),
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
  const NEED_OF = { left: 'side', right: 'side', jump: 'jump', slide: 'slide', switchWorld: 'switch' };
  function act(move) {
    if (mode !== 'play' || bot) return;
    if (tut) {
      // near a lesson, only the move being taught is allowed, and only once the run has stopped for it
      if (tut.waiting) { if (NEED_OF[move] !== tut.waiting.need) return; }
      else if (tutNext() && tutNext().d - sim.player.d < sim.speed * 4.5) return;
    }
    sim[move]();
  }
  function tutNext() { return tut && track.rows.find(r => r.need && !tut.done.has(r)); }
  window.addEventListener('keydown', e => {
    const k = e.key;
    Sound.init();
    if (k === 'm' || k === 'M') { toggleMute(); return; }

    if (mode === 'play' || mode === 'countdown') {
      if (GAME_KEYS.includes(k)) e.preventDefault();
      if (k === 'Escape' || k === 'p' || k === 'P') { pause(); return; }
      if (mode !== 'play' || bot || e.repeat) return;
      switch (k) {
        case 'ArrowLeft': case 'a': case 'A': act('left'); break;
        case 'ArrowRight': case 'd': case 'D': act('right'); break;
        case 'ArrowUp': case 'w': case 'W': act('jump'); break;
        case 'ArrowDown': case 's': case 'S': act('slide'); break;
        case ' ': act('switchWorld'); break;
      }
      return;
    }
    if (mode === 'paused' && (k === 'Escape' || k === 'p' || k === 'P')) { e.preventDefault(); resume(); return; }
    // menus: arrows move focus, Enter/Space press the focused button (native behaviour)
    if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); UI.navigate(1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); UI.navigate(-1); }
    else if (k === 'Escape' && (UI.current === 'levels' || UI.current === 'exit' || UI.current === 'wardrobe')) toMenu();
  });
  window.addEventListener('pointerdown', () => Sound.init());

  // ------------------------------------------------------------------
  // touch: swipe to move / jump / slide, tap to switch worlds
  // ------------------------------------------------------------------
  const SWIPE = 28;          // px of finger travel that counts as a swipe
  const TAP_MS = 260;        // a shorter touch without travel is a tap
  let touch = null;
  function useTouch() {
    if (UI.touch) return;
    UI.setTouch(true);
  }
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) useTouch();
  const inGame = () => mode === 'play' || mode === 'countdown';
  const onControl = e => e.target.closest && e.target.closest('button, .screen, #dimension');
  window.addEventListener('touchstart', e => {
    useTouch();
    Sound.init();
    if (!inGame() || onControl(e)) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    touch = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now(), done: false };
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (!touch || !inGame()) return;
    e.preventDefault();
    const t = [...e.changedTouches].find(c => c.identifier === touch.id);
    if (!t || touch.done) return;
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    touch.done = true;   // act as soon as the swipe is clear: no waiting for the finger to lift
    if (mode !== 'play' || bot) return;
    if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? 'left' : 'right');
    else (dy < 0 ? sim.jump() : sim.slide());
  }, { passive: false });
  window.addEventListener('touchend', e => {
    if (!touch) return;
    const t = [...e.changedTouches].find(c => c.identifier === touch.id);
    if (!t) return;
    const tap = !touch.done && performance.now() - touch.t < TAP_MS;
    touch = null;
    if (inGame()) e.preventDefault();
    if (tap) act('switchWorld');
  }, { passive: false });
  window.addEventListener('touchcancel', () => { touch = null; });
  // the world orb is a button too
  document.getElementById('dimension').addEventListener('pointerdown', e => {
    e.stopPropagation();
    act('switchWorld');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => pause());

  // ------------------------------------------------------------------
  // gameplay events -> sound, visuals, UI
  // ------------------------------------------------------------------
  function tutDid(need) {
    if (!tut || !tut.waiting || tut.waiting.need !== need) return;
    tut.done.add(tut.waiting);
    tut.waiting = null;
    UI.tutorial(null);
    Sound.ready();
    world.burst(world.playerPos(1.2), 0x6cf08a, 18, { speed: 6, up: 3, life: 0.6 });
    UI.banner(tut.done.size < 4 ? 'GREAT!' : 'PERFECT!<small>YOU KNOW ALL THE MOVES</small>', 'milestone', 700);
  }

  function handleEvents() {
    for (const e of sim.events) {
      switch (e.type) {
        case 'jump': Sound.jump(); tutDid('jump'); break;
        case 'slide': Sound.slide(); tutDid('slide'); break;
        case 'move': Sound.move(); tutDid('side'); break;
        case 'switch': tutDid('switch'); Sound.switchTo(e.world); world.switchFx(e.world); UI.flash(e.world === C.DARK ? 'd' : 'l'); break;
        case 'switchDenied': Sound.denied(); UI.denied(); break;
        case 'ready': if (track.cfg.cooldown > 0) Sound.ready(); break;
        case 'rift': Sound.rift(); world.riftFx(); UI.flash(e.world === C.DARK ? 'd' : 'l'); UI.glitch(); break;
        case 'coin': Sound.coin(track.coins[e.index].world); world.hideCoin(e.index, e.magnet); save.addCoins(1); break;
        case 'gem': Sound.gem(); world.hideGem(e.index); save.addGems(e.value); UI.banner(`💎 +${e.value}`, 'milestone gem', 700); break;
        case 'shield': Sound.shield(); world.shieldFx(); UI.flash('w'); UI.banner('🛡️ SHIELD!<small>IT SAVED YOU</small>', 'milestone', 900); break;
        case 'shard':
          Sound.shard(); world.hideShard(e.index);
          if (track.cfg.boss) { bossHits++; world.bossHit(); Sound.bossHit(); UI.banner('💥 BOSS HIT!<small>THE SHARD BLASTS THE MONSTER KING</small>', 'danger', 900); }
          else UI.banner('✦ +250<small>DIMENSION SHARD</small>', '', 900);
          break;
        case 'chest': {
          Sound.chest(); world.openChest(e.index); UI.flash('w');
          // clothing, coins or diamonds: saved right away, but kept a surprise until the gift box
          const got = save.openChest();
          if (got.kind === 'item') prizes.push(got);
          else if (got.kind === 'coins') prizes.push({ slot: 'coins', item: { id: null, icon: '💰', name: got.amount + ' Coins' } });
          else prizes.push({ slot: 'gems', item: { id: null, icon: got.amount >= 50 ? '💎💎💎' : '💎', name: got.amount + ' Diamonds' } });
          UI.banner('🎁 TREASURE!<small>A MYSTERY GIFT · OPEN IT AT THE END</small>', 'treasure', 1800);
          break;
        }
        case 'pad':
          Sound.warp(e.kind); world.padFx(e.index, e.kind); setWarpClass(e.kind);
          UI.banner(e.kind === 'fast' ? '⏩ TIME RUSH<small>×2 POINTS</small>' : '⏪ TIME SLOWED', 'milestone', 900);
          break;
        case 'warpEnd': setWarpClass(null); break;
        case 'bounce': Sound.bounce(); world.bounceFx(); UI.flash('r'); break;
        case 'death':
          if (e.kind === 'gap') Sound.fall(); else Sound.crash();
          setWarpClass(null);
          world.crashFx(e.kind);
          UI.flash('r');
          Sound.musicStop();
          setMode('dead');
          break;
        case 'finish':
          if (track.cfg.final) {
            setMode('victory'); Sound.musicStop(); Sound.victory(); UI.flash('w'); world.runner.scale = 1;
            if (track.cfg.boss) { world.bossDefeat(); Sound.bossDefeat(); UI.bossBar(track.cfg.boss.name, 0); UI.banner('MONSTER KING DEFEATED!<small>YOU SAVED BOTH WORLDS</small>', 'treasure', 2600); }
          }
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

  // keyboard hints, reworded for phones
  function touchHint(h) {
    return h.replace('Dodge with ← → (or A / D)', 'Swipe left / right to dodge')
      .replace('Jump with ↑ (or W)', 'Swipe up to jump')
      .replace('Slide with ↓ (or S)', 'Swipe down to slide')
      .replace('Press SPACE', 'Tap')
      .replace('SPACE again', 'Tap again');
  }

  function currentHint() {
    const P = sim.player, rows = track.rows;
    for (let i = sim.rowCursor; i < rows.length; i++) {
      const r = rows[i];
      if (r.d - P.d > sim.speed * 4.5) break;   // hints show early enough to read
      if (r.hint && r.d + r.depth / 2 > P.d) return UI.touch ? touchHint(r.hint) : r.hint;
    }
    return '';
  }

  // the first time each kind of time pad comes up, explain it
  function padHint() {
    const P = sim.player;
    for (const p of track.pads || []) {
      if (p.d < P.d) continue;
      if (p.d - P.d > sim.speed * 2.5) break;
      if (!padHints[p.kind] || padHints[p.kind] === p) {
        padHints[p.kind] = p;
        return p.kind === 'fast' ? 'Green pads speed up time: double points!' : 'Purple pads slow time down';
      }
    }
    return '';
  }

  function setWarpClass(kind) {
    document.body.classList.toggle('warp-fast', kind === 'fast');
    document.body.classList.toggle('warp-slow', kind === 'slow');
    Sound.setTempoScale(kind === 'fast' ? 1.35 : kind === 'slow' ? 0.7 : 1);
  }

  // ------------------------------------------------------------------
  // per-frame logic
  // ------------------------------------------------------------------
  function update(dt) {
    modeT += dt;
    switch (mode) {
      case 'menu': {
        // the title screen shows off both worlds (but not while you are dressing up)
        menuSwitchT = wardrobeOpen ? 0 : menuSwitchT + dt;
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
        if (tut && !tut.waiting) {
          const row = tutNext();
          if (row && row.d - row.depth / 2 - sim.player.d < sim.speed * 0.45) { tut.waiting = row; UI.tutorial(row.need, UI.touch); UI.hint(''); }
        }
        sim.update(tut && tut.waiting ? 0 : dt * sim.timeScale, bot ? s => bot.tick(s) : null);
        handleEvents();
        if (mode !== 'play') break;
        if (!(tut && tut.waiting)) UI.hint(currentHint() || padHint());
        // the boss weakens as you get closer to the end, and more with every shard hit
        if (track.cfg.boss) {
          const hp = Math.max(0.04, 1 - sim.progress * 0.85 - bossHits * track.cfg.boss.hitPerShard);
          world.bossHP = hp;
          UI.bossBar(track.cfg.boss.name, hp);
        }
        // Infinite World: a callout every 500 m
        if (track.cfg.endless && Math.floor(sim.player.d / 500) > milestone) {
          milestone = Math.floor(sim.player.d / 500);
          world.milestoneFx();
          Sound.ready();
          UI.banner(`${milestone * 500} m<small>${sim.player.d > save.data.endlessBest && save.data.endlessBest > 0 ? 'NEW RECORD!' : 'KEEP RUNNING'}</small>`, 'milestone', 900);
        }
        // progress milestones: shockwave + callout at 25 / 50 / 75 %
        if (!track.cfg.endless && milestone < 3 && sim.progress >= (milestone + 1) * 0.25) {
          milestone++;
          world.milestoneFx();
          Sound.ready();
          if (!finaleShown) UI.banner(`${milestone * 25}%<small>${['KEEP GOING', 'HALFWAY THERE', 'ALMOST OUT'][milestone - 1]}</small>`, 'milestone', 800);
        }
        // final escape
        if (track.finaleD && sim.player.d > track.finaleD && !finaleShown) {
          finaleShown = true;
          UI.banner(track.cfg.finale.text || 'FINAL ESCAPE!<small>RUN!</small>', 'danger', 2200);
          UI.vignette(true);
          Sound.setIntensity(1);
          Sound.setTempoScale(1.2);
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
        break;
      }
      case 'dead':
        sim.update(dt);
        if (modeT > 1.4) {
          const score = sim.scoring.score;
          const meters = Math.floor(sim.player.d);
          const isBest = track.cfg.tutorial ? false : track.cfg.endless ? save.recordEndless(meters) : save.recordScore(level, score);
          if (track.cfg.endless) save.recordScore(0, score);
          save.write();
          UI.hud(false);
          const over = {
            cfg: track.cfg, message: deathMessage(), progress: sim.progress, score, coins: sim.scoring.coins, best: save.best(level), isBest,
            wallet: save.data.wallet, reviveCost: reviveCost(), endless: !!track.cfg.endless, meters, bestMeters: save.data.endlessBest,
          };
          mode = 'result';
          openGifts(() => UI.gameOver(over));
        }
        break;
      case 'finish':
        sim.update(dt);
        if (tut) {   // tutorial finished: from now on you play on your own
          if (modeT - dt <= 0) UI.banner('YOU\'RE READY! 🎉<small>NOW YOU PLAY ON YOUR OWN</small>', 'treasure', 2000);
          if (modeT > 2.2) { save.data.tutorialDone = true; save.write(); const n = tut.then; tut = null; startLevel(n); }
          break;
        }
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
    mode = 'result';
    const unlockedNew = save.data.unlocked > wasUnlocked;
    openGifts(() => {
      if (track.cfg.final) {
        UI.victory({ score: s.score, coins: s.coins, total: save.bestTotal(), isBest });
      } else {
        UI.complete({
          cfg: track.cfg, distance: track.length, coins: s.coins, shards: s.shards, totalShards: track.shards.length,
          bonus: s.bonus, score: s.score, isBest, unlockedNew,
        });
      }
    });
  }

  // gift boxes for the items won this run: tap to open each one, then the result screen
  function openGifts(then) {
    if (!prizes.length || bot) { then(); return; }
    const list = prizes;
    prizes = [];
    UI.showGifts(list, (slot, id) => {
      if (save.equip(slot, id)) world.applyOutfit(save.data.equipped);
    }, then);
    // the first gift ever: show how to open it; after a first clothing prize, the menu will point to the wardrobe
    if (!save.data.onboard.gift) UI.coach('#giftBox', 'Tap the gift to open it!', () => { save.data.onboard.gift = true; save.write(); });
    if (save.data.onboard.wardrobe === 0 && list.some(p => p.slot !== 'coins' && p.slot !== 'gems')) { save.data.onboard.wardrobe = 1; save.write(); }
  }

  function frame(dt) {
    if (mode !== 'paused') update(dt);
    if (mode === 'play' || mode === 'countdown' || mode === 'paused') {
      UI.updateHud({
        score: sim.scoring.score, coins: sim.scoring.coins, shards: sim.scoring.shards, progress: sim.progress,
        world: sim.dim.world, readiness: sim.dim.readiness, cooldownOn: track.cfg.cooldown > 0,
        shields: sim.shields, magnet: sim.magnet, gems: save.data.gems,
        endless: !!track.cfg.endless, meters: Math.floor(sim.player.d), bestMeters: save.data.endlessBest,
      });
    }
    world.update(mode === 'paused' ? 0 : dt, {
      sim, mode: viewMode, modeT: viewMode === mode ? modeT : 99, wardrobe: wardrobeOpen && UI.current === 'wardrobe',
      instability: mode === 'menu' ? 0 : track.cfg.instability, danger: finaleShown && mode !== 'menu' ? 1 : 0,
    });
    world.render();
  }

  // ------------------------------------------------------------------
  // boot
  // ------------------------------------------------------------------
  // private link: ?unlock=all opens every level and wardrobe item on this device (saved, so it sticks)
  if (params.get('unlock') === 'all') {
    save.data.unlocked = DR.LEVELS.length;
    for (const slot in DR.COSMETICS) {
      for (const item of DR.COSMETICS[slot]) if (!save.owns(slot, item.id)) save.data.owned.push(slot + ':' + item.id);
    }
    save.write();
  }
  world.onThunder = () => Sound.thunder();
  world.onBoom = () => { if (Math.random() < 0.4) Sound.boom(); };   // not every meteor: it would get noisy
  world.onBossThrow = () => Sound.bossThrow();
  world.applyOutfit(save.data.equipped);
  toMenu();
  if (params.has('level')) {
    const n = U.clamp(parseInt(params.get('level'), 10) || 0, 0, DR.LEVELS.length);
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
