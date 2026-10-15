/* Dimension switching: which world is active, the cooldown, and the visual mix value.
   The logical switch is instant (so it feels responsive); `mix` eases from 0 (Light)
   to 1 (Dark) for the visual transformation. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const U = DR.util;
  const C = DR.CONST;

  class Dimension {
    constructor(cooldown = 0) { this.reset(cooldown); }

    reset(cooldown = 0) {
      this.world = C.LIGHT;
      this.mix = 0;
      this.cooldown = cooldown;
      this.readyIn = 0;
      this.switches = 0;
    }

    get ready() { return this.readyIn <= 0; }
    /** 0..1 fill of the cooldown indicator (1 = ready). */
    get readiness() { return this.cooldown > 0 ? 1 - this.readyIn / this.cooldown : 1; }

    trySwitch() {
      if (!this.ready) return false;
      this.world = 1 - this.world;
      this.readyIn = this.cooldown;
      this.switches++;
      return true;
    }

    /** Rift gates flip the world without using the player's cooldown. */
    forceFlip() { this.world = 1 - this.world; }

    update(dt) {
      const wasReady = this.ready;
      this.readyIn = Math.max(0, this.readyIn - dt);
      this.mix = U.moveToward(this.mix, this.world, dt / C.SWITCH_FX_TIME);
      return !wasReady && this.ready;   // true on the frame the cooldown finishes
    }
  }

  DR.Dimension = Dimension;
})(typeof window !== 'undefined' ? window : globalThis);
