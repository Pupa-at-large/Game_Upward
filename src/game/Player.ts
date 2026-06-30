import { TUNING } from '../config/tuning';
import { CONST } from '../config/constants';
import { Input } from '../core/Input';
import { Platform, World } from './World';

type State = 'ground' | 'air' | 'grab';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 2D 玩家：解析运动学 + AABB 碰撞。核心是蓄力跳手感，全部数值来自 tuning.ts。
 *  - 蓄力跳：按住空格蓄力，松开按时长决定跳高/跳远；瞄准方向由左右键决定。禁二段跳。
 *  - 空中控制极弱（airControl）：蓄力定生死，是核心难度来源。
 *  - 冲量保留：落地保留部分水平速度，连跳累积。
 *  - 抓握：下落贴边可抓住悬挂，按跳翻上。
 *  - 被移动平台带动；踩到 bouncer 弹起；进入 wind 区受推力；踩 fading 触发渐隐。
 */
export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  readonly w = TUNING.playerW;
  readonly h = TUNING.playerH;

  state: State = 'air';
  facing = 1; // 朝向，蓄力起跳的水平方向参考
  squat = 0; // 0-1 蓄力下蹲视觉量

  private grounded = false;
  private timeSinceGround = 999;
  private support: Platform | null = null;
  private grabTimer = 0;
  private grabReleaseLock = 0;
  private grabPlatform: Platform | null = null;
  private grabSide = 1; // 抓的是平台左(-1)还是右(+1)边

  constructor(private input: Input, private world: World) {
    this.x = world.spawn.x;
    this.y = world.spawn.y;
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y + this.h / 2; }
  get bottom() { return this.y - this.h / 2; }
  get isGrounded() { return this.grounded; }

  get chargeRatio(): number {
    if (!this.input.isCharging || !(this.state === 'ground' || this.state === 'grab')) return 0;
    const t = clamp(this.input.chargeTime, TUNING.jumpChargeMin, TUNING.jumpChargeMax);
    return (t - TUNING.jumpChargeMin) / (TUNING.jumpChargeMax - TUNING.jumpChargeMin);
  }

  /** 蓄力中的预测起跳速度（供渲染弹道预览）；未蓄力返回 null。 */
  get aimPreview(): { vx: number; vy: number } | null {
    const r = this.chargeRatio;
    if (r <= 0) return null;
    const vy = lerp(TUNING.jumpVyMin, TUNING.jumpVyMax, r);
    const vxm = lerp(TUNING.jumpVxMin, TUNING.jumpVxMax, r);
    const dir = this.input.moveX !== 0 ? Math.sign(this.input.moveX) : 0;
    return { vx: dir * vxm, vy };
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
  }

  update(dt: number) {
    dt = Math.min(dt, CONST.PHYSICS_MAX_DELTA);

    if (this.grabReleaseLock > 0) this.grabReleaseLock -= dt;

    if (this.state === 'grab') {
      this.updateGrab(dt);
      return;
    }

    // 被脚下移动平台带动
    if (this.grounded && this.support && this.support.solid) {
      this.x += this.support.dx;
      this.y += this.support.dy;
    }

    const charging = this.input.isCharging && this.grounded;
    const mx = this.input.moveX;
    if (mx !== 0) this.facing = mx;
    this.squat = charging ? this.chargeRatio : 0;

    // 水平控制
    if (charging) {
      this.vx *= 0.75; // 蓄力是瞄准时刻，收住水平速度
    } else if (this.grounded) {
      const target = mx * TUNING.moveSpeed;
      if (mx !== 0) this.vx = lerp(this.vx, target, TUNING.groundAccel);
      else this.vx *= 1 - TUNING.groundFriction;
    } else {
      // 空中：极弱微调
      this.vx = lerp(this.vx, mx * TUNING.moveSpeed, TUNING.airControl);
    }

    // 重力
    this.vy -= TUNING.gravity * dt;
    if (this.vy < -TUNING.terminalVy) this.vy = -TUNING.terminalVy;

    // 起跳（地面 / 土狼时间内）
    const released = this.input.consumeJumpRelease();
    const canJump = this.grounded || this.timeSinceGround < CONST.COYOTE;
    if (released !== null && canJump) {
      this.jump(released);
    }

    // 风区推力
    this.applyWind(dt);

    // 积分 + 碰撞
    this.integrateAndCollide(dt);

    // 抓握检测（下落中）
    if (!this.grounded && this.vy < 0 && this.grabReleaseLock <= 0) this.tryGrab();

    if (this.grounded) this.timeSinceGround = 0;
    else this.timeSinceGround += dt;

    this.state = this.grounded ? 'ground' : 'air';
  }

  private jump(charge: number) {
    const t = clamp(charge, TUNING.jumpChargeMin, TUNING.jumpChargeMax);
    const r = (t - TUNING.jumpChargeMin) / (TUNING.jumpChargeMax - TUNING.jumpChargeMin);
    const vy = lerp(TUNING.jumpVyMin, TUNING.jumpVyMax, r);
    const vx = lerp(TUNING.jumpVxMin, TUNING.jumpVxMax, r);
    this.vy = vy;
    // 水平：朝瞄准方向；若无输入则原地竖跳（保留少量已有动量）
    const dir = this.input.moveX !== 0 ? Math.sign(this.input.moveX) : 0;
    this.vx = dir * vx + (dir === 0 ? this.vx * 0.3 : 0);
    this.grounded = false;
    this.support = null;
    this.timeSinceGround = 999;
  }

  private applyWind(dt: number) {
    for (const p of this.world.platforms) {
      if (p.type !== 'wind') continue;
      if (this.aabb(p)) {
        this.vx += p.windDir[0] * p.windStrength * dt;
        this.vy += p.windDir[1] * p.windStrength * dt;
      }
    }
  }

  private integrateAndCollide(dt: number) {
    // 水平
    this.x += this.vx * dt;
    for (const p of this.collidables()) {
      if (this.aabb(p)) {
        if (this.vx > 0) this.x = p.left - this.w / 2;
        else if (this.vx < 0) this.x = p.right + this.w / 2;
        this.vx = 0;
      }
    }

    // 垂直
    this.y += this.vy * dt;
    let landed = false;
    let support: Platform | null = null;
    for (const p of this.collidables()) {
      if (!this.aabb(p)) continue;
      if (this.vy <= 0) {
        // 落到顶面
        this.y = p.top + this.h / 2;
        if (p.type === 'bouncer' && this.vy < -1) {
          this.vy = p.bounceForce; // 弹起
        } else {
          this.vy = 0;
          landed = true;
          support = p;
          p.touch(); // fading 触发渐隐
        }
      } else {
        // 头顶撞底
        this.y = p.bottom - this.h / 2;
        this.vy = 0;
      }
    }
    this.grounded = landed;
    this.support = support;
  }

  // ── 抓握 ────────────────────────────────────────
  private tryGrab() {
    if (this.timeSinceGround > TUNING.grabWindow) return;
    for (const p of this.collidables()) {
      // 顶面需在玩家身体高度带内
      if (p.top < this.bottom || p.top > this.top + TUNING.grabReach) continue;
      // 贴近左边缘（从左侧上抓）
      if (this.right >= p.left - TUNING.grabReach && this.right <= p.left + 0.2 &&
          this.facing >= 0) {
        this.enterGrab(p, -1);
        return;
      }
      // 贴近右边缘
      if (this.left <= p.right + TUNING.grabReach && this.left >= p.right - 0.2 &&
          this.facing <= 0) {
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
    // 悬挂在边缘下方
    this.y = p.top - this.h / 2;
    this.x = side < 0 ? p.left - this.w / 2 : p.right + this.w / 2;
  }

  private updateGrab(dt: number) {
    this.grabTimer -= dt;
    const p = this.grabPlatform;
    if (p && p.solid) {
      // 跟随平台（若在动）
      this.x += p.dx;
      this.y += p.dy;
    }
    // 翻上：按跳
    if (this.input.consumeJumpRelease() !== null) {
      this.vy = TUNING.grabPullUpVy;
      this.vx = -this.grabSide * TUNING.jumpVxMin; // 朝平台内侧
      this.exitGrab();
      return;
    }
    // 超时 / 平台消失 → 松手下落
    if (this.grabTimer <= 0 || !p || !p.solid) {
      this.exitGrab();
    }
  }

  private exitGrab() {
    this.state = 'air';
    this.grabPlatform = null;
    this.grounded = false;
    this.grabReleaseLock = 0.3;
    this.timeSinceGround = 999;
  }

  // ── 工具 ────────────────────────────────────────
  private *collidables() {
    for (const p of this.world.platforms) {
      if (p.type === 'wind') continue; // 风区不实心
      if (p.solid) yield p;
    }
  }

  private aabb(p: Platform): boolean {
    return (
      this.left < p.right &&
      this.right > p.left &&
      this.bottom < p.top &&
      this.top > p.bottom
    );
  }
}
