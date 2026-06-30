import { Platform } from '../Platform';
import { Physics } from '../../core/Physics';
import type { PlatformDef } from '../../data/types';

/**
 * 往复移动平台。沿 axis 在 ±range/2 间正弦往复。
 * 用 KINEMATIC body：通过设置 velocity 让站在上面的玩家被正确带动。
 */
export class MovingPlatform extends Platform {
  private readonly axis: 'x' | 'y' | 'z';
  private readonly range: number;
  private readonly speed: number;

  constructor(def: PlatformDef, physics: Physics) {
    super(def, physics, 0xa9b8c9);
    this.axis = def.axis ?? 'x';
    this.range = def.range ?? 4;
    this.speed = def.speed ?? 1;
  }

  override update(_dt: number, t: number): void {
    // 仅设定解析速度，由物理引擎整合出位置（KINEMATIC body）。
    // 这样站在台上的玩家会被接触解算正确带动；位置不手写，避免与 step 双重积分。
    // 解析速度 = d/dt[ (range/2)·sin(t·speed) ] = (range/2)·speed·cos(t·speed)
    const vel = Math.cos(t * this.speed) * this.speed * (this.range / 2);
    this.body.velocity.set(0, 0, 0);
    this.body.velocity[this.axis] = vel;
  }
}
