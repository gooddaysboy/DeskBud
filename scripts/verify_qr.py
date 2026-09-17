#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""二维码自检：把产物**真的解码一遍**，确认扫出来的 URL 与预期一致。

为什么需要：二维码是「生成完看不出对不对」的东西 —— 目标页写错、编码参数错、
放进卡片后被缩放糊掉，肉眼都发现不了。这个脚本把产物丢给 ZXing 解码，比对期望值。

覆盖（与 scripts/gen_qr.py 的两个目标一一对应）：
  assets/img/qr-android.svg  -> https://deskbud.xyz/get.html      （下载页扫码装手机）
  assets/share/qr.png        -> https://deskbud.xyz/buddies.html  （三端分享卡）

SVG 走「解析 segno 的 qrline path -> 重建模块矩阵 -> 画成位图 -> 解码」，
不引额外光栅化依赖（cairosvg 之类在 Windows 上还要单独装 cairo dll）。

依赖：Pillow + zxing-cpp
  ~/.workbuddy/binaries/python/envs/default/Scripts/python.exe -m pip install zxing-cpp
用法：python scripts/verify_qr.py          # 全对 -> 退出码 0；任一错 -> 1
"""
import os
import re
import sys

from PIL import Image, ImageDraw
import zxingcpp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXPECT = [
    ('assets/img/qr-android.svg', 'https://deskbud.xyz/get.html'),
    ('assets/share/qr.png', 'https://deskbud.xyz/buddies.html'),
]


def svg_to_image(path):
    """segno 的 QR SVG -> 位图。

    它的 <path d> 形如 `M2 2.5h7m1 0h2...m-29 1h1...`：
    由绝对 moveto 起头，之后用 `m dx dy` 换位 / 换行，`h len` 画一段水平线
    （横线中心线在 y+.5，故行号 = int(y)）。逐段涂格子重建矩阵，再画成位图。
    """
    src = open(path, encoding='utf-8').read()
    m = re.search(r'<path[^>]*\sd="([^"]+)"', src)
    if not m:
        raise ValueError('SVG 里找不到 <path d=...>（segno 输出格式变了？）')
    d = m.group(1)
    width = int(re.search(r'\bwidth="(\d+)"', src).group(1))
    height = int(re.search(r'\bheight="(\d+)"', src).group(1))

    tokens = re.findall(r'[MmhVv]|-?\d+(?:\.\d+)?', d)
    grid = [[0] * width for _ in range(height)]
    x = y = 0.0
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in 'Mm':                                   # 绝对/相对 move
            dx, dy = float(tokens[i + 1]), float(tokens[i + 2])
            x, y = (dx, dy) if t == 'M' else (x + dx, y + dy)
            i += 3
        elif t == 'h':                                  # 水平线段
            length = float(tokens[i + 1])
            row = int(y)
            for c in range(int(x), int(x + length)):
                if 0 <= row < height and 0 <= c < width:
                    grid[row][c] = 1
            x += length
            i += 2
        elif t == 'v':                                  # 垂直线段（segno 少用，兜底）
            length = float(tokens[i + 1])
            col = int(x)
            for r in range(int(y), int(y + length)):
                if 0 <= r < height and 0 <= col < width:
                    grid[r][col] = 1
            y += length
            i += 2
        else:
            i += 1

    scale, border = 10, 4                               # 白边 = quiet zone，解码器要
    img = Image.new('L', ((width + 2 * border) * scale, (height + 2 * border) * scale), 255)
    dr = ImageDraw.Draw(img)
    for r in range(height):
        for c in range(width):
            if grid[r][c]:
                x0, y0 = (c + border) * scale, (r + border) * scale
                dr.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill=0)
    return img, '%dx%d 矩阵' % (width, height)


def decode(path):
    if path.lower().endswith('.svg'):
        img, note = svg_to_image(path)
    else:
        img, note = Image.open(path), '%s' % (Image.open(path).size,)
    res = zxingcpp.read_barcodes(img)
    return (res[0].text if res else None), note


def main():
    bad = 0
    for rel, want in EXPECT:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            print('[MISS] %-28s 文件不存在' % rel)
            bad += 1
            continue
        got, note = decode(p)
        if got == want:
            print('[ OK ] %-28s -> %s   (%s)' % (rel, got, note))
        else:
            bad += 1
            print('[FAIL] %-28s -> %r' % (rel, got))
            print('       期望 %r   (%s)' % (want, note))
    print('\n%d/%d 通过' % (len(EXPECT) - bad, len(EXPECT)))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
