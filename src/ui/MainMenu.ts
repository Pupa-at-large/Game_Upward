/**
 * 主菜单：远景剪影塔 + 标题 + 三个文字入口。冷雾留白基调，Cormorant Garamond 标题。
 */
export class MainMenu {
  private root: HTMLDivElement;

  constructor(opts: { onStart: () => void; onMapSelect: () => void; onSettings: () => void }) {
    this.root = document.createElement('div');
    this.root.style.cssText = `position:fixed;inset:0;z-index:20;overflow:hidden;
      background:linear-gradient(180deg,#2a3340 0%,#1b2330 55%,#06070a 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cormorant Garamond',serif;color:#fffcf5;`;

    // 顶部暖光
    const glow = document.createElement('div');
    glow.style.cssText = `position:absolute;top:-20%;left:50%;transform:translateX(-50%);
      width:80%;height:60%;border-radius:50%;
      background:radial-gradient(closest-side,rgba(232,184,109,.16),transparent);`;
    this.root.appendChild(glow);

    // 剪影塔（SVG）
    const tower = document.createElement('div');
    tower.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);opacity:.5;';
    tower.innerHTML = `<svg width="220" height="520" viewBox="0 0 220 520" fill="#3a4656">
      <path d="M110 20 L128 90 L120 90 L120 160 L140 160 L140 240 L150 240 L150 340
               L165 340 L165 460 L175 460 L175 520 L45 520 L45 460 L55 460 L55 340
               L70 340 L70 240 L80 240 L80 160 L100 160 L100 90 L92 90 Z"/></svg>`;
    this.root.appendChild(tower);

    // 标题
    const title = document.createElement('div');
    title.style.cssText = 'position:relative;text-align:center;margin-bottom:64px;';
    title.innerHTML = `
      <div style="font-size:16px;letter-spacing:14px;opacity:.6;font-family:Inter,sans-serif;font-weight:300;padding-left:14px;">U P W A R D</div>
      <div style="font-size:88px;font-weight:400;letter-spacing:10px;line-height:1.1;margin-top:8px;">向上之塔</div>
      <div style="font-size:22px;opacity:.5;font-style:italic;margin-top:10px;">雾起之处，唯有向上</div>`;
    this.root.appendChild(title);

    // 入口
    const menu = document.createElement('div');
    menu.style.cssText = 'position:relative;display:flex;flex-direction:column;gap:22px;align-items:center;';
    const entry = (label: string, onClick: () => void) => {
      const e = document.createElement('div');
      e.textContent = label;
      e.style.cssText = `font-size:28px;letter-spacing:6px;cursor:pointer;opacity:.8;
        transition:opacity .2s,transform .2s,text-shadow .2s;`;
      e.onmouseenter = () => {
        e.style.opacity = '1';
        e.style.transform = 'translateY(-2px)';
        e.style.textShadow = '0 2px 24px rgba(232,184,109,.6)';
      };
      e.onmouseleave = () => {
        e.style.opacity = '.8';
        e.style.transform = 'translateY(0)';
        e.style.textShadow = 'none';
      };
      e.onclick = onClick;
      return e;
    };
    menu.appendChild(entry('开始攀登', opts.onStart));
    menu.appendChild(entry('选择地图', opts.onMapSelect));
    menu.appendChild(entry('设置', opts.onSettings));
    this.root.appendChild(menu);

    document.body.appendChild(this.root);
  }

  dispose() {
    this.root.remove();
  }
}
