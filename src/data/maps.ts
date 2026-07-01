import type { MapDef } from './types';
import mistyTower from './maps/misty-tower.json';
import livingRealm from './maps/living-realm.json';
import cloudGears from './maps/cloud-gears.json';
import celestialStairs from './maps/celestial-stairs.json';
import invertedTower from './maps/inverted-tower.json';

/** 五座塔的有序列表（攀爬顺序 = 色温冷→暖）。 */
export const MAPS: MapDef[] = [
  mistyTower as MapDef,
  livingRealm as MapDef,
  cloudGears as MapDef,
  celestialStairs as MapDef,
  invertedTower as MapDef,
];

export function getMap(id: string): MapDef | undefined {
  return MAPS.find((m) => m.id === id);
}

/**
 * 解锁条件解析。unlockCondition 语法：
 *   null            → 默认解锁
 *   "clear:<mapId>" → 需先通关某张图
 */
export function parseUnlock(cond: string | null): { type: 'default' | 'clear'; mapId?: string } {
  if (!cond) return { type: 'default' };
  const [k, v] = cond.split(':');
  if (k === 'clear') return { type: 'clear', mapId: v };
  return { type: 'default' };
}
