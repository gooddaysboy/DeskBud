#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成分享卡片示例图（PNG）—— 三端视觉基准的「效果版」。

参数与 assets/share/share-card-sample.svg 完全一致（尺寸/坐标/字号/配色）；
宠物用 idle 首帧（真图），二维码贴 assets/share/qr.png（真码，目标 = 伙伴页）。

为什么要单独出示例图：SVG 是「规范」，PNG 是「效果」—— 三端（Android Canvas /
桌面 Pillow / 网页 Canvas 2D）实现时看 PNG 对结果，比读 SVG 注释快得多。

⚠️ 改 scripts/gen_qr.py 的二维码目标后**必须重跑本脚本**：示例图内嵌的是 qr.png，
   不重跑就会出现「规范说伙伴页、示例图还印着下载页」的错配。

依赖：Pillow（本机托管 venv 自带）
   ~/.workbuddy/binaries/python/envs/default/Scripts/python.exe scripts/gen_share_card_samples.py

原文出处：2026-09-13 写的 _tmp/_make_share_card.py（临时目录，已不在版本控制里），
2026-09-17 收编到 scripts/ 免得换机器就丢。逻辑未改，只动了 ROOT 层级与注释。
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1080, 1440
BRAND = '#E8722B'
SOFT = '#FFF1E6'
INK = '#222222'
INK_FAINT = '#9A8874'
LINE = '#EFE2CF'

MSYH = 'C:/Windows/Fonts/msyh.ttc'
MSYH_BD = 'C:/Windows/Fonts/msyhbd.ttc'
EMOJI = 'C:/Windows/Fonts/seguiemj.ttf'

# 三只样例：rabbit / panda / linekit（personas 与 idle 首帧都从真源取）
SAMPLES = [
    ('rabbit', 'works/rabbit/idle.webp', '「长耳耷拉脸蛋圆，门牙两颗露一点」', '\U0001F430'),
    ('panda', 'works/panda/idle.webp', '「国宝主打一个躺平」', '\U0001F43C'),
    ('linekit', 'works/linekit-anim/linekit_idle.webp', '「我只有几根线条，但够你陪啦」', '\u270F\uFE0F'),
]


def wrap(draw, text, fnt, maxw):
    """按中文标点优先折行（避免断在词中间），单段仍超宽才硬切。"""
    import re
    parts = re.findall(r'[^，。！？；、]+[，。！？；、]?', text) or [text]
    lines, cur = [], ''
    for p in parts:
        if draw.textlength(cur + p, font=fnt) <= maxw:
            cur += p
        else:
            if cur:
                lines.append(cur)
            cur = p
    if cur:
        lines.append(cur)
    out = []
    for ln in lines:
        while draw.textlength(ln, font=fnt) > maxw:
            k = len(ln)
            while k > 1 and draw.textlength(ln[:k], font=fnt) > maxw:
                k -= 1
            out.append(ln[:k])
            ln = ln[k:]
        out.append(ln)
    return out


def make(out_path, pet_path, quote, emoji):
    img = Image.new('RGB', (W, H), SOFT)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 14], fill=BRAND)

    # 宠物主图（contain 居中于 190,150,700x620）
    pet = Image.open(os.path.join(ROOT, pet_path)).convert('RGBA')
    s = min(700 / pet.width, 620 / pet.height)
    pet = pet.resize((max(1, int(pet.width * s)), max(1, int(pet.height * s))), Image.LANCZOS)
    img.paste(pet, ((W - pet.width) // 2, 150 + (620 - pet.height) // 2), pet)

    # 人设句（居中，最多 2 行；两行基线 900/976，单行 938）
    f56 = ImageFont.truetype(MSYH, 56)
    lines = wrap(d, quote, f56, 860)[:2]
    y = 938 if len(lines) == 1 else 900
    for ln in lines:
        d.text((540, y), ln, font=f56, fill=INK, anchor='ms')
        y += 76

    # emoji（与第二行留足 90px 以上间距）
    try:
        fe = ImageFont.truetype(EMOJI, 58)
        d.text((540, 1068), emoji, font=fe, fill=INK, anchor='ms', embedded_color=True)
    except Exception as e:  # noqa
        print('  (emoji 跳过:', e, ')')

    # 分隔线
    d.rectangle([110, 1139, 970, 1141], fill=LINE)

    # 字标 + 域名
    d.text((110, 1225), 'DeskBud', font=ImageFont.truetype(MSYH_BD, 46), fill=BRAND, anchor='ls')
    d.text((110, 1280), 'deskbud.xyz', font=ImageFont.truetype(MSYH, 28), fill=INK_FAINT, anchor='ls')

    # 二维码（真源 = assets/share/qr.png；目标由 scripts/gen_qr.py 决定 = 伙伴页）
    qr = Image.open(os.path.join(ROOT, 'assets', 'share', 'qr.png')).convert('RGB').resize((180, 180), Image.LANCZOS)
    img.paste(qr, (810, 1150))

    img.save(out_path)
    print('[ok]', out_path, os.path.getsize(out_path), 'B')


def main():
    import json
    outdir = os.path.join(ROOT, 'assets', 'share')
    os.makedirs(outdir, exist_ok=True)
    personas = json.load(open(os.path.join(ROOT, 'data', 'bubble.json'), encoding='utf-8'))['personas']
    for i, (pid, pet, quote, emoji) in enumerate(SAMPLES):
        p = personas.get(pid)
        if p:                              # 文案/emoji 一律以 personas 真源为准
            quote = '\u300c' + p['zh'] + '\u300d'
            emoji = p['emoji']
        out = os.path.join(outdir, 'share-card-sample.png' if i == 0 else 'share-card-sample-%s.png' % pid)
        make(out, pet, quote, emoji)


if __name__ == '__main__':
    main()
