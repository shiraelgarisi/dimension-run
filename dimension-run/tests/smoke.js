/* Browser smoke test. Open:  index.html?test&autopilot            (all 5 levels)
                              index.html?test&autopilot&level=3    (one level)
                              ...&stopAt=0.4&dark                  (freeze mid-level, for screenshots)
   Drives the real game (rendering, UI, sound code paths) with the autopilot and writes a
   JSON report into <pre id="smoke-report"> and the page title. */
(function () {
  'use strict';
  const report = { errors: [], levels: [], ok: false };
  window.addEventListener('error', e => report.errors.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const origErr = console.error;
  console.error = (...a) => { report.errors.push(a.map(String).join(' ')); origErr.apply(console, a); };

  const p = new URLSearchParams(location.search);
  const only = p.get('level');
  const stopAt = parseFloat(p.get('stopAt'));
  const levels = only ? [parseInt(only, 10)] : [1, 2, 3, 4, 5];
  const DT = 1 / 20;
  const g = window.__dr;

  function finish() {
    report.ok = !report.errors.length && report.levels.every(l => l.result === 'completed' || l.result === 'stopped');
    const pre = document.createElement('pre');
    pre.id = 'smoke-report';
    pre.style.cssText = 'position:fixed;left:0;bottom:0;margin:0;font:10px monospace;color:#fff;background:#000a;z-index:99;max-width:50vw;white-space:pre-wrap';
    pre.textContent = JSON.stringify(report);
    if (!isNaN(stopAt)) pre.style.display = 'none';
    document.body.appendChild(pre);
    document.title = 'SMOKE:' + (report.ok ? 'PASS' : 'FAIL');
  }

  function runLevel(i) {
    if (i >= levels.length) return finish();
    const n = levels[i];
    const t0 = performance.now();
    g.startLevel(n);
    let frames = 0;
    const chunk = () => {
      try {
        for (let k = 0; k < 40; k++) {
          g.frame(DT);
          frames++;
          if (!isNaN(stopAt) && g.mode === 'play' && g.sim.progress >= stopAt) {
            if (p.has('dark') && g.sim.dim.world !== 1) g.sim.dim.forceFlip();
            if (p.has('light') && g.sim.dim.world !== 0) g.sim.dim.forceFlip();
            // freeze the run but keep rendering, so a screenshot shows the scene
            const frozen = () => { g.sim.dim.update(1 / 60); g.frame(0); requestAnimationFrame(frozen); };
            frozen();
            report.levels.push({ level: n, result: 'stopped', progress: g.sim.progress });
            return finish();
          }
          if (g.mode === 'result' || frames > 40 * 60 * 20) {
            const s = g.sim;
            report.levels.push({
              level: n, result: s.state === 'finished' ? 'completed' : 'died:' + s.deathKind, progress: +s.progress.toFixed(3),
              score: s.scoring.score, coins: s.scoring.coins, gameTime: +s.time.toFixed(1), frames,
              screen: [...document.querySelectorAll('.screen')].filter(e => !e.classList.contains('hidden')).map(e => e.id).join(','),
              msPerFrame: +((performance.now() - t0) / frames).toFixed(1),
            });
            return setTimeout(() => runLevel(i + 1), 0);
          }
        }
      } catch (e) {
        report.errors.push('exception: ' + e.message + ' ' + (e.stack || '').split('\n')[1]);
        return finish();
      }
      setTimeout(chunk, 0);
    };
    chunk();
  }
  if (p.get('screen') === 'levels') {
    // just open the level selection screen (for a screenshot)
    setTimeout(() => { document.getElementById('levelsBtn').click(); const f = () => { g.frame(1 / 60); requestAnimationFrame(f); }; f(); finish(); }, 50);
    return;
  }
  setTimeout(() => runLevel(0), 50);
})();
