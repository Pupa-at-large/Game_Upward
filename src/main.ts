import { Engine2D } from './core/Engine2D';
import { Input } from './core/Input';
import { World } from './game/World';
import { Player } from './game/Player';
import { Camera2D } from './game/Camera2D';
import { FallSystem } from './game/FallSystem';
import { Renderer } from './render/Renderer';
import { ProgressSystem } from './systems/ProgressSystem';
import { SaveSystem } from './systems/SaveSystem';
import { HUD } from './ui/HUD';
import type { MapDef } from './data/types';
import mistyTower from './data/maps/misty-tower.json';

/**
 * 2D 攀爬 MVP 入口（纪念碑谷风）。装配引擎/世界/玩家/相机/坠落/渲染/HUD，
 * 跑通蓄力跳 + 冲量保留 + 抓握 + 区段坠落重置。手感全部经 tuning.ts 实时可调。
 */
function boot() {
  const container = document.getElementById('app')!;
  const map = mistyTower as MapDef;

  const engine = new Engine2D(container);
  const input = new Input();
  const world = new World(map);
  const player = new Player(input, world);
  const cam = new Camera2D();
  const fall = new FallSystem(world, player);
  const progress = new ProgressSystem(0); // 海拔零点 = 地图 y=0
  const save = new SaveSystem();
  const renderer = new Renderer(map.theme);
  const hud = new HUD(map.summitY, map.theme.accent);

  cam.resize(engine.width, engine.height);
  cam.follow(player.x, player.y, true);

  let t = 0;
  engine.onFrame((dt) => {
    dt = Math.min(dt, 1 / 20); // 容忍掉帧
    t += dt;
    input.update(dt);

    world.update(dt, t);
    player.update(dt);

    if (fall.update()) {
      progress.registerFall();
      hud.flashFall();
    }

    // 星核收集
    for (const s of world.stars) {
      if (s.collected) continue;
      if (Math.hypot(player.x - s.x, player.y - s.y) < 1.2) s.collected = true;
    }

    progress.update(dt, player.y);
    cam.resize(engine.width, engine.height);
    cam.follow(player.x, player.y);

    renderer.draw(engine.ctx, cam, world, player, t, engine.width, engine.height);
    hud.update(dt, progress.height, player.chargeRatio);

    input.endFrame();
  });

  engine.start();

  window.addEventListener('beforeunload', () => {
    const cleared = progress.maxHeight >= map.summitY;
    save.recordRun(map.id, progress.maxHeight, cleared, progress.elapsed);
  });

  (window as unknown as Record<string, unknown>).__upward = { player, progress, fall, cam, world };
}

boot();
