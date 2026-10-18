# Dimension Run

**Live demo:** https://shiraelgarisi.github.io/dimension-run/

Dimension Run is a 3D endless runner that runs entirely in the browser, on desktop and mobile. The player runs along a single path that exists in two parallel worlds, Light and Dark. Some obstacles exist in only one world, so switching worlds at the right moment is the core skill.

The game has no backend, no database, no external services and no asset files. Graphics, textures, music and sound effects are all generated in code at runtime.

## Features
- **Levels:** 8 themed levels, each with its own art direction, soundtrack, and Light and Dark variants, ending in a boss fight against the Monster King.
- **Infinite World:** an endless mode with its own look and speed that keeps rising, streamed in chunks as the player runs.
- **Procedural tracks:** a new layout every run, checked by a solver that guarantees every track can be completed.
- **Progression:** 3 stars per level, coins and diamonds, treasure chests, a daily reward with a streak, and daily missions.
- **Customization:** a wardrobe of hats, outfits and back items in four rarity tiers, and six pets.
- **Onboarding:** a guided first run, an illustrated How to Play screen, and contextual first-time hints.
- **Controls:** keyboard on desktop, and swipe and tap on mobile.

## Tech stack
- HTML, CSS and vanilla JavaScript, with no build step
- [Three.js](https://threejs.org/) for 3D rendering, stored in `vendor/`
- Web Audio API for synthesized music and sound effects
- Canvas 2D for textures generated at load time
- `localStorage` for saved progress, with validation of stored data
- GitHub Pages for hosting

## Architecture
The game logic is kept separate from rendering. The simulation is deterministic and has no dependency on the DOM or Three.js, so the browser and the Node.js test suite run exactly the same rules.

| Module | Responsibility |
|---|---|
| `config.js` | All gameplay constants and level definitions (data-driven balancing) |
| `track.js` | Procedural track generation and the fairness solver |
| `sim.js`, `player.js`, `dimension.js`, `collision.js`, `scoring.js` | Deterministic gameplay simulation |
| `world.js`, `themes*.js`, `pets.js` | Rendering, level themes and effects (read-only access to the simulation) |
| `audio.js` | Music and sound effects synthesizer |
| `ui.js` | Menus, HUD and onboarding |
| `save.js` | Saved progress |
| `game.js` | Game state machine, input and main loop |

## Testing
- **Unit and integration tests** (`tests/run-tests.js`, 34 tests): track fairness, collisions, scoring, level progression and save data integrity.
- **Autopilot:** an automated player follows the solver's planned path through the real simulation to verify that every level can be completed.
- **Browser smoke test** (`?test&autopilot`): plays all levels in the browser and reports any runtime error.

```
node dimension-run/tests/run-tests.js
```

## Running locally
```
cd dimension-run
python -m http.server 8000
```
Then open http://localhost:8000.

## Development with an AI agent
This project was developed with **Claude Code**, an AI coding agent, as part of an exploration of AI-assisted software development. I defined the product vision, requirements and user experience, and the agent implemented them.

**Workflow**
1. **Requirements:** I defined each feature or reported each issue with a clear description of the expected behavior.
2. **Implementation:** the agent wrote the code and updated the tests.
3. **Verification:** the agent ran the test suite and checked the game in a browser before every commit.
4. **Review:** I play-tested on desktop and on mobile devices and gave feedback.
5. **Iteration:** changes that did not meet expectations were refined or reverted. Every completed step was committed separately, which made it easy to roll back.

**Division of responsibilities**
- **Me:** product vision, game design, prioritization, user experience decisions, testing on real devices and final approval of every change.
- **The AI agent:** implementation, automated testing, debugging and documentation.

**Key takeaways**
- Precise requirements lead to better results, especially when describing a bug: what happens, where, and when.
- Automated tests let the project grow quickly without breaking existing features.
- Human testing is still essential. Feel, sound and touch responsiveness can only be judged by playing on real devices.
- Small, separate commits make it safe to experiment and to undo changes.
