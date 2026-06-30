/**
 * 游戏内 HUD。设计纪律：无血条、无分数、无弹窗。
 *  - 左上：高度数值（上升时高亮）
 *  - 右边缘：垂直海拔刻度 + 当前进度游标（1b 海拔尺）
 *  - 底部居中：蓄力条（仅蓄力时出现）
 *  - 坠落：屏幕边缘泛红 + 轻微失焦，无文字
 *
 * 纯 DOM/CSS 实现，色值取冷雾留白基调，后续可按设计稿换皮。
 */
export class HUD {
  private root: HTMLDivElement;
  private heightEl: HTMLDivElement;
  private heightUnitEl: HTMLSpanElement;
  private markerEl: HTMLDivElement;
  private scaleEl: HTMLDivElement;
  private chargeWrap: HTMLDivElement;
  private chargeFill: HTMLDivElement;
  private vignette: HTMLDivElement;

  private lastHeight = 0;
  private fallFlash = 0;
  private summitY: number;

  constructor(summitY: number) {
    this.summitY = summitY;
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed; inset: 0; pointer-events: none;
      font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
      color: #C4CDD6; z-index: 10;`;

    // 左上高度
    const corner = document.createElement('div');
    corner.style.cssText = `position:absolute; top:32px; left:32px; line-height:1;`;
    this.heightEl = document.createElement('div');
    this.heightEl.style.cssText = `
      font-size:48px; font-weight:300; letter-spacing:1px;
      color:#E8EDF2; text-shadow:0 2px 20px rgba(107,140,174,.5);
      transition: color .25s, text-shadow .25s;`;
    this.heightUnitEl = document.createElement('span');
    this.heightUnitEl.textContent = ' m';
    this.heightUnitEl.style.cssText = `font-size:18px; opacity:.6; font-weight:300;`;
    corner.appendChild(this.heightEl);
    this.heightEl.appendChild(this.heightUnitEl);
    this.root.appendChild(corner);

    // 右边缘海拔尺
    this.scaleEl = document.createElement('div');
    this.scaleEl.style.cssText = `
      position:absolute; right:28px; top:12%; bottom:12%; width:2px;
      background:linear-gradient(180deg, rgba(196,205,214,.05), rgba(196,205,214,.35), rgba(196,205,214,.05));`;
    this.markerEl = document.createElement('div');
    this.markerEl.style.cssText = `
      position:absolute; right:-5px; width:12px; height:12px; border-radius:50%;
      background:#E8EDF2; box-shadow:0 0 14px 3px rgba(196,205,214,.7);
      transform:translateY(-50%); bottom:0; transition: bottom .12s linear;`;
    this.scaleEl.appendChild(this.markerEl);
    this.buildTicks();
    this.root.appendChild(this.scaleEl);

    // 蓄力条
    this.chargeWrap = document.createElement('div');
    this.chargeWrap.style.cssText = `
      position:absolute; left:50%; bottom:48px; transform:translateX(-50%);
      width:180px; height:6px; border-radius:3px; background:rgba(196,205,214,.15);
      opacity:0; transition:opacity .12s; overflow:hidden;`;
    this.chargeFill = document.createElement('div');
    this.chargeFill.style.cssText = `
      width:0%; height:100%; border-radius:3px;
      background:linear-gradient(90deg,#8B7FA8,#C4CDD6);`;
    this.chargeWrap.appendChild(this.chargeFill);
    this.root.appendChild(this.chargeWrap);

    // 坠落泛红 + 失焦遮罩
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = `
      position:absolute; inset:0; opacity:0; transition:opacity .3s;
      box-shadow: inset 0 0 160px 40px rgba(180,40,40,.55);
      backdrop-filter: blur(0px);`;
    this.root.appendChild(this.vignette);

    document.body.appendChild(this.root);
  }

  private buildTicks() {
    // 每 30m 一条刻度，对齐区段边界
    const step = 30;
    for (let h = 0; h <= this.summitY; h += step) {
      const pct = (h / this.summitY) * 100;
      const tick = document.createElement('div');
      tick.style.cssText = `
        position:absolute; right:6px; bottom:${pct}%; width:10px; height:1px;
        background:rgba(196,205,214,.4);`;
      const label = document.createElement('div');
      label.textContent = String(h);
      label.style.cssText = `
        position:absolute; right:24px; bottom:${pct}%; transform:translateY(50%);
        font-size:11px; opacity:.45; font-weight:300;`;
      this.scaleEl.appendChild(tick);
      this.scaleEl.appendChild(label);
    }
  }

  /** 触发坠落反馈（泛红+失焦），由 main 在重置时调用。 */
  flashFall() {
    this.fallFlash = 1;
  }

  update(dt: number, height: number, chargeRatio: number) {
    // 高度数值 + 上升高亮
    const rising = height > this.lastHeight + 0.01;
    this.heightEl.firstChild!.textContent = height.toFixed(0);
    if (rising) {
      this.heightEl.style.color = '#FFFFFF';
      this.heightEl.style.textShadow = '0 2px 28px rgba(160,190,220,.85)';
    } else {
      this.heightEl.style.color = '#E8EDF2';
      this.heightEl.style.textShadow = '0 2px 20px rgba(107,140,174,.5)';
    }
    this.lastHeight = height;

    // 海拔游标
    const pct = Math.max(0, Math.min(1, height / this.summitY)) * 100;
    this.markerEl.style.bottom = `${pct}%`;

    // 蓄力条
    if (chargeRatio > 0) {
      this.chargeWrap.style.opacity = '1';
      this.chargeFill.style.width = `${chargeRatio * 100}%`;
    } else {
      this.chargeWrap.style.opacity = '0';
    }

    // 坠落泛红衰减
    if (this.fallFlash > 0) {
      this.fallFlash = Math.max(0, this.fallFlash - dt * 1.6);
      this.vignette.style.opacity = String(this.fallFlash);
      this.vignette.style.backdropFilter = `blur(${this.fallFlash * 3}px)`;
    }
  }

  dispose() {
    this.root.remove();
  }
}
