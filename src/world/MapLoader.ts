import * as THREE from 'three';
import { Physics } from '../core/Physics';
import { Segment } from './Segment';
import type { MapDef } from '../data/types';

/**
 * 地图加载器：读取地图 JSON，生成各区段平台、灯光、雾、星核占位。
 * 内容完全数据驱动，逻辑不硬编码任何具体平台。
 */
export class MapLoader {
  readonly def: MapDef;
  readonly segments: Segment[] = [];
  readonly starCoreMeshes: THREE.Mesh[] = [];

  constructor(def: MapDef, physics: Physics, scene: THREE.Scene) {
    this.def = def;

    for (const segDef of def.segments) {
      this.segments.push(new Segment(segDef, physics, scene));
    }

    this.setupLighting(scene);
    this.setupStarCores(scene);
  }

  /** 玩家出生点：第一区段第一块平台的正上方。 */
  get spawnPoint(): THREE.Vector3 {
    const first = this.def.segments[0]?.platforms[0];
    if (!first) return new THREE.Vector3(0, 2, 0);
    const [x, y, z] = first.pos;
    const top = y + first.size[1] / 2;
    return new THREE.Vector3(x, top + 1.5, z);
  }

  get summitY() {
    return this.def.summitY;
  }

  private setupLighting(scene: THREE.Scene) {
    const ambient = new THREE.AmbientLight(
      new THREE.Color(this.def.theme.ambient),
      0.7,
    );
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(
      new THREE.Color(this.def.theme.accent),
      1.1,
    );
    sun.position.set(10, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    const s = 40;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    scene.add(sun);
  }

  private setupStarCores(scene: THREE.Scene) {
    const geom = new THREE.IcosahedronGeometry(0.35, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffe9a8,
      emissive: 0xffcf6b,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    for (const sc of this.def.starCores) {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(sc.pos[0], sc.pos[1], sc.pos[2]);
      scene.add(mesh);
      this.starCoreMeshes.push(mesh);
    }
  }

  update(dt: number, t: number) {
    for (const seg of this.segments) seg.update(dt, t);
    // 星核轻微自转，便于辨识（不影响玩法）
    for (const m of this.starCoreMeshes) m.rotation.y += dt * 1.5;
  }
}
