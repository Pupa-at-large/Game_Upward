/**
 * 输入管理：键盘（WASD/方向）、空格蓄力、触控。
 * 提供方向向量与蓄力状态查询，逻辑层只读这里，不直接碰 DOM 事件。
 */
export interface MoveAxis {
  x: number; // -1 左 / +1 右
  z: number; // -1 前(远离相机) / +1 后(靠近相机)
}

export class Input {
  private keys = new Set<string>();

  // 蓄力状态
  private charging = false;
  private chargeStart = 0;
  private jumpReleasedThisFrame = false;
  private now = 0; // 由 update(dt) 推进的内部时钟（秒）

  // 触控
  private touchMove: MoveAxis = { x: 0, z: 0 };
  private touchCharging = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.setupTouch();
  }

  /** 每帧推进内部时钟，并清理一次性标志。注意：必须在逻辑读取之后调用 endFrame。 */
  update(dt: number) {
    this.now += dt;
  }

  endFrame() {
    this.jumpReleasedThisFrame = false;
  }

  get moveAxis(): MoveAxis {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    x += this.touchMove.x;
    z += this.touchMove.z;
    // 归一化避免斜向超速
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  get isCharging(): boolean {
    return this.charging;
  }

  /** 当前蓄力已持续秒数（未蓄力为 0）。 */
  get chargeTime(): number {
    return this.charging ? this.now - this.chargeStart : 0;
  }

  /** 本帧是否松开了跳跃键（消费一次性）。 */
  consumeJumpRelease(): boolean {
    if (this.jumpReleasedThisFrame) {
      this.jumpReleasedThisFrame = false;
      return true;
    }
    return false;
  }

  private beginCharge() {
    if (!this.charging) {
      this.charging = true;
      this.chargeStart = this.now;
    }
  }

  private endCharge() {
    if (this.charging) {
      this.charging = false;
      this.jumpReleasedThisFrame = true;
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
    if (e.code === 'Space') {
      this.endCharge();
    }
  };

  private setupTouch() {
    // 左半屏：虚拟摇杆方向；右半屏：按住蓄力，松开起跳。
    let joyStartX = 0;
    let joyStartY = 0;
    let joyId = -1;

    const onStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth / 2) {
          joyId = t.identifier;
          joyStartX = t.clientX;
          joyStartY = t.clientY;
        } else {
          this.touchCharging = true;
          this.beginCharge();
        }
      }
    };
    const onMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) {
          const dx = (t.clientX - joyStartX) / 60;
          const dy = (t.clientY - joyStartY) / 60;
          this.touchMove.x = Math.max(-1, Math.min(1, dx));
          this.touchMove.z = Math.max(-1, Math.min(1, dy));
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) {
          joyId = -1;
          this.touchMove.x = 0;
          this.touchMove.z = 0;
        } else if (t.clientX >= window.innerWidth / 2 && this.touchCharging) {
          this.touchCharging = false;
          this.endCharge();
        }
      }
    };

    window.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }
}
