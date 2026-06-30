import * as CANNON from 'cannon-es';
import { TUNING } from '../config/tuning';
import { CONST } from '../config/constants';

/**
 * cannon-es 物理世界封装。固定步长推进，提供材质与射线工具。
 */
export class Physics {
  readonly world: CANNON.World;
  readonly playerMaterial: CANNON.Material;
  readonly platformMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, TUNING.gravity, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.allowSleep = false;

    this.playerMaterial = new CANNON.Material('player');
    this.platformMaterial = new CANNON.Material('platform');

    // 玩家与平台接触：物理摩擦设为 0，水平移动/停步/冲量保留全部由 PlayerController
    // 用代码控制（tuning.groundFriction 作为代码层减速）。否则物理摩擦会与逐帧设定的
    // 速度相互拮抗，导致角色移动迟滞。移动平台对玩家的带动也在控制器里显式处理。
    const contact = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.platformMaterial,
      {
        friction: 0,
        restitution: 0, // 不反弹，弹跳由 bouncer 机关显式给力
      },
    );
    this.world.addContactMaterial(contact);
    this.world.defaultContactMaterial.friction = 0;
  }

  step(dt: number) {
    const clamped = Math.min(dt, CONST.PHYSICS_MAX_DELTA);
    this.world.step(CONST.FIXED_TIMESTEP, clamped, CONST.MAX_SUBSTEPS);
  }

  add(body: CANNON.Body) {
    this.world.addBody(body);
  }

  remove(body: CANNON.Body) {
    this.world.removeBody(body);
  }

  /**
   * 向下射线检测，返回最近命中点的 body 与距离（米）。无命中返回 null。
   */
  raycastDown(from: CANNON.Vec3, maxDistance: number): CANNON.Body | null {
    const to = new CANNON.Vec3(from.x, from.y - maxDistance, from.z);
    const result = new CANNON.RaycastResult();
    this.world.raycastClosest(
      from,
      to,
      { collisionFilterMask: CONST.GROUP_PLATFORM, skipBackfaces: true },
      result,
    );
    return result.hasHit ? result.body : null;
  }
}
