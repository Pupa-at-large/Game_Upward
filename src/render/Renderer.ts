import { TUNING } from '../config/tuning';
import { Camera2D } from '../game/Camera2D';
import { Player } from '../game/Player';
import { World, Platform } from '../game/World';
import type { MapTheme } from '../data/types';

/** #rrggbb → {r,g,b}。 */
function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgba(c: string, a: number) {
  const { r, g, b } = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}
function mix(a: string, b: string, t: number) {
  const x = hex(a), y = hex(b);
  const r = Math.round(x.r + (y.r - x.r) * t);
  const g = Math.round(x.g + (y.g - x.g) * t);
  const bl = Math.round(x.b + (y.b - x.b) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * 纪念碑谷风格 2D 渲染：扁平几何平台 + 柔和长投影 + 随高度冷→暖的天空 +
 * 飘浮光尘 + 蓄力弹道预览。所有色彩来自地图 theme。
 */
export class Renderer {
  constructor(private theme: MapTheme) {}

  draw(
    ctx: CanvasRenderingContext2D,
    cam: Camera2D,
    world: World,
    player: Player,
    t: number,
    w: number,
    h: number,
  ) {
    this.drawSky(ctx, cam, world, w, h);
    this.drawSilhouettes(ctx, cam, w, h);
    this.drawMotes(ctx, cam, t, w, h);

    for (const p of world.platforms) this.drawPlatform(ctx, cam, p);
    this.drawStars(ctx, cam, world, t);
    this.drawAim(ctx, cam, player);
    this.drawPlayer(ctx, cam, player);
  }

  // ── 天空：底冷顶暖渐变 + 顶部暖光 ────────────────
  private drawSky(ctx: CanvasRenderingContext2D, cam: Camera2D, world: World, w: number, h: number) {
    // 随攀爬高度，整体略微提亮、向顶色靠拢（越往上越亮越暖）
    const climb = Math.max(0, Math.min(1, cam.camY / Math.max(1, world.summitY)));
    const bottom = mix(this.theme.skyBottom, this.theme.skyTop, climb * 0.35);
    const top = mix(this.theme.skyTop, '#fffcf5', climb * 0.25);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 顶部一缕暖光（登顶暗示）
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.12, 0, w * 0.5, h * 0.12, h * 0.5);
    glow.addColorStop(0, rgba(this.theme.accent, 0.18 + climb * 0.22));
    glow.addColorStop(1, rgba(this.theme.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  // ── 远景剪影塔（视差）────────────────────────────
  private drawSilhouettes(ctx: CanvasRenderingContext2D, cam: Camera2D, w: number, h: number) {
    const layers = [
      { px: 0.12, alpha: 0.18, scale: 1.4, off: -0.18 },
      { px: 0.25, alpha: 0.26, scale: 1.0, off: 0.22 },
    ];
    for (const L of layers) {
      ctx.fillStyle = rgba(this.theme.silhouette, L.alpha);
      const baseY = h + 40;
      // 视差：相机上移时远塔缓慢下移
      const shift = -cam.camY * TUNING.pxPerMeter * L.px;
      const cx = w * (0.5 + L.off);
      const tw = 120 * L.scale;
      const th = h * 1.6;
      // 阶梯收顶的几何塔
      let y = baseY + (shift % (th));
      this.towerPath(ctx, cx, y, tw, th);
      this.towerPath(ctx, cx - w * 0.42, y + 60, tw * 0.8, th);
      this.towerPath(ctx, cx + w * 0.42, y + 30, tw * 0.9, th);
    }
  }

  private towerPath(ctx: CanvasRenderingContext2D, cx: number, baseY: number, tw: number, th: number) {
    const steps = 5;
    ctx.beginPath();
    let wdt = tw;
    let y = baseY;
    ctx.moveTo(cx - wdt / 2, y);
    for (let i = 0; i < steps; i++) {
      const segH = th / steps;
      y -= segH;
      ctx.lineTo(cx - wdt / 2, y);
      const nw = wdt * 0.78;
      ctx.lineTo(cx - nw / 2, y);
      wdt = nw;
    }
    ctx.lineTo(cx, y - 30);
    // 镜像下来
    let wb = tw * Math.pow(0.78, steps);
    y = baseY - th;
    ctx.lineTo(cx + wb / 2, y + 30);
    wdt = wb;
    for (let i = 0; i < steps; i++) {
      const segH = th / steps;
      ctx.lineTo(cx + wdt / 2, y);
      const nw = wdt / 0.78;
      ctx.lineTo(cx + nw / 2, y);
      y += segH;
      wdt = nw;
    }
    ctx.closePath();
    ctx.fill();
  }

  // ── 飘浮光尘 ────────────────────────────────────
  private drawMotes(ctx: CanvasRenderingContext2D, cam: Camera2D, t: number, w: number, h: number) {
    const N = 48;
    for (let i = 0; i < N; i++) {
      const seed = i * 12.9898;
      const fx = (Math.sin(seed) * 0.5 + 0.5) * w;
      const speed = 8 + (Math.sin(seed * 1.7) * 0.5 + 0.5) * 16;
      const drift = (t * speed + i * 37) % (h + 60);
      const y = h - drift;
      const x = fx + Math.sin(t * 0.5 + i) * 14;
      const climb = Math.max(0, Math.min(1, cam.camY / 260));
      const r = 0.6 + (Math.sin(seed * 2.3) * 0.5 + 0.5) * 1.6;
      const col = mix('#cdd3da', this.theme.accent, climb);
      ctx.fillStyle = rgba(col, 0.12 + (Math.sin(seed * 3.1) * 0.5 + 0.5) * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 平台（扁平几何 + 厚度 + 长投影）──────────────
  private drawPlatform(ctx: CanvasRenderingContext2D, cam: Camera2D, p: Platform) {
    if (!p.solid && p.type !== 'fading') return;
    const x = cam.sx(p.left);
    const yTop = cam.sy(p.top);
    const pw = p.w * cam.scale;
    const ph = Math.max(10, p.h * cam.scale);

    const alpha = p.type === 'fading' ? p.alpha : 1;
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    // 长投影
    ctx.fillStyle = rgba('#0a0a12', 0.16);
    this.roundRect(ctx, x + 10, yTop + 14, pw, ph, 6);
    ctx.fill();

    // 厚度（侧/底面）
    ctx.fillStyle = this.theme.platformSide;
    this.roundRect(ctx, x, yTop, pw, ph + 10, 7);
    ctx.fill();

    // 顶面
    ctx.fillStyle = this.theme.platformTop;
    this.roundRect(ctx, x, yTop, pw, ph * 0.7, 7);
    ctx.fill();

    // 顶部高光唇线（也是"可抓"提示）
    ctx.strokeStyle = rgba('#fffcf5', 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, yTop + 2);
    ctx.lineTo(x + pw - 6, yTop + 2);
    ctx.stroke();

    // 机关标识
    if (p.type === 'moving') {
      ctx.fillStyle = rgba(this.theme.accent, 0.9);
      this.roundRect(ctx, x + pw / 2 - 10, yTop + ph + 2, 20, 3, 1.5);
      ctx.fill();
    } else if (p.type === 'bouncer') {
      ctx.strokeStyle = rgba(this.theme.accent, 0.95);
      ctx.lineWidth = 2.5;
      const my = yTop - 2;
      ctx.beginPath();
      ctx.moveTo(x + pw / 2 - 8, my);
      ctx.lineTo(x + pw / 2, my - 7);
      ctx.lineTo(x + pw / 2 + 8, my);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── 星核 ────────────────────────────────────────
  private drawStars(ctx: CanvasRenderingContext2D, cam: Camera2D, world: World, t: number) {
    for (const s of world.stars) {
      if (s.collected) continue;
      const x = cam.sx(s.x);
      const y = cam.sy(s.y) + Math.sin(t * 2 + s.x) * 5;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 26);
      glow.addColorStop(0, rgba(this.theme.accent, 0.8));
      glow.addColorStop(1, rgba(this.theme.accent, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - 26, y - 26, 52, 52);
      ctx.fillStyle = '#fffcf5';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4 + t * 0.6);
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }

  // ── 蓄力弹道预览 ────────────────────────────────
  private drawAim(ctx: CanvasRenderingContext2D, cam: Camera2D, player: Player) {
    const aim = player.aimPreview;
    if (!aim) return;
    ctx.fillStyle = rgba(this.theme.accent, 0.7);
    const g = TUNING.gravity;
    for (let i = 1; i <= 22; i++) {
      const dt = i * 0.05;
      const wx = player.x + aim.vx * dt;
      const wy = player.y + aim.vy * dt - 0.5 * g * dt * dt;
      if (wy < player.y - 9) break;
      const sx = cam.sx(wx);
      const sy = cam.sy(wy);
      const r = 3 - (i / 22) * 1.5;
      ctx.globalAlpha = 0.7 - (i / 22) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── 玩家 ────────────────────────────────────────
  private drawPlayer(ctx: CanvasRenderingContext2D, cam: Camera2D, player: Player) {
    const squat = player.squat;
    const wpx = player.w * cam.scale * (1 + squat * 0.22);
    const hpx = player.h * cam.scale * (1 - squat * 0.28);
    const cx = cam.sx(player.x);
    const footY = cam.sy(player.bottom);
    const topY = footY - hpx;

    // 接触阴影
    ctx.fillStyle = rgba('#0a0a12', 0.22);
    ctx.beginPath();
    ctx.ellipse(cx, footY + 2, wpx * 0.55, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体（奶白胶囊 + 轮廓光）
    ctx.fillStyle = '#fffcf5';
    this.roundRect(ctx, cx - wpx / 2, topY, wpx, hpx, wpx * 0.45);
    ctx.fill();
    ctx.strokeStyle = rgba(this.theme.accent, 0.85);
    ctx.lineWidth = 2;
    this.roundRect(ctx, cx - wpx / 2, topY, wpx, hpx, wpx * 0.45);
    ctx.stroke();

    // 朝向小切口
    ctx.fillStyle = rgba(this.theme.skyBottom, 0.7);
    const eyeX = cx + player.facing * wpx * 0.18;
    ctx.beginPath();
    ctx.arc(eyeX, topY + hpx * 0.32, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
