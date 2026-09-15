# DeskBud.xyz — 桌宠官方站

DeskBud 桌面宠物（豁牙小兔及一众「织」系伙伴）的官方**展示与下载站**。站点定位：**展示作品 + 引导下载客户端**；皮肤购买只发生在客户端内（App 以 `?embed=1` 内嵌「伙伴之家」领养），网页本身不做交易。

## 站点定位
- 访客（无 `device_id`）：看伙伴、点「下载客户端 · 领养宠物」引导安装客户端。
- App 内（带 `device_id` + `embed=1`）：勾选皮肤 → 跳 `pay.deskbud.xyz/checkout.html` 内嵌收银台。
- 网页职责 = 展示 + 引流；购物与付费在客户端与 `petpay` 完成。

## 页面构成
- `index.html` 首页：标题 + Slogan + 分类导航 + 伙伴墙 + 姿态宫格预览
- `buddies.html` 伙伴之家：皮肤浏览/勾选（App 内嵌时显示「领养」）
- `download.html` 下载：按 UA 分流（桌面直链 win/mac，移动端二维码），读 `version-download.json` + gitee release
- `get.html` 获取指引：Android 按 UA 分流（桌面→二维码、移动→按钮、微信/iOS→引导）
- `contact.html` 联系我们
- `privacy.html` 隐私政策（中/英，离线快照内联）
- `manual/` 使用手册 6 份（win / mac / android × zh / en）
- `beian-pending.html` 备案占位页

## 技术
- 纯静态 HTML/CSS/JS，**零构建**；EdgeOne Pages 自动部署。
- 软导航：`SITE.route()` 通过 `fetch` 切换 `#view`，新页登记 `SITE.pages`；页面 CSS 进 `base.css`。
- 国际化：`window.pick({zh,en})` + `lang:change/ready` 事件；升 i18n key 需同步升 `RES_VER` 与 `i18n.js?v=`。
- 网页宠物：`webmeji.js`（仅桌面端启用；`?embed=1` 内嵌不启用）。
- 内嵌模式：`?embed=1` 隐藏顶栏 / BGM / 页脚 / 搜索 / 走马灯 / 宣传条；`?lang=` 优先级最高。

## 下载与版本
- 安装包走 gitee release（`DeskBud_<平台>_v<无点版本>.<ext>`），分发清单 `version-download.json`。
- 发版后跑 `scripts/sync_download_manifest.py` 同步官网清单。

## 本地预览
```bash
python serve.py            # 默认 8081（常驻，含单实例守卫）
# 或 python -m http.server 8080
```

## 离线快照产线
```bash
python scripts/gen_offline_docs.py && python scripts/gen_sync_json.py
```
产物 `docs/{privacy,manual}_{zh,en}.html` 与 `data/sync.json`（5 项）。改 `privacy.html` / `base.css` / `locales` / `manual/android-*.html` 后必重跑两步。

## 部署
EdgeOne Pages 连接 GitHub 仓库 `gooddaysboy/DeskBud`，根目录部署，push `main` 自动发布（约 3 分钟）。

## 协同
跨端协同看板 `COORDINATION.md`（家 D: / 办公 C: 坚果云同步）。网站只做展示 + 引流，付费链路在客户端与 `petpay`。
