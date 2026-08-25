# DeskBud.xyz — 桌面宠物作品分享站

面向桌面宠物爱好者的作品展示分享静态站点。简洁护眼、PC 优先兼容移动端，纯静态产物部署于腾讯云 EdgeOne Pages。

## 站点定位
汇集各类趣味桌面宠物伙伴作品，支持浏览、预览、下载。你的桌面屏幕上，常驻的宠物伙伴。

## 页面构成
- `index.html` 首页：站点标题 + Slogan + 分类导航 + 热门作品预览
- `list.html` 作品列表：分类筛选、排序（最新/下载量/热门）、卡片式展示
- `detail.html` 作品详情：图文/GIF/视频预览、下载按钮、访问&下载统计

## 技术
- 纯静态 HTML/CSS/JS，零构建
- 作品数据驱动：`data/works.json`
- 统计：不蒜子 busuanzi（全站 + 单页访问量；下载量用作品字段展示）

## 本地预览
```bash
# 任选其一启动本地服务器（避免 file:// 下 fetch 失败）
python -m http.server 8080
# 或 npx serve .
```
浏览器打开 http://localhost:8080

## 添加作品
编辑 `data/works.json`，在 `works` 数组追加一条：
```json
{
  "id": "唯一标识",
  "title": "作品名",
  "category": "分类id（见 categories）",
  "author": "作者",
  "cover": "works/xxx/cover.png",
  "thumb": "works/xxx/thumb.png",
  "summary": "一句话简介",
  "description": "详细介绍",
  "media": [ { "type": "image|gif|video", "src": "...", "caption": "说明" } ],
  "download": { "label": "下载按钮文字", "url": "下载链接" },
  "downloads": 0,
  "date": "YYYY-MM-DD",
  "featured": false
}
```
素材放入 `works/<id>/` 目录。

## 部署
EdgeOne Pages 连接 GitHub 仓库 `gooddaysby/deskbud`，根目录（/）部署，无需构建命令，推送 main 分支自动发布。
