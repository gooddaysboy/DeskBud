# DeskBud 分享卡片 · 版式基准 v1

> 2026-09-13 website 出（执行协同板 09-13 20:00 `[kotlin → website]` 派活）。
> **视觉基准 = `share-card-sample.svg`**（尺寸/坐标/字号/配色全部写在文件注释里，一份文件即规范）。
> 效果示例见同目录 `share-card-sample*.png`。
>
> 🔴 **2026-09-17 修订（老曹拍板 1B）**：分享卡二维码目标由 `get.html` 改为 **`buddies.html`**。
> 下面正文里凡涉及二维码目标的旧表述已就地标注，末节「六」是本次修订记录。

## 一、website 侧交付素材

| 文件 | 用途 | 备注 |
|---|---|---|
| `assets/share/qr.png` | **卡片二维码（必须用这个）** | 525×525 · 1-bit · 698 B。🔴 Android 原生 Canvas / 桌面 Pillow 都画不了 SVG，只能吃 PNG。**目标 = `buddies.html`（伙伴页，2026-09-17 起）** |
| `assets/img/qr-android.svg` | **下载页**扫码用的 SVG | ⚠️ **与 `qr.png` 目标不同**：这个指向 `get.html`（给桌面访客扫了装手机），别跟着分享卡改 |
| `assets/share/share-card-sample.svg` | 版式规范（1080×1440） | 参数在注释里；含真实二维码 |
| `assets/share/share-card-sample.png` | 效果示例 · 织兔子（两行人设句） | Pillow 合成 |
| `assets/share/share-card-sample-panda.png` | 效果示例 · 织熊猫（emoji 彩色） | |
| `assets/share/share-card-sample-linekit.png` | 效果示例 · 线咪（单行人设句） | |

生成器（均在 `scripts/`，换码/改版式后按顺序跑）：

```bash
PY=~/.workbuddy/binaries/python/envs/default/Scripts/python.exe
$PY scripts/gen_qr.py                    # 两个二维码（各自目标见文件头）
$PY scripts/gen_share_card_samples.py    # 3 张示例卡（内嵌 qr.png，必须重跑）
$PY scripts/verify_qr.py                 # 自检：把产物解码回 URL 比对（2/2 才算对）
```

> `gen_share_card_samples.py` 原为 2026-09-13 的 `_tmp/_make_share_card.py`（临时目录，不在版本控制里），
> 2026-09-17 收编进 `scripts/`，逻辑未改。`verify_qr.py` 同批新增。

## 二、关键参数（与 SVG 注释一致）

| 项 | 值 |
|---|---|
| 画布 | 1080 × 1440（3:4 竖版） |
| 卡底 | `#FFF1E6`（`--brand-soft`） |
| 顶部装饰条 | `0,0 1080×14` `#E8722B`（可选） |
| 宠物区 | `x190 y150 w700 h620` · contain 居中 · **idle 首帧** |
| 人设句 | 居中 `x540` · **两行基线 900/976（单行 938）· 行高 76** · 字号 56 · 色 `#222` · 可用宽 860 |
| 角色 emoji | 居中 `x540` · 基线 **1068** · 字号 58 |
| 分隔线 | `x110→970, y1139` · 高 2 · `#EFE2CF` |
| 品牌字标 | `x110` 基线 `y1225` · `DeskBud` · 48 粗 · `#E8722B` |
| 官网域名 | `x110` 基线 `y1280` · `deskbud.xyz` · 28 · `#9A8874` |
| 二维码 | `x810 y1150` · 180×180 · 内容 **`https://deskbud.xyz/buddies.html`**（2026-09-17 起；此前为 `get.html`） |
| 安全边距 | 四边 ≥ 90 |
| 字体 | 系统 sans（PingFang SC / Microsoft YaHei / Noto Sans CJK），不内嵌字体 |

## 三、与 kotlin 草案（`DeskBud_三端分享卡片_设计方案_2026-09-13.md` §3）的 3 处修正

1. **人设句基线**：草案 920/1000 + emoji 1050 → 两行时 emoji 会压到第二行上（已实测）。
   改为 **两行 900/976、单行 938、emoji 1068**。
2. **中文折行**：按中文标点（`，。！？；、`）优先折行，**不要逐字硬切** —— 否则会断成「…门牙两颗露一 / 点」。
3. **emoji 来源**：统一取 `personas[role].emoji`（见下）。

其余（尺寸口径、卡底、宠物位、无「免费下载」引导字样、不放 App 图标）与草案一致。

## 四、`personas` 数据（website 已入库 `data/bubble.json`，version 7 → 8）

| role | name | emoji | zh（zh 优先，kotlin 只读 zh） |
|---|---|---|---|
| rabbit | 织兔子 | 🐰 | 长耳耷拉脸蛋圆，门牙两颗露一点 |
| panda | 织熊猫 | 🐼 | 国宝主打一个躺平 |
| cat | 小猫 | 🐱 | 猫的事情，你少管哦 |
| dog | 小狗 | 🐶 | 我的眼里只有主人 |
| plant | 小绿植 | 🌱 | 安静发呆也是成长 |
| linekit | 线咪 | ✏️ | 我只有几根线条，但够陪你啦 |

> 卡片正文渲染时外面套 `「」`（英文套 `“”`）。
> `cat` / `dog` / `plant` 三只尚未上线，`name` 为占位名（上线前定名后改一处即可）。

## 五、老曹拍板（2026-09-13 22:27，三项全定 ✅）

| # | 事项 | 结论 |
|---|---|---|
| 1 | 卡片尺寸 | ✅ **1080×1440 竖版**（方版 1080×1080 不采用；其参数仍保留在 `share-card-sample.svg` 注释末尾，备用） |
| 2 | 二维码目标 | ⚠️ **原结论「维持 `get.html`」已于 2026-09-17 改判为 `buddies.html`**（见第六节；此处保留原文以便追溯） |
| 3 | Android「保存到相册」 | ✅ **本期不做**（minSdk 26 走 MediaStore 需运行时存储权限，不值；后续按需再加） |

## 六、2026-09-17 修订记录（二维码目标：`get.html` → `buddies.html`）

**为什么改**：分享卡是给人转发的。收到卡的人先想知道「这是个什么东西、有多少只宠物」，
直接砸下载页（`get.html` 只有平台按钮 + 二维码）跳过了认知环节；伙伴页 `buddies.html`
既能看宠物又能下载，转化路径更顺。老曹 09-16 15:43 拍板 4A，09-17 08:35 确认执行（1B）。

**改了哪些地方**（六处，同一个口径，改一处就得全改）：

| # | 位置 | 说明 |
|---|---|---|
| 1 | `scripts/gen_qr.py` | 拆成两个目标常量：`TARGET_GET`（`qr-android.svg`）+ `TARGET_BUDDIES`（`qr.png`） |
| 2 | `assets/share/qr.png` | 重新生成 → 真解码 = `buddies.html` |
| 3 | `assets/share/share-card-sample.svg` | 注释里的目标说明 |
| 4 | `assets/share/share-card-sample*.png`（3 张） | 内嵌二维码，必须重合成 |
| 5 | 本文件（`share-card-spec.md`） | 第一节表、第二节参数表、第五节结论 + 本记录 |
| 6 | kotlin 内嵌快照 `assets/site/assets/share/qr.png` | 与本站同一份，**换图后由 kotlin 侧重跑同步生效**（website 已在协同板 @ 他们） |

🔴 **`assets/img/qr-android.svg` 故意不动**：它是**下载页**给桌面访客扫的码，用途是「把 App 装到手机」，
指向 `get.html` 是对的。改完本节后，第一节里「与 `qr-android.svg` 同内容」这句已不再成立，故已更正。

**验证方式**（`scripts/verify_qr.py`，别只靠肉眼）：

```
[ OK ] assets/img/qr-android.svg  -> https://deskbud.xyz/get.html      (33x33 矩阵)
[ OK ] assets/share/qr.png        -> https://deskbud.xyz/buddies.html  ((525, 525))
2/2 通过
```

外加 3 张示例卡从 `(810,1150,990,1330)` 裁出二维码区域解码，3/3 = `buddies.html`。
