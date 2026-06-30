/**
 * 不变常量。区别于 tuning.ts：这里放不需要手测调整的工程常量。
 */
export const CONST = {
  FIXED_TIMESTEP: 1 / 60, // 物理固定步长
  MAX_SUBSTEPS: 5,
  PHYSICS_MAX_DELTA: 1 / 20, // 单帧最大 dt，避免卡顿后穿模

  // 碰撞分组
  GROUP_PLAYER: 1,
  GROUP_PLATFORM: 2,

  // 坠落判定：玩家中心低于缓冲台/起点这个量才算"掉下去了"
  FALL_RESET_MARGIN: 1.5,

  // 落地检测：脚下射线长度（相对玩家半径的余量）
  GROUND_PROBE_MARGIN: 0.15,
} as const;
