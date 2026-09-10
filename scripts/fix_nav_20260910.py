# -*- coding: utf-8 -*-
"""2026-09-10 导航重排（老曹拍板）：
   bgm开关 → EN → 首页 → 伙伴(buddies.html 新增) → 关于(原许可与隐私) → 下载(原客户端下载,最右)
   6 生产页同步：index/detail/list/pets/usage/privacy。保留各页原有 node-id 与按钮串。
"""
import re, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ['index.html', 'detail.html', 'list.html', 'pets.html', 'usage.html', 'privacy.html']

NAV_RE = re.compile(r'(<nav class="nav"[^>]*>)(.*?)(</nav>)', re.S)
BGM_RE = re.compile(r'<button id="bgmToggle".*?</button>', re.S)
LANG_RE = re.compile(r'<button id="langSwitch".*?</button>', re.S)
A_RE = re.compile(r'<a href="(index|list|privacy)\.html"[^>]*>.*?</a>', re.S)

for page in PAGES:
    p = os.path.join(ROOT, page)
    with io.open(p, encoding='utf-8') as f:
        html = f.read()
    m = NAV_RE.search(html)
    if not m:
        print('SKIP(no nav):', page); continue
    nav_body = m.group(2)
    bgm_m = BGM_RE.search(nav_body)
    lang_m = LANG_RE.search(nav_body)
    if not bgm_m or not lang_m:
        print('SKIP(no bgm/lang):', page); continue
    bgm, lang = bgm_m.group(0), lang_m.group(0)

    # 提取三个链接原串（保留 node-id），并改静态默认文案
    a_map = {}
    for a in A_RE.finditer(nav_body):
        key = a.group(1)
        s = a.group(0)
        if key == 'list.html'.split('.')[0]:
            s = s.replace('>客户端下载<', '>下载<').replace('>Download<', '>Download<')
        if key == 'privacy':
            s = s.replace('>许可与隐私<', '>关于<').replace('>License & Privacy<', '>About<')
        a_map.setdefault(key, s)  # 同页同链接可能出现多次？nav 内不会，取第一个
    if not all(k in a_map for k in ('index', 'list', 'privacy')):
        print('SKIP(missing links)', page, list(a_map)); continue

    new_nav_body = (
        '\n        ' + bgm +
        '\n        ' + lang +
        '\n        ' + a_map['index'] +
        '\n        <a href="buddies.html" data-i18n="nav.buddies">伙伴</a>' +
        '\n        ' + a_map['privacy'] +
        '\n        ' + a_map['list'] +
        '\n      '
    )
    html = html[:m.start(2)] + new_nav_body + html[m.end(2):]
    with io.open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print('OK:', page)

# 验证：各页 nav 内顺序与关键串
print('\n--- verify ---')
for page in PAGES:
    with io.open(os.path.join(ROOT, page), encoding='utf-8') as f:
        html = f.read()
    m = NAV_RE.search(html)
    body = m.group(2) if m else ''
    order = re.findall(r'id="(bgmToggle|langSwitch)"|href="(index|buddies|privacy|list)\.html"', body)
    flat = [a or ('a:' + b) for a, b in order]
    ok_lang_after_bgm = flat.index('langSwitch') == flat.index('bgmToggle') + 1
    print(page, flat, 'EN-after-bgm:', ok_lang_after_bgm,
          'has-buddies:', 'href="buddies.html"' in body,
          'dl-text:', '>下载<' in body, 'about-text:', '>关于<' in body)
