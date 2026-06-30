/**
 * 地图数据结构定义（与 data/maps/*.json 对应）。
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
  pos: [number, number, number];
  size: [number, number, number];
  // moving
  axis?: 'x' | 'y' | 'z';
  range?: number;
  speed?: number;
  // fading
  fadeDelay?: number;
  respawnTime?: number;
  // bouncer
  bounceForce?: number;
  // wind
  direction?: [number, number, number];
  strength?: number;
  // gear
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
  pos: [number, number, number];
}

export interface MapTheme {
  fog: string;
  ambient: string;
  accent: string;
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
}
