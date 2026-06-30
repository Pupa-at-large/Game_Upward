/**
 * 不变的工程常量（区别于 tuning.ts 的手感参数）。
 */
export const CONST = {
  PHYSICS_MAX_DELTA: 1 / 30, // 单帧最大 dt，避免卡顿后穿透
  FALL_RESET_MARGIN: 2, // 低于缓冲台/起点这个量（米）才判定坠落
  COYOTE: 0.08, // 秒，离地后仍可起跳的宽限（土狼时间）
} as const;
