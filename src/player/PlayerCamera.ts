import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { TUNING } from '../config/tuning';

/**
 * 垂直跟随相机。平滑跟随玩家高度，水平略跟随，始终 lookAt 玩家。
 * 简易防穿模：相机与玩家间有平台遮挡时拉近。
 */
export class PlayerCamera {
  private target = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private platforms: THREE.Object3D[],
  ) {}

  update(playerPos: CANNON.Vec3) {
    // 目标机位：玩家身后上方
    this.target.set(
      playerPos.x,
      playerPos.y + TUNING.cameraHeight,
      playerPos.z + TUNING.cameraDistance,
    );

    // 防穿模：从玩家向目标机位射线检测，命中则拉近
    const desired = this.target.clone();
    const eye = new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z);
    const dir = desired.clone().sub(eye);
    const dist = dir.length();
    dir.normalize();
    const ray = new THREE.Raycaster(eye, dir, 0.1, dist);
    const hits = ray.intersectObjects(this.platforms, false);
    if (hits.length > 0) {
      desired.copy(eye).addScaledVector(dir, Math.max(2, hits[0].distance - 0.5));
    }

    this.camera.position.lerp(desired, TUNING.cameraFollowLerp);

    this.lookTarget.lerp(
      new THREE.Vector3(playerPos.x, playerPos.y + 0.5, playerPos.z),
      TUNING.cameraFollowLerp * 1.5,
    );
    this.camera.lookAt(this.lookTarget);
  }
}
