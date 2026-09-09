#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""素材预览快照生成器（复用 website/scripts/素材预览_webmeji.html 模板）

用法:
  python gen_preview_snapshot.py --root <素材根> --out <输出html> [--title 标题]

- root 下每个子目录=一个动作，收集 f*.webp / f*.png（按文件名排序）
- 生成自包含 html：内嵌文件清单，双击 file:// 直接看，零服务依赖
- 输出 html 放在哪都行，图片用相对路径引用（所以 out 最好与 root 同级或上层）

示例:
  python gen_preview_snapshot.py --root <素材根目录> \
      --out <输出目录>/素材预览_桌面.html
"""
import argparse
import json
import os
import re
import sys

TPL = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   '素材预览_webmeji.html')
IMG_EXT = ('.webp', '.png', '.gif', '.jpg', '.jpeg')
FRAME_RE = re.compile(r'^f\d+', re.I)


def scan(root):
    """扫描素材根 → [{name,type,dir,files:[相对路径]}]"""
    items = []
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if not os.path.isdir(d):
            continue
        frames = sorted(f for f in os.listdir(d)
                        if f.lower().endswith(IMG_EXT))
        if not frames:
            continue
        # f000.webp 优先按帧号排；非 f 开头排后面
        frames.sort(key=lambda f: (0, int(FRAME_RE.match(f).group()[1:]))
                    if FRAME_RE.match(f) else (1, 0))
        items.append({
            'name': name,
            'type': 'seq',
            'dir': name,
            'files': [os.path.join(name, f).replace('\\', '/')
                      for f in frames],
        })
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True, help='素材根目录（其下每子目录=一个动作）')
    ap.add_argument('--out', required=True, help='输出 html 路径')
    ap.add_argument('--title', default='', help='页面标题（可选）')
    ap.add_argument('--tpl', default=TPL, help='预览模板 html')
    a = ap.parse_args()

    root = os.path.abspath(a.root)
    out = os.path.abspath(a.out)
    if not os.path.isdir(root):
        print('ERR 素材根不存在:', root)
        return 1

    items = scan(root)
    if not items:
        print('ERR 未扫描到任何帧:', root)
        return 1
    total = sum(len(i['files']) for i in items)

    html = open(a.tpl, encoding='utf-8').read()
    # 图片路径相对 out 所在目录
    base = os.path.dirname(out)
    rel_prefix = os.path.relpath(root, base).replace('\\', '/')
    for it in items:
        it['files'] = [f'{rel_prefix}/{f}' for f in it['files']]

    emb = 'const EMBEDDED = ' + json.dumps(items, ensure_ascii=False) + ';'
    html, n1 = re.subn(r'const EMBEDDED = \[.*?\];\n', emb + '\n', html,
                       count=1, flags=re.S)
    # SNAP_ROOT 只作展示：写相对路径（相对输出目录），跨盘无法相对化时退回目录名
    try:
        root_disp = os.path.relpath(root, base).replace('\\', '/')
    except ValueError:
        root_disp = os.path.basename(root)
    snap = 'const SNAP_ROOT = ' + json.dumps(root_disp) + ';'
    html, n2 = re.subn(r'const SNAP_ROOT = ".*?";', snap, html, count=1)
    if a.title:
        html = re.sub(r'<title>.*?</title>', f'<title>{a.title}</title>',
                      html, count=1)
    if not (n1 and n2):
        print('ERR 模板锚点未匹配（EMBEDDED/SNAP_ROOT）:', a.tpl)
        return 1

    os.makedirs(base, exist_ok=True)
    open(out, 'w', encoding='utf-8').write(html)
    print(f'OK {out}')
    print(f'   动作 {len(items)} 个 / 帧 {total} 张 / 根 {root}')
    for it in items:
        print(f'   - {it["name"]:<14} {len(it["files"])} 帧')
    return 0


if __name__ == '__main__':
    sys.exit(main())
