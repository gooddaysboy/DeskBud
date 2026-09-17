# -*- coding: utf-8 -*-
"""apply_og_meta.py  --  给对外页面注入 og / twitter 分享标签（老曹 09-17 拍板 6A）

为什么做：全站此前**零 og 标签**（只有 meta description）⇒ 微信 / QQ / 小红书里发链接，
  预览卡片抓不到自定义标题与配图，标题只能拿 <title> 凑、**并且没有缩略图**。
  6B 已另出横版配图 assets/share/og-card.png（1200×630，见 scripts/gen_og_card.py）。

做法：每页注入一块被注释包住的标签组
        <!-- og-share -->  ...  <!-- /og-share -->
      **幂等**：已存在 → 整块替换；不存在 → 插到 </head> 之前。可以反复跑。

🔴 有意**不注入**的页面（不是漏了）：
  privacy.html、manual/android-{zh,en}.html
      它们是离线快照产线的**真源**（见 scripts/gen_offline_docs.py 头部）：改这几个文件必须
      重跑 gen_offline_docs.py + gen_sync_json.py，会连带改动 docs/ 下 4 份产物 + 升 sync.json
      版本、让客户端重下隐私/手册快照 —— 为几行 meta 付这个代价不值。
  contact.html
      跳转页（canonical → privacy.html），无分享价值。
  docs/*.html
      产线产物，重跑即覆盖，手改无意义。
  bubble_preview.html / beian-pending.html
      内部预览页 / 备案停服页。

行尾：按各文件自身行尾写入（不统一改 CRLF/LF）。

用法：
  python scripts/apply_og_meta.py            # 注入（幂等）
  python scripts/apply_og_meta.py --check    # 只校验：逐页报「块是否齐全、og:image 是否绝对 URL」
"""
import argparse
import html
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_ROOT = os.path.abspath(os.path.join(HERE, '..'))

BASE = 'https://deskbud.xyz'
OG_IMG = BASE + '/assets/share/og-card.png'
OG_IMG_W, OG_IMG_H = 1200, 630
OG_IMG_ALT = 'DeskBud 桌宠 · 让桌面不再孤单'

# (相对路径, og:title, og:description)
#   描述有意写得比 SEO 的 meta description 更口语 —— 微信卡片是「第一眼」文案。
PAGES = [
    ('index.html', 'DeskBud · 让桌面不再孤单',
     '挑一只针织桌宠伙伴，它会自己走、自己玩，安静地陪你。Windows / 安卓 / macOS 免费下载。'),
    ('buddies.html', 'DeskBud 伙伴 · 挑一只陪你的桌宠',
     '看看每只伙伴长什么样、会做哪些动作，挑一只喜欢的装进桌面。'),
    ('download.html', 'DeskBud 桌宠伙伴 · 免费下载',
     'Windows / 安卓 / macOS 三平台免费下载，宠物都在客户端里，装好一键领养。'),
    ('get.html', 'DeskBud 客户端下载',
     '电脑上直接下载，手机扫码装安卓版，装好就能领养伙伴。'),
    ('manual/win-zh.html', 'DeskBud 桌宠用户手册（Windows）',
     'Windows 版怎么装、怎么玩、遇到问题怎么办，一页看完。'),
    ('manual/win-en.html', 'DeskBud Desktop Pet User Manual (Windows)',
     'How to install and use DeskBud on Windows, plus common questions.'),
    ('manual/mac-zh.html', 'DeskBud 桌宠用户手册（Mac）',
     'Mac 版怎么装、怎么玩、遇到问题怎么办，一页看完。'),
    ('manual/mac-en.html', 'DeskBud Desktop Pet User Manual (Mac)',
     'How to install and use DeskBud on macOS, plus common questions.'),
]

BEGIN = '<!-- og-share -->'
END = '<!-- /og-share -->'
# 宽松匹配（兼容缩进变化 / 重复块）
BLOCK_RE = re.compile(r'[ \t]*<!-- og-share -->[\s\S]*?<!-- /og-share -->[^\n]*\n?')


def page_url(rel):
    """相对路径 → 绝对 URL（首页用根路径）。"""
    if rel == 'index.html':
        return BASE + '/'
    return BASE + '/' + rel.replace(os.sep, '/')


def build_block(rel, title, desc):
    def m(prop, content):
        return '<meta property="%s" content="%s">' % (prop, html.escape(content, quote=True))

    lines = [
        BEGIN,
        m('og:type', 'website'),
        m('og:site_name', 'DeskBud'),
        m('og:locale', 'zh_CN'),
        m('og:title', title),
        m('og:description', desc),
        m('og:url', page_url(rel)),
        m('og:image', OG_IMG),
        m('og:image:width', str(OG_IMG_W)),
        m('og:image:height', str(OG_IMG_H)),
        m('og:image:alt', OG_IMG_ALT),
        '<meta name="twitter:card" content="summary_large_image">',
        m('twitter:title', title),
        m('twitter:description', desc),
        m('twitter:image', OG_IMG),
        END,
    ]
    return ''.join('  ' + ln + '\n' for ln in lines)


def read_text(p):
    with io.open(p, 'rb') as f:
        raw = f.read()
    crlf = raw.count(b'\r\n')
    lf = raw.count(b'\n') - crlf
    nl = '\r\n' if crlf > lf else '\n'
    return raw.decode('utf-8'), nl


def write_text(p, text, nl):
    data = text.replace('\r\n', '\n').replace('\n', nl).encode('utf-8')
    with io.open(p, 'wb') as f:
        f.write(data)


def apply_page(rel, title, desc, check_only):
    p = os.path.join(SITE_ROOT, rel.replace('/', os.sep))
    s, nl = read_text(p)
    block = build_block(rel, title, desc)
    # 统一成 \n 处理，最后按原行尾写回
    s_u = s.replace('\r\n', '\n')
    block_u = block.replace('\r\n', '\n')

    had = bool(BLOCK_RE.search(s_u))
    stripped = BLOCK_RE.sub('', s_u)

    if '</head>' not in stripped:
        return rel, 'ERROR', 'no </head>'

    cut = stripped.rfind('\n', 0, stripped.find('</head>')) + 1
    new_u = stripped[:cut] + block_u + stripped[cut:]

    if check_only:
        # 三条件：块恰好出现一次 + 块内容与当前模板逐字一致 + 块外没有散落的 og:image
        ok = (s_u.count(BEGIN) == 1) and (block_u in s_u) and (stripped.count('og:image"') == 0)
        return rel, ('OK' if ok else 'STALE'), ('present & current' if ok else 'missing or outdated')

    if not check_only and (not had or new_u != s_u):
        write_text(p, new_u, nl)
    return rel, ('FIXED' if had else 'ADDED'), 'block written'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='只校验不写盘')
    args = ap.parse_args()

    print('og:image = %s (%dx%d)' % (OG_IMG, OG_IMG_W, OG_IMG_H))
    print('模式：%s\n' % ('check（不写盘）' if args.check else 'apply（幂等写入）'))
    bad = 0
    for rel, title, desc in PAGES:
        r, st, note = apply_page(rel, title, desc, args.check)
        print('  [%-5s] %-24s %s' % (st, r, note))
        if st in ('ERROR', 'STALE'):
            bad += 1
    print('\n%d/%d 页通过' % (len(PAGES) - bad, len(PAGES)))
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main())
