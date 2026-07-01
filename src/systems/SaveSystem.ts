import { parseUnlock } from '../data/maps';

/**
 * localStorage 存读：每张地图的最高点、最佳用时、是否通关，并据此判断解锁。
 */
export interface MapSave {
  maxHeight: number;
  bestTimeSec: number | null;
  cleared: boolean;
}

export interface SaveData {
  version: number;
  maps: Record<string, MapSave>;
}

const KEY = 'upward.save.v1';

const DEFAULT: SaveData = { version: 1, maps: {} };

export class SaveSystem {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== DEFAULT.version) return structuredClone(DEFAULT);
      return parsed;
    } catch {
      return structuredClone(DEFAULT);
    }
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 隐私模式等场景忽略写入失败 */
    }
  }

  getMap(mapId: string): MapSave {
    return this.data.maps[mapId] ?? { maxHeight: 0, bestTimeSec: null, cleared: false };
  }

  /** 根据解锁条件与存档判断某张图是否已解锁。 */
  isUnlocked(cond: string | null): boolean {
    const u = parseUnlock(cond);
    if (u.type === 'default') return true;
    if (u.type === 'clear' && u.mapId) return this.getMap(u.mapId).cleared;
    return true;
  }

  /** 记录一次跑图结果，返回是否刷新了最高点。 */
  recordRun(mapId: string, maxHeight: number, cleared: boolean, timeSec: number) {
    const prev = this.getMap(mapId);
    const next: MapSave = {
      maxHeight: Math.max(prev.maxHeight, maxHeight),
      cleared: prev.cleared || cleared,
      bestTimeSec:
        cleared && (prev.bestTimeSec === null || timeSec < prev.bestTimeSec)
          ? timeSec
          : prev.bestTimeSec,
    };
    const improved = next.maxHeight > prev.maxHeight;
    this.data.maps[mapId] = next;
    this.persist();
    return improved;
  }
}
