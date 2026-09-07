"""DeskBud Webmeji 熊猫素材转换：kotlin 原始动作 → 网站动作目录。

源: D:/deskbud/kotlin/app/src/main/assets/pets/panda/<源动作>/fNNN.webp (240x240)
出: assets/webmeji/panda/<网站动作>/fNNN.webp
特点: 幂等（可重复跑覆盖）、只做选帧+重命名（源已是 240² webp，无需转码）、
      hangstillSide 不单独出目录（config 里复用 hangstillTop 的帧路径，同 rabbit 做法）。

用法: python scripts/convert_panda_frames.py [--src 源目录] [--out 输出目录]
"""
import argparse
import os
import shutil

# 网站动作 → (kotlin 源动作, 帧号列表 None=全量)
MAP = {
    'walk':         ('run',       None),                       # 28 帧, interval 90
    'stand':        ('idle',      [0, 14]),                    # 2 帧,  700
    'sit':          ('sit',       None),                       # 25 帧, 160
    'spin':         ('idle',      [0]),                        # 1 帧,  80
    'dance':        ('jumphappy', [0, 4, 8, 12, 16, 20]),      # 6 帧,  130
    'trip':         ('fall',      [4, 8, 12, 16, 20]),         # 5 帧,  130
    'forcethink':   ('scratch',   [2, 6, 10, 14, 18]),         # 5 帧,  180
    'pet':          ('eat',       [4, 10, 16]),                # 3 帧,  250
    'drag':         ('fall',      [8, 14, 20]),                # 3 帧,  100
    'falling':      ('fall',      None),                       # 34 帧, 115（时长≈3.9s 与物理下落同步）
    'fallen':       ('fall',      [24, 26, 28, 29, 30, 31, 32, 33]),  # 8 帧, 244（末段瘫坐）
    'jump':         ('jumphappy', [0]),                        # 1 帧,  160
    'climbTop':     ('jumphappy', [0, 4]),                     # 2 帧,  220
    'climbSide':    ('climb',     None),                       # 3 帧,  150
    'hangstillTop': ('hang',      None),                       # 25 帧, 150（hangstillSide 复用此目录）
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=r'D:/deskbud/kotlin/app/src/main/assets/pets/panda')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'webmeji', 'panda'))
    args = ap.parse_args()

    total = 0
    for action, (src_name, idxs) in MAP.items():
        src_dir = os.path.join(args.src, src_name)
        out_dir = os.path.join(args.out, action)
        os.makedirs(out_dir, exist_ok=True)
        files = sorted(os.listdir(src_dir))
        picks = files if idxs is None else [files[i] for i in idxs]
        for n, fname in enumerate(picks):
            dst = os.path.join(out_dir, f'f{n:03d}.webp')
            shutil.copyfile(os.path.join(src_dir, fname), dst)
            total += 1
        print(f'{action:14s} <- {src_name:10s} {len(picks):3d} 帧')
    print(f'共 {total} 帧 → {os.path.abspath(args.out)}')


if __name__ == '__main__':
    main()
