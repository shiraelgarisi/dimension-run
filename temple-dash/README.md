# Temple Dash

An endless 3D temple runner that runs **entirely in the browser**. It has no server, no backend, no database and no API keys, just HTML, CSS and JavaScript (plus Three.js, vendored locally in `vendor/`). That makes it a perfect fit for GitHub Pages.

## Play locally
Double-click `index.html`, or serve the folder:
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Controls
| Action | Keyboard | Touch |
|---|---|---|
| Turn at a corner / change lane | ← → (or A D) | swipe left / right |
| Jump (logs, gaps) | ↑ / W / Space | swipe up |
| Slide (vine arches) | ↓ / S | swipe down |
| Pause / Mute | P / M | buttons top-right |

Hit a block from the side and you **stumble**: the demons catch up. Stumble again before they fall back and you're caught.

## Deploy to GitHub Pages
1. Create a repo and push this folder's contents to it (`index.html` at the root).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Wait about a minute, then open `https://<username>.github.io/<repo>/`.

## What's inside (all procedural, no image or sound files)
- **Endless path generator**: segments with left/right turns; headings are restricted to N/E/W so the path never crosses itself
- **Obstacles**: logs (jump), vine arches (slide), stone blocks (dodge), gaps (jump); spacing scales with speed so they're always survivable
- **Demon monkeys** follow a breadcrumb trail of your path, so they chase you around corners
- **Magnet power-up**, coin arcs, particle bursts, camera shake, speed-based FOV
- **Textures** drawn on `<canvas>` at load time (stone, moss, sky gradient)
- **Sound and music** synthesized live with the Web Audio API (tribal drum loop, coin pings)
- Best score saved in `localStorage`

## 90-second demo script
1. **0–10s**: Title screen. "Pure HTML/CSS/JS on GitHub Pages: no backend, no assets, everything is generated in code."
2. **10–50s**: Play. Show a turn (on-screen hint), a jump, a slide, grab coins. Mention the textures and music are generated live.
3. **50–70s**: Side-swipe a block on purpose so the demons appear and chase you around a corner.
4. **70–90s**: Die, show the game-over screen and best score, and hit *Run again*.
