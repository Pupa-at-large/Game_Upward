import { MAPS, parseUnlock } from '../data/maps';
import { SaveSystem } from '../systems/SaveSystem';
import type { MapDef } from '../data/types';

/**
 * 地图选择：横向卡片。未解锁显示剪影 + 锁 + 条件。展示最佳记录。
 */
export class MapSelect {
  private root: HTMLDivElement;

  constructor(save: SaveSystem, opts: { onSelect: (id: string) => void; onBack: () => void }) {
    this.root = document.createElement('div');
    this.root.style.cssText = `position:fixed;inset:0;z-index:20;overflow:hidden;
      background:linear-gradient(180deg,#1b2330,#06070a);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cormorant Garamond',serif;color:#fffcf5;`;

    const heading = document.createElement('div');
    heading.textContent = '选择地图';
    heading.style.cssText = 'font-size:34px;letter-spacing:8px;opacity:.85;margin-bottom:34px;';
    this.root.appendChild(heading);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:22px;padding:0 40px;max-width:100vw;overflow-x:auto;align-items:stretch;';
    for (const m of MAPS) row.appendChild(this.card(m, save, opts.onSelect));
    this.root.appendChild(row);

    const back = document.createElement('div');
    back.textContent = '返回';
    back.style.cssText = 'margin-top:36px;font-size:22px;letter-spacing:6px;opacity:.6;cursor:pointer;';
    back.onmouseenter = () => (back.style.opacity = '1');
    back.onmouseleave = () => (back.style.opacity = '.6');
    back.onclick = opts.onBack;
    this.root.appendChild(back);

    document.body.appendChild(this.root);
  }

  private card(m: MapDef, save: SaveSystem, onSelect: (id: string) => void): HTMLElement {
    const unlocked = save.isUnlocked(m.unlockCondition);
    const rec = save.getMap(m.id);
    const c = document.createElement('div');
    c.style.cssText = `width:200px;flex:0 0 auto;border-radius:16px;overflow:hidden;
      background:linear-gradient(180deg,${m.theme.skyTop},${m.theme.skyBottom});
      border:1px solid rgba(255,252,245,.12);display:flex;flex-direction:column;
      transition:transform .2s,box-shadow .2s;cursor:${unlocked ? 'pointer' : 'default'};
      ${unlocked ? '' : 'filter:grayscale(.7) brightness(.5);'}`;

    // 缩略塔
    const art = document.createElement('div');
    art.style.cssText = 'height:200px;display:flex;align-items:flex-end;justify-content:center;position:relative;';
    art.innerHTML = `<svg width="80" height="150" viewBox="0 0 80 150" fill="${m.theme.silhouette}" opacity="0.85">
      <path d="M40 8 L48 44 L44 44 L44 78 L52 78 L52 110 L58 110 L58 150 L22 150 L22 110 L28 110 L28 78 L36 78 L36 44 L32 44 Z"/></svg>`;
    if (!unlocked) {
      const lock = document.createElement('div');
      lock.textContent = '🔒';
      lock.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;';
      art.appendChild(lock);
    }
    c.appendChild(art);

    const info = document.createElement('div');
    info.style.cssText = 'padding:14px 16px 18px;background:rgba(6,7,10,.35);flex:1;';
    const cond = parseUnlock(m.unlockCondition);
    const condText =
      cond.type === 'clear' ? `通关「${MAPS.find((x) => x.id === cond.mapId)?.name ?? ''}」解锁` : '';
    info.innerHTML = `
      <div style="font-size:22px;letter-spacing:3px;">${m.name}</div>
      <div style="font-size:13px;opacity:.6;font-style:italic;margin-top:4px;min-height:32px;">${
        unlocked ? m.tagline : condText
      }</div>
      <div style="font-family:Inter,sans-serif;font-size:11px;opacity:.55;margin-top:10px;font-weight:300;">
        ${unlocked ? `最高 ${rec.maxHeight.toFixed(0)}m${rec.cleared ? ' · 已通关' : ''}` : '未解锁'}
      </div>`;
    c.appendChild(info);

    if (unlocked) {
      c.onmouseenter = () => {
        c.style.transform = 'translateY(-6px)';
        c.style.boxShadow = `0 12px 40px rgba(0,0,0,.4)`;
      };
      c.onmouseleave = () => {
        c.style.transform = 'translateY(0)';
        c.style.boxShadow = 'none';
      };
      c.onclick = () => onSelect(m.id);
    }
    return c;
  }

  dispose() {
    this.root.remove();
  }
}
