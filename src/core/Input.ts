/**
 * 输入管理（2D）：水平方向（A/D、←/→）+ 空格蓄力 + 触控。
 * 逻辑层只读这里，不直接碰 DOM 事件。
 */
export class Input {
  private keys = new Set<string>();

  private charging = false;
  private chargeStart = 0;
  private jumpReleased = false;
  private releasedCharge = 0; // 松开瞬间锁存的蓄力时长（秒）
  private now = 0;

  // 触控
  private touchDir = 0; // -1 / 0 / +1
  private touchCharging = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.setupTouch();
  }

  update(dt: number) {
    this.now += dt;
  }

  endFrame() {
    this.jumpReleased = false;
  }

  /** 水平方向 -1 / 0 / +1。 */
  get moveX(): number {
    let x = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    x += this.touchDir;
    return Math.max(-1, Math.min(1, x));
  }

  get isCharging(): boolean {
    return this.charging;
  }

  get chargeTime(): number {
    return this.charging ? this.now - this.chargeStart : 0;
  }

  /**
   * 若本帧松开了跳跃键，返回松开瞬间锁存的蓄力时长（秒）；否则返回 null。
   * 必须用这个返回值计算跳跃力——松开后 charging 已置否，chargeTime 会归零。
   */
  consumeJumpRelease(): number | null {
    if (this.jumpReleased) {
      this.jumpReleased = false;
      return this.releasedCharge;
    }
    return null;
  }

  private beginCharge() {
    if (!this.charging) {
      this.charging = true;
      this.chargeStart = this.now;
    }
  }

  private endCharge() {
    if (this.charging) {
      this.releasedCharge = this.now - this.chargeStart;
      this.charging = false;
      this.jumpReleased = true;
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      this.beginCharge();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === 'Space') this.endCharge();
  };

  private setupTouch() {
    // 左半屏点按：左移；右半屏按住：蓄力，松开起跳。瞄准方向用左半屏左右点。
    const onStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth / 2) {
          this.touchDir = t.clientX < window.innerWidth / 4 ? -1 : 1;
        } else {
          this.touchCharging = true;
          this.beginCharge();
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth / 2) {
          this.touchDir = 0;
        } else if (this.touchCharging) {
          this.touchCharging = false;
          this.endCharge();
        }
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }
}
