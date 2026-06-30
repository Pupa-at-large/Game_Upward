/**
 * 2D 渲染引擎：Canvas + requestAnimationFrame 主循环 + 高分屏适配 + resize。
 * 调用方注册 frame(dt) 回调，自行 update + 用 ctx 绘制。
 */
export class Engine2D {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;

  private frameFn: ((dt: number) => void) | null = null;
  private last = 0;
  private raf = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  onFrame(fn: (dt: number) => void) {
    this.frameFn = fn;
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = (now - this.last) / 1000;
      this.last = now;
      this.frameFn?.(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
}
