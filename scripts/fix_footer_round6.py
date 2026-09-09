#!/usr/bin/env python3
"""6 页同步：导航文案 + 页脚三行重排（老曹 2026-09-09 拍板）"""
import os, re

PAGES = ['index.html', 'list.html', 'detail.html', 'pets.html', 'usage.html', 'privacy.html']


def extract_div_with_attrs(s, cls_name, start=0):
    """找 class 含 cls_name 的 <div>，按开闭 div 标签匹配（任意嵌套），返回 (attrs_str, inner_html, end_index)。

    算法：扫描 s 中所有 <div> 开标签（深度+1）和 </div> 闭标签（深度-1）；深度从 1 变 0 时（即外层 footer-top
    闭合），截取 m.end() 到该闭标签之间的全部内容作为 inner。
    """
    pat = re.compile(r'<div\b([^>]*\bclass\s*=\s*"[^"]*\b' + re.escape(cls_name) + r'\b[^"]*"[^>]*)>')
    m = pat.search(s, start)
    if not m:
        return None
    attrs = m.group(1)
    inner_start = m.end()  # 关键：inner 起点在外层开始标签后，全程不变
    i = m.end()
    depth = 1
    while i < len(s):
        # 找下一个真正的 <div 开标签
        next_open = -1
        j = i
        while j < len(s):
            idx = s.find('<div', j)
            if idx == -1:
                break
            ch = s[idx + 4:idx + 5]
            if ch in (' ', '>', '\n', '\t'):
                next_open = idx
                break
            j = idx + 4
        next_close = s.find('</div>', i)
        if next_close == -1:
            return None
        # 谁在前就处理谁
        if next_open != -1 and next_open < next_close:
            depth += 1
            i = next_open + 4
        else:
            depth -= 1
            if depth == 0:
                inner = s[inner_start:next_close]  # 用 inner_start 而非 i
                return attrs, inner, next_close + len('</div>')
            i = next_close + len('</div>')
    return None


def split_footer(s):
    m = re.search(r'<footer\b[^>]*>', s)
    if not m:
        return None
    end_idx = s.find('</footer>', m.end())
    if end_idx == -1:
        return None
    end = end_idx + len('</footer>')
    return s[:m.start()], s[m.start():end], s[end:]


def rebuild_footer_block(footer_block):
    top = extract_div_with_attrs(footer_block, 'footer-top')
    if not top:
        return footer_block
    bot = extract_div_with_attrs(footer_block, 'footer-bottom', start=top[2])
    if not bot:
        return footer_block
    top_attrs, top_inner, _ = top
    bot_attrs, bot_inner, _ = bot
    # 新 wrap 内部（保留原 footer-top/footer-bottom 的所有 attrs 含 data-page-node-id）
    inner = (
        '<div class="footer-dl"><a href="list.html" data-i18n="footer.download">客户端下载</a></div>'
        + f'<div{bot_attrs}>{bot_inner}</div>'
        + f'<div{top_attrs}>{top_inner}</div>'
    )
    # 替换 wrap div 整段（用栈式 extract 找到 wrap 的真实范围）
    wrap = extract_div_with_attrs(footer_block, 'wrap')
    if not wrap:
        return footer_block
    # 找 wrap 开始标签位置
    pat_wrap = re.compile(r'<div\b([^>]*\bclass\s*=\s*"[^"]*\bwrap\b[^"]*"[^>]*)>')
    mw = pat_wrap.search(footer_block)
    if not mw:
        return footer_block
    wrap_open_end = mw.end()
    wrap_close_end = wrap[2]  # extract 返回的 end_index 是 </div> 之后
    # 新 wrap = 原 attrs（包含 class="wrap"） + 新 inner + </div>
    new_block = footer_block[:wrap_open_end] + inner + '</div>' + footer_block[wrap_close_end:]
    return new_block


def fix_page(text):
    text = text.replace('>下载客户端</a>', '>客户端下载</a>')
    text = text.replace('>联系我们</a>', '>许可与隐私</a>')
    text = re.sub(r'<a href="list\.html" data-i18n="nav\.works">[^<]*</a>\s*', '', text)
    parts = split_footer(text)
    if parts:
        header, footer_block, tail = parts
        new_footer = rebuild_footer_block(footer_block)
        text = header + new_footer + tail
    return text


if __name__ == '__main__':
    base = r'D:/360Downloads/deskbud/website'
    for f in PAGES:
        p = os.path.join(base, f)
        src = open(p, encoding='utf-8').read()
        out = fix_page(src)
        if out != src:
            open(p, 'w', encoding='utf-8').write(out)
            print(f, '改:', len(src), '->', len(out))
        else:
            print(f, '无变化')