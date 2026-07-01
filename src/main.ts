import { Game } from './game/Game';

/**
 * 入口：启动顶层流程控制（主菜单 → 地图选择 → 攀爬 → 通关）。
 * 手感参数在 src/config/tuning.ts；控制台 window.__upward 可调试当前会话。
 */
new Game(document.getElementById('app')!);
