#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成两个静态二维码（入库，浏览器/原生零依赖）。

🔴 **两个产物、两个目标，不要统一**（2026-09-17 老曹拍板 1B）：
  1) assets/img/qr-android.svg  -> https://deskbud.xyz/get.html
     下载页给**桌面访客**扫的码，用途 = 把 App 装到手机。桌面落地已改成
     「直接给 Win/Mac 下载按钮 + 二维码」，这里必须留下载引导页。
  2) assets/share/qr.png        -> https://deskbud.xyz/buddies.html
     三端**分享卡片**上的码（Android 原生 Canvas / 桌面 Pillow 都画不了 SVG，只能吃 PNG）。
     分享出去的人先看伙伴页（认识宠物 + 看有多少只），再决定下不下 → 比直接砸下载页转化好。

  ⚠️ 历史坑：share-card-spec.md 第五节曾写「二维码维持 get.html」（09-13 结论），
     与 09-16 15:43 老曹改判「分享卡指向伙伴页」在同一个文件里互相打架。
     本次已一并更正 spec；改这里时请**同时**检查 spec 第 33/62/65 行与
     share-card-sample.svg 的注释，三处是同一条口径。
  ⚠️ 分享卡示例 PNG（assets/share/share-card-sample*.png）内嵌的就是 qr.png，
     换目标后必须重跑 _trash/tmp_scripts_20260913/_make_share_card.py 重新合成。
  ⚠️ kotlin 内嵌快照 assets/site/assets/share/qr.png 与本站同一份，
     换图后由 kotlin 侧重跑同步（website 侧会在协同板 @ 他们）。

  「换版本不用换码」：两个目标页都自己去取最新直链，所以二维码内容与版本无关。

依赖：segno（本机托管 venv，缺就装）：
   python -m pip install segno
   解释器：~/.workbuddy/binaries/python/envs/default/Scripts/python.exe

用法：python scripts/gen_qr.py
"""
import os

import segno

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 下载页扫码用（桌面访客 → 装到手机）—— 保持 get.html，别改。
TARGET_GET = 'https://deskbud.xyz/get.html'
OUT_SVG = os.path.join(ROOT, 'assets', 'img', 'qr-android.svg')

# 分享卡用（看伙伴页 → 再下载）—— 2026-09-17 由 get.html 改为 buddies.html。
TARGET_BUDDIES = 'https://deskbud.xyz/buddies.html'
# PNG 版：给 Android（原生 Canvas 画不了 SVG）/ 桌面 Pillow 的分享卡片用。
# 路径按 kotlin 设计文档约定固定为 assets/share/qr.png；白底 + 深灰模块
#（扫描器需要 quiet zone 对比，浅色卡底上不能只留透明底）。
OUT_PNG = os.path.join(ROOT, 'assets', 'share', 'qr.png')

# 二维码固定参数：中等容错够小又耐刮花；深灰 #222 与品牌色系一致。
QR_KW = dict(error='m')


def main():
    os.makedirs(os.path.dirname(OUT_SVG), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)

    qr_get = segno.make(TARGET_GET, **QR_KW)
    qr_get.save(OUT_SVG, kind='svg', scale=1, border=2, dark='#222222', light=None)
    print('[ok]', OUT_SVG, '->', TARGET_GET)

    qr_bud = segno.make(TARGET_BUDDIES, **QR_KW)
    qr_bud.save(OUT_PNG, kind='png', scale=15, border=3, dark='#222222', light='#ffffff')
    print('[ok]', OUT_PNG, '->', TARGET_BUDDIES)

    print('     size  :', os.path.getsize(OUT_SVG), 'B (svg) /', os.path.getsize(OUT_PNG), 'B (png)')


if __name__ == '__main__':
    main()
