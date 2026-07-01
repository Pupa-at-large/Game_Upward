/**
 * 游戏内 HUD（2D）。设计纪律：无血条、无分数、无弹窗。
 *  - 左上：海拔数值（上升时高亮），Inter。
 *  - 右边缘：海拔刻度尺 + 当前游标。
 *  - 底部居中：蓄力条（仅蓄力时出现）。
 *  - 坠落：屏幕边缘泛红 + 轻微失焦，无文字。
 * 配色取自地图 theme（accent）。
 */
export class HUD {
  private root: HTMLDivElement;
  private heightEl: HTMLDivElement;
  private numEl: HTMLSpanElement;
  private marker: HTMLDivElement;
  private chargeWrap: HTMLDivElement;
  private chargeFill: HTMLDivElement;
  private vignette: HTMLDivElement;

  private lastH = 0;
  private flash = 0;

  constructor(private summitY: number, accent: string) {
    this.root = document.createElement('div');
    this.root.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:10;
      font-family:Inter,system-ui,-apple-system,sans-serif;color:#fffcf5;`;

    // 左上海拔
    const corner = document.createElement('div');
    corner.style.cssText = 'position:absolute;top:28px;left:32px;line-height:1;';
    this.heightEl = document.createElement('div');
    this.heightEl.style.cssText = `font-size:52px;font-weight:200;letter-spacing:1px;
      transition:color .25s,text-shadow .25s;text-shadow:0 2px 24px rgba(0,0,0,.35);`;
    this.numEl = document.createElement('span');
    const unit = document.createElement('span');
    unit.textContent = ' m';
    unit.style.cssText = 'font-size:18px;opacity:.55;font-weight:300;';
    this.heightEl.appendChild(this.numEl);
    this.heightEl.appendChild(unit);
    corner.appendChild(this.heightEl);
    this.root.appendChild(corner);

    // 右边缘刻度尺
    const scale = document.createElement('div');
    scale.style.cssText = `position:absolute;right:30px;top:14%;bottom:14%;width:2px;
      background:linear-gradient(180deg,rgba(255,252,245,.04),rgba(255,252,245,.3),rgba(255,252,245,.04));`;
    for (let hh = 0; hh <= summitY; hh += 30) {
      const pct = (hh / summitY) * 100;
      const tick = document.createElement('div');
      tick.style.cssText = `position:absolute;right:4px;bottom:${pct}%;width:9px;height:1px;background:rgba(255,252,245,.35);`;
      const lab = document.createElement('div');
      lab.textContent = String(hh);
      lab.style.cssText = `position:absolute;right:20px;bottom:${pct}%;transform:translateY(50%);font-size:10px;opacity:.4;`;
      scale.appendChild(tick);
      scale.appendChild(lab);
    }
    this.marker = document.createElement('div');
    this.marker.style.cssText = `position:absolute;right:-5px;bottom:0;width:11px;height:11px;border-radius:50%;
      background:#fffcf5;box-shadow:0 0 12px 3px ${accent};transform:translateY(50%);transition:bottom .1s linear;`;
    scale.appendChild(this.marker);
    this.root.appendChild(scale);

    // 蓄力条
    this.chargeWrap = document.createElement('div');
    this.chargeWrap.style.cssText = `position:absolute;left:50%;bottom:42px;transform:translateX(-50%);
      width:200px;height:6px;border-radius:3px;background:rgba(255,252,245,.14);opacity:0;transition:opacity .1s;overflow:hidden;`;
    this.chargeFill = document.createElement('div');
    this.chargeFill.style.cssText = `width:0%;height:100%;border-radius:3px;background:linear-gradient(90deg,#fffcf5,${accent});`;
    this.chargeWrap.appendChild(this.chargeFill);
    this.root.appendChild(this.chargeWrap);

    // 坠落泛红
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = `position:absolute;inset:0;opacity:0;transition:opacity .25s;
      box-shadow:inset 0 0 170px 50px rgba(180,50,45,.55);`;
    this.root.appendChild(this.vignette);

    document.body.appendChild(this.root);
  }

  flashFall() {
    this.flash = 1;
  }

  update(dt: number, height: number, chargeRatio: number) {
    const rising = height > this.lastH + 0.02;
    this.numEl.textContent = height.toFixed(0);
    this.heightEl.style.color = rising ? '#ffffff' : '#fffcf5';
    this.heightEl.style.textShadow = rising
      ? '0 2px 30px rgba(255,240,200,.7)'
      : '0 2px 24px rgba(0,0,0,.35)';
    this.lastH = height;

    const pct = Math.max(0, Math.min(1, height / this.summitY)) * 100;
    this.marker.style.bottom = `${pct}%`;

    if (chargeRatio > 0) {
      this.chargeWrap.style.opacity = '1';
      this.chargeFill.style.width = `${chargeRatio * 100}%`;
    } else {
      this.chargeWrap.style.opacity = '0';
    }

    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 1.6);
      this.vignette.style.opacity = String(this.flash);
    }
  }

  dispose() {
    this.root.remove();
  }
}
