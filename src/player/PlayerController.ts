import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '../core/Physics';
import { Input } from '../core/Input';
import { TUNING } from '../config/tuning';
import { CONST } from '../config/constants';

type PlayerState = 'ground' | 'air' | 'grab';

/**
 * 玩家控制器：核心手感所在。
 *  - 移动：地面全控制，空中弱控制（airControl）
 *  - 蓄力跳：按住空格蓄力，松开按蓄力时长起跳；禁止二段跳
 *  - 冲量保留：落地保留部分水平速度，奖励连跳节奏
 *  - 抓握：下落中贴近平台边缘可抓住悬挂，按跳翻上
 * 所有数值来自 tuning.ts，便于手测微调。
 */
export class PlayerController {
  readonly body: CANNON.Body;
  readonly mesh: THREE.Mesh;

  private state: PlayerState = 'air';
  private wasGrounded = false;
  private _grounded = false;
  private support: CANNON.Body | null = null; // 脚下平台（用于被移动平台带动）
  private timeSinceGrounded = 0; // 用于抓握时间窗
  private grabTimer = 0;
  private grabReleaseLock = 0; // 抓握后短暂禁止再次抓握，避免黏住

  /** 朝向（水平），由移动输入更新；起跳水平分量沿此方向。 */
  private facing = new THREE.Vector3(0, 0, -1);

  constructor(
    private physics: Physics,
    private input: Input,
    spawn: THREE.Vector3,
  ) {
    // 物理体用球体，避免胶囊翻滚；视觉用胶囊近似
    this.body = new CANNON.Body({
      mass: TUNING.playerMass,
      shape: new CANNON.Sphere(TUNING.playerRadius),
      material: physics.playerMaterial,
      position: new CANNON.Vec3(spawn.x, spawn.y, spawn.z),
      linearDamping: TUNING.airDrag,
      fixedRotation: true,
      collisionFilterGroup: CONST.GROUP_PLAYER,
      collisionFilterMask: CONST.GROUP_PLATFORM,
    });
    this.body.updateMassProperties();
    physics.add(this.body);

    const geom = new THREE.CapsuleGeometry(
      TUNING.playerRadius,
      TUNING.playerHeight - TUNING.playerRadius * 2,
      6,
      12,
    );
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf4f0ff,
      emissive: 0x3a3358,
      emissiveIntensity: 0.4,
      roughness: 0.6,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
  }

  get position(): CANNON.Vec3 {
    return this.body.position;
  }

  get isCharging(): boolean {
    return this.input.isCharging && (this.state === 'ground' || this.state === 'grab');
  }

  /** 蓄力进度 0-1，供 HUD 显示蓄力条。 */
  get chargeRatio(): number {
    if (!this.isCharging) return 0;
    const t = THREE.MathUtils.clamp(
      this.input.chargeTime,
      TUNING.jumpChargeMin,
      TUNING.jumpChargeMax,
    );
    return (t - TUNING.jumpChargeMin) / (TUNING.jumpChargeMax - TUNING.jumpChargeMin);
  }

  /** 把玩家瞬移到指定点并清零速度（坠落重置用）。 */
  teleport(p: THREE.Vector3) {
    this.body.position.set(p.x, p.y, p.z);
    this.body.velocity.set(0, 0, 0);
    this.state = 'air';
    this.grabReleaseLock = 0.2;
  }

  /** 本帧是否稳定站立（落地检测结果），供 FallSystem 判定 reachedSeg。 */
  get grounded(): boolean {
    return this._grounded;
  }

  update(dt: number) {
    const grounded = this.checkGrounded();
    this._grounded = grounded;

    // 落地瞬间：冲量保留
    if (grounded && !this.wasGrounded && this.state !== 'grab') {
      this.body.velocity.x *= TUNING.landingMomentumKeep;
      this.body.velocity.z *= TUNING.landingMomentumKeep;
    }

    if (this.state !== 'grab') {
      this.state = grounded ? 'ground' : 'air';
    }

    if (grounded) this.timeSinceGrounded = 0;
    else this.timeSinceGrounded += dt;

    if (this.grabReleaseLock > 0) this.grabReleaseLock -= dt;

    this.updateFacing();

    switch (this.state) {
      case 'ground':
        this.handleGroundMove();
        break;
      case 'air':
        this.handleAirMove();
        this.tryGrab();
        break;
      case 'grab':
        this.handleGrab(dt);
        break;
    }

    // 起跳判定：仅地面或抓握态，松开跳跃键时触发
    if (this.input.consumeJumpRelease()) {
      if (this.state === 'ground') this.performJump();
      else if (this.state === 'grab') this.pullUp();
    }

    this.wasGrounded = grounded;
    this.syncMesh();
  }

  // ── 地面/空中移动 ───────────────────────────────
  private handleGroundMove() {
    // 以"脚下平台"为参考系计算相对水平速度：站着不动会随移动平台一起走，
    // 输入则在平台之上叠加控制；松手时相对速度按 groundFriction 衰减到静止。
    const sv = this.support ?? null;
    const svx = sv ? sv.velocity.x : 0;
    const svz = sv ? sv.velocity.z : 0;
    let relx = this.body.velocity.x - svx;
    let relz = this.body.velocity.z - svz;

    const axis = this.input.moveAxis;
    const hasInput = axis.x !== 0 || axis.z !== 0;

    if (this.isCharging) {
      // 蓄力是"瞄准"时刻：快速收住相对速度，让起跳方向干净
      relx *= 0.8;
      relz *= 0.8;
    } else if (hasInput) {
      const tx = axis.x * TUNING.moveSpeed;
      const tz = axis.z * TUNING.moveSpeed;
      relx = THREE.MathUtils.lerp(relx, tx, TUNING.groundControl);
      relz = THREE.MathUtils.lerp(relz, tz, TUNING.groundControl);
    } else {
      // 无输入：代码层摩擦，逐帧衰减到与平台同速（即静止站立）
      relx *= 1 - TUNING.groundFriction;
      relz *= 1 - TUNING.groundFriction;
    }

    this.body.velocity.x = relx + svx;
    this.body.velocity.z = relz + svz;
  }

  private handleAirMove() {
    const axis = this.input.moveAxis;
    const target = this.worldMove(axis, TUNING.moveSpeed);
    // 空中：弱控制，向目标速度插值
    this.body.velocity.x = THREE.MathUtils.lerp(
      this.body.velocity.x,
      target.x,
      TUNING.airControl * 0.1,
    );
    this.body.velocity.z = THREE.MathUtils.lerp(
      this.body.velocity.z,
      target.z,
      TUNING.airControl * 0.1,
    );
  }

  /** 把输入轴映射到世界水平速度向量。 */
  private worldMove(axis: { x: number; z: number }, speed: number) {
    return new CANNON.Vec3(axis.x * speed, 0, axis.z * speed);
  }

  private updateFacing() {
    const axis = this.input.moveAxis;
    if (axis.x !== 0 || axis.z !== 0) {
      this.facing.set(axis.x, 0, axis.z).normalize();
    }
  }

  // ── 蓄力跳 ──────────────────────────────────────
  private performJump() {
    const t = THREE.MathUtils.clamp(
      this.input.chargeTime,
      TUNING.jumpChargeMin,
      TUNING.jumpChargeMax,
    );
    const ratio =
      (t - TUNING.jumpChargeMin) / (TUNING.jumpChargeMax - TUNING.jumpChargeMin);
    const force = THREE.MathUtils.lerp(
      TUNING.jumpForceMin,
      TUNING.jumpForceMax,
      ratio,
    );

    // 垂直起跳
    this.body.velocity.y = force;
    // 水平分量沿当前朝向叠加（保留已有动量 → 连跳累积）
    const h = force * TUNING.jumpHorizontalRatio;
    this.body.velocity.x += this.facing.x * h;
    this.body.velocity.z += this.facing.z * h;

    this.state = 'air';
    this.wasGrounded = false;
  }

  // ── 抓握 ────────────────────────────────────────
  private tryGrab() {
    if (this.grabReleaseLock > 0) return;
    if (this.body.velocity.y >= 0) return; // 必须在下落
    if (this.timeSinceGrounded > TUNING.grabWindow * 4) return; // 离地不能太久

    const edge = this.findGrabbableEdge();
    if (edge) {
      this.state = 'grab';
      this.grabTimer = TUNING.grabHangDuration;
      // 吸附到边缘下方悬挂位
      this.body.position.x = edge.x;
      this.body.position.z = edge.z;
      this.body.position.y = edge.y - TUNING.playerRadius;
      this.body.velocity.set(0, 0, 0);
      this.body.type = CANNON.Body.KINEMATIC;
    }
  }

  /**
   * 在玩家四周小范围探测可抓的平台顶面边缘。
   * 返回边缘点（平台顶面、最接近玩家的水平边）。
   */
  private findGrabbableEdge(): CANNON.Vec3 | null {
    const p = this.body.position;
    const reach = TUNING.grabReach;
    // 从玩家略上方向四周采样，找顶面在 [p.y, p.y+grabReach] 内的平台
    for (const body of this.physics.world.bodies) {
      if (body.collisionFilterGroup !== CONST.GROUP_PLATFORM) continue;
      const shape = body.shapes[0];
      if (!(shape instanceof CANNON.Box)) continue;
      const he = shape.halfExtents;
      const c = body.position;
      const topY = c.y + he.y;
      // 边缘需在玩家手够得到的高度带内
      if (topY < p.y - 0.1 || topY > p.y + reach + TUNING.playerRadius) continue;
      // 水平是否贴近平台外轮廓
      const dx = Math.abs(p.x - c.x) - he.x;
      const dz = Math.abs(p.z - c.z) - he.z;
      const inX = p.x >= c.x - he.x && p.x <= c.x + he.x;
      const inZ = p.z >= c.z - he.z && p.z <= c.z + he.z;
      const nearX = dx > -reach && dx < reach;
      const nearZ = dz > -reach && dz < reach;
      if ((inX && nearZ) || (inZ && nearX) || (nearX && nearZ)) {
        // 把抓点钳到平台外缘
        const ex = THREE.MathUtils.clamp(p.x, c.x - he.x, c.x + he.x);
        const ez = THREE.MathUtils.clamp(p.z, c.z - he.z, c.z + he.z);
        return new CANNON.Vec3(ex, topY, ez);
      }
    }
    return null;
  }

  private handleGrab(dt: number) {
    this.grabTimer -= dt;
    if (this.grabTimer <= 0) {
      this.releaseGrab();
    }
  }

  private pullUp() {
    this.releaseGrab();
    this.body.velocity.y = TUNING.grabPullUpForce;
    // 朝平台内侧给一点水平推力，确保落到台面上
    this.body.velocity.x += this.facing.x * TUNING.grabPullUpForce * 0.4;
    this.body.velocity.z += this.facing.z * TUNING.grabPullUpForce * 0.4;
  }

  private releaseGrab() {
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.updateMassProperties();
    this.state = 'air';
    this.grabReleaseLock = 0.25;
    this.timeSinceGrounded = TUNING.grabWindow * 5; // 松手后不立刻再抓
  }

  // ── 落地检测 ────────────────────────────────────
  private checkGrounded(): boolean {
    this.support = null;
    if (this.state === 'grab') return false;
    if (this.body.velocity.y > 0.5) return false; // 上升中不算落地
    const from = new CANNON.Vec3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z,
    );
    const probe = TUNING.playerRadius + CONST.GROUND_PROBE_MARGIN;
    const hit = this.physics.raycastDown(from, probe);
    this.support = hit; // 记录脚下平台，供地面移动带动（移动平台）
    return hit !== null;
  }

  private syncMesh() {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z,
    );
  }
}
