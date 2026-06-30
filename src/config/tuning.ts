/**
 * 核心手感参数集中调参区。
 * 所有影响跳跃/移动/相机手感的数值都放这里，方便反复微调。
 * 改这里的值无需改逻辑代码。
 */
export const TUNING = {
  // ── 重力与基础物理 ──────────────────────────────
  gravity: -20, // m/s^2，比真实重力大，手感更利落
  playerMass: 1,
  airDrag: 0.02,

  // ── 蓄力跳跃 ────────────────────────────────────
  jumpChargeMin: 0.05, // 秒，最短蓄力（轻点）
  jumpChargeMax: 1.0, // 秒，满蓄力时长
  jumpForceMin: 6, // 最短蓄力起跳垂直速度
  jumpForceMax: 14, // 满蓄力起跳垂直速度
  jumpHorizontalRatio: 0.7, // 水平方向跳跃力占比（朝向输入方向）

  // ── 冲量保留（speedrun 关键）───────────────────
  landingMomentumKeep: 0.6, // 落地保留的水平速度比例
  moveSpeed: 5, // 地面水平移动速度
  groundControl: 0.25, // 地面响应（0-1，越大越跟手；相对移动平台计算）
  groundFriction: 0.4, // 无输入时地面减速比例（每帧），代码层"摩擦"
  airControl: 0.3, // 空中水平控制力度（0-1）

  // ── 抓握 ────────────────────────────────────────
  grabReach: 0.8, // 米，可抓住边缘的水平距离
  grabWindow: 0.3, // 秒，接触边缘后可抓住的时间窗
  grabHangDuration: 1.5, // 秒，最长悬挂时间
  grabPullUpForce: 8, // 翻上平台的垂直力

  // ── 相机 ────────────────────────────────────────
  cameraFollowLerp: 0.1, // 跟随平滑系数
  cameraDistance: 8,
  cameraHeight: 2,

  // ── 玩家体型 ────────────────────────────────────
  playerRadius: 0.4,
  playerHeight: 1.2, // 胶囊总高（视觉用）
};

export type Tuning = typeof TUNING;
