# -*- coding: utf-8 -*-
"""verify_og_meta.py  --  分享标签（og / twitter）真实抓取校验。

和 apply_og_meta.py --check 的区别：
  那个是**读本地文件**比对模板；这个是**真发 HTTP 请求**抓 HTML，
  再用 HTMLParser 确认标签落在 <head> 里 —— 与微信 / QQ / 小红书爬虫的取数方式一致。
  （爬虫不执行 JS，所以「head 里静态存在」才是有效判据。）

检查项（逐页）：
  ① 必需 og 标签齐全（含 twitter:*）
  ② og:title / og:description / og:image / og:url 非空
  ③ og:image 是**绝对 URL**（微信不接受相对路径）
  ④ 标签确实位于 <head> 段内（不是误插到 body）
  ⑤ og:image 能取到（HTTP 200）且尺寸与声明的 width/height 一致

用法：
  python scripts/verify_og_meta.py                              # 校验线上
  python scripts/verify_og_meta.py --base http://127.0.0.1:8099 # 校验本地预览
"""
import argparse
import io
import os
import sys
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urlparse

# 🔴 页面清单**单一真源** = apply_og_meta.PAGES（别再抄一份，抄了必漂移）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_og_meta import PAGES as _SOURCE_PAGES          # noqa: E402

PAGES = [rel for rel, _title, _desc in _SOURCE_PAGES]
REQUIRED = [
    'og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description',
    'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt',
    'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image',
]

_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'deskbud-og-verify/1.0'})
    with _opener.open(req, timeout=30) as r:
        data = r.read()
        return r.status, (data if binary else data.decode('utf-8', 'replace'))


class HeadMeta(HTMLParser):
    """只收 <head> 段内的 og:/twitter: meta，并记录标签是否在 head 关闭前出现。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.metas = {}
        self.stray = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == 'head':
            self.in_head = True
        elif tag == 'meta':
            key = d.get('property') or d.get('name') or ''
            if key.startswith('og:') or key.startswith('twitter:'):
                (self.metas if self.in_head else self.stray).__setitem__(key, d.get('content', ''))

    def handle_endtag(self, tag):
        if tag == 'head':
            self.in_head = False


def check_page(base, rel):
    url = base.rstrip('/') + '/' + rel
    problems = []
    try:
        status, htmltext = fetch(url)
    except Exception as e:
        return url, ['抓取失败：%s' % e], {}

    if status != 200:
        problems.append('HTTP %s' % status)

    p = HeadMeta()
    p.feed(htmltext)

    if p.stray:
        problems.append('有 og 标签落在 <head> 之外：%s' % ', '.join(sorted(p.stray)))
    for k in REQUIRED:
        if not p.metas.get(k):
            problems.append('缺 %s' % k)

    img = p.metas.get('og:image', '')
    if img and not img.startswith(('http://', 'https://')):
        problems.append('og:image 不是绝对 URL：%s' % img)

    # 图片可取 + 尺寸一致
    #   注意：og:image 永远写**线上绝对 URL**（微信要求）。校验本地预览时，
    #   把 host 换成 --base 再取，否则会去请求线上（未部署时必然 404，是假失败）。
    if img:
        img_url = img
        if not base.startswith('https://deskbud.xyz'):
            img_url = base.rstrip('/') + urlparse(img).path
        try:
            st, raw = fetch(img_url, binary=True)
            if st != 200:
                problems.append('og:image HTTP %s（%s）' % (st, img_url))
            else:
                from PIL import Image
                im = Image.open(io.BytesIO(raw))
                w, h = im.size
                dw, dh = int(p.metas.get('og:image:width') or 0), int(p.metas.get('og:image:height') or 0)
                if (w, h) != (dw, dh):
                    problems.append('图实际 %dx%d ≠ 声明 %dx%d' % (w, h, dw, dh))
                p.metas['_img_bytes'] = len(raw)
        except ImportError:
            pass
        except Exception as e:
            problems.append('og:image 取不到：%s（%s）' % (e, img_url))

    return url, problems, p.metas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='https://deskbud.xyz')
    args = ap.parse_args()

    print('base = %s\n' % args.base)
    bad = 0
    for rel in PAGES:
        url, problems, metas = check_page(args.base, rel)
        if problems:
            bad += 1
            print('  [FAIL] %s' % url)
            for x in problems:
                print('         - %s' % x)
        else:
            kb = metas.get('_img_bytes', 0) / 1024.0
            print('  [ OK ] %-52s title=%s' % (url, metas.get('og:title', '')[:20]))
            print('         缩略图 %s (%.1f KB)' % (metas.get('og:image', '').split('/')[-1], kb))
    print('\n%d/%d 页通过' % (len(PAGES) - bad, len(PAGES)))
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main())
