#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
extract_rabbit_frames.py
从 pyside6_rabbit_orbit/rabbit/*.webp 动画抽帧，归一到统一画布，输出到 assets/webmeji/rabbit/。
锚点：内容脚底中点 = 画布底部中点；等比缩放；站姿 idle 为基准参考高度。

【朝向约定】
webmeji 引擎硬编码素材基准面朝 left（facing='left' → scaleX(1) 原图）。
源素材若面朝右（run_right/jumphappy），抽帧后镜像为左基准，使移动方向与脸朝向一致。

用法：
  python scripts/extract_rabbit_frames.py

依赖：Pillow
"""
import os
import json
from PIL import Image, ImageOps

# ---- 配置 ----
# OUT：本项目 assets，相对脚本定位（换机/换盘免改）。
# SRC：优先环境变量 RABBIT_SRC → 项目根下 pyside6_rabbit_orbit/rabbit → 老机器绝对路径兜底。
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(_PROJECT_ROOT, 'assets', 'webmeji', 'rabbit')
_SRC_CANDIDATES = [
    os.environ.get('RABBIT_SRC'),
    os.path.join(os.path.dirname(_PROJECT_ROOT), 'pyside6_rabbit_orbit', 'rabbit'),  # 项目根(deskbud)/pyside6_rabbit_orbit
    r'D:\deskbud\pyside6_rabbit_orbit\rabbit',
]
SRC = next((p for p in _SRC_CANDIDATES if p and os.path.isdir(p)), _SRC_CANDIDATES[1])
CANVAS = 200      # 输出正方形画布
TARGET_H = 150    # 站姿目标视觉高（用作归一基准）

# (webmeji action 名, 源动作名, 帧索引列表, 帧间隔 ms, 是否镜像)
# 镜像=True 表示源素材面朝右，输出统一为左基准（run_right/jumphappy）
PLAN = [
    # 底部行为（地面版）
    ('walk',         'run_left',   [0,4,8,12,16,20],   110, False),
    ('stand',        'idle_left',  [0, 12],             600, False),
    ('sit',          'idle_left',  [0, 8, 16],          350, False),
    ('spin',         'idle_left',  [0],                 80,  False),
    ('dance',        'jumphappy',  [0,4,8,12,16,20],    130, True),
    ('trip',         'fall',       [4,8,12,16,20],      130, False),
    ('forcethink',   'scratch',    [2,6,10,14,18],      180, False),
    ('pet',          'eat',        [4,10,16],           250, False),
    ('drag',         'fall',       [8,14,20],           100, False),
    ('falling',      'fall',       [0,4,8],             120, False),
    ('fallen',       'fall',       [22,26],             250, False),
    # 边缘 & 跳跃专用（启用 ALLOWANCES:top 后）
    ('jump',         'jumphappy',  [0],                 160, True),
    ('hangstillTop', 'fall',       [0],                 400, False),
    ('climbTop',     'jumphappy',  [0,4],               220, True),
]


def get_frame(webp_path, frame_idx):
    im = Image.open(webp_path)
    total = getattr(im, 'n_frames', 1)
    if frame_idx >= total:
        frame_idx = total - 1
    im.seek(frame_idx)
    return im.convert('RGBA')


def content_bbox(im):
    return im.getbbox()


def normalize_frame(im, ref_scale, mirror=False):
    """内容 bbox 裁剪 → 可选水平镜像 → 等比缩放至 TARGET_H 视觉高 → 居中贴底放回画布。"""
    bb = content_bbox(im)
    if not bb:
        return Image.new('RGBA', (CANVAS, CANVAS), (0,0,0,0))
    cropped = im.crop(bb)
    if mirror:
        cropped = ImageOps.mirror(cropped)
    cw, ch = cropped.size
    nw, nh = max(1, int(round(cw * ref_scale))), max(1, int(round(ch * ref_scale)))
    resized = cropped.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0,0,0,0))
    x = (CANVAS - nw) // 2
    y = CANVAS - nh
    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)

    # 基准：idle_left 第 0 帧 bbox 高 → 缩放因子
    im_idle = get_frame(os.path.join(SRC, 'idle_left.webp'), 0)
    bb_idle = content_bbox(im_idle)
    h_idle = bb_idle[3] - bb_idle[1]
    REF_SCALE = TARGET_H / h_idle
    print(f'基准 idle_left bbox h={h_idle} → 缩放因子 {REF_SCALE:.4f}')

    manifest = []
    for action, src_act, idx_list, interval, mirror in PLAN:
        dir_path = os.path.join(OUT, action)
        os.makedirs(dir_path, exist_ok=True)
        src_path = os.path.join(SRC, f'{src_act}.webp')
        for i, idx in enumerate(idx_list, 1):
            im = get_frame(src_path, idx)
            canvas = normalize_frame(im, REF_SCALE, mirror)
            filename = f'{i}.png'
            canvas.save(os.path.join(dir_path, filename), optimize=True)
        frames_count = len(idx_list)
        frames_urls = [f'rabbit/{action}/{j}.png' for j in range(1, frames_count + 1)]
        manifest.append({'action': action, 'frames': frames_urls, 'interval': interval})
        print(f'  {action}: {frames_count} 帧 (mirror={mirror}, src={src_act})')

    with open(os.path.join(OUT, '_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f'\n写入 manifest: {OUT}/_manifest.json')

    total_size = 0
    for root, _, files in os.walk(OUT):
        for fn in files:
            total_size += os.path.getsize(os.path.join(root, fn))
    print(f'素材总大小: {total_size/1024:.1f} KB ({total_size/1024/1024:.2f} MB)')


if __name__ == '__main__':
    main()