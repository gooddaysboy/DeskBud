#!/usr/bin/env python3
"""6 页 footer 行 2 右=tagline / 行 3 右=PV 对调（老曹 2026-09-09 拍板）"""
import os, re, sys

PAGES = ['index.html', 'list.html', 'detail.html', 'pets.html', 'usage.html', 'privacy.html']

sys.path.insert(0, r'D:/360Downloads/deskbud/website/scripts')
from fix_footer_round6 import extract_div_with_attrs


TAGLINE_HTML = '<div data-i18n="footer.tagline">趣味桌面宠物伙伴 · 常驻你的屏幕</div>'
PV_HTML = '<span class="site-pv">🌐 <span data-i18n="footer.visits">全站访问</span> <span id="busuanzi_value_site_pv">-</span></span>'


def find_balanced(text, start_pos, open_tag, close_tag):
    o = text.find(open_tag, start_pos)
    if o == -1:
        return None
    o_end = o + len(open_tag)
    depth = 1
    i = o_end
    while i < len(text):
        nxt_o = text.find(open_tag, i)
        nxt_c = text.find(close_tag, i)
        if nxt_c == -1:
            return None
        if nxt_o != -1 and nxt_o < nxt_c:
            depth += 1
            i = nxt_o + len(open_tag)
        else:
            depth -= 1
            if depth == 0:
                return (o, o_end, nxt_c + len(close_tag))
            i = nxt_c + len(close_tag)
    return None


def swap_footer_rights(text):
    # 1. 找 footer-bottom 外层 div 开始位置（用正则锚定 class）
    pat_bot = re.compile(r'<div\b[^>]*\bclass\s*=\s*"[^"]*\bfooter-bottom\b[^"]*"[^>]*>')
    m_bot = pat_bot.search(text)
    if not m_bot:
        return text
    bot_open_start = m_bot.start()
    # 2. 用栈式 extract 找 footer-bottom inner + 结束位置
    bot = extract_div_with_attrs(text, 'footer-bottom')
    if not bot:
        return text
    bot_attrs, bot_inner, bot_end = bot
    # 3. 在 bot_inner 内找 site-pv span 完整范围
    pv_pos = bot_inner.find('class="site-pv"')
    if pv_pos == -1:
        return text
    sp_start = bot_inner.rfind('<span', 0, pv_pos)
    pv_range = find_balanced(bot_inner, sp_start, '<span', '</span>')
    if not pv_range:
        return text
    new_bot_inner = bot_inner[:pv_range[0]] + TAGLINE_HTML + bot_inner[pv_range[2]:]
    new_bot = f'<div{bot_attrs}>{new_bot_inner}</div>'

    # 4. footer-top 同理
    pat_top = re.compile(r'<div\b[^>]*\bclass\s*=\s*"[^"]*\bfooter-top\b[^"]*"[^>]*>')
    m_top = pat_top.search(text, bot_end)
    if not m_top:
        return text
    top_open_start = m_top.start()
    top = extract_div_with_attrs(text, 'footer-top', start=bot_end)
    if not top:
        return text
    top_attrs, top_inner, top_end = top
    tag_pos = top_inner.find('data-i18n="footer.tagline"')
    if tag_pos == -1:
        return text
    div_start = top_inner.rfind('<div', 0, tag_pos)
    tag_range = find_balanced(top_inner, div_start, '<div', '</div>')
    if not tag_range:
        return text
    new_top_inner = top_inner[:tag_range[0]] + PV_HTML + top_inner[tag_range[2]:]
    new_top = f'<div{top_attrs}>{new_top_inner}</div>'

    return text[:bot_open_start] + new_bot + text[bot_end:top_open_start] + new_top + text[top_end:]


if __name__ == '__main__':
    base = r'D:/360Downloads/deskbud/website'
    for f in PAGES:
        p = os.path.join(base, f)
        src = open(p, encoding='utf-8').read()
        out = swap_footer_rights(src)
        if out != src:
            open(p, 'w', encoding='utf-8').write(out)
            print(f, '改:', len(src), '->', len(out))
        else:
            print(f, '无变化')