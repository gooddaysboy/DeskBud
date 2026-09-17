#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成分享卡片图 og-card.png（1200×630 横版）—— 微信 / QQ / 小红书 抓 og:image 用。

为什么单独一张（不直接用 share-card-sample.png）：
  share-card-sample*.png 是 **1080×1440 竖版**，用于「发图片到朋友圈」；
  微信 / QQ 抓取 og:image 时按 **1.91:1 横版**裁剪显示，竖版会被裁掉一半或留白。
  所以另出一张 1200×630。

视觉基准沿用 assets/share/share-card-sample.svg：
  卡底 #FFF1E6 · 顶部装饰条 #E8722B · 品牌字标 #E8722B · 辅助色 #9A8874 / 分隔线 #EFE2CF
差异（有意）：
  ① **不放二维码** —— og 缩略图在微信里只显示约 200px 宽，二维码扫不了，白占位置。
  ② 主体改为「字标 + 一句定位」+ 宠物大图，让人一眼知道这是什么。

依赖：Pillow（托管 venv 自带）
  ~/.workbuddy/binaries/python/envs/default/Scripts/python.exe scripts/gen_og_card.py
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
BRAND = '#E8722B'
SOFT = '#FFF1E6'
INK = '#222222'
INK_FAINT = '#9A8874'
LINE = '#EFE2CF'

MSYH = 'C:/Windows/Fonts/msyh.ttc'
MSYH_BD = 'C:/Windows/Fonts/msyhbd.ttc'

OUT = os.path.join(ROOT, 'assets', 'share', 'og-card.png')
# 宠物用 idle 首帧（真图）；rabbit = 主形象，与 share-card-sample.png 保持一致
PET = 'works/rabbit/idle.webp'
# 宠物绘制盒（右栏）；中心 y 与左栏文字块中心（= 画布中线 315）对齐
PET_BOX = (650, 60, 1140, 570)
# 左栏文字锚点
LX = 84


def font(path, size):
    return ImageFont.truetype(path, size)


def main():
    img = Image.new('RGB', (W, H), SOFT)
    d = ImageDraw.Draw(img)

    # 顶部装饰条（与分享卡同一口径）
    d.rectangle([0, 0, W, 14], fill=BRAND)

    # 宠物：contain 居中于 PET_BOX
    pet = Image.open(os.path.join(ROOT, PET)).convert('RGBA')
    x0, y0, x1, y1 = PET_BOX
    bw, bh = x1 - x0, y1 - y0
    s = min(bw / pet.width, bh / pet.height)
    pet = pet.resize((max(1, int(pet.width * s)), max(1, int(pet.height * s))), Image.LANCZOS)
    img.paste(pet, (x0 + (bw - pet.width) // 2, y0 + (bh - pet.height) // 2), pet)

    # 左栏：品牌字标 / 定位句 / 分隔线 / 一句话说明 / 域名
    #   整块（190~440）垂直居中于 630 高的画布
    d.text((LX, 190), 'DeskBud', font=font(MSYH_BD, 88), fill=BRAND, anchor='ls')
    d.text((LX + 4, 262), '让桌面不再孤单', font=font(MSYH, 34), fill=INK, anchor='ls')
    d.rectangle([LX, 306, 520, 308], fill=LINE)
    d.text((LX + 4, 354), '趣味桌面宠物伙伴 · 常驻你的屏幕', font=font(MSYH, 26), fill=INK_FAINT, anchor='ls')
    d.text((LX + 4, 440), 'deskbud.xyz', font=font(MSYH_BD, 32), fill=BRAND, anchor='ls')

    img.save(OUT, optimize=True)
    size = os.path.getsize(OUT)
    print('[ok] %s  %s  %d B (%.1f KB)' % (OUT, img.size, size, size / 1024.0))
    if size > 300 * 1024:
        print('[warn] 超过 300 KB，微信抓取可能偏慢，考虑改存 JPEG', file=sys.stderr)


if __name__ == '__main__':
    main()
