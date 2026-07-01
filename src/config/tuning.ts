/**
 * 2D 攀爬·核心手感参数集中调参区。单位：米、秒、米/秒。
 * 改这里即可实时微调跳跃弧线、移动、抓握、相机。
 */
export const TUNING = {
  // ── 重力与基础 ──────────────────────────────────
  gravity: 22, // m/s^2（向下为正，在 Player 中取负应用）；偏大更利落
  terminalVy: 24, // 最大下落速度（限制手感）

  // ── 蓄力跳跃 ────────────────────────────────────
  // 满蓄力垂直起跳 vy 决定最大跳高 ≈ vy^2 / (2g)。
  // 当前：vy=16 → 约 5.8m；vy=8(轻点) → 约 1.5m。
  jumpChargeMin: 0.05, // 秒，最短蓄力（轻点）
  jumpChargeMax: 0.9, // 秒，满蓄力时长
  jumpVyMin: 8, // 最短蓄力垂直起跳速度
  jumpVyMax: 16, // 满蓄力垂直起跳速度
  jumpVxMax: 9, // 满蓄力时朝瞄准方向的水平速度
  jumpVxMin: 4, // 轻点时水平速度

  // ── 移动与冲量 ──────────────────────────────────
  moveSpeed: 6, // 地面水平移动速度
  groundAccel: 0.3, // 地面控制响应 0-1
  groundFriction: 0.5, // 无输入时每帧水平衰减
  airControl: 0.12, // 空中水平微调（小！蓄力跳定生死，这是核心难度）
  landingMomentumKeep: 0.5, // 落地保留水平速度比例（连跳累积）

  // ── 抓握 ────────────────────────────────────────
  grabReach: 0.5, // 米，贴边可抓的水平距离
  grabWindow: 0.35, // 秒，离地后仍可抓的时间窗
  grabHangDuration: 1.6, // 秒，最长悬挂
  grabPullUpVy: 11, // 翻上平台的垂直速度

  // ── 相机 ────────────────────────────────────────
  pxPerMeter: 46, // 渲染缩放：1 米 = 多少像素
  cameraFollowLerp: 0.12, // 垂直跟随平滑
  cameraLookAheadUp: 2.2, // 视线略偏上，给上方留出预判空间（米）

  // ── 玩家体型 ────────────────────────────────────
  playerW: 0.7,
  playerH: 1.1,

  // ── 放下 · 轻盈度（核心变量）────────────────────
  weightStart: 0.9, // 进塔初始负累 w∈[0,1]
  weightMin: 0.08, // 该塔可达最轻
  shedPerPerfect: 0.06, // 每次正心落点卸下的负累
  sinkWeightPenalty: 0.05, // 柔性下沉时加重
  // 有效重力 = gravity × (gravLo + gravHi·w)：越轻重力越小 → 越高越飘
  gravLo: 0.6,
  gravHi: 0.4,
  floatFactor: 0.55, // 轻且接近弧顶时的额外重力衰减（悬停感）
  floatWeightBelow: 0.45, // w 低于此值才有悬停
  sweetSpot: 0.35, // 正心甜区 = ±35% 半宽
  burdenCount: 4, // 负累件数（跟随的小几何暗影）
};

export type Tuning = typeof TUNING;
