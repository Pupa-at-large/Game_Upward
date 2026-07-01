# 向上之塔 Upward

一款 **2D 侧视蓄力跳爬塔**游戏（Only Up / Jump King 那一类），**纪念碑谷式扁平几何美术** +「越往上越暖」的色温叙事。核心是**蓄力跳跃的手感**。

技术栈：**Canvas 2D + TypeScript + Vite**，纯解析物理（AABB），无渲染/物理库，无后端。

> 历史：项目最初用 Three.js + cannon-es 做 3D，后因手感与复杂度改为 2D（3D 版本保留在 git 历史中）。

## 运行

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 生产构建到 dist/
```

在线试玩（自动部署）：`https://pupa-at-large.github.io/game_upward/`

## 操作

| 操作 | 键位 | 触控 |
|------|------|------|
| 移动 / 瞄准 | A/D 或 ←/→ | 左半屏左右点按 |
| 蓄力跳 | 按住空格蓄力，松开起跳；蓄力时按方向键决定跳跃方向 | 右半屏按住蓄力，松开起跳 |

蓄力时会显示**金色弹道预览**，告诉你这一跳的落点。**禁止二段跳/空中跳**——核心难度来源。

## 调手感

所有手感参数在 [`src/config/tuning.ts`](src/config/tuning.ts)，热更新实时生效。关键：

- `jumpVyMin/Max`：跳跃高度（满蓄力跳高 ≈ `vy²/(2·gravity)`，当前满蓄约 5.8m）
- `jumpVxMin/Max`：跳跃水平距离
- `gravity` / `terminalVy`：下落手感
- `airControl`：空中微调（**故意很小**，蓄力定生死）
- `landingMomentumKeep` / `moveSpeed` / `groundAccel`：移动与连跳动量
- `grab*`：抓握
- `pxPerMeter` / `cameraFollowLerp`：渲染缩放与相机

控制台可访问 `window.__upward`（player / progress / fall / cam / world）调试。

## 项目结构

```
src/
├── main.ts                 入口：装配引擎/世界/玩家/相机/坠落/渲染/HUD + 主循环
├── config/                 tuning.ts（手感）· constants.ts
├── core/                   Engine2D（Canvas+循环）· Input（移动+蓄力+触控）
├── game/                   Player（蓄力跳/AABB/抓握）· World/Platform · Camera2D · FallSystem
├── render/                 Renderer（纪念碑谷风：扁平平台/天空/光尘/弹道预览）
├── systems/                ProgressSystem · SaveSystem（localStorage）
├── ui/                     HUD（海拔/刻度尺/蓄力条/坠落泛红）
└── data/                   maps/*.json（数据驱动）· types.ts
```

## 惩罚模型（坠落重置）

无传统存档点。地图按区段纵向分段（`startY` / `bufferPlatformY` / `boundaryY`）：

- **软惩罚**：在已到达的最高区段内坠落 → 传回该段缓冲台。
- **硬惩罚**：掉出该区段下边界 → 传回该段起点。

## 设计文档

- [`docs/design-prompt-v2.md`](docs/design-prompt-v2.md)：给 Claude Design 的 2D·纪念碑谷风 UI 设计 prompt（含 5 关逐关美术与机关描述）。

### 五座塔 · 色温线（冷 → 暖）

越往上爬越暖、越有希望，顶端晨曦暖金。值写在各地图 JSON 的 `theme`。

| 塔 | 色温 | 机制重点 | summit |
|----|------|----------|--------|
| 晨雾塔 | 冷雾蓝灰 | static / moving / 抓握（教学）| 90m |
| 生活国度 | 渗暖青瓷 | bouncer / moving / fading | 140m |
| 云海齿轮 | 中性暮色黄铜 | gear / wind / 传送带 | 180m |
| 仙山天梯 | 暖金夕照 | fading / wind / bouncer | 220m |
| 逆位之塔 | 晨曦暖金 | 重力翻转 / 镜像 / 限时坍塌 | 260m |

## 开发阶段

- **Phase 1（2D MVP，已完成）**：Canvas 引擎、蓄力跳（弹道预览）、冲量保留、抓握、移动平台、
  晨雾塔 3 区段、区段坠落重置、垂直相机、HUD、纪念碑谷风渲染。
- **Phase 2（流程与框架，已完成）**：主菜单 / 地图选择（含解锁与最佳记录）/ 通关画面、
  完整晨雾塔至登顶、SaveSystem 存档、登顶判定与结算。
- **Phase 3（内容扩展，进行中）**：全部机关已实现（fading / bouncer / wind / gear）；
  生活国度、云海齿轮两张机关关卡 + 仙山天梯、逆位之塔短程试玩关；星核收集；地图解锁链。
  待办：升级树 UI 与光点货币、四关全长内容、逆位之塔的重力翻转/镜像机关。
- **Phase 4**：speedrun 计时、每日挑战、风景收集、纯净模式、幽灵竞速、音效粒子打磨。

> 调试：URL 加 `?map=<id>`（如 `?map=cloud-gears`）可直接进入某张图，跳过菜单与解锁。
