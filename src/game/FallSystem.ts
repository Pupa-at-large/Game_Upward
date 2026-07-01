import { CONST } from '../config/constants';
import type { SegmentDef } from '../data/types';
import { Player } from './Player';
import { World } from './World';

/**
 * 柔性下沉（放下的惩罚模型）。没够到 → 沉回上一歇脚 + 略加重 + 断连击，绝不硬重开。
 * 仍追踪玩家到达的最高区段，供进度 / HUD 显示。
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

  /** @returns 是否触发了下沉（供 HUD 反馈）。 */
  update(): boolean {
    const y = this.player.y;
    const cur = this.indexAt(y);
    if (this.player.isGrounded && cur > this.reached) this.reached = cur;

    // 明显跌落到上一歇脚之下 → 柔性下沉
    if (!this.player.isGrounded && y < this.player.restY - CONST.FALL_RESET_MARGIN) {
      this.player.sink();
      return true;
    }
    return false;
  }
}
