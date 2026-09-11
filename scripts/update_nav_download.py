#!/usr/bin/env python3
# 导航栏改造（2026-09-11 老曹）：
# 1) 给「下载」链接加文字「下载」+ 图标（CTA 胶囊样式在 base.css）
# 2) 把「关于」(privacy) 移到最右，与「下载」交换位置
# 3) base.css 改了 -> 全站 base.css?v=100 -> ?v=101 缓存失效
import re, io, os

ROOT = r'D:\360Downloads\deskbud\website'
NAV_FILES = ['buddies.html','download.html','detail.html','list.html',
             'index.html','pets.html','privacy.html','usage.html']

dl_pat = re.compile(r'<a href="download\.html" class="nav-dl".*?</a>', re.S)
pr_pat = re.compile(r'<a href="privacy\.html" data-i18n="nav\.privacy".*?</a>', re.S)

for fn in NAV_FILES:
    p = os.path.join(ROOT, fn)
    s = io.open(p, encoding='utf-8').read()
    m_dl = dl_pat.search(s)
    m_pr = pr_pat.search(s)
    if not m_dl or not m_pr:
        print(fn, 'SKIP missing block dl=%s pr=%s' % (bool(m_dl), bool(m_pr)))
        continue
    dl, pr = m_dl.group(0), m_pr.group(0)
    # 在 <svg 前插入文字 span（i18n 走 nav.download，自动变 Download）
    dl_new = dl.replace('<svg', '<span class="nav-dl-txt" data-i18n="nav.download">下载</span><svg', 1)
    if dl_new == dl:
        print(fn, 'WARN: <svg not found in download link')
    # 重排：删原 download，再把新版 download 插到 privacy 之前（交换位置）
    s2 = s.replace(dl, '', 1)
    if pr not in s2:
        print(fn, 'ERR: privacy block lost after removing download')
        continue
    s2 = s2.replace(pr, dl_new + pr, 1)
    if s2 != s:
        io.open(p, 'w', encoding='utf-8').write(s2)
        print(fn, 'UPDATED')
    else:
        print(fn, 'no change')

# 4) base.css 版本号失效（缓存）
cnt = 0
for fn in os.listdir(ROOT):
    if fn.lower().endswith('.html'):
        p = os.path.join(ROOT, fn)
        s = io.open(p, encoding='utf-8').read()
        if 'base.css?v=100' in s:
            s2 = s.replace('base.css?v=100', 'base.css?v=101')
            io.open(p, 'w', encoding='utf-8').write(s2)
            cnt += 1
            print('bump', fn)
print('base.css bumped in', cnt, 'files')
