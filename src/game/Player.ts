import { TUNING } from '../config/tuning';
import { CONST } from '../config/constants';
import { Input } from '../core/Input';
import { Platform, World } from './World';

type State = 'ground' | 'air' | 'grab';

export interface Burst {
  x: number;
  y: number;
  age: number;
  life: number;
  strong: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 禅跳玩家（放下 · 越轻越高）。
 *  - 蓄力精准跳：瞄准在松手前定死，弧线即承诺；空中控制极弱。
 *  - 轻盈度 w：正心落点（正中甜区）卸下负累 → 变轻 → 有效重力更小 → 跳得更高更飘。
 *  - 柔性下沉：没够到 → 沉回上一歇脚 + 略加重，绝不硬重开。
 * 数值来自 tuning.ts。
 */
export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  readonly w = TUNING.playerW;
  readonly h = TUNING.playerH;

  state: State = 'air';
  facing = 1;
  squat = 0;

  // 放下 · 轻盈
  weight = TUNING.weightStart;
  combo = 0;
  burdensShed = 0;

  // 反馈事件（由 Session 挂接）
  onPerfect: ((combo: number) => void) | null = null;
  onShed: ((index: number) => void) | null = null;
  onSink: (() => void) | null = null;

  // 视觉
  bursts: Burst[] = [];
  trail: { x: number; y: number }[] = [];

  private grounded = false;
  private wasGrounded = false;
  private timeSinceGround = 999;
  private support: Platform | null = null;
  private landedPlatform: Platform | null = null;
  private airborneFromJump = false; // 只有真正起跳后的落地才计分
  private lastRestX: number;
  private lastRestY: number;

  private grabTimer = 0;
  private grabReleaseLock = 0;
  private grabPlatform: Platform | null = null;
  private grabSide = 1;

  constructor(private input: Input, private world: World) {
    this.x = world.spawn.x;
    this.y = world.spawn.y;
    this.lastRestX = this.x;
    this.lastRestY = this.y;
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y + this.h / 2; }
  get bottom() { return this.y - this.h / 2; }
  get isGrounded() { return this.grounded; }
  /** 上一处稳定歇脚的顶面高度（柔性下沉目标）。 */
  get restY() { return this.lastRestY; }
  /** 轻盈度 0(重)→1(轻)，供渲染辉光/拖尾。 */
  get lightness() { return 1 - this.weight; }
  /** 剩余负累件数。 */
  get burdens() { return TUNING.burdenCount - this.burdensShed; }
  /** 当前有效重力（越轻越小）。 */
  get gEff() { return TUNING.gravity * (TUNING.gravLo + TUNING.gravHi * this.weight); }

  get chargeRatio(): number {
    if (!this.input.isCharging || !(this.state === 'ground' || this.state === 'grab')) return 0;
    const t = clamp(this.input.chargeTime, TUNING.jumpChargeMin, TUNING.jumpChargeMax);
    return (t - TUNING.jumpChargeMin) / (TUNING.jumpChargeMax - TUNING.jumpChargeMin);
  }

  /** 蓄力预测起跳速度 + 有效重力（供弹道预览，弧线即承诺）。 */
  get aimPreview(): { vx: number; vy: number; g: number } | null {
    const r = this.chargeRatio;
    if (r <= 0) return null;
    const vy = lerp(TUNING.jumpVyMin, TUNING.jumpVyMax, r);
    const vxm = lerp(TUNING.jumpVxMin, TUNING.jumpVxMax, r);
    const dir = this.input.moveX !== 0 ? Math.sign(this.input.moveX) : 0;
    return { vx: dir * vxm, vy, g: this.gEff };
  }

  teleport(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = 'air';
    this.support = null;
    this.grabPlatform = null;
    this.grabReleaseLock = 0.25;
    this.airborneFromJump = false;
  }

  /** 柔性下沉：沉回上一歇脚，加重、断连击。 */
  sink() {
    this.teleport(this.lastRestX, this.lastRestY + 1.2);
    this.weight = clamp(this.weight + TUNING.sinkWeightPenalty, 0, 1);
    this.combo = 0;
    this.syncBurdens();
    this.onSink?.();
  }

  update(dt: number) {
    dt = Math.min(dt, CONST.PHYSICS_MAX_DELTA);
    if (this.grabReleaseLock > 0) this.grabReleaseLock -= dt;

    this.ageEffects(dt);

    if (this.state === 'grab') {
      this.updateGrab(dt);
      this.pushTrail();
      return;
    }

    if (this.grounded && this.support && this.support.solid) {
      this.x += this.support.dx;
      this.y += this.support.dy;
    }

    const charging = this.input.isCharging && this.grounded;
    const mx = this.input.moveX;
    if (mx !== 0) this.facing = mx;
    this.squat = charging ? this.chargeRatio : 0;

    if (charging) {
      this.vx *= 0.75;
    } else if (this.grounded) {
      const target = mx * TUNING.moveSpeed;
      if (mx !== 0) this.vx = lerp(this.vx, target, TUNING.groundAccel);
      else this.vx *= 1 - TUNING.groundFriction;
    } else {
      this.vx = lerp(this.vx, mx * TUNING.moveSpeed, TUNING.airControl);
    }

    // 有效重力（越轻越小）；轻且接近弧顶时额外衰减 → 悬停感
    let g = this.gEff;
    if (this.weight < TUNING.floatWeightBelow && Math.abs(this.vy) < 2) {
      g *= TUNING.floatFactor;
    }
    this.vy -= g * dt;
    const term = TUNING.terminalVy * (0.5 + 0.5 * this.weight);
    if (this.vy < -term) this.vy = -term;

    const released = this.input.consumeJumpRelease();
    const canJump = this.grounded || this.timeSinceGround < CONST.COYOTE;
    if (released !== null && canJump) this.jump(released);

    this.applyWind(dt);
    this.integrateAndCollide(dt);
    this.handleLanding();

    if (!this.grounded && this.vy < 0 && this.grabReleaseLock <= 0) this.tryGrab();

    if (this.grounded) this.timeSinceGround = 0;
    else this.timeSinceGround += dt;
    this.state = this.grounded ? 'ground' : 'air';

    this.pushTrail();
  }

  private jump(charge: number) {
    const t = clamp(charge, TUNING.jumpChargeMin, TUNING.jumpChargeMax);
    const r = (t - TUNING.jumpChargeMin) / (TUNING.jumpChargeMax - TUNING.jumpChargeMin);
    this.vy = lerp(TUNING.jumpVyMin, TUNING.jumpVyMax, r);
    const vx = lerp(TUNING.jumpVxMin, TUNING.jumpVxMax, r);
    const dir = this.input.moveX !== 0 ? Math.sign(this.input.moveX) : 0;
    this.vx = dir * vx + (dir === 0 ? this.vx * 0.3 : 0);
    this.grounded = false;
    this.support = null;
    this.timeSinceGround = 999;
    this.airborneFromJump = true;
  }

  // ── 落点分级（正心 / 稳）───────────────────────
  private handleLanding() {
    if (this.grounded && !this.wasGrounded && this.landedPlatform) {
      const p = this.landedPlatform;
      this.lastRestX = clamp(this.x, p.left + 0.2, p.right - 0.2);
      this.lastRestY = p.top;

      if (!this.airborneFromJump) {
        // 出生/下沉后的落地，不计分
        this.wasGrounded = this.grounded;
        return;
      }
      this.airborneFromJump = false;
      p.touch(); // 正念踏石：踩上触发消隐（正心则稳住，见下）

      const off = Math.abs(this.x - p.x) / (p.w / 2);
      if (off <= TUNING.sweetSpot) {
        // 正心：卸负累、变轻、连击、光爆、稳住正念踏石
        this.combo++;
        this.weight = clamp(this.weight - TUNING.shedPerPerfect, TUNING.weightMin, 1);
        p.reassure(); // 正心落点让正念踏石多停留
        this.spawnBurst(this.x, p.top, true);
        this.onPerfect?.(this.combo);
        this.syncBurdens();
      } else {
        // 稳：连击保持，不减重
        this.spawnBurst(this.x, p.top, false);
      }
    }
    this.wasGrounded = this.grounded;
  }

  private syncBurdens() {
    // 负累件数随轻盈度递减：w 从 start→min 对应 剩余 burdenCount→0
    const span = TUNING.weightStart - TUNING.weightMin;
    const frac = clamp((this.weight - TUNING.weightMin) / span, 0, 1);
    const target = Math.round(frac * TUNING.burdenCount);
    const shedTarget = TUNING.burdenCount - target;
    while (this.burdensShed < shedTarget) {
      this.onShed?.(this.burdensShed);
      this.burdensShed++;
    }
    if (shedTarget < this.burdensShed) this.burdensShed = shedTarget; // 下沉加重时可回涨
  }

  // ── 风 / 上升气流（轻则被托起）──────────────────
  private applyWind(dt: number) {
    for (const p of this.world.platforms) {
      if (p.type !== 'wind') continue;
      if (!this.aabb(p)) continue;
      const up = p.windDir[1] > 0 ? this.lightness : 1; // 上升气流仅在轻时生效
      this.vx += p.windDir[0] * p.windStrength * dt;
      this.vy += p.windDir[1] * p.windStrength * up * dt;
    }
  }

  private integrateAndCollide(dt: number) {
    this.x += this.vx * dt;
    for (const p of this.collidables()) {
      if (this.aabb(p)) {
        if (this.vx > 0) this.x = p.left - this.w / 2;
        else if (this.vx < 0) this.x = p.right + this.w / 2;
        this.vx = 0;
      }
    }

    this.y += this.vy * dt;
    let landed = false;
    let support: Platform | null = null;
    for (const p of this.collidables()) {
      if (!this.aabb(p)) continue;
      if (this.vy <= 0) {
        this.y = p.top + this.h / 2;
        if (p.type === 'bouncer' && this.vy < -1) {
          this.vy = p.bounceForce;
        } else {
          this.vy = 0;
          landed = true;
          support = p;
        }
      } else {
        this.y = p.bottom - this.h / 2;
        this.vy = 0;
      }
    }
    this.grounded = landed;
    this.support = support;
    this.landedPlatform = support;
  }

  // ── 抓握（保留）─────────────────────────────────
  private tryGrab() {
    if (this.timeSinceGround > TUNING.grabWindow) return;
    for (const p of this.collidables()) {
      if (p.top < this.bottom || p.top > this.top + TUNING.grabReach) continue;
      if (this.right >= p.left - TUNING.grabReach && this.right <= p.left + 0.2 && this.facing >= 0) {
        this.enterGrab(p, -1);
        return;
      }
      if (this.left <= p.right + TUNING.grabReach && this.left >= p.right - 0.2 && this.facing <= 0) {
        this.enterGrab(p, 1);
        return;
      }
    }
  }

  private enterGrab(p: Platform, side: number) {
    this.state = 'grab';
    this.grabPlatform = p;
    this.grabSide = side;
    this.grabTimer = TUNING.grabHangDuration;
    this.vx = 0;
    this.vy = 0;
    this.y = p.top - this.h / 2;
    this.x = side < 0 ? p.left - this.w / 2 : p.right + this.w / 2;
  }

  private updateGrab(dt: number) {
    this.grabTimer -= dt;
    const p = this.grabPlatform;
    if (p && p.solid) {
      this.x += p.dx;
      this.y += p.dy;
    }
    if (this.input.consumeJumpRelease() !== null) {
      this.vy = TUNING.grabPullUpVy;
      this.vx = -this.grabSide * TUNING.jumpVxMin;
      this.exitGrab();
      return;
    }
    if (this.grabTimer <= 0 || !p || !p.solid) this.exitGrab();
  }

  private exitGrab() {
    this.state = 'air';
    this.grabPlatform = null;
    this.grounded = false;
    this.grabReleaseLock = 0.3;
    this.timeSinceGround = 999;
  }

  // ── 视觉效果 ────────────────────────────────────
  private spawnBurst(x: number, y: number, strong: boolean) {
    this.bursts.push({ x, y, age: 0, life: strong ? 0.7 : 0.4, strong });
  }
  private ageEffects(dt: number) {
    for (const b of this.bursts) b.age += dt;
    this.bursts = this.bursts.filter((b) => b.age < b.life);
  }
  private pushTrail() {
    this.trail.push({ x: this.x, y: this.y });
    const max = 14;
    if (this.trail.length > max) this.trail.splice(0, this.trail.length - max);
  }

  // ── 工具 ────────────────────────────────────────
  private *collidables() {
    for (const p of this.world.platforms) {
      if (p.type === 'wind') continue;
      if (p.solid) yield p;
    }
  }

  private aabb(p: Platform): boolean {
    return this.left < p.right && this.right > p.left && this.bottom < p.top && this.top > p.bottom;
  }
}
