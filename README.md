# 向上之塔 Upward

一款类 Only Up 的 Web 端 3D 垂直攀爬跳跃游戏。核心是**蓄力跳跃的手感**。

技术栈：Three.js · cannon-es · TypeScript · Vite（纯前端，无后端）。

## 运行

```bash
npm install
npm run dev        # 本地开发，默认 http://localhost:5173
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 预览生产构建
```

## 操作

| 操作 | 键位 | 触控 |
|------|------|------|
| 移动 | WASD / 方向键 | 左半屏虚拟摇杆 |
| 蓄力跳 | 按住空格蓄力，松开起跳 | 右半屏按住蓄力，松开起跳 |

**禁止二段跳/空中跳**——这是核心难度来源，不会被"优化"掉。

## 调手感

所有手感参数集中在 [`src/config/tuning.ts`](src/config/tuning.ts)，改完热更新即可实时验证。
也可在浏览器控制台访问 `window.__upward`（engine / player / progress / fall / map）调试。

关键参数：

- `jumpForceMin/Max`、`jumpChargeMin/Max`、`jumpHorizontalRatio`：蓄力跳曲线
- `landingMomentumKeep`：落地保留的水平动量（连跳累积、speedrun 关键）
- `moveSpeed` / `groundControl` / `groundFriction` / `airControl`：地面与空中控制
- `grabReach` / `grabWindow` / `grabHangDuration` / `grabPullUpForce`：抓握
- `gravity`：全局重力（越大越利落）

## 项目结构

```
src/
├── main.ts                 入口：装配引擎/场景/主循环
├── config/                 tuning.ts（手感）· constants.ts（工程常量）
├── core/                   Engine · Physics · Input
├── player/                 PlayerController（蓄力跳/冲量/抓握）· PlayerCamera
├── world/                  MapLoader · Segment · Platform · mechanics/
├── systems/                FallSystem（区段重置）· ProgressSystem · SaveSystem
├── ui/                     HUD
└── data/                   maps/*.json（数据驱动）· types.ts
```

## 惩罚模型（坠落重置）

无传统存档点。地图按 `Segment` 纵向分段，每段含 `startY` / `bufferPlatformY` / `boundaryY`：

- **软惩罚**：在已到达的最高区段内坠落 → 传回该段缓冲台。
- **硬惩罚**：掉出该区段下边界 → 传回该段起点。

进度（最高高度）仅用于 UI 与解锁，不影响重生位置。

## 开发阶段

- **Phase 1（MVP，已完成）**：项目骨架、引擎/物理/输入、蓄力跳+冲量保留+抓握、
  晨雾塔前 3 区段（含 moving 平台）、区段坠落重置、垂直相机、HUD（高度/海拔尺/蓄力条/坠落泛红）。
  已通过浏览器冒烟测试：下落静止、水平移动、蓄力起跳、坠落软重置均正确。
- **Phase 2**：主菜单/地图选择/通关画面、存档、完整晨雾塔（至 summitY=90）。
- **Phase 3**：全部机关（fading/bouncer/wind/gear）、其余 4 张地图、升级树与光点、星核收集。
- **Phase 4**：speedrun 计时、每日挑战、风景收集、纯净模式、幽灵竞速、音效粒子打磨。

### 五张地图色温线（冷 → 暖）

越往上爬色调越暖、越有希望，顶端晨曦暖金。值写在各地图 JSON 的 `theme`：

| 地图 | fog | ambient | accent |
|------|-----|---------|--------|
| 晨雾塔 | `#6B8CAE` | `#8B7FA8` | `#C4CDD6` |
| 生活国度 | `#7E96A8` | `#9A8FA0` | `#D8D2C8` |
| 云海齿轮 | `#A89B8C` | `#B39A86` | `#E4D9C4` |
| 仙山天梯 | `#C9A878` | `#C99A6A` | `#F0E0C0` |
| 逆位之塔 | `#E0B878` | `#D8A860` | `#FBEFCF` |
