#!/usr/bin/env python3
"""6 页 footer 重构：footer-dl 合并进 footer-bottom 内最左（与 联系我们 同行），老曹 2026-09-09 拍板"""
import os, re, sys

PAGES = ['index.html', 'list.html', 'detail.html', 'pets.html', 'usage.html', 'privacy.html']
sys.path.insert(0, r'D:/360Downloads/deskbud/website/scripts')
from fix_footer_round6 import extract_div_with_attrs


def merge_footer_dl(text):
    """去掉独立 .footer-dl 行；把 footer-dl <a> 包到 footer-bottom 内最前面，用 .footer-bottom-left 容器包裹 dl + mailto。"""
    # 1. 提取 footer-dl 整段
    dl = extract_div_with_attrs(text, 'footer-dl')
    if not dl:
        return text
    dl_attrs, dl_inner, dl_end = dl
    # dl_inner 应是 `<a href="list.html" data-i18n="footer.download">客户端下载</a>`（可能含 data-page-node-id）
    # 提取 dl_inner 内的 <a> 标签起始位置
    a_match = re.search(r'<a\b[^>]*>', dl_inner)
    if not a_match:
        return text
    a_tag = a_match.group(0)
    a_text_match = re.search(r'>([^<]*)</a>', dl_inner)
    if not a_text_match:
        return text
    a_text = a_text_match.group(1)
    # 重组 dl a 标签：保留 a_tag 内的所有属性，加 class="footer-dl-link"
    if 'class=' in a_tag:
        new_a_tag = re.sub(r'class\s*=\s*"([^"]*)"', r'class="\1 footer-dl-link"', a_tag)
    else:
        new_a_tag = a_tag[:-1] + ' class="footer-dl-link">'
    dl_a_html = new_a_tag + a_text + '</a>'

    # 2. 提取 footer-bottom 整段
    bot = extract_div_with_attrs(text, 'footer-bottom')
    if not bot:
        return text
    bot_attrs, bot_inner, bot_end = bot

    # 3. 在 bot_inner 内提取 mailto a 标签开头位置
    m_match = re.search(r'<a\b[^>]*>', bot_inner)
    if not m_match:
        return text
    m_pos = m_match.start()
    m_end = m_match.end()
    # 在 mailto a 之前插入 dl 链接 + footer-bottom-left 开标签；mailto a 之后 + footer-bottom-left 闭合标签（在 tagline div 之前）
    # 结构：<div class="footer-bottom-left"><a class="footer-dl-link">客户端下载</a> <a href="mailto...">联系我们...</a></div> <div class="tagline">...</div>
    # 但 footer-bottom inner 内是：[<a mailto>][<space>][<div tagline>]</div>] —— mailto + 空格 + tagline div
    # 找 tagline div 开始位置
    tag_match = re.search(r'<div\b[^>]*\bdata-i18n\s*=\s*"footer\.tagline"[^>]*>', bot_inner)
    if not tag_match:
        return text
    tag_pos = tag_match.start()
    new_bot_inner = (
        bot_inner[:m_pos]
        + '<div class="footer-bottom-left">'
        + dl_a_html + ' '
        + bot_inner[m_pos:tag_pos]
        + '</div> '
        + bot_inner[tag_pos:]
    )
    new_bot = f'<div{bot_attrs}>{new_bot_inner}</div>'

    # 4. text 中替换：去掉 footer-dl 段，插入新 footer-bottom 段
    pat_dl_open = re.compile(r'<div\b[^>]*\bclass\s*=\s*"[^"]*\bfooter-dl\b[^"]*"[^>]*>')
    m_dl_open = pat_dl_open.search(text)
    if not m_dl_open:
        return text
    dl_open_start = m_dl_open.start()
    return text[:dl_open_start] + new_bot + text[bot_end:]


if __name__ == '__main__':
    base = r'D:/360Downloads/deskbud/website'
    for f in PAGES:
        p = os.path.join(base, f)
        src = open(p, encoding='utf-8').read()
        out = merge_footer_dl(src)
        if out != src:
            open(p, 'w', encoding='utf-8').write(out)
            print(f, '改:', len(src), '->', len(out))
        else:
            print(f, '无变化')