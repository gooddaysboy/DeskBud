# DeskBud 作品站防盗链实践备忘（EdgeOne Pages）

> 最后更新：2026-09-02｜结论先行：**前端三层兜底已够用，EdgeOne Pages「自定义规则」不适合做 Referer 防盗链（会误伤全站）**。

---

## 一、已落地的防盗（前端三层，已部署）

| 层 | 做法 | 文件 |
|----|------|------|
| 1. 防拖 + 防右键 | `img { user-drag:none }` + JS `draggable=false` + 全局 `contextmenu` 拦截命中图片 | `assets/css/base.css` `assets/js/site.js`（`SITE.protectImages()` + boot 挂拦截）|
| 2. 作品图水印 | 22 张 webp 逐帧叠 `DeskBud.xyz` 半透明字 + 暗描边 | `tools/watermark_webp.py`（Pillow），原始图备份 `works_backup_20260902/` |
| 3. 上下文菜单兜底 | 右键图片弹菜单被拦，无法直接"图片另存为" | 同上 site.js |

> 说明：纯前端防保存是「防君子不防小人」——熟练用户仍能从 DevTools Network / 页面源码拿图 URL。但配合水印，盗出去的图带品牌标识，价值已压到很低。够用，不追求边缘 403。

---

## 二、踩坑记录（EdgeOne Pages「自定义规则」——此路不通）

### 入口（正确）
EdgeOne Pages 项目（如 `deskbud-nochina`）→ **项目详情 → 安全防护 → 自定义规则**。
- 不是 SCDN 加速产品的「站点列表 → 站点加速 → 规则引擎 / Web 防护」（菜单结构完全不同，别套）。
- `deskbud.xyz` 是**自定义域名**（CNAME 到 `deskbu.xyz.pages.dnse4.com`），自定义规则对它生效；项目默认域名 `*.edgeone.dev` 不支持自定义规则。

### 事故（2026-09-02 实测）
配了两条规则：
- 规则 1：`Referer` 匹配内容 = **为空** → 拦截
- 规则 2：`Referer` 匹配内容 = **适配符不匹配** `*deskbud.xyz*` → 拦截

**发布后打开 `deskbud.xyz` 直接 403「访问受限 / 由 Tencent Cloud EdgeOne 提供防护」，点击站内导航跳详情页也拦（"宠物都无法跳转了"）。** 删规则 2 后恢复。

### 根因
1. **「自定义规则」是粗粒度全站规则**：对**所有请求生效（含 HTML 页面）**，不像 SCDN 规则引擎能按 URL 路径 / 文件类型只拦 `/works/*`。一站内跳转也走它 → 误伤。
2. **浏览器首访 / 外部链接点入** `deskbud.xyz` 时 Referer **为空或为外站域名** → 命中规则 1（空 Referer 拦截）→ 首页 403。
3. **适配符 `*` 语义不认 `.` 分隔**：站内跳转 Referer 是 `https://deskbud.xyz/...`（本应匹配 `*deskbud.xyz*`），仍被规则 2 误伤——EdgeOne 的「适配符」不等于正则，`*` 通配行为未达预期。
4. 附带语义发现：EdgeOne「匹配内容 = 为空」匹配的是「Referer 头字段存在但值为空字符串」，**不是**「Referer 头不存在」（浏览器直访是头不存在，所以规则 1 未误伤 HTML 首访——但此语义脆弱，未来 EdgeOne 若改判会突然误伤）。

### 决策
**规则 2（适配符不匹配）永不复用；规则 1（空 Referer 拦截）可留作轻量兜底（当前不误伤）。** 发布任何"安全策略"前，必须先想清楚「首访 / 外部链接点入 / 搜索引擎爬虫」这三类 Referer 都不在内站预设里，否则一发布就瘫痪。

---

## 三、未来若真要做边缘防盗链（正确方向）

不要再用「自定义规则」。两个正路：

**A. EdgeOne Pages「安全防护」下的专门「防盗链 / Referer 防盗链」子菜单**
与「自定义规则」平级（CDN 厂商标配），可配置「**仅对静态资源（/works/*、/assets/*）生效、放行 HTML**」——细粒度，不会误伤首访 / 站内跳转。需在控制台「安全防护」左侧菜单找该子项，按实际字段填（不凭 SCDN 经验推）。

**B. EdgeOne Pages 边缘函数（Functions）**
仓库目前无 `functions/` 约定。需要时新建 `functions/works/[[path]].js` 拦截 `works/*`，读 `request.headers.get('Referer')` 决定放行 / 403。需确认所用 Pages 套餐开放自定义边缘函数（先咨询 EdgeOne）。

---

## 四、命令行验证（若未来走 A/B 路径）

```bash
# ① 外站盗链 Referer → 应 403
curl -H "Referer: https://www.baidu.com/" -I https://deskbud.xyz/works/panda/idle.webp

# ② 站内页面 Referer → 应 200（必须验证，之前就是这步翻车）
curl -H "Referer: https://deskbud.xyz/list.html" -I https://deskbud.xyz/works/panda/idle.webp

# ③ 直接打开图链（无 Referer）→ 按策略定 200/403
curl -I https://deskbud.xyz/works/panda/idle.webp
```

> 铁律：**② 必须 200**。任何方案只要让「站内 Referer」请求 403，就是误伤全站，立即回滚。
