/* Player movement: lanes, jumping, sliding. Pure state + physics (no rendering). */
(function (root) {
  'use strict';
  const DR = root.DR;
  const U = DR.util;
  const C = DR.CONST;

  class Player {
    constructor() { this.reset(); }

    reset() {
      this.d = 0;            // distance travelled along the track (m)
      this.lane = 0;         // target lane: -1, 0, 1
      this.fromLane = 0;     // lane we came from (for side-bounce)
      this.lat = 0;          // actual sideways position (m)
      this.prevLat = 0;
      this.y = 0;            // feet height
      this.vy = 0;
      this.slideT = 0;
      this.slideQueued = false;
      this.jumpBuf = 0;
      this.falling = false;  // fell into a gap: no more ground
    }

    get grounded() { return this.y <= 0 && this.vy <= 0 && !this.falling; }
    get sliding() { return this.slideT > 0 && this.grounded; }
    get laneOfLat() { return U.clamp(Math.round(this.lat / C.LANE_W), -1, 1); }

    move(dir) {
      const nl = U.clamp(this.lane + dir, -1, 1);
      if (nl === this.lane) return false;
      this.fromLane = this.lane;
      this.lane = nl;
      return true;
    }

    jump() {
      if (this.grounded) {
        this.vy = C.JUMP_V;
        this.slideT = 0;           // jumping cancels a slide
        this.slideQueued = false;
        return true;
      }
      this.jumpBuf = C.JUMP_BUFFER;
      return false;
    }

    slide() {
      if (this.grounded) {
        const started = this.slideT <= 0;
        this.slideT = C.SLIDE_TIME;
        return started;
      }
      this.vy = Math.min(this.vy, C.SLAM_V);  // slam down, slide on landing
      this.slideQueued = true;
      this.jumpBuf = 0;
      return false;
    }

    /** Advance physics; returns a list of event names ('jump', 'slide', 'land'). */
    update(dt, speed) {
      const ev = [];
      this.d += speed * dt;
      this.prevLat = this.lat;
      this.lat = U.moveToward(this.lat, this.lane * C.LANE_W, C.LAT_SPEED * dt);

      if (this.falling) {
        this.vy -= C.GRAVITY * dt;
        this.y += this.vy * dt;
        return ev;
      }
      if (this.y > 0 || this.vy > 0) {
        this.vy -= C.GRAVITY * dt;
        this.y += this.vy * dt;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          ev.push('land');
          if (this.slideQueued) { this.slideQueued = false; this.slideT = C.SLIDE_TIME; ev.push('slide'); }
          else if (this.jumpBuf > 0) { this.jumpBuf = 0; this.vy = C.JUMP_V; ev.push('jump'); }
        }
      }
      this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      if (this.grounded) this.slideT = Math.max(0, this.slideT - dt);
      return ev;
    }
  }

  DR.Player = Player;
})(typeof window !== 'undefined' ? window : globalThis);
