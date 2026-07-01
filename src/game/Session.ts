import { Engine2D } from '../core/Engine2D';
import { Input } from '../core/Input';
import { World } from './World';
import { Player } from './Player';
import { Camera2D } from './Camera2D';
import { FallSystem } from './FallSystem';
import { Renderer } from '../render/Renderer';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { HUD } from '../ui/HUD';
import type { MapDef } from '../data/types';

export interface RunStats {
  mapId: string;
  timeSec: number;
  falls: number;
  height: number;
  starsCollected: number;
  starsTotal: number;
}

/**
 * 一次攀爬会话：装配世界/玩家/相机/坠落/渲染/HUD，驱动更新与渲染，
 * 检测登顶并回调。销毁时移除 HUD。
 */
export class Session {
  private world: World;
  private player: Player;
  private cam: Camera2D;
  private fall: FallSystem;
  private progress: ProgressSystem;
  private renderer: Renderer;
  private hud: HUD;
  private t = 0;
  private done = false;

  constructor(
    private engine: Engine2D,
    private input: Input,
    private map: MapDef,
    private save: SaveSystem,
    private onSummit: (stats: RunStats) => void,
  ) {
    this.world = new World(map);
    this.player = new Player(input, this.world);
    this.cam = new Camera2D();
    this.fall = new FallSystem(this.world, this.player);
    this.progress = new ProgressSystem(0);
    this.renderer = new Renderer(map.theme);
    this.hud = new HUD(map.summitY, map.theme.accent);
    this.cam.resize(engine.width, engine.height);
    this.cam.follow(this.player.x, this.player.y, true);

    (window as unknown as Record<string, unknown>).__upward = {
      player: this.player,
      progress: this.progress,
      fall: this.fall,
      cam: this.cam,
      world: this.world,
    };
  }

  frame(dt: number) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    this.input.update(dt);

    if (!this.done) {
      this.world.update(dt, this.t);
      this.player.update(dt);

      if (this.fall.update()) {
        this.progress.registerFall();
        this.hud.flashFall();
      }
      for (const s of this.world.stars) {
        if (!s.collected && Math.hypot(this.player.x - s.x, this.player.y - s.y) < 1.2) {
          s.collected = true;
        }
      }
      this.progress.update(dt, this.player.y);
      this.checkSummit();
    }

    this.cam.resize(this.engine.width, this.engine.height);
    this.cam.follow(this.player.x, this.player.y);
    this.renderer.draw(this.engine.ctx, this.cam, this.world, this.player, this.t, this.engine.width, this.engine.height);
    this.hud.update(dt, this.progress.height, this.player.chargeRatio);

    this.input.endFrame();
  }

  private checkSummit() {
    // 登顶 = 稳定站上最高平台（与 summitY 显示值解耦，避免永远差一点）
    if (this.player.isGrounded && this.player.bottom >= this.world.topPlatformY - 0.2) {
      this.done = true;
      const stars = this.world.stars;
      const collected = stars.filter((s) => s.collected).length;
      this.save.recordRun(this.map.id, this.progress.maxHeight, true, this.progress.elapsed);
      this.onSummit({
        mapId: this.map.id,
        timeSec: this.progress.elapsed,
        falls: this.progress.falls,
        height: this.map.summitY,
        starsCollected: collected,
        starsTotal: stars.length,
      });
    }
  }

  /** 保存当前进度（未登顶时，如返回菜单）。 */
  saveProgress() {
    this.save.recordRun(this.map.id, this.progress.maxHeight, this.done, this.progress.elapsed);
  }

  dispose() {
    this.hud.dispose();
  }
}
