import { Engine } from './core/Engine';
import { Physics } from './core/Physics';
import { Input } from './core/Input';
import { MapLoader } from './world/MapLoader';
import { PlayerController } from './player/PlayerController';
import { PlayerCamera } from './player/PlayerCamera';
import { FallSystem } from './systems/FallSystem';
import { ProgressSystem } from './systems/ProgressSystem';
import { SaveSystem } from './systems/SaveSystem';
import { HUD } from './ui/HUD';
import type { MapDef } from './data/types';
import mistyTower from './data/maps/misty-tower.json';

/**
 * Phase 1 入口：加载晨雾塔前 3 区段，跑通蓄力跳 + 冲量保留 + 抓握 +
 * 区段坠落重置 + 垂直相机 + HUD。手感全部经 tuning.ts 实时可调。
 */
function boot() {
  const container = document.getElementById('app')!;
  const map = mistyTower as MapDef;

  const engine = new Engine(container);
  engine.setFog(map.theme.fog);

  const physics = new Physics();
  const input = new Input();

  const world = new MapLoader(map, physics, engine.scene);

  const player = new PlayerController(physics, input, world.spawnPoint);
  engine.scene.add(player.mesh);

  const platformMeshes = world.segments.flatMap((s) => s.platforms.map((p) => p.mesh));
  const cam = new PlayerCamera(engine.camera, platformMeshes);

  const fall = new FallSystem(world.segments, player);
  const progress = new ProgressSystem(world.spawnPoint.y);
  const save = new SaveSystem();
  const hud = new HUD(map.summitY);

  let t = 0; // 累计时间，驱动移动平台等机关

  engine.onUpdate((dt) => {
    t += dt;
    input.update(dt);

    // 先推进物理（整合上一帧设定的速度/受力），再读取新位置做控制与渲染同步。
    physics.step(dt);

    world.update(dt, t);
    player.update(dt);

    const didReset = fall.update(player.grounded);
    if (didReset) {
      progress.registerFall();
      hud.flashFall();
    }

    progress.update(dt, player.position.y);
    cam.update(player.position);
    hud.update(dt, progress.height, player.chargeRatio);

    input.endFrame();
  });

  engine.start();

  // 离开页面时落盘最高点
  window.addEventListener('beforeunload', () => {
    const cleared = progress.maxHeight + world.spawnPoint.y >= map.summitY;
    save.recordRun(map.id, progress.maxHeight, cleared, progress.elapsed);
  });

  // 暴露到 window，便于在控制台实时调参/调试
  (window as unknown as Record<string, unknown>).__upward = {
    engine,
    player,
    progress,
    fall,
    map,
  };
}

boot();
