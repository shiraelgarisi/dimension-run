/* Scoring: distance points (worth more on later levels), coins, shards, completion bonus. */
(function (root) {
  'use strict';
  const DR = root.DR;

  const COIN_POINTS = 10;
  const SHARD_POINTS = 250;
  const COMPLETE_BONUS = 500;   // × level number
  const CHEST_POINTS = 300;

  class Scoring {
    constructor(level = 1) { this.reset(level); }

    reset(level = 1) {
      this.level = level;
      this.mult = 1 + 0.25 * (level - 1);
      this.distance = 0;
      this.coins = 0;
      this.shards = 0;
      this.bonus = 0;
      this.chests = 0;
    }

    addDistance(m) { this.distance += m; }
    coin() { this.coins++; }
    shard() { this.shards++; }
    chest() { this.chests++; }
    complete() { this.bonus = COMPLETE_BONUS * this.level; }

    get score() {
      return Math.floor(this.distance * this.mult) + this.coins * COIN_POINTS + this.shards * SHARD_POINTS + this.chests * CHEST_POINTS + this.bonus;
    }
  }

  Object.assign(Scoring, { COIN_POINTS, SHARD_POINTS, CHEST_POINTS, COMPLETE_BONUS });
  DR.Scoring = Scoring;
})(typeof window !== 'undefined' ? window : globalThis);
