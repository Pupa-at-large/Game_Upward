import * as THREE from 'three';

/**
 * 渲染引擎封装：场景、相机、渲染器、时钟、resize、主循环。
 * 调用方注册 update(dt) 回调，Engine 负责按帧驱动。
 */
export class Engine {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private updateFn: ((dt: number) => void) | null = null;
  private running = false;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onResize);
  }

  setFog(color: string) {
    const c = new THREE.Color(color);
    this.scene.fog = new THREE.Fog(c, 20, 80);
    this.scene.background = c.clone().multiplyScalar(0.6);
  }

  onUpdate(fn: (dt: number) => void) {
    this.updateFn = fn;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.loop);
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private loop = () => {
    const dt = this.clock.getDelta();
    this.updateFn?.(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
