# 在线在用数据清单（Online Data Manifest）

> **用途**：本文件是 DeskBud 网站 `data/` 目录下所有**对外在线服务的数据文件**的权威清单。
> 任何人增删改 `data/` 下的文件、或调整任何一端（网站 / pyside6 桌面端 / kotlin 安卓端）的数据拉取来源时，**必须先对照本清单、改完同步更新本文件**，避免"线上/本地混淆"。
>
> **隔离铁律**：
> - 本清单列出的文件 = **必须在线、被消费**，随仓库部署到 `deskbud.xyz`，**不得**移入本地备份目录。
> - 本地备份/草稿/旧版 = 放 `_local_backup/`（见文末），**永不入库、永不部署**（已在 `.gitignore`）。
> - 网页（可访问页面）与本地文件严格隔离：任何 `_trash/ _tmp/ _spare/ _local_backup/` 下的内容都不会被 EdgeOne 部署。
>
> **最后更新**：2026-09-16

---

## 一、在线在用文件（7 个，全部被消费，必须部署）

| 文件 | 角色 | 在线消费方 | 状态 | 派生关系 |
|---|---|---|---|---|
| `data/works.json` | **唯一真源**（含 builtin/online/hidden 状态、分类 categories、**顶层 channels/channelsVisible 渠道行**） | 网站 `site.js`（`load()`/`onlineWorks()` + `loadCatalog()` 现均返 works；驱动伙伴之家/作品墙/首页详情渠道行/PetsView/detail 购买区）；kotlin B 方案运行时拉 `works/<id>/*` 素材 | **在用·唯一真源（2026-09-16 单源化）** | 手工维护，为一切派生源之根；catalog.json/buddies-snapshot.json 收敛到此 |
| `data/catalog.json` | 旧目录源（已退役） | **三端均已不消费**（2026-09-16 单源化）：网站 site.js 已改读 works.json；pyside6 `CATALOG_URL` 已退役、改 `WORKS_URL`；kotlin 原生层零引用 | **已退役 · 待移 `_local_backup/`** | 与 works.json 角色重叠，已收敛到 works.json |
| `data/buddies-snapshot.json` | 客户端目录增量真源（带顶层 payload sha256，供客户端增量判定） | pyside6 `SNAPSHOT_URL`（**主源·必须在线**）；**kotlin 原生层 09-16 起 0 引用**（`BuddiesSnapshot.kt` 已删）；网站不消费 | **在用·仅 pyside6 主源** | 由 `scripts/gen_buddies_snapshot.py` 从 `works.json` 派生（🔴 works.json 改宠物条目必重跑） |
| `data/bubble.json` | 气泡语录真源（v9，3 宠 rabbit/panda/linekit） | 网站 `site.js`；pyside6 `BUBBLE_URL`；kotlin（原生 fetch） | **在用·三端共用** | 手工维护，三端同步源 |
| `data/download-latest.json` | 各端下载版本清单（同源副本，规避 gitee CORS） | 网站 `get.html:181/217`、`site.js:1513/1516` | **在用** | 由 `scripts/sync_download_manifest.py` 从 gitee `version-android.json` 同步 |
| `data/announcements.json` | 全站公告栏内容 | 网站 `site.js:531` 公告栏注入 | **在用** | 手工维护 |
| `data/sync.json` | 离线快照清单（5 项：privacy/manual/bubbles 等离线包指纹） | 离线 docs 包（`docs/*`）、`gen_sync_json.py --check-remote` 校验 | **在用** | 由 `scripts/gen_sync_json.py` 产出 |

---

## 二、本地隔离目录（永不部署、永不入库）

以下目录已在 `.gitignore` 中排除，仅本机可见，**不属于在线清单、任何人不得据此推断线上状态**：

| 目录 | 用途 |
|---|---|
| `_local_backup/` | **本地备份专用**：在线数据文件的旧版/快照（如改 `catalog.json` 前的副本），仅本机回滚用，不部署 |
| `_trash/` | "删除拦截"规避：删类操作先 `mv` 到这里，不入库 |
| `_tmp/` | 临时产物/中间文件 |
| `_spare/` | 停用但未删的历史页面/脚本（日常不更新） |
| `outputs/` | 本地视觉自检截图产物 |

> ⚠️ **catalog.json 退役（✅ 已满足，2026-09-16）**：三端均已不消费——网站改读 works.json、pyside6 `CATALOG_URL` 退役、kotlin 零引用 ⇒ **catalog.json 可移入 `_local_backup/`**（本地备份，不部署）。
> ⚠️ **buddies-snapshot.json（🔴 不可退役）**：仍是 pyside6 **主源（`SNAPSHOT_URL`）**，必须保持在线；仅 kotlin 原生层已不消费。

---

## 三、单源化收敛（2026-09-16 已定·网站侧已执行）

**决策（老曹）**：统一到 `works.json` 单源，网站详情页/购买区/PetsView/catalog 渠道行全部改读 works.json（含顶层 channels）。**不**走 buddies-snapshot 收敛路线（那是客户端增量源，与网站展示无关）。

**网站侧已完成**：
- `site.js` 的 `loadCatalog()` 改为直接返 `SITE.load()`（works.json）；`PetsView` 的 `fetch('data/catalog.json')` 已改读 works.json 并映射字段（tagline→summary、detail→`detail.html?id=`、download→`versions[].download.url`）。
- `works.json` 已补顶层 `channels`/`channelsVisible`（原 catalog 配置原样迁入）+ 三只在线宠 emoji。

**各端跟进结果（2026-09-16 已闭环）**：
- ✅ pyside6（09-16 13:58）：`CATALOG_URL` 退役，新增 `WORKS_URL` 作兜底；主源仍 `SNAPSHOT_URL`（带 hash 增量）。
- ✅ kotlin（09-16 13:40/14:15）：原生层零引用 catalog/snapshot/category，无需改代码；v0.1.16 已发（内嵌 site.js 刷新至 `c0a8401`）。
- ⇒ catalog.json 可移 `_local_backup/`；**buddies-snapshot.json 不可移**（pyside6 主源）。

---

## 四、维护约定

- 增/删/改任一在线文件 → 同步改本清单对应行 + 升级该文件 URL 的 `?cv=`/版本号（防缓存）。
- 🔴 **works.json 改「宠物条目本身」（新增/下线宠、改 title/cover/thumb/status）→ 必跑 `scripts/gen_buddies_snapshot.py` 并部署**，否则客户端主源（snapshot）看不到变更；仅改 channels/emoji 等非宠物字段可不跑。
- 任一端新增数据拉取源 → 在本清单"在线消费方"列补上。
- 本清单本身随仓库提交（团队可见），但**不作为网页页面**对外链接。
