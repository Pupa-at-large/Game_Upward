import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '../core/Physics';
import { CONST } from '../config/constants';
import type { PlatformDef } from '../data/types';

/**
 * 平台基类：一个静态/可动的盒体，拥有同步的渲染网格与物理刚体。
 * 机关子类覆写 update() 实现移动/弹跳/风等行为。
 */
export class Platform {
  readonly mesh: THREE.Mesh;
  readonly body: CANNON.Body;
  readonly def: PlatformDef;

  constructor(def: PlatformDef, physics: Physics, color = 0xc4cdd6) {
    this.def = def;
    const [sx, sy, sz] = def.size;
    const [px, py, pz] = def.pos;

    const geom = new THREE.BoxGeometry(sx, sy, sz);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.set(px, py, pz);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // 物理：往复移动用 KINEMATIC，静态用 STATIC
    const isKinematic = def.type === 'moving';
    this.body = new CANNON.Body({
      type: isKinematic ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)),
      material: physics.platformMaterial,
      position: new CANNON.Vec3(px, py, pz),
      collisionFilterGroup: CONST.GROUP_PLATFORM,
      collisionFilterMask: CONST.GROUP_PLAYER,
    });
    physics.add(this.body);
  }

  /** 子类覆写；基类静态平台无需更新。t 为累计时间（秒）。 */
  update(_dt: number, _t: number): void {}

  /** 把物理位置同步到渲染网格。 */
  syncMesh(): void {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z,
    );
    this.mesh.quaternion.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w,
    );
  }
}
