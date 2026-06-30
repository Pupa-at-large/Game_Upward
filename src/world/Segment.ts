import * as THREE from 'three';
import { Physics } from '../core/Physics';
import { Platform } from './Platform';
import { MovingPlatform } from './mechanics/MovingPlatform';
import type { SegmentDef } from '../data/types';

/**
 * 区段：地图的纵向分段单位。承载该段所有平台，并持有惩罚模型用到的三个高度：
 *  - startY：区段起点（跨区段硬重置传送点）
 *  - bufferPlatformY：区段底部缓冲台（区段内软重置传送点）
 *  - boundaryY：区段顶部边界（= 下一区段 startY）
 */
export class Segment {
  readonly def: SegmentDef;
  readonly platforms: Platform[] = [];

  constructor(def: SegmentDef, physics: Physics, scene: THREE.Scene) {
    this.def = def;
    for (const pdef of def.platforms) {
      const platform =
        pdef.type === 'moving'
          ? new MovingPlatform(pdef, physics)
          : new Platform(pdef, physics);
      this.platforms.push(platform);
      scene.add(platform.mesh);
    }
  }

  get startY() {
    return this.def.startY;
  }
  get bufferPlatformY() {
    return this.def.bufferPlatformY;
  }
  get boundaryY() {
    return this.def.boundaryY;
  }

  /** 玩家 Y 是否落在本区段 [startY, boundaryY) 内。 */
  contains(y: number): boolean {
    return y >= this.def.startY && y < this.def.boundaryY;
  }

  update(dt: number, t: number) {
    for (const p of this.platforms) {
      p.update(dt, t);
      p.syncMesh();
    }
  }
}
