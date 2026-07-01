import type { RunStats } from '../game/Session';
import type { MapDef } from '../data/types';

/**
 * 通关画面：世界点亮的暖调氛围，展示用时 / 坠落次数 / 到达海拔 / 星核，
 * 入口 再次攀登 / 返回。
 */
export class SummitScreen {
  private root: HTMLDivElement;

  constructor(map: MapDef, stats: RunStats, opts: { onRetry: () => void; onBack: () => void }) {
    const mm = Math.floor(stats.timeSec / 60);
    const ss = Math.floor(stats.timeSec % 60);
    const time = `${mm}:${ss.toString().padStart(2, '0')}`;

    this.root = document.createElement('div');
    this.root.style.cssText = `position:fixed;inset:0;z-index:30;overflow:hidden;
      background:linear-gradient(180deg,${map.theme.skyTop} 0%,${map.theme.skyBottom} 70%,#06070a 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cormorant Garamond',serif;color:#fffcf5;opacity:0;transition:opacity 1s;`;

    const glow = document.createElement('div');
    glow.style.cssText = `position:absolute;top:-10%;left:50%;transform:translateX(-50%);
      width:90%;height:60%;border-radius:50%;
      background:radial-gradient(closest-side,rgba(255,224,160,.28),transparent);`;
    this.root.appendChild(glow);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;text-align:center;';
    wrap.innerHTML = `
      <div style="font-size:20px;letter-spacing:10px;opacity:.6;">登 顶</div>
      <div style="font-size:56px;letter-spacing:8px;margin:6px 0 4px;">${map.name}</div>
      <div style="font-size:18px;opacity:.5;font-style:italic;margin-bottom:44px;">${map.tagline}</div>`;

    const stat = (label: string, value: string) =>
      `<div style="display:flex;flex-direction:column;gap:6px;">
        <div style="font-family:Inter,sans-serif;font-size:12px;letter-spacing:3px;opacity:.5;font-weight:300;">${label}</div>
        <div style="font-size:40px;font-weight:300;">${value}</div>
      </div>`;
    const stats3 = document.createElement('div');
    stats3.style.cssText = 'display:flex;gap:64px;justify-content:center;margin-bottom:48px;';
    stats3.innerHTML =
      stat('用时', time) +
      stat('坠落', String(stats.falls)) +
      stat('海拔', `${stats.height.toFixed(0)}m`) +
      (stats.starsTotal > 0 ? stat('星核', `${stats.starsCollected}/${stats.starsTotal}`) : '');
    wrap.appendChild(stats3);

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:40px;justify-content:center;';
    const btn = (label: string, cb: () => void) => {
      const b = document.createElement('div');
      b.textContent = label;
      b.style.cssText = 'font-size:24px;letter-spacing:5px;cursor:pointer;opacity:.8;transition:opacity .2s,text-shadow .2s;';
      b.onmouseenter = () => {
        b.style.opacity = '1';
        b.style.textShadow = '0 2px 22px rgba(255,224,160,.7)';
      };
      b.onmouseleave = () => {
        b.style.opacity = '.8';
        b.style.textShadow = 'none';
      };
      b.onclick = cb;
      return b;
    };
    btns.appendChild(btn('再次攀登', opts.onRetry));
    btns.appendChild(btn('返回', opts.onBack));
    wrap.appendChild(btns);
    this.root.appendChild(wrap);

    document.body.appendChild(this.root);
    requestAnimationFrame(() => (this.root.style.opacity = '1'));
  }

  dispose() {
    this.root.remove();
  }
}
