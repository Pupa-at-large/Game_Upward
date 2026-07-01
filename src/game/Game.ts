import { Engine2D } from '../core/Engine2D';
import { Input } from '../core/Input';
import { SaveSystem } from '../systems/SaveSystem';
import { Session, RunStats } from './Session';
import { MainMenu } from '../ui/MainMenu';
import { MapSelect } from '../ui/MapSelect';
import { SummitScreen } from '../ui/SummitScreen';
import { getMap, MAPS } from '../data/maps';

type Screen = { dispose(): void };

/**
 * 顶层流程控制：主菜单 → 地图选择 → 攀爬会话 → 通关画面。
 * 只有 playing 状态驱动 Session；其余状态用 DOM 覆盖层。
 */
export class Game {
  private engine: Engine2D;
  private input: Input;
  private save = new SaveSystem();
  private session: Session | null = null;
  private screen: Screen | null = null;
  private lastMapId = MAPS[0].id;

  constructor(container: HTMLElement) {
    this.engine = new Engine2D(container);
    this.input = new Input();
    this.engine.onFrame(this.frame);
    this.engine.start();

    // 调试：?map=<id> 直接进入某张图（跳过菜单/解锁）
    const forced = new URLSearchParams(location.search).get('map');
    if (forced && getMap(forced)) this.startMap(forced);
    else this.showMenu();
  }

  private frame = (dt: number) => {
    if (this.session) {
      this.session.frame(dt);
    } else {
      // 无会话：清屏为深色，避免残帧（菜单为不透明覆盖层，通常看不到）
      const { ctx, width, height } = this.engine;
      ctx.fillStyle = '#06070a';
      ctx.fillRect(0, 0, width, height);
    }
  };

  private clearScreen() {
    this.screen?.dispose();
    this.screen = null;
  }

  private endSession() {
    this.session?.dispose();
    this.session = null;
  }

  private showMenu() {
    this.endSession();
    this.clearScreen();
    this.screen = new MainMenu({
      onStart: () => this.startMap(this.lastMapId),
      onMapSelect: () => this.showMapSelect(),
      onSettings: () => this.toast('设置 · 开发中'),
    });
  }

  private showMapSelect() {
    this.endSession();
    this.clearScreen();
    this.screen = new MapSelect(this.save, {
      onSelect: (id) => this.startMap(id),
      onBack: () => this.showMenu(),
    });
  }

  private startMap(id: string) {
    const map = getMap(id);
    if (!map) return;
    this.lastMapId = id;
    this.clearScreen();
    this.endSession();
    this.session = new Session(this.engine, this.input, map, this.save, (stats) =>
      this.showSummit(stats),
    );
  }

  private showSummit(stats: RunStats) {
    const map = getMap(stats.mapId)!;
    this.endSession();
    this.screen = new SummitScreen(map, stats, {
      onRetry: () => this.startMap(stats.mapId),
      onBack: () => this.showMenu(),
    });
  }

  private toast(msg: string) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:40;
      font-family:Inter,sans-serif;font-size:14px;letter-spacing:2px;color:#fffcf5;
      background:rgba(6,7,10,.7);padding:10px 20px;border-radius:20px;opacity:0;transition:opacity .3s;`;
    document.body.appendChild(t);
    requestAnimationFrame(() => (t.style.opacity = '1'));
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 400);
    }, 1400);
  }
}
