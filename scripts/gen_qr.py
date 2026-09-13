#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成下载页要用的静态二维码（入库，浏览器零依赖）。

目标固定 = https://deskbud.xyz/get.html（安卓下载引导页）。
「换版本不用换码」：get.html 自己去取最新直链，所以二维码内容永远不变。

依赖：segno（本机装在托管 venv：
  C:/Users/zhi_feng.cao/.workbuddy/binaries/python/envs/default/Scripts/pip.exe install segno）

用法：python scripts/gen_qr.py
"""
import os

import segno

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = 'https://deskbud.xyz/get.html'
OUT = os.path.join(ROOT, 'assets', 'img', 'qr-android.svg')
# PNG 版：给 Android（原生 Canvas 画不了 SVG）/ 桌面 Pillow 的分享卡片用。
# 路径按 kotlin 设计文档约定固定为 assets/share/qr.png；白底 + 深灰模块
#（扫描器需要 quiet zone 对比，浅色卡底上不能只留透明底）。
OUT_PNG = os.path.join(ROOT, 'assets', 'share', 'qr.png')


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    qr = segno.make(TARGET, error='m')          # 中等容错：够小又耐刮花
    qr.save(OUT, kind='svg', scale=1, border=2, dark='#222222', light=None)
    print('[ok]', OUT)
    qr.save(OUT_PNG, kind='png', scale=15, border=3, dark='#222222', light='#ffffff')
    print('[ok]', OUT_PNG)
    print('     target:', TARGET)
    print('     size  :', os.path.getsize(OUT), 'B (svg) /', os.path.getsize(OUT_PNG), 'B (png)')


if __name__ == '__main__':
    main()
