# EdgeOne Referer 防盗链 配置指南

> 目标：阻止其他网站 `<img src="https://deskbud.xyz/...">` 盗链作品图（外站请求 403），同时保证本站页面正常加载。

## 关键：理解本站 vs 外站 的 Referer 差异

| 场景 | Referer 头部 | 期望结果 |
|------|--------------|----------|
| 用户在 `deskbud.xyz` 页面看作品 | `https://deskbud.xyz/index.html` 等 | 放行（200） |
| 外站 `<img src="https://deskbud.xyz/works/panda/idle.webp">` | 对方域名 | 拦截（403） |
| 用户直接打开图片 URL（地址栏粘图链） | 空 | 拦截（403，防 URL 转手） |
| 邮件/文档里点图片 URL | 空 | 拦截（同上） |

---

## 入口 A（推荐：规则引擎 — 适配静态站，最快生效）

1. 登录 边缘安全加速平台 EO 控制台（https://console.cloud.tencent.com/edgeone）
2. 左侧菜单 → **站点列表** → 选中 `deskbud.xyz`
3. 站点详情页 → **站点加速** → 顶栏 **规则引擎** Tab
4. **创建规则** → 新增空白规则
5. 配置：
   - **规则名**：`referer-guard-images`
   - **匹配条件**（AND 全部满足才执行操作）：
     - HOST 等于 `deskbud.xyz`
     - **请求 URL 路径** 通配符匹配 `*/works/*`（仅保护作品资源，不误伤页面/JS/CSS）
     - **HTTP 请求头 Referer 头部值 正则不匹配** `^https?://(www\.)?deskbud\.xyz(/|$)`
   - **操作**：HTTP 应答
   - **响应状态码**：`403`
   - **响应页面**：选一个错误页（无则先"新建页面"再引用）
6. **保存并发布** → 立即对全网节点生效

> 关键写法：用「正则不匹配」而不是「字符串包含」，避免子串误判；正则 `^https?://(www\.)?deskbud\.xyz(/|$)` 同时覆盖 `http/https`、`www/裸域`、任何子路径，挡得严。

---

## 入口 B（Web 防护 → 自定义规则 — 备选，更"安全"入口）

1. 控制台 → 站点详情 → **安全防护** → **Web 防护** → 选域名 `deskbud.xyz`
2. **自定义规则** 卡 → **基础访问管控** → **添加规则**
3. **规则名**：`referer-block-external`
4. 匹配条件：**Referer 头部值 通配符 不匹配** `https://deskbud.xyz*`
5. 处置：**拦截**
6. **保存并发布**

---

## 规则发布后：必做的两步验证

### 1. 控制台自检
- 浏览器开 `https://deskbud.xyz` → 作品图正常加载（DevTools Network 200）
- 浏览器直接打开 `https://deskbud.xyz/works/panda/idle.webp` → 显示 403/错误页（Referer 空 → 拦截，符合预期）

### 2. 命令行 curl 三连（需自机或可访问桌机网络的设备）

```bash
# ① 模拟外站盗链：应 403
curl -H "Referer: https://www.baidu.com/" -I https://deskbud.xyz/works/panda/idle.webp

# ② 模拟本站页面：应 200
curl -H "Referer: https://deskbud.xyz/list.html" -I https://deskbud.xyz/works/panda/idle.webp

# ③ 模拟直接打开图链（无 Referer）：应 403
curl -I https://deskbud.xyz/works/panda/idle.webp
```

### 3. 节点缓存刷新
- 规则发布后 EdgeOne 边缘节点可能还在用旧策略响应（缓存了 200），建议同步执行 **清除缓存**：
  - 选 **URL 类型** → 输入 `https://deskbud.xyz/works/` 前缀
  - 或选 **全部缓存**（最稳，但回源压力大些）
  - 让全网节点立即按新规则响应

---

## 注意事项

- **不要把"Referer 头部值 包含 deskbud.xyz"作为放行条件**：子串匹配会误判（如对方站带 deskbud 字样也能进）。**用"正则不匹配完整域名"**。
- **规则只匹配 `*/works/*`**：避免误伤 `assets/css/*`、`assets/js/*`（CSS/JS 一般也不会被外站盗，但留个心眼）；如果想让所有静态资源都防，把 URL 路径条件去掉即可。
- **邮件/书签点图链会 403**：极少数从邮件/文档点原图的用户会被挡，是正常防外站行为。必要时让他们从 `deskbud.xyz` 内点。
- **开启 HTTPS**：EdgeOne 默认 443；如果站点同时走 HTTP 也想挡，把正则改成 `^https?://...`（已含）。

---

## 替代方案：EdgeOne Pages 边缘函数（Functions）

仓库目前没有 `functions/` 约定。如果以后需要更复杂逻辑（远程鉴权、签名 URL、UA 黑名单等），可启用 EdgeOne Pages Functions：
- 在项目根新建 `functions/` 目录
- 写 `functions/works/[[path]].js` 拦截 `works/*` 请求，检查 `request.headers.get('Referer')` 后决定放行/403
- 需 EdgeOne Pages 平台支持自定义边缘函数（标准 Pages 计划可能不开放），**先咨询 EdgeOne 工单/套餐确认**
- **推荐先用控制台规则引擎**，点几下就生效，零代码、零部署。

---

**当前现状**：防盗链配置**尚未在控制台执行**（需要老曹登录 https://console.cloud.tencent.com/edgeone 手动点击发布）。代码层面（item 1 全站图防拖+防右键、item 2 22 个作品 webp 已加半透明水印）已就绪，等你按上面步骤在控制台点完发布，再回来说"推送"，我把这次的全部本地改动（item 1/2 + 之前的累积）一起推 DeskBud.git。
