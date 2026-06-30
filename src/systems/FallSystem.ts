import * as THREE from 'three';
import { Segment } from '../world/Segment';
import { PlayerController } from '../player/PlayerController';
import { CONST } from '../config/constants';

/**
 * 坠落与区段重置 —— 惩罚模型核心。
 *
 * 记录玩家"已稳定站立"的最高区段 reachedSeg。坠落时：
 *  - 情况 A（软惩罚）：仍在 reachedSeg 范围内 → 传送回该段缓冲台 bufferPlatformY
 *  - 情况 B（硬惩罚）：掉出 reachedSeg 下边界 → 传送回该段起点 startY
 *
 * 全程无传统存档点；进度仅用于 UI/解锁，不影响重生位置。
 */
export class FallSystem {
  private reachedIndex = 0; // 已稳定到达的最高区段下标

  constructor(
    private segments: Segment[],
    private player: PlayerController,
  ) {}

  get reachedSegmentIndex() {
    return this.reachedIndex;
  }

  /** 玩家当前所属区段下标（按 Y 落点）。 */
  currentIndex(y: number): number {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      if (y >= this.segments[i].startY) return i;
    }
    return 0;
  }

  /**
   * @param grounded 玩家本帧是否稳定站立（决定是否刷新 reachedSeg）
   * @returns 是否触发了重置（供 HUD 泛红反馈）
   */
  update(grounded: boolean): boolean {
    const y = this.player.position.y;
    const cur = this.currentIndex(y);

    // 稳定站立在更高区段 → 提升 reachedSeg
    if (grounded && cur > this.reachedIndex) {
      this.reachedIndex = cur;
    }

    const reached = this.segments[this.reachedIndex];

    // 掉出 reachedSeg 下边界（含余量）→ 硬惩罚回起点
    if (y < reached.startY - CONST.FALL_RESET_MARGIN) {
      this.resetTo(reached.startY);
      return true;
    }

    // 在 reachedSeg 内但低于缓冲台一截（掉坑/掉到段底以下）→ 软惩罚回缓冲台
    if (y < reached.bufferPlatformY - CONST.FALL_RESET_MARGIN) {
      this.resetTo(reached.bufferPlatformY);
      return true;
    }

    return false;
  }

  private resetTo(y: number) {
    const reached = this.segments[this.reachedIndex];
    const spawn = reached.platforms[0]?.mesh.position;
    const x = spawn ? spawn.x : 0;
    const z = spawn ? spawn.z : 0;
    this.player.teleport(new THREE.Vector3(x, y + 2, z));
  }
}
