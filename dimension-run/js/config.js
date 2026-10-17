/* Tunable constants and the five level definitions.
   Every gameplay number lives here, so balancing a level means editing data, not code. */
(function (root) {
  'use strict';
  const DR = (root.DR = root.DR || {});

  DR.CONST = {
    LIGHT: 0,
    DARK: 1,
    LANE_W: 2.2,          // metres between lane centres (lanes are -1, 0, 1)
    LAT_SPEED: 14,        // m/s sideways, so one lane change takes ~0.16 s
    GRAVITY: 36,
    JUMP_V: 12.2,         // airtime 2v/g ≈ 0.68 s, apex ≈ 2.1 m
    SLAM_V: -26,          // pressing slide in mid-air drops you fast
    SLIDE_TIME: 0.7,
    JUMP_BUFFER: 0.14,    // a jump pressed just before landing still fires
    CLEAR_LOW: 0.5,       // feet must be this high to clear a log / spike row
    HIT_GRACE: 0.3,       // hitboxes are shrunk by this much along the track (forgiving)
    BLOCK_HALF_W: 0.95,   // sideways overlap that counts as touching a block
    DEPTH: { block: 1.2, low: 1.0, high: 0.8, gap: 3.0 },
    SWITCH_FX_TIME: 0.32, // visual cross-fade between worlds (logic switches instantly)

    // Fairness rules used by the track generator's solver
    LANE_TIME: 0.2,       // budget per lane change (real change takes ~0.16 s)
    MIN_ROW_TIME: 0.5,    // never two obstacle rows closer than this
    VERTICAL_ROW_TIME: 0.85, // two rows that both need a jump/slide: land first
    REACT_MARGIN: 0.08,   // a switch must happen at least this long before a row's hitbox
    MOVER_SETTLE: 0.75,   // moving obstacles stop this many seconds before you reach them
    MOVER_DURATION: 0.55,
  };

  // Pattern names and what they do are documented in track.js.
  DR.LEVELS = [
    {
      id: 1,
      name: 'The Beginning',
      subtitle: 'Learn to run between worlds',
      difficulty: 'Easy',
      seed: 1101,
      length: 850,
      speed: [15, 17.5],
      cooldown: 0,
      rowTime: [1.5, 2.3],
      patterns: { lane: 3, lane2: 3, jump: 2, slide: 2, wall: 2.5 },
      coinRate: 0.75,
      shards: 1,
      chests: 2,
      instability: 0,
      intro: [
        { at: 105, pattern: 'tutLane', hint: 'Dodge with ← → (or A / D)' },
        { at: 165, pattern: 'tutJump', hint: 'Jump with ↑ (or W)' },
        { at: 225, pattern: 'tutSlide', hint: 'Slide with ↓ (or S)' },
        { at: 285, pattern: 'tutWallLight', hint: 'Blocked! Press SPACE to switch worlds' },
        { at: 345, pattern: 'tutWallDark', hint: 'SPACE again to switch back' },
        { at: 405, pattern: 'tutGhost', hint: 'Faint shapes show the other world\'s obstacles' },
      ],
    },
    {
      id: 2,
      name: 'Two Worlds',
      subtitle: 'Some paths only exist in the other world',
      difficulty: 'Easy – Medium',
      seed: 2207,
      length: 1200,
      speed: [17.5, 20.5],
      cooldown: 0,
      rowTime: [1.05, 1.7],
      patterns: { lane2: 2, jump: 1.2, slide: 1.2, wall: 3, split: 3, gap: 2, trap: 2, beamTrap: 1.5, combo: 2, enemy: 1.5 },
      coinRate: 0.7,
      shards: 2,
      chests: 3,
      instability: 0,
      intro: [
        { at: 120, pattern: 'introGap', hint: 'A gap in the Light World: jump it or switch' },
        { at: 185, pattern: 'introSpikes', hint: 'Dark World spike traps: jump them' },
        { at: 250, pattern: 'introBeam', hint: 'Energy beams: slide under' },
        { at: 315, pattern: 'introWraith', hint: 'Wraiths haunt the Dark World: dodge or switch' },
      ],
    },
    {
      id: 3,
      name: 'Time Pressure',
      subtitle: 'Switching now needs time to recharge',
      difficulty: 'Medium',
      seed: 3313,
      length: 1500,
      speed: [20.5, 23.5],
      cooldown: 0.9,
      rowTime: [0.85, 1.35],
      patterns: { wall: 2, split: 2.5, gap: 1.5, trap: 1.5, combo: 2, zigzag: 3, timing: 2, slalom: 2.5, enemy: 1.5 },
      coinRate: 0.65,
      shards: 2,
      chests: 3,
      timePads: 0.55,   // share of free stretches that get a time pad (speed up / slow down time)
      instability: 0.1,
      intro: [
        { at: 140, pattern: 'tutWallLight', hint: 'Switching has a cooldown now: watch the ring' },
        { at: 210, pattern: 'zigzag2', hint: 'Time your switches!' },
      ],
    },
    {
      id: 4,
      name: 'Chaos Dimension',
      subtitle: 'Nothing stays where it was',
      difficulty: 'Hard',
      seed: 4421,
      length: 1750,
      speed: [23.5, 27],
      cooldown: 0.7,
      rowTime: [0.72, 1.15],
      patterns: { split: 2, combo: 2, zigzag: 2.5, timing: 1.5, slalom: 2, mover: 3.5, enemy: 2, rift: 2, gap: 1, darkGap: 1 },
      movingEnemies: true,
      coinRate: 0.6,
      shards: 3,
      chests: 4,
      instability: 0.6,
      intro: [
        { at: 165, pattern: 'introMover', hint: 'Moving obstacles shift lanes: watch them' },
        { at: 240, pattern: 'introRift', hint: 'Rift gates flip your world automatically' },
      ],
    },
    {
      id: 5,
      name: 'The Collapse',
      subtitle: 'The dimensions are collapsing. Outrun it.',
      difficulty: 'Very Hard',
      seed: 5531,
      length: 2250,
      speed: [26.5, 30],
      cooldown: 0.6,
      rowTime: [0.68, 1.05],
      patterns: { split: 1.5, combo: 1.5, zigzag: 2.5, slalom: 1.5, mover: 2.5, enemy: 2, rift: 1.5, collapse: 3, gauntlet: 2, timing: 1.5, darkGap: 1 },
      movingEnemies: true,
      finale: {
        length: 380,
        speed: 33,
        patterns: { zigzag: 3, collapse: 3, gauntlet: 3, mover: 2, rift: 1.5 },
        text: 'ESCAPE THE COLLAPSE!<small>THE DIMENSIONS ARE FALLING APART · RUN!</small>',
      },
      coinRate: 0.55,
      shards: 3,
      chests: 4,
      instability: 0.85,
      intro: [
        { at: 175, pattern: 'introCollapse', hint: 'The path is collapsing: watch the cracks' },
      ],
    },
    {
      id: 6,
      name: 'Sugar Rush',
      subtitle: 'Sweet on the outside, sour on the inside',
      difficulty: 'Very Hard',
      seed: 6643,
      length: 2350,
      speed: [27, 30.5],
      cooldown: 0.6,
      rowTime: [0.66, 1.02],
      patterns: { split: 2, combo: 1.5, zigzag: 2.5, slalom: 2, mover: 3, enemy: 2, rift: 1.5, timing: 2, gap: 1, darkGap: 1, collapse: 1 },
      movingEnemies: true,
      coinRate: 0.6,
      shards: 3,
      chests: 4,
      instability: 0.3,
      intro: [
        { at: 180, pattern: 'introMover', hint: 'Candy blocks slide around: keep your eyes open' },
      ],
    },
    {
      id: 7,
      name: 'Neon Overdrive',
      subtitle: 'Full speed through the city of lights',
      difficulty: 'Extreme',
      seed: 7759,
      length: 2450,
      speed: [27.5, 31],
      cooldown: 0.55,
      rowTime: [0.72, 1.14],
      patterns: { split: 2, zigzag: 3, slalom: 3, timing: 2.5, mover: 2.5, enemy: 1.5, rift: 2, gauntlet: 1.5, collapse: 1, darkGap: 1 },
      movingEnemies: true,
      coinRate: 0.6,
      shards: 3,
      chests: 4,
      instability: 0.5,
      intro: [
        { at: 185, pattern: 'zigzag2', hint: 'Neon Overdrive: switch fast, switch often!' },
      ],
    },
    {
      id: 8,
      name: 'The Monster King',
      subtitle: 'Defeat the boss. Escape for good.',
      difficulty: 'Boss',
      seed: 8861,
      length: 2600,
      speed: [28, 31.5],
      cooldown: 0.55,
      rowTime: [0.56, 0.9],
      patterns: { split: 2, combo: 1.5, zigzag: 2.5, slalom: 2, mover: 2.5, enemy: 2.5, rift: 1.5, collapse: 2, gauntlet: 2, timing: 1.5, darkGap: 1 },
      movingEnemies: true,
      boss: { name: 'MONSTER KING', hitPerShard: 0.08 },
      final: true,   // finishing this level wins the game
      finale: {
        length: 420,
        speed: 34,
        patterns: { zigzag: 3, collapse: 2.5, gauntlet: 3, mover: 2, enemy: 2, rift: 1.5 },
        text: 'BOSS RAGE!<small>THE MONSTER KING IS FURIOUS · FINISH HIM!</small>',
      },
      coinRate: 0.6,
      shards: 5,
      chests: 4,
      instability: 0.7,
      intro: [
        { at: 185, pattern: 'tutWallLight', hint: 'The Monster King throws obstacles: watch where they land!' },
        { at: 260, pattern: 'introWraith', hint: 'Grab the glowing shards to hit the boss!' },
      ],
    },
  ];

  // Wardrobe items. Free ones are owned from the start; the rest are found in treasure chests.
  DR.COSMETICS = {
    hat: [
      { id: 'none', name: 'No hat', icon: '🙂', free: true },
      { id: 'crown', name: 'Golden Crown', icon: '👑' },
      { id: 'cowboy', name: 'Cowboy Hat', icon: '🤠' },
      { id: 'wizard', name: 'Wizard Hat', icon: '🧙' },
      { id: 'tophat', name: 'Top Hat', icon: '🎩' },
      { id: 'helmet', name: 'Space Helmet', icon: '👩‍🚀' },
      { id: 'viking', name: 'Viking Helmet', icon: '🪓' },
      { id: 'party', name: 'Party Hat', icon: '🥳' },
    ],
    outfit: [
      { id: 'explorer', name: 'Explorer', icon: '🧭', free: true, shirt: 0xf2f2f2, pants: 0x34405e, scarf: 0xffb020 },
      { id: 'ninja', name: 'Ninja', icon: '🥷', shirt: 0x1c1c26, pants: 0x14141c, scarf: 0xff2a3a },
      { id: 'royal', name: 'Royal', icon: '💜', shirt: 0x6a2a9a, pants: 0x2a1a4a, scarf: 0xffd84a },
      { id: 'astro', name: 'Astronaut', icon: '🚀', shirt: 0xf4f4f8, pants: 0xc8c8d4, scarf: 0xff7a1a },
      { id: 'pirate', name: 'Pirate', icon: '🏴‍☠️', shirt: 0xc8302a, pants: 0x2a1a14, scarf: 0x111111 },
      { id: 'jungle', name: 'Jungle', icon: '🌿', shirt: 0x4a8a3a, pants: 0x5a4a2a, scarf: 0x8adc3a },
      { id: 'ice', name: 'Ice', icon: '❄️', shirt: 0x8adfff, pants: 0x2a5a8a, scarf: 0xffffff },
    ],
    pet: [
      { id: 'none', name: 'No pet', icon: '▫️', free: true },
      { id: 'panda', name: 'Panda', icon: '🐼' },
      { id: 'corgi', name: 'Corgi', icon: '🐶' },
      { id: 'chick', name: 'Chick', icon: '🐥' },
      { id: 'cat', name: 'Cat', icon: '🐱' },
      { id: 'koala', name: 'Koala', icon: '🐨' },
      { id: 'raccoon', name: 'Raccoon', icon: '🦝' },
    ],
    back: [
      { id: 'backpack', name: 'Backpack', icon: '🎒', free: true },
      { id: 'none', name: 'Nothing', icon: '▫️', free: true },
      { id: 'cape', name: 'Hero Cape', icon: '🦸' },
      { id: 'jetpack', name: 'Jetpack', icon: '🔥' },
      { id: 'wings', name: 'Angel Wings', icon: '🪽' },
      { id: 'shield', name: 'Shield', icon: '🛡️' },
    ],
  };
  DR.COSMETIC_SLOTS = { pet: 'Pets', hat: 'Hats', outfit: 'Outfits', back: 'Back' };

  // Coin shop. Power-ups are used up automatically at the start of your next run.
  DR.SHOP = {
    shield: { name: 'Shield', icon: '🛡️', price: 150, desc: 'Survive one crash' },
    magnet: { name: 'Magnet', icon: '🧲', price: 100, desc: 'Pull in coins from every lane' },
  };
  DR.REVIVE_COST = [50, 100, 200];   // continuing after a crash; doubles every time in the same run
  DR.GHOST_TIME = { revive: 2.5, shield: 1.4 };

  // Time pads (Time Pressure): they change how fast time flows for everything,
  // so obstacle spacing stays exactly as fair as the solver planned it.
  DR.TIME_PADS = {
    fast: { scale: 1.45, duration: 2.6, pointsMult: 2 },
    slow: { scale: 0.6, duration: 2.6, pointsMult: 1 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
