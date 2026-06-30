import { TUNING } from '../config/tuning';

/**
 * 2D 相机：垂直跟随玩家（带向上预判），水平平滑居中。
 * 提供世界坐标 → 屏幕坐标变换。玩家固定在屏幕约 70% 处，以便看清上方路线。
 */
export class Camera2D {
  camX = 0;
  camY = 0;
  private w = 1;
  private h = 1;

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  /** 玩家锚点在屏幕高度的占比（越大玩家越靠下，越能看到上方）。 */
  private get anchorY() {
    return this.h * 0.68;
  }

  follow(px: number, py: number, immediate = false) {
    const targetX = px;
    const targetY = py + TUNING.cameraLookAheadUp;
    if (immediate) {
      this.camX = targetX;
      this.camY = targetY;
    } else {
      this.camX += (targetX - this.camX) * TUNING.cameraFollowLerp;
      this.camY += (targetY - this.camY) * TUNING.cameraFollowLerp;
    }
  }

  sx(worldX: number): number {
    return this.w / 2 + (worldX - this.camX) * TUNING.pxPerMeter;
  }

  sy(worldY: number): number {
    return this.anchorY - (worldY - this.camY) * TUNING.pxPerMeter;
  }

  /** 一段世界高度对应的像素长度。 */
  get scale() {
    return TUNING.pxPerMeter;
  }
}
