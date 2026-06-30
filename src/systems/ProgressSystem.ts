/**
 * 进度统计：当前高度、最高点、用时、坠落计数。
 * 仅用于 UI 显示与解锁判定，不影响重生（重生由 FallSystem 决定）。
 */
export class ProgressSystem {
  private _height = 0;
  private _maxHeight = 0;
  private _elapsed = 0;
  private _falls = 0;

  /** @param baseY 高度计的零点（出生平台高度），让显示从 0 起算。 */
  constructor(private baseY = 0) {}

  update(dt: number, y: number) {
    this._elapsed += dt;
    this._height = Math.max(0, y - this.baseY);
    if (this._height > this._maxHeight) this._maxHeight = this._height;
  }

  registerFall() {
    this._falls++;
  }

  get height() {
    return this._height;
  }
  get maxHeight() {
    return this._maxHeight;
  }
  get elapsed() {
    return this._elapsed;
  }
  get falls() {
    return this._falls;
  }
}
