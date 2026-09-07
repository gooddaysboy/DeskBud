"""Webmeji 兔子素材尺寸统一：所有动作帧画布统一到 240×240（q90 webp 重存）。

背景：v3 新素材(walk/sit/hangstillTop/fallen)为 240²，旧动作(stand/climbTop/pet/drag 等)为 200²。
显示尺寸由 CSS 容器固定(100×100)决定，等比放大画布不改变兔子视觉大小(内容占画布比例不变)，
只统一资产规格，便于跨项目(kotlin/website)素材复用。

用法: python scripts/normalize_webmeji_size.py
说明: 原图在 git HEAD(png 版)有备份，出错可 git checkout 恢复后重转。
"""
import glob
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "webmeji", "rabbit")
ROOT = os.path.normpath(ROOT)
TARGET = (240, 240)


def main():
    changed = 0
    skipped = 0
    total_in = 0
    total_out = 0
    for d in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, d)
        if not os.path.isdir(p):
            continue
        for f in sorted(glob.glob(os.path.join(p, "*.webp"))):
            total_in += os.path.getsize(f)
            im = Image.open(f)
            if im.size == TARGET:
                skipped += 1
                total_out += os.path.getsize(f)
                continue
            if im.mode != "RGBA":
                im = im.convert("RGBA")
            # 等比放大到 240²（原画布正方形，直接 resize 保持内容占比不变）
            im = im.resize(TARGET, Image.LANCZOS)
            im.save(f, "WEBP", quality=90, method=4)
            changed += 1
            total_out += os.path.getsize(f)
            print(f"{d}/{os.path.basename(f)}: -> {TARGET}")
    print(f"\n完成: 重存 {changed} 帧, 跳过(已240²) {skipped} 帧")
    print(f"体积: {total_in} -> {total_out} B ({total_out/max(total_in,1)*100:.0f}%)")


if __name__ == "__main__":
    main()
