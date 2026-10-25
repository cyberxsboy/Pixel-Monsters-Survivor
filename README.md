# 精灵幸存者 · Pixel Monsters Survivor

> 中文 · 像素风 · 幸存者类（Bullet Heaven）网页小游戏
> 零依赖 · 无构建 · 可直接部署到 Cloudflare（Workers / Pages）

一款融合了「走位躲避 + 自动攻击 + 升级三选一」的 roguelike 生存游戏：开局选择伙伴精灵，在无限生成的野外对抗不断涌来的魔物，每 2 分钟迎战头目，随机刷新的裂隙通往传说精灵竞技场，坚持 **15 分钟**即可通关。局外还有扭蛋收集、永久强化、每日任务与排行榜，形成「打一局 → 变强 → 打更远」的循环。

**立即试玩**：执行 `node server.js` 后访问 `http://127.0.0.1:8788/`（或直接双击 `index.html`，部分浏览器对 `file://` 有限制）。

> 原创同人向作品：所有精灵、像素美术、背景音乐均为程序生成 / 原创，**未使用任何宝可梦官方素材与名称**。

---

## 一、功能介绍

### 核心战斗

| 系统 | 说明 |
|---|---|
| 走位 + 自动攻击 | 精灵自动使用当前选中技能，玩家专注走位；`Shift` 冲刺带无敌帧 |
| 升级三选一 | 拾取经验宝石升级，从技能 / 被动道具 / 治疗中三选一 |
| 技能体系 | 20 个技能 × 10 种弹幕形态：直线弹、扇形、连锁闪电、环绕、光环、光束、回旋镖、追踪弹、护盾、脉冲 |
| 武器进化 | 技能满级 + 持有关键道具（头目掉落）→ 进化为专属强化形态 |
| 精灵进化 | 达到等级阈值自动进化：外观变化 + 属性成长 + 解锁新技能 |

### 世界与敌人

- **无限分块地形**：草地 / 深草 / 水域（减速）/ 沙地（加速）/ **熔岩（灼烧敌我双方）**
- **场景交互**：树木阻挡弹幕、石块与草丛可破坏、回复泉回血、宝箱、石碑
- **8 类敌人 AI**：追击、环绕、远程、自爆、冲锋（带地面预警）、治疗、护盾、召唤
- **精英与闪光**：精英怪带额外血量光环；任意敌人 1/4096 概率闪光，击败后收入图鉴
- **天气系统**：晴 / 雨 / 沙暴 / 飘雪 / 迷雾，对应属性增减伤
- **12 属性克制**：战斗实时提示「效果拔群 / 效果不佳」
- **头目战**：每 2 分钟一只，多阶段弹幕，击败后可选一份祝福
- **裂隙传说战**：地图随机刷新裂隙，进入独立竞技场挑战传说精灵

### 长线养成

- **图鉴收集**：21 种原创精灵（火 / 水 / 草三条御世家 + 电、冰、岩、飞、幽、龙、虫、恶），支持闪光版本
- **扭蛋召唤**：消耗扭蛋券（局内掉落 / 任务获取），重复精灵转化为钻石
- **永久强化**：7 条成长线（攻击 / 生命 / 移速 / 拾取 / 恢复 / 开局等级 / 暴击）
- **每日任务 + 12 项成就**
- **排行榜**：今日 / 历史生存时长榜（需 D1 云存档）
- **存档**：localStorage 本地存档，支持云同步、JSON 导入导出

### 技术特性

- 纯 HTML + CSS + 原生 JavaScript + Canvas 2D，**无任何运行时依赖、无构建步骤**
- 音频为 Web Audio 实时合成（三套曲目 + 全套音效），零版权风险、零资源体积
- 分块地形按需烘焙、对象池复用弹幕 / 掉落 / 精灵，400+ 同屏物体仍流畅
- 所有美术为代码内像素网格生成，整包体积约 **230KB**（不含依赖）

---

## 二、部署方法

前置：Node.js ≥ 18、npm。所有命令均在项目根目录执行。

### 先弄清楚：Workers 并不是"只能传一个 JS 文件"

- **Dashboard 网页里的 "Edit code"** 才是单文件模式（只能贴一份脚本）——不适合本项目。
- **正确的 CLI 部署**是一次发布两部分：`worker.js`（唯一的单文件脚本，无 import、无需打包）+ 静态资产（整个游戏），后者由 `wrangler.toml` 的 `[assets]` 指定，运行时通过 `env.ASSETS` 提供服务。
- 项目已内置 **`.assetsignore`**，部署时自动排除 `node_modules`、`tools/`、`server.js`、`package.json` 等开发文件——否则依赖目录里的 `workerd.exe`（97 MiB）会超出 Cloudflare 单文件 25 MiB 上限导致上传失败。

### 方式 A：Cloudflare Workers（推荐，含云存档 + 排行榜）

**A0. 本地干跑验证（可选，无需登录）**

```bash
npx wrangler deploy --dry-run
# 期望输出：Total Upload: 4.17 KiB，无 ERROR
```

**A1. 登录**

```bash
npx wrangler login        # 浏览器中点击 Allow 授权
```

> 若 OAuth 失败：去 Dashboard → My Profile → API Tokens 创建 **Edit Cloudflare Workers** Token，然后在终端设置 `CLOUDFLARE_API_TOKEN` 环境变量即可，后续命令通用。

**A2. 创建 D1 数据库并初始化表结构（云存档必需）**

```bash
npx wrangler d1 create pixel_monsters_survivor
# 记下输出的 database_id

npx wrangler d1 execute pixel_monsters_survivor --remote --file=./schema.sql
```

**A3. 填入配置** —— 打开 `wrangler.toml`，取消注释并粘贴 id：

```toml
[[d1_databases]]
binding = "DB"
database_name = "pixel_monsters_survivor"
database_id = "粘贴 A2 的 database_id"
```

可选（KV 加速排行榜读写）：

```bash
npx wrangler kv namespace create SESSION
```

```toml
[[kv_namespaces]]
binding = "SESSION"
id = "粘贴输出的 id"
```

**A4. 部署**

```bash
npx wrangler deploy        # 或 npm run deploy
```

成功后得到 `https://pixel-monsters-survivor.<你的子域>.workers.dev`。

**A5. 验证**：访问 `<域名>/api/health` 应返回 JSON；进游戏点「同步」应显示「云存档已同步」。

**日常更新**：改完代码只需重跑 `npx wrangler deploy`（D1/KV 配置不变）。

### 方式 B：Cloudflare Pages（纯静态，无云存档）

Pages 上没有 `worker.js`，`/api/*` 不存在，游戏**自动降级为 localStorage 本地存档**，其余功能完整。二选一：

**B1. Git 集成（推荐，最省心）**

1. 把项目推到 GitHub（仓库已含 `.gitignore`，`node_modules` 不会被上传）
2. Dashboard → **Workers & Pages** → Create → **Pages** → Connect to Git → 选中仓库
3. Framework preset：**None**；Build command：留空；**Build output directory：`.`**
4. Deploy —— 之后每次 push 自动发布

**B2. Dashboard 直接上传（无需 GitHub）**

Create → Pages → **Direct Upload**，**只拖入游戏文件**：

```
index.html   css/   js/   favicon.svg   manifest.webmanifest   404.html
```

> ⚠️ 不要拖整个文件夹——根目录的 `node_modules` 有近 2000 个文件和 97 MiB 的可执行体，会超出 Pages 限制。若确实要拖整目录，先临时改名：`Rename-Item node_modules _nm`，上传完成后改回。

**日常更新**：B1 重新 push；B2 重新拖一次。

### 方式 C：本地运行（开发 / 试玩）

```bash
node server.js        # 或 npm start
# 打开 http://127.0.0.1:8788/

npm run dev           # wrangler dev，本地模拟 Cloudflare（含 /api/*）
```

直接双击 `index.html` 也可以玩：`file://` 下云请求与 manifest 已自动跳过（控制台无 CORS 报错），存档走 localStorage。

### API 一览（仅方式 A 生效，worker.js）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/save` | `{token, nick, data}` 保存存档 |
| GET | `/api/load?token=` | 读取存档 |
| GET | `/api/rank?scope=today\|all` | 排行榜 Top20 |
| POST | `/api/rank` | `{token, nick, mon, ms}` 提交成绩（保留每人最佳） |

其余路径全部回落到静态资源（`env.ASSETS`）。

### 常见部署问题

| 现象 | 原因 / 解法 |
|---|---|
| `Asset too large ... workerd.exe 97.3 MiB` | `.assetsignore` 被删除或改动——恢复它即可（它排除了 `node_modules`） |
| `wrangler login` 报 CSRF / 超时 | 在自己终端重跑一次，或改用 API Token（见 A1） |
| 排行榜/云存档 404 | 方式 B 没有 `/api/*` 属正常（降级本地）；方式 A 需完成 A2/A3 后重新 deploy |
| 控制台 manifest / fetch CORS 报错 | 只在 `file://` 下出现且已被自动跳过，属历史遗留提示；用 `node server.js` 访问即干净 |

---

## 三、游玩操作说明

### 电脑（键盘）

| 按键 | 动作 |
|---|---|
| `W` `A` `S` `D` / 方向键 | 移动 |
| `Shift` / `空格` | **冲刺**（0.3 秒无敌，有冷却条） |
| `1` `2` `3` `4` | 切换主动技能 |
| `Q` / `E` | 循环切换技能 |
| `Esc` / `P` | 暂停 / 继续 |
| 鼠标点击 | 菜单、升级三选一、技能槽 |

### 手机 / 平板（横屏）

- 屏幕**左侧任意位置按下拖动** → 出现虚拟摇杆移动
- 右下角 **闪** 按钮 → 冲刺
- 底部技能槽点击切换；右上角按钮暂停

### 新手流程

1. 标题页点 **开始冒险** → 主菜单 **更换伙伴** 选择初始精灵（小焰狐 / 溪豆 / 芽芽鹿）
2. 进入战斗：走位拾取绿色**经验宝石**，升级时从三张卡片中选一
3. 注意底部技能栏 —— **只有当前高亮的技能会攻击**，用 `1~4` 或 `Q/E` 切换
4. 血量危险时找地图上的**回复泉**（蓝色泉眼），或打开心形回复包
5. 看到屏幕提示「头目来袭」准备走位躲弹幕；「裂隙出现」可去挑战传说精灵
6. 坚持 **15 分钟**达成通关，结算获得钻石 / 扭蛋券
7. 回主菜单：**扭蛋召唤**新精灵 → **永久强化**消费钻石 → 挑战更高纪录

### 进阶要点

- **属性克制**：水克火、火克草、电克飞、幽克一般……被克制时伤害减半，切换技能应对
- **武器进化**：技能满级后，若持有对应关键道具（击败头目掉落），升级界面会出现「武器进化」金色卡片，优先选它
- **环绕系技能**（藤蔓缠绕 / 浮岩石）：自动 360° 攻击，适合贴脸走位流
- **冲刺无敌帧**：留着躲 Boss 的全屏弹幕与自爆怪
- **熔岩**对敌我双方都造成伤害 —— 必要时可以把怪引到熔岩里
- **闪光怪**屏幕边缘有箭头指引，击杀必得，别放过
- 属性进化：等级到 8 / 18 级自动进化，进化瞬间回满血并解锁新技能

---

## 目录结构

```
index.html              页面骨架与脚本加载顺序
css/style.css           UI 样式
js/core/                util / rng / input / audio(WebAudio 合成) / save(本地+云) / gfx(像素渲染)
js/data/                types(属性克制) / sprites(像素图) / monsters / moves / enemies / upgrades
js/world/               分块地形生成与烘焙
js/entities/            fx / projectile / pickup / player / enemy
js/systems/             combat / spawner(波次) / levelup(三选一) / boss / gacha
js/ui/                  ui / hud / menu
js/game.js              主循环与状态机
worker.js               Cloudflare Worker（API + 静态资产回落）
wrangler.toml           部署配置（[assets] 指向仓库根目录）
.assetsignore           部署排除清单（node_modules 等开发文件）
schema.sql              D1 表结构
server.js               本地静态服务器
tools/smoke-test.js     Node 冒烟测试（含视口/烘焙/对象池回归断言）
```

## 二次开发

- 新增精灵：`js/data/sprites.js` 写像素网格 + `js/data/monsters.js` 注册
- 新增技能：`js/data/moves.js` 写 8 级数值表与进化参数
- 调数值：`js/systems/spawner.js`（刷怪曲线）、`js/data/upgrades.js`（强化）、`js/game.js`（15 分钟通关线）
- 新增根目录静态文件（图片 / 音频）：会随 `[assets]` 自动发布；若属于开发产物，需在 `.assetsignore` 中加一行排除
- 自检：`node tools/smoke-test.js`（模拟开局 / 战斗 / 升级 / 环绕技能回收 / 扭蛋 / 结算）
- 部署前干跑：`npx wrangler deploy --dry-run`

## 许可

代码采用 **PolyForm Noncommercial 1.0.0**：可自由学习、修改、分享，禁止商业用途。精灵、像素美术与音乐为本项目原创。
