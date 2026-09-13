# -*- coding: utf-8 -*-
"""
gen_offline_docs.py  --  离线快照产线（website 侧）

背景（2026-09-13 kotlin《离线快照与静默同步_设计方案》定稿，老曹拍板 B：脚本生成）：
  安卓客户端的内置「文档中心」需要在**无网络**时也能打开隐私政策与使用手册。
  kotlin 不做在线抓取，改由官网**产出自包含单文件快照**，随首次联网静默下载并落盘。

输入（真源，全部在 website/ 内；改真源 → 重跑本脚本即可，不要手改产物）：
  privacy.html                  隐私页真源（靠 data-i18n / data-i18n-attr 挂文案）
  locales/{zh,en}.json          文案真源（含 privacy.effective 生效日期）
  assets/css/base.css           样式真源（含 3 处 url(../img/*) 装饰图引用）
  assets/img/{bamboo.svg, field.svg, deskbud-icon.png}
  manual/android-{zh,en}.html   安卓手册真源（本体已是自包含静态页）

输出（website/docs/）：
  privacy_zh.html / privacy_en.html   转换分支：内联全部 data-i18n 文案 + 删除 5 个 <script>
                                      + 删顶栏/搜索/页脚 + base.css 与 3 张装饰图全内联
  manual_zh.html  / manual_en.html    透传分支：manual/android-{zh,en}.html 原样拷入（内容零改动）

🔴 跨仓铁律（kotlin / pyside6 的快照生成器同样依赖）：
   privacy.html 的 data-i18n 属性与 locales 键名 = **跨仓契约**。
   后续任何一方修改 privacy.html **必须保留该属性与键**，否则三方快照生成全部解析失败。
   本脚本产出的快照会**保留** data-i18n 属性（不删），只把文案替换为对应语言。

用法：
  python scripts/gen_offline_docs.py            # 生成 4 份快照
  python scripts/gen_offline_docs.py --check    # 只校验产物是否与真源一致（CI/回归用）
"""
import argparse
import base64
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))
OUT_DIR = os.path.join(SITE, 'docs')

PRIVACY_SRC = os.path.join(SITE, 'privacy.html')
CSS_SRC = os.path.join(SITE, 'assets', 'css', 'base.css')
IMG_DIR = os.path.join(SITE, 'assets', 'img')
MANUAL_DIR = os.path.join(SITE, 'manual')

MIME = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
}

LANGS = [('zh', 'zh-CN'), ('en', 'en')]


# ---------------------------------------------------------------- 工具
def read_text(path):
    with open(path, 'r', encoding='utf-8', newline='') as f:
        return f.read()


def write_text(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def flatten(d, prefix=''):
    """{"privacy": {"title": "x"}} -> {"privacy.title": "x"}"""
    out = {}
    for k, v in d.items():
        key = prefix + k
        if isinstance(v, dict):
            out.update(flatten(v, key + '.'))
        else:
            out[key] = v
    return out


def cut_range(s, start, end, keep_end=False):
    """删除 [start .. end]；keep_end=True 时保留 end 本体（删到 end 之前）。"""
    i = s.find(start)
    if i < 0:
        return s, False
    j = s.find(end, i)
    if j < 0:
        return s, False
    stop = j if keep_end else j + len(end)
    return s[:i] + s[stop:], True


# ---------------------------------------------------------------- CSS 内联
def inline_css_urls(css):
    """把 base.css 里的 url(../img/x) 换成 base64 data URI（装饰图 3 张）。"""
    def repl(m):
        raw = m.group(2)
        if raw.startswith(('data:', 'http:', 'https:', '//')):
            return m.group(0)
        path = os.path.normpath(os.path.join(os.path.dirname(CSS_SRC), raw))
        if not os.path.isfile(path):
            print('  [warn] CSS 引用的文件不存在，保持原样：%s' % raw)
            return m.group(0)
        ext = os.path.splitext(path)[1].lower()
        mime = MIME.get(ext, 'application/octet-stream')
        with open(path, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        return 'url("data:%s;base64,%s")' % (mime, b64)

    return re.sub(r'url\(\s*(["\']?)([^"\')]+)\1\s*\)', repl, css)


# ---------------------------------------------------------------- i18n 内联
def inline_text_i18n(s, loc, missing):
    """替换 <tag ... data-i18n="key" ...>原文本</tag> 的文本为 locales 值。"""
    pat = re.compile(
        r'(<([a-zA-Z][\w-]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)(.*?)(</\2>)', re.S)

    def rep(m):
        key = m.group(3)
        if key not in loc:
            missing.append(key)
            return m.group(0)
        return m.group(1) + html.escape(str(loc[key]), quote=False) + m.group(5)

    return pat.sub(rep, s)


def inline_attr_i18n(s, loc, missing):
    """处理 data-i18n-attr="attr:key,attr2:key2" 形式。"""
    pat = re.compile(r'<[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>', re.S)

    def rep(m):
        tag, spec = m.group(0), m.group(1)
        new = tag
        for pair in spec.split(','):
            pair = pair.strip()
            if ':' not in pair:
                continue
            attr, key = [x.strip() for x in pair.split(':', 1)]
            if key not in loc:
                missing.append(key)
                continue
            val = html.escape(str(loc[key]), quote=True)
            new = re.sub(r'(\b%s=")[^"]*(")' % re.escape(attr),
                         lambda mm: mm.group(1) + val + mm.group(2), new, count=1)
        return new

    return pat.sub(rep, s)


# ---------------------------------------------------------------- 转换分支
def build_privacy(lang, lang_attr, loc, css_inlined):
    """privacy.html -> 自包含单文件快照。"""
    s = read_text(PRIVACY_SRC)
    missing = []

    # 1) 去掉全部 <script>（i18next / i18n.js / site.js / bubble.js / SITE.boot() 共 5 个）
    s, _ = re.subn(r'<script\b[^>]*>.*?</script>\s*', '', s, flags=re.S)

    # 2) 去顶栏 / 搜索条 / 页脚（App 由原生底部栏承担"离线副本"提示）
    s, ok1 = cut_range(s, '<header class="topbar"', '</header>')
    s, ok2 = cut_range(s, '<div class="top-search"', '<main', keep_end=True)
    s, ok3 = cut_range(s, '<footer class="footer"', '</body>', keep_end=True)
    if not (ok1 and ok2 and ok3):
        print('  [warn] 结构切除不完整 header=%s search=%s footer=%s' % (ok1, ok2, ok3))

    # 3) 样式内联
    s, n = re.subn(r'<link rel="stylesheet"[^>]*>',
                   lambda m: '<style>\n' + css_inlined + '\n</style>', s, count=1)
    if n != 1:
        print('  [warn] 未替换到 <link rel="stylesheet">')

    # 4) 文案内联（顺序：文本 → 属性）
    s = inline_text_i18n(s, loc, missing)
    s = inline_attr_i18n(s, loc, missing)

    # 5) 语言标记
    s = s.replace('<html lang="zh-CN"', '<html lang="%s"' % lang_attr, 1)

    # 6) 快照头（版本/日期戳：来源 + 生成日 + 隐私生效日）
    eff = loc.get('privacy.effective', '')
    stamp = ('<!-- DeskBud offline snapshot'
             ' | lang=%s | source=privacy.html | generated=%s | %s'
             ' | 本文件由 website/scripts/gen_offline_docs.py 生成，请勿手改 -->'
             % (lang, __import__('datetime').date.today().isoformat(), eff))
    s = s.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + stamp, 1)

    return s, sorted(set(missing))


# ---------------------------------------------------------------- 主流程
def collect(loc_by_lang):
    """生成 4 份产物内容；返回 {相对路径: 内容}"""
    css_raw = read_text(CSS_SRC)
    css_inlined = inline_css_urls(css_raw)
    css_kb = round(len(css_inlined.encode('utf-8')) / 1024.0, 1)

    out = {}
    stats = {}
    for lang, lang_attr in LANGS:
        loc = loc_by_lang[lang]
        text, missing = build_privacy(lang, lang_attr, loc, css_inlined)
        out['privacy_%s.html' % lang] = text
        stats['privacy_%s' % lang] = (len(text.encode('utf-8')), missing)

    for lang, _ in LANGS:
        src = os.path.join(MANUAL_DIR, 'android-%s.html' % lang)
        if not os.path.isfile(src):
            raise SystemExit('缺少手册真源：%s' % src)
        out['manual_%s.html' % lang] = read_text(src)
        stats['manual_%s' % lang] = (os.path.getsize(src), [])

    return out, stats, css_kb


def self_check(out):
    """产物自检：不允许残留 script / 外链资源。"""
    bad = []
    for name, text in out.items():
        if '<script' in text:
            bad.append('%s 残留 <script>' % name)
        for pat in ('href="assets/', "href='assets/", 'src="assets/', "src='assets/"):
            if pat in text:
                bad.append('%s 残留外链资源 %s' % (name, pat))
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='只校验，不写文件')
    args = ap.parse_args()

    loc_by_lang = {}
    for lang, _ in LANGS:
        loc_by_lang[lang] = flatten(json.loads(read_text(
            os.path.join(SITE, 'locales', '%s.json' % lang))))

    out, stats, css_kb = collect(loc_by_lang)
    bad = self_check(out)

    print('gen_offline_docs  (%s)' % (SITE))
    print('  内联 CSS: %.1f KB（含 3 张装饰图 data URI）' % css_kb)
    for name in ('privacy_zh.html', 'privacy_en.html', 'manual_zh.html', 'manual_en.html'):
        key = name[:-5]
        size, missing = stats[key]
        print('  %-18s %7.1f KB%s' % (name, size / 1024.0,
                                      ('  [缺键 %d: %s]' % (len(missing), ','.join(missing[:5])))
                                      if missing else ''))
    if bad:
        print('  [FAIL] 自检未通过：')
        for b in bad:
            print('     - ' + b)
    else:
        print('  自检：无 <script> 残留 / 无 assets 外链  ✓')

    if args.check:
        drift = []
        for name, text in out.items():
            p = os.path.join(OUT_DIR, name)
            if not os.path.isfile(p) or read_text(p) != text:
                drift.append(name)
        if drift or bad:
            print('  [check] 产物与真源不一致：%s' % (', '.join(drift) if drift else '自检失败'))
            return 1
        print('  [check] 4 份产物均为最新 ✓')
        return 0

    for name, text in out.items():
        write_text(os.path.join(OUT_DIR, name), text)
    print('  已写出 → docs/  （%d 份）' % len(out))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
