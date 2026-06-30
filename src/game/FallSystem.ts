import { CONST } from '../config/constants';
import type { SegmentDef } from '../data/types';
import { Player } from './Player';
import { World } from './World';

/**
 * 坠落与区段重置 —— 惩罚模型核心（2D）。
 *  - 软惩罚：在已到达的最高区段内坠落 → 传回该段缓冲台。
 *  - 硬惩罚：掉出该区段下边界 → 传回该段起点。
 * 无传统存档点；进度仅用于 UI / 解锁。
 */
export class FallSystem {
  private reached = 0;
  private segs: SegmentDef[];

  constructor(world: World, private player: Player) {
    this.segs = world.segments;
  }

  get reachedIndex() {
    return this.reached;
  }

  private indexAt(y: number): number {
    for (let i = this.segs.length - 1; i >= 0; i--) {
      if (y >= this.segs[i].startY) return i;
    }
    return 0;
  }

  /** @returns 是否触发了重置（供 HUD 泛红）。 */
  update(): boolean {
    const y = this.player.y;
    const cur = this.indexAt(y);
    if (this.player.isGrounded && cur > this.reached) this.reached = cur;

    const seg = this.segs[this.reached];

    if (y < seg.startY - CONST.FALL_RESET_MARGIN) {
      this.reset(seg.startY);
      return true;
    }
    if (y < seg.bufferPlatformY - CONST.FALL_RESET_MARGIN) {
      this.reset(seg.bufferPlatformY);
      return true;
    }
    return false;
  }

  private reset(y: number) {
    const seg = this.segs[this.reached];
    const p0 = seg.platforms[0];
    const x = p0 ? p0.pos[0] : 0;
    this.player.teleport(x, y + 1.5);
  }
}
