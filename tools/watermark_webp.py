#!/usr/bin/env python
# 给作品 webp（含动画帧）批量叠半透明文字水印 "DeskBud.xyz"
# 用法: python tools/watermark_webp.py [目录1 目录2 ...]   (默认 works/panda works/rabbit)
# 说明: 只改写传入目录下的 *.webp；逐帧叠角标，保留动画帧数与透明。运行前请先备份 works/。
import os
import sys

from PIL import Image, ImageDraw, ImageFont

WATERMARK = "DeskBud.xyz"
FONT_CANDIDATES = [
    r"C:/Windows/Fonts/arial.ttf",
    r"C:/Windows/Fonts/msyh.ttc",
    r"C:/Windows/Fonts/msyhbd.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


def load_font(size):
    for fp in FONT_CANDIDATES:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                pass
    return ImageFont.load_default()


def watermark_frame(rgba, font):
    w, h = rgba.size
    d = ImageDraw.Draw(rgba)
    fs = max(12, int(min(w, h) * 0.06))
    f = font if getattr(font, "size", 0) == fs else load_font(fs)
    tw = d.textlength(WATERMARK, font=f)
    th = fs
    pad = max(6, int(min(w, h) * 0.03))
    x = w - tw - pad
    y = h - th - pad
    # 先画暗色偏移描边增强在亮/暗背景上的可读性，再画半透明白字
    d.text((x + 1, y + 1), WATERMARK, font=f, fill=(0, 0, 0, 120))
    d.text((x, y), WATERMARK, font=f, fill=(255, 255, 255, 150))
    return rgba


def process(path):
    im = Image.open(path)
    n = getattr(im, "n_frames", 1)
    base_font = load_font(24)
    frames = []
    durations = []
    for i in range(n):
        im.seek(i)
        durations.append(im.info.get("duration", 100))
        frame = im.convert("RGBA")
        frames.append(watermark_frame(frame, base_font))
    info = im.info
    save_kwargs = dict(
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        loop=info.get("loop", 0),
        duration=durations,
    )
    if "lossless" in info:
        save_kwargs["lossless"] = info.get("lossless")
    if "quality" in info:
        save_kwargs["quality"] = info.get("quality")
    if "method" in info:
        save_kwargs["method"] = info.get("method")
    if "background" in info:
        save_kwargs["background"] = info.get("background")
    frames[0].save(path, **save_kwargs)
    print(f"  ok {os.path.relpath(path)}  frames={n}  ->{os.path.getsize(path) // 1024}KB")


if __name__ == "__main__":
    dirs = sys.argv[1:] or ["works/panda", "works/rabbit"]
    for d in dirs:
        if not os.path.isdir(d):
            print(f"[跳过] 目录不存在: {d}")
            continue
        for root, _, files in os.walk(d):
            for fn in files:
                if fn.lower().endswith(".webp"):
                    process(os.path.join(root, fn))
    print("完成。")
