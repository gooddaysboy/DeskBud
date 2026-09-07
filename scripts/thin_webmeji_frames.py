#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
抽稀 webmeji 动作帧：隔帧取（f000,f002,f004...）并把 interval 按同比例放大。
=> 帧数与体积减半，动作播放速度/总时长保持不变。

特点：
- 只改 rabbit.config.js 里的 frames 列表与 interval，**不删任何素材文件**（随时可回滚）
- 幂等：某动作当前帧数已少于磁盘文件数 => 判定已抽稀，跳过
- 用法：
    python scripts/thin_webmeji_frames.py                 # 默认：帧数>=12 的动作抽稀 2 倍
    python scripts/thin_webmeji_frames.py --min 8 --factor 2 --dry
"""
import argparse
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CONFIG = os.path.join(ROOT, 'assets', 'webmeji', 'rabbit.config.js')
ASSET_ROOT = os.path.join(ROOT, 'assets', 'webmeji')

# 形如：  walk:        { frames: [ ... ], interval: 100, loops: 2 },
LINE_RE = re.compile(
    r'^(?P<indent>\s{2})(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{\s*'
    r'frames:\s*\[(?P<frames>.*?)\]\s*,\s*'
    r'interval:\s*(?P<interval>\d+)(?P<rest>[^\n]*)$',
    re.M,
)


def disk_frame_count(first_url):
    """该动作在磁盘上的 webp 数量（用于幂等判断）"""
    m = re.search(r'rabbit/([^/]+)/', first_url)
    if not m:
        return None
    d = os.path.join(ASSET_ROOT, 'rabbit', m.group(1))
    if not os.path.isdir(d):
        return None
    return len([f for f in os.listdir(d) if f.endswith('.webp')])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--min', type=int, default=12, help='帧数 >= 此值才抽稀（默认 12）')
    ap.add_argument('--factor', type=int, default=2, help='抽稀倍率（默认 2：隔帧取）')
    ap.add_argument('--dry', action='store_true', help='只打印不落盘')
    args = ap.parse_args()

    src = io.open(CONFIG, encoding='utf-8').read()
    out = src
    report = []

    for m in list(LINE_RE.finditer(src)):
        name = m.group('name')
        raw = m.group('frames')
        frames = re.findall(r'"([^"]+)"', raw)
        n = len(frames)
        interval = int(m.group('interval'))
        if n < args.min:
            continue

        disk = disk_frame_count(frames[0]) if frames else None
        if disk and n < disk:
            report.append('  %-14s 已抽稀（%d < 磁盘 %d），跳过' % (name, n, disk))
            continue

        kept = frames[::args.factor]
        if kept[-1] != frames[-1]:
            kept.append(frames[-1])          # 保留尾帧，保证动作收尾
        # 按“原周期 ÷ 新帧数”取整，保证动作总时长/速度基本不变
        new_interval = max(1, int(round(n * interval / float(len(kept)))))
        new_line = '%s%s: { frames: [%s], interval: %d%s' % (
            m.group('indent'), name,
            ', '.join('"%s"' % f for f in kept),
            new_interval, m.group('rest'),
        )
        out = out.replace(m.group(0), new_line, 1)
        report.append('  %-14s %2d -> %2d 帧, interval %d -> %d ms（周期 %.2fs -> %.2fs）' % (
            name, n, len(kept), interval, new_interval,
            n * interval / 1000.0, len(kept) * new_interval / 1000.0,
        ))

    print('抽稀报告（factor=%d, min=%d）：' % (args.factor, args.min))
    print('\n'.join(report) if report else '  （无动作满足条数阈值）')

    if not args.dry and out != src:
        io.open(CONFIG, 'w', encoding='utf-8', newline='\n').write(out)
        print('已写入 %s' % CONFIG)
    elif args.dry:
        print('[dry-run] 未落盘')


if __name__ == '__main__':
    main()
