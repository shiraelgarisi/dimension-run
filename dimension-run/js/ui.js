/* Menus and HUD: all DOM work lives here. The game calls these functions;
   button clicks are forwarded to the handlers the game passes to init(). */
(function () {
  'use strict';
  const DR = window.DR;
  const $ = id => document.getElementById(id);
  const SCREENS = ['menu', 'levels', 'wardrobe', 'shop', 'gift', 'info', 'pause', 'over', 'complete', 'victory', 'exit'];
  const RING = 2 * Math.PI * 28;

  let hintText = '', bannerTimer = null, lastHud = {};

  const UI = {
    init(h) {
      const on = (id, fn) => $(id).addEventListener('click', () => { DR.Sound.click(); fn(); });
      on('startBtn', h.start);
      on('levelsBtn', h.levels);
      on('wardrobeBtn', h.wardrobe);
      on('infoBtn', h.info);
      on('pauseInfoBtn', () => { this.infoFrom = 'pause'; h.info(); });
      on('infoBack', () => { const from = this.infoFrom || 'menu'; this.infoFrom = null; this.show(from); });
      on('shopBtn', h.shop);
      on('shopBack', h.menu);
      $('continueBtn').addEventListener('click', () => h.continueRun());
      on('wardrobeBack', h.menu);
      on('wardrobeWorld', h.wardrobeWorld);
      on('exitBtn', h.exit);
      on('levelsBack', h.menu);
      on('resetBtn', () => { if (window.confirm('Reset all progress and best scores?')) h.resetProgress(); });
      on('resumeBtn', h.resume);
      on('restartBtn', h.retry);
      on('pauseMenuBtn', h.menu);
      on('retryBtn', h.retry);
      on('overMenuBtn', h.menu);
      on('nextBtn', h.next);
      on('cRetryBtn', h.retry);
      on('cMenuBtn', h.menu);
      on('vMenuBtn', h.menu);
      on('vLevelsBtn', h.levels);
      on('exitBack', h.menu);
      $('muteBtn').addEventListener('click', h.mute);
      $('pauseBtn').addEventListener('click', h.pause);
      this.handlers = h;
    },

    /** Show one overlay screen (or none with null) and focus its first button. */
    show(name) {
      this.coach(null);
      for (const s of SCREENS) $(s).classList.toggle('hidden', s !== name);
      this.current = name;
      if (name) {
        const b = $(name).querySelector('button:not([disabled])');
        if (b) setTimeout(() => b.focus({ preventScroll: true }), 30);
      }
    },
    hud(visible) { $('hud').classList.toggle('hidden', !visible); if (!visible) { this.hint(''); this.banner(''); } },

    /** Arrow keys move between the visible buttons of the current screen. */
    navigate(dir) {
      if (!this.current) return;
      const btns = [...$(this.current).querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent);
      if (!btns.length) return;
      const i = btns.indexOf(document.activeElement);
      btns[(i + dir + btns.length) % btns.length].focus();
    },

    renderMenu(save, next) {
      const cfg = DR.LEVELS[next - 1];
      const total = Object.values(DR.COSMETICS).reduce((n, l) => n + l.length, 0);
      $('wardrobeCount').textContent = `${save.data.owned.length} / ${total}`;
      $('shopCoins').textContent = save.data.wallet;
      $('menuCoins').textContent = save.data.wallet;
      $('menuGems').textContent = save.data.gems;
      $('menuStars').textContent = `${save.totalStars()}/${(DR.LEVELS.length + 1) * 3}`;
      $('wardrobeBtn').classList.toggle('has-new', save.data.newItems.length > 0);
      $('startInfo').textContent = `Level ${cfg.id} · ${cfg.name}`;
      $('menuBest').textContent = save.bestTotal();
    },

    renderLevels(save, pick, thumbs = {}) {
      const pic = (b, id) => { if (thumbs[id]) { b.style.backgroundImage = `url(${thumbs[id]})`; b.classList.add('has-pic'); } };
      const grid = $('levelGrid');
      grid.innerHTML = '';
      // level 0: the Infinite World, always open
      const inf = document.createElement('button');
      inf.className = 'level-card endless';
      const starText = id => [0, 1, 2].map(i => `<b class="${save.starsOf(id) & (1 << i) ? 'on' : ''}">★</b>`).join('');
      inf.innerHTML = `<span class="num">∞</span><span class="name">${DR.ENDLESS.name}</span><span class="card-stars">${starText(0)}</span><span class="lbest">Best: ${save.data.endlessBest} m</span>`;
      pic(inf, 0);
      inf.addEventListener('click', () => { DR.Sound.click(); pick(0); });
      grid.appendChild(inf);
      for (const cfg of DR.LEVELS) {
        const unlocked = save.isUnlocked(cfg.id);
        const b = document.createElement('button');
        b.className = 'level-card' + (unlocked ? '' : ' locked');
        b.dataset.level = cfg.id;
        pic(b, cfg.id);
        b.innerHTML = `
          ${save.isCompleted(cfg.id) ? '<span class="done" title="Completed">✔</span>' : ''}
          <span class="num">${cfg.id}</span>
          <span class="name">${cfg.name}</span>
          <span class="diff">${cfg.difficulty}</span>
          ${unlocked ? `<span class="card-stars">${starText(cfg.id)}</span>` : ''}
          ${unlocked ? `<span class="lbest">Best: ${save.best(cfg.id)}</span>` : '<span class="lock">🔒</span><span class="lbest">Finish level ' + (cfg.id - 1) + '</span>'}`;
        b.setAttribute('aria-label', `Level ${cfg.id} ${cfg.name}${unlocked ? '' : ' (locked)'}`);
        if (unlocked) b.addEventListener('click', () => { DR.Sound.click(); pick(cfg.id); });
        else b.addEventListener('click', () => { DR.Sound.denied(); b.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 200); });
        grid.appendChild(b);
      }
    },

    /** Gift boxes: tap a box, it shakes, bursts open and shows the item. done() after the last one. */
    showGifts(list, wear, done) {
      let i = 0;
      const box = $('giftBox'), item = $('giftItem'), btns = $('giftButtons'), wearBtn = $('giftWear');
      const one = () => {
        const g = list[i];
        $('giftTitle').textContent = list.length > 1 ? `GIFT ${i + 1} OF ${list.length}` : 'YOU WON A GIFT!';
        $('giftHint').classList.remove('hidden');
        box.className = 'giftbox';
        box.dataset.rarity = g.rarity || 'common';
        box.parentNode.classList.remove('opened');
        box.parentNode.dataset.rarity = g.rarity || 'common';
        box.disabled = false;
        item.classList.add('hidden');
        btns.classList.add('hidden');
        $('giftConfetti').innerHTML = '';
        item.querySelector('.ico').textContent = g.item.icon;
        item.querySelector('.nm').textContent = g.item.name;
        item.querySelector('.slot').textContent = (DR.RARITY[g.rarity || 'common'].name.toUpperCase()) + ' · ' + (g.slot === 'coins' ? 'FOR THE SHOP' : g.slot === 'gems' ? 'FOR PETS' : 'NEW ' + ({ hat: 'HAT', outfit: 'OUTFIT', back: 'BACK ITEM', pet: 'PET' }[g.slot] || g.slot.toUpperCase()));
        wearBtn.textContent = g.slot === 'pet' ? 'TAKE IT ALONG' : 'WEAR IT NOW';
        wearBtn.disabled = false;
        wearBtn.classList.toggle('hidden', g.slot === 'coins' || g.slot === 'gems');
        $('giftNext').textContent = i < list.length - 1 ? 'NEXT GIFT' : 'CONTINUE';
        setTimeout(() => box.focus({ preventScroll: true }), 60);
      };
      box.onclick = () => {
        if (box.disabled) return;
        box.disabled = true;
        $('giftHint').classList.add('hidden');
        box.classList.add('shake');
        DR.Sound.bounce();
        setTimeout(() => {
          box.classList.add('open');
          box.parentNode.classList.add('opened');
          DR.Sound.chest();
          this.flash('w');
          const cf = $('giftConfetti');
          const cols = ['#ff4d8a', '#ffd84a', '#39f3ff', '#6cf08a', '#b04dff', '#ff8a3a'];
          for (let k = 0; k < 40; k++) {
            const c = document.createElement('i');
            c.style.cssText = `left:${50 + (Math.random() - 0.5) * 20}%;background:${cols[k % cols.length]};--dx:${(Math.random() - 0.5) * 460}px;--dy:${-120 - Math.random() * 260}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * 0.15}s`;
            cf.appendChild(c);
          }
        }, 650);
        setTimeout(() => { item.classList.remove('hidden'); btns.classList.remove('hidden'); $('giftNext').focus({ preventScroll: true }); }, 1000);
      };
      wearBtn.onclick = () => { const g = list[i]; wear(g.slot, g.item.id); DR.Sound.click(); wearBtn.textContent = '✓ ON!'; wearBtn.disabled = true; };
      $('giftNext').onclick = () => { DR.Sound.click(); i++; if (i < list.length) one(); else done(); };
      this.show('gift');
      one();
    },

    /** First-time guide: a pointing hand and a glow on one button, with a short note.
        target: element or CSS selector (null hides it). done() runs when the button is pressed. */
    coach(target, text, done) {
      const box = $('coach');
      clearInterval(this.coachTimer);
      if (this.coachEl) { this.coachEl.classList.remove('coach-target'); this.coachEl.removeEventListener('click', this.coachClick); }
      this.coachEl = null;
      box.classList.add('hidden');
      if (!target) return;
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      this.coachEl = el;
      el.classList.add('coach-target');
      $('coachText').textContent = text;
      this.coachClick = () => { this.coach(null); if (done) done(); };
      el.addEventListener('click', this.coachClick);
      const place = () => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const below = r.bottom + 150 < innerHeight;   // the hand sits under the button, or over it near the bottom
        box.classList.toggle('above', !below);
        box.style.left = Math.round(r.left + r.width / 2) + 'px';
        box.style.top = Math.round(below ? r.bottom + 4 : r.top - 4) + 'px';
      };
      box.classList.remove('hidden');
      place();
      this.coachTimer = setInterval(place, 250);   // follows the button if the screen moves or scrolls
    },

    /** Tutorial: the big arrow that says which move to make (null hides it). */
    tutorial(need, touch) {
      const box = $('tutor');
      box.classList.toggle('hidden', !need);
      $('dimension').classList.toggle('teach', need === 'switch');
      if (!need) return;
      const T = {
        slide: ['⬇', touch ? 'Swipe DOWN to slide' : 'Press ↓ to slide', 'down'],
        jump: ['⬆', touch ? 'Swipe UP to jump' : 'Press ↑ to jump', 'up'],
        side: ['⬅ ➡', touch ? 'Swipe LEFT or RIGHT' : 'Press ← or →', 'side'],
        switch: ['☀ ☾', touch ? 'TAP the screen to switch worlds!' : 'Press SPACE to switch worlds!', 'switch'],
      }[need];
      box.className = 'tutor ' + T[2];
      $('tutArrow').textContent = T[0];
      $('tutText').textContent = T[1];
    },

    /** Three stars that light up one by one. mask: earned (bits 1,2,4); gained: earned for the first time. */
    starsRow(el, mask, gained, labels) {
      el.innerHTML = labels.map((l, i) => `<div class="star"><span class="s">★</span><small>${l}</small>${gained & (1 << i) ? `<em>+${DR.STARS.reward} 💎</em>` : ''}</div>`).join('');
      [...el.children].forEach((s, i) => {
        if (!(mask & (1 << i))) return;
        setTimeout(() => {
          s.classList.add('on');
          if (gained & (1 << i)) { s.classList.add('new'); DR.Sound.shard(); } else DR.Sound.ready();
        }, 350 + i * 450);
      });
    },

    /** Boss health bar: name (or null to hide) and health 0..1. */
    bossBar(name, hp) {
      $('bossBar').classList.toggle('hidden', !name);
      if (!name) return;
      $('bossName').textContent = name;
      $('bossFill').style.width = Math.round(hp * 100) + '%';
      $('bossBar').classList.toggle('rage', hp < 0.35);
    },

    renderShop(save, buy) {
      $('shopWallet').textContent = save.data.wallet;
      const box = $('shopItems');
      box.innerHTML = '';
      for (const id in DR.SHOP) {
        const it = DR.SHOP[id], can = save.data.wallet >= it.price;
        const row = document.createElement('div');
        row.className = 'shop-row';
        row.innerHTML = `<span class="ico">${it.icon}</span><span class="txt"><b>${it.name}</b><small>${it.desc}</small><small>You have: <b>${save.data.items[id]}</b></small></span>`;
        const b = document.createElement('button');
        b.className = 'buy' + (can ? '' : ' poor');
        b.innerHTML = `<span class="coin-icon"></span> ${it.price}`;
        b.addEventListener('click', () => buy(id));
        row.appendChild(b);
        box.appendChild(row);
      }
    },

    /** Label of the wardrobe's world button: it offers the other world. */
    wardrobeWorld(world) {
      $('wardrobeWorld').innerHTML = world === DR.CONST.LIGHT ? '☾ See it in the Dark World' : '☀ Back to the Light World';
    },

    renderWardrobe(save, equip, buy, fresh = new Set()) {
      $('wardrobeGems').textContent = save.data.gems;
      const box = $('wardrobeSlots');
      box.innerHTML = '';
      for (const slot in DR.COSMETICS) {
        const h = document.createElement('h3');
        h.textContent = DR.COSMETIC_SLOTS[slot];
        box.appendChild(h);
        const row = document.createElement('div');
        row.className = 'items';
        for (const item of DR.COSMETICS[slot]) {
          const owned = save.owns(slot, item.id), on = save.data.equipped[slot] === item.id;
          const forSale = !owned && item.price, afford = forSale && save.data.gems >= item.price;
          const b = document.createElement('button');
          const isNew = fresh.has(slot + ':' + item.id);
          b.className = 'item' + (owned ? '' : forSale ? ' for-sale' + (afford ? ' afford' : '') : ' locked') + (on ? ' on' : '') + (isNew ? ' is-new' : '') + ` r-${item.rarity || 'common'}`;
          const rar = item.rarity && !item.free ? `<span class="rar">${DR.RARITY[item.rarity].name}</span>` : '';
          if (forSale) b.innerHTML = `<span class="ico">${item.icon}</span><span class="nm">${item.name}</span>${rar}<span class="price">💎 ${item.price}</span>`;
          else b.innerHTML = `<span class="ico">${owned ? item.icon : '🔒'}</span><span class="nm">${owned ? item.name : '???'}</span>${owned ? rar : ''}${isNew ? '<span class="new-badge">NEW</span>' : ''}`;
          b.title = owned ? item.name : forSale ? `${item.name}: ${item.price} diamonds` : 'Find it in a treasure chest';
          b.addEventListener('click', () => {
            if (owned) { DR.Sound.click(); equip(slot, item.id); }
            else if (afford && window.confirm(`Buy the ${item.name} for ${item.price} diamonds?`)) buy(slot, item.id);
            else DR.Sound.denied();
          });
          row.appendChild(b);
        }
        box.appendChild(row);
      }
      const total = Object.values(DR.COSMETICS).reduce((n, l) => n + l.length, 0);
      $('wardrobeFound').textContent = `Found ${save.data.owned.length} of ${total} items. Chests hide clothes; pets cost diamonds!`;
    },

    startLevel(cfg, best) {
      $('levelName').textContent = cfg.tutorial ? 'Tutorial' : cfg.endless ? `∞ · ${cfg.name}` : `Level ${cfg.id} · ${cfg.name}`;
      $('hudBest').textContent = best;
      $('shards').classList.add('hidden');
      lastHud = {};
      $('dimState').innerHTML = `<kbd>${this.switchKey}</kbd> switch`;
    },

    updateHud(s) {
      const set = (k, id, v) => { if (lastHud[k] !== v) { lastHud[k] = v; $(id).textContent = v; } };
      set('score', 'score', s.score);
      set('coins', 'coins', s.coins);
      if (s.shards) { set('shards', 'shards', '✦ ' + s.shards); $('shards').classList.remove('hidden'); }
      set('powerups', 'powerups', (s.shields ? '🛡️' : '') + (s.magnet ? '🧲' : ''));
      const pct = Math.floor(s.progress * 100);
      if (s.endless) {   // Infinite World: distance, measured against your record
        if (lastHud.m !== s.meters) {
          lastHud.m = s.meters;
          $('progressFill').style.width = (s.bestMeters ? Math.min(100, s.meters / s.bestMeters * 100) : 0) + '%';
          $('progressPct').textContent = `${s.meters} m · BEST ${s.bestMeters} m`;
        }
      } else if (lastHud.pct !== pct) { lastHud.pct = pct; $('progressFill').style.width = pct + '%'; $('progressPct').textContent = pct + '%'; }
      set('gems', 'gemsHud', '💎 ' + s.gems);
      if (lastHud.world !== s.world) {
        lastHud.world = s.world;
        const dark = s.world === DR.CONST.DARK;
        $('dimIcon').textContent = dark ? '☾' : '☀';
        $('dimName').textContent = dark ? 'DARK WORLD' : 'LIGHT WORLD';
        $('dimension').classList.toggle('dark', dark);
        $('dimension').classList.toggle('light', !dark);
      }
      const r = Math.round(s.readiness * 100) / 100;
      if (lastHud.ready !== r) {
        lastHud.ready = r;
        $('dimRing').style.strokeDashoffset = String(RING * (1 - r));
        $('dimension').classList.toggle('charging', r < 1);
        if (s.cooldownOn) $('dimState').innerHTML = r < 1 ? 'recharging…' : `<kbd>${this.switchKey}</kbd> ready`;
      }
    },
    denied() {
      const d = $('dimension');
      d.classList.remove('denied'); void d.offsetWidth; d.classList.add('denied');
    },

    switchKey: 'SPACE',
    setTouch(on) {
      this.touch = on;
      this.switchKey = on ? 'TAP' : 'SPACE';
      document.body.classList.toggle('touch', on);
    },

    hint(text) {
      if (text === hintText) return;
      hintText = text;
      $('hint').textContent = text;
      $('hint').classList.toggle('hidden', !text);
    },
    banner(html, cls = '', ms = 1600) {
      const b = $('banner');
      clearTimeout(bannerTimer);
      if (!html) { b.classList.add('hidden'); return; }
      b.innerHTML = html;
      b.className = cls;
      void b.offsetWidth;
      if (ms) bannerTimer = setTimeout(() => b.classList.add('hidden'), ms);
    },
    flash(kind) {   // 'l' light, 'd' dark, 'w' white, 'r' red
      const f = $('flash');
      f.className = kind + ' on';
      requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
    },
    vignette(on) { $('vignette').classList.toggle('on', !!on); },
    glitch() { document.body.classList.add('glitch'); setTimeout(() => document.body.classList.remove('glitch'), 140); },
    setMuted(m) { $('muteBtn').classList.toggle('off', m); },

    gameOver(d) {
      $('deathMsg').textContent = d.message;
      $('overPct').textContent = d.endless ? d.meters + ' m' : Math.floor(d.progress * 100) + '%';
      $('overLevel').textContent = d.endless ? `the Infinite World (best ${d.bestMeters} m)` : `Level ${d.cfg.id} · ${d.cfg.name}`;
      $('overScore').textContent = d.score;
      $('overCoins').textContent = d.coins;
      $('overBest').textContent = d.best;
      $('overNewBest').classList.toggle('hidden', !d.isBest);
      $('oStars').classList.toggle('hidden', !d.endless);
      if (d.endless) this.starsRow($('oStars'), d.stars, d.newStars, DR.STARS.endless.map(m => m + ' m'));
      const can = d.wallet >= d.reviveCost;
      $('continueBtn').innerHTML = `CONTINUE <span class="coin-icon"></span> ${d.reviveCost}`;
      $('continueBtn').disabled = !can;
      $('overWallet').textContent = can ? `You have ${d.wallet} coins` : `You have ${d.wallet} coins: you need ${d.reviveCost} to continue`;
      this.show('over');
      setTimeout(() => $('retryBtn').focus({ preventScroll: true }), 40);   // Enter retries; continuing spends coins
    },
    complete(d) {
      $('completeName').textContent = `Level ${d.cfg.id} · ${d.cfg.name}`;
      $('cDist').textContent = Math.floor(d.distance) + ' m';
      $('cCoins').textContent = d.coins;
      $('cShards').textContent = d.shards + ' / ' + d.totalShards;
      $('cBonus').textContent = '+' + d.bonus;
      $('cScore').textContent = d.score;
      $('cNewBest').classList.toggle('hidden', !d.isBest);
      this.starsRow($('cStars'), d.stars, d.newStars, ['Finish', 'All shards', 'No hits']);
      const nextCfg = DR.LEVELS[d.cfg.id];
      $('cUnlock').classList.toggle('hidden', !d.unlockedNew);
      if (nextCfg && d.unlockedNew) {
        // the next level's picture pops up locked; the lock shakes, opens, and the picture lights up
        const u = $('cUnlock');
        u.innerHTML = `<div class="unlock-card locked"${d.nextThumb ? ` style="background-image:url(${d.nextThumb})"` : ''}>
          <span class="ul-num">${nextCfg.id}</span><span class="ul-lock">🔒</span></div>
          <div class="ul-text">LEVEL ${nextCfg.id}: ${nextCfg.name.toUpperCase()}</div>`;
        const card = u.querySelector('.unlock-card'), lock = u.querySelector('.ul-lock');
        clearTimeout(this.unlockT1); clearTimeout(this.unlockT2);
        this.unlockT1 = setTimeout(() => card.classList.add('shaking'), 700);
        this.unlockT2 = setTimeout(() => {
          lock.textContent = '🔓';
          card.classList.remove('shaking', 'locked'); card.classList.add('open');
          u.querySelector('.ul-text').textContent = `🎉 LEVEL ${nextCfg.id} UNLOCKED: ${nextCfg.name.toUpperCase()}`;
          DR.Sound.chest();
        }, 1500);
      }
      $('nextBtn').classList.toggle('hidden', !nextCfg);
      this.show('complete');
    },
    victory(d) {
      $('vScore').textContent = d.score;
      $('vCoins').textContent = d.coins;
      $('vTotal').textContent = d.total;
      $('vNewBest').classList.toggle('hidden', !d.isBest);
      this.starsRow($('vStars'), d.stars, d.newStars, ['Finish', 'All shards', 'No hits']);
      this.show('victory');
    },
  };

  DR.UI = UI;
})();
