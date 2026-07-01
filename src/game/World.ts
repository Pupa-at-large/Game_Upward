import { CONST } from '../config/constants';
import type { MapDef, PlatformDef, PlatformType } from '../data/types';

/**
 * 平台（2D，AABB）。x/y 为中心，w/h 为全宽高（米）。
 * moving 平台每帧记录位移 dx/dy，供玩家站立时被带动。
 */
export class Platform {
  type: PlatformType;
  x: number;
  y: number;
  w: number;
  h: number;

  // 本帧位移（rider carry）
  dx = 0;
  dy = 0;

  // moving
  private axis: 'x' | 'y';
  private range: number;
  private speed: number;
  private ox: number;
  private oy: number;

  // fading
  fadeDelay: number;
  respawnTime: number;
  state: 'solid' | 'fading' | 'gone' = 'solid';
  private fadeTimer = 0;
  alpha = 1;

  // bouncer / wind
  bounceForce: number;
  windDir: [number, number];
  windStrength: number;

  // gear（绕中心公转的平台）
  private radius: number;
  private rotSpeed: number;
  angle = 0;

  constructor(def: PlatformDef) {
    this.type = def.type;
    this.x = def.pos[0];
    this.y = def.pos[1];
    this.w = def.size[0];
    this.h = def.size[1];
    this.ox = this.x;
    this.oy = this.y;
    this.axis = def.axis ?? 'x';
    this.range = def.range ?? 4;
    this.speed = def.speed ?? 1;
    this.fadeDelay = def.fadeDelay ?? 0.4;
    this.respawnTime = def.respawnTime ?? 2.5;
    this.bounceForce = def.bounceForce ?? 20;
    this.windDir = def.direction ?? [1, 0];
    this.windStrength = def.strength ?? 8;
    this.radius = def.radius ?? 3;
    this.rotSpeed = def.rotSpeed ?? 1;
  }

  /** gear/wind 母题的中心（原始位置），供渲染画齿盘/风场。 */
  get centerX() { return this.ox; }
  get centerY() { return this.oy; }
  get orbitRadius() { return this.radius; }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y + this.h / 2; }
  get bottom() { return this.y - this.h / 2; }
  /** 当前是否可碰撞（消失态不可踩）。 */
  get solid() { return this.state !== 'gone'; }

  /** 玩家踩上 fading / 正念踏石时调用，触发渐隐倒计时。 */
  touch() {
    if (this.type === 'fading' && this.state === 'solid') {
      this.state = 'fading';
      this.fadeTimer = this.fadeDelay;
    }
  }

  /** 正念踏石：正心落点让它稳住不再消隐（撤销本次渐隐）。 */
  reassure() {
    if (this.type === 'fading' && this.state === 'fading') {
      this.state = 'solid';
      this.alpha = 1;
    }
  }

  update(dt: number, t: number) {
    if (this.type === 'moving') {
      const px = this.x;
      const py = this.y;
      const offset = Math.sin(t * this.speed) * (this.range / 2);
      if (this.axis === 'x') this.x = this.ox + offset;
      else this.y = this.oy + offset;
      this.dx = this.x - px;
      this.dy = this.y - py;
    } else if (this.type === 'gear') {
      // 绕中心公转：站在齿上的玩家被 dx/dy 带着转
      const px = this.x;
      const py = this.y;
      this.angle = t * this.rotSpeed;
      this.x = this.ox + Math.cos(this.angle) * this.radius;
      this.y = this.oy + Math.sin(this.angle) * this.radius;
      this.dx = this.x - px;
      this.dy = this.y - py;
    } else {
      this.dx = 0;
      this.dy = 0;
    }

    if (this.type === 'fading') {
      if (this.state === 'fading') {
        this.fadeTimer -= dt;
        this.alpha = Math.max(0.15, this.fadeTimer / this.fadeDelay);
        if (this.fadeTimer <= 0) {
          this.state = 'gone';
          this.alpha = 0;
          this.fadeTimer = this.respawnTime;
        }
      } else if (this.state === 'gone') {
        this.fadeTimer -= dt;
        if (this.fadeTimer <= 0) {
          this.state = 'solid';
          this.alpha = 1;
        }
      }
    }
  }
}

export interface StarCore {
  x: number;
  y: number;
  collected: boolean;
}

/**
 * 世界：加载地图，持有全部平台、星核、区段元数据。
 */
export class World {
  readonly def: MapDef;
  readonly platforms: Platform[] = [];
  readonly stars: StarCore[] = [];

  constructor(def: MapDef) {
    this.def = def;
    for (const seg of def.segments) {
      for (const p of seg.platforms) this.platforms.push(new Platform(p));
    }
    for (const s of def.starCores) {
      this.stars.push({ x: s.pos[0], y: s.pos[1], collected: false });
    }
  }

  get summitY() { return this.def.summitY; }
  get segments() { return this.def.segments; }

  /** 最高平台的顶面高度（登顶判定用，与 summitY 显示值解耦）。 */
  get topPlatformY(): number {
    let top = 0;
    for (const seg of this.def.segments) {
      for (const p of seg.platforms) top = Math.max(top, p.pos[1] + p.size[1] / 2);
    }
    return top;
  }

  /** 出生点：第一块平台顶面正上方。 */
  get spawn(): { x: number; y: number } {
    const p = this.platforms[0];
    return { x: p.x, y: p.top + 0.6 };
  }

  update(dt: number, t: number) {
    for (const p of this.platforms) p.update(Math.min(dt, CONST.PHYSICS_MAX_DELTA), t);
  }
}
