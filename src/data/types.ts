/**
 * 2D 地图数据结构（侧视攀爬）。坐标单位为「米」，y 轴向上。
 * 渲染时由 Camera2D 做世界→屏幕变换。
 */

export type PlatformType =
  | 'static'
  | 'moving'
  | 'fading'
  | 'bouncer'
  | 'wind'
  | 'gear';

export interface PlatformDef {
  type: PlatformType;
  pos: [number, number]; // 中心 [x, y]
  size: [number, number]; // [宽, 高]
  // moving
  axis?: 'x' | 'y';
  range?: number;
  speed?: number;
  // fading
  fadeDelay?: number;
  respawnTime?: number;
  // bouncer
  bounceForce?: number;
  // wind
  direction?: [number, number];
  strength?: number;
  // gear（2D：以中心为轴旋转的几何条）
  radius?: number;
  rotSpeed?: number;
}

export interface SegmentDef {
  id: string;
  name: string;
  startY: number;
  bufferPlatformY: number;
  boundaryY: number;
  platforms: PlatformDef[];
}

export interface StarCoreDef {
  pos: [number, number];
}

export interface MapTheme {
  /** 天空渐变：底部（较冷/暗）→ 顶部（较暖/亮）。 */
  skyBottom: string;
  skyTop: string;
  /** 平台主色（顶面）与厚度面。 */
  platformTop: string;
  platformSide: string;
  /** 强调色（光点、游标、星核辉光）。 */
  accent: string;
  /** 远景塔剪影色。 */
  silhouette: string;
}

export interface MapDef {
  id: string;
  name: string;
  tagline: string;
  theme: MapTheme;
  unlockCondition: string | null;
  segments: SegmentDef[];
  summitY: number;
  starCores: StarCoreDef[];
  /** 卸下负累时依次浮现的放下短诗（可选）。 */
  poems?: string[];
}
