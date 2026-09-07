"""
convert_webmeji_webp.py —— DeskBud 网站 webmeji 素材统一升级脚本（website 本地版，勿改 kotlin 脚本）

背景(2026-09-07): kotlin 桌宠素材已改为 q90 webp + fNNN.webp 三补零命名。
为全站统一(格式+命名一致, 便于后续素材跨项目复用), 本脚本把
  assets/webmeji/rabbit/<action>/N.png        (N 从 1 起)
转换成
  assets/webmeji/rabbit/<action>/fNNN.webp    (NNN 三补零, 从 f000 起, webp q90)

规则:
- 只处理 assets/webmeji/rabbit/ 下动作目录内的 .png
- 帧按文件名数字升序排, 第 i 个(0起) -> f{i:03d}.webp
- 画布尺寸保持原样(不缩放, 240²/200² 混差另议)
- 转换全部成功后才删原 png (git 有提交可回滚)

用法:
  python scripts/convert_webmeji_webp.py            # 全部动作
  python scripts/convert_webmeji_webp.py --actions walk sit fallen
"""
import os
import sys
import glob
import argparse
from PIL import Image

ROOT = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "assets", "webmeji", "rabbit"
))


def sort_key(fn):
    """按文件名里的整数排序: 1.png, 2.png, ... 10.png"""
    try:
        return int(os.path.splitext(fn)[0])
    except ValueError:
        return 0


def convert_action(adir):
    """把 adir 内全部 *.png 转成 fNNN.webp, 返回 (帧数, 转换前字节, 转换后字节) 或 None"""
    pngs = sorted([f for f in os.listdir(adir) if f.lower().endswith(".png")], key=sort_key)
    if not pngs:
        return None

    size_in = 0
    dsts = []
    for i, fn in enumerate(pngs):
        src = os.path.join(adir, fn)
        dst = os.path.join(adir, f"f{i:03d}.webp")
        size_in += os.path.getsize(src)
        try:
            Image.open(src).save(dst, "WEBP", quality=90, method=4)
        except Exception as e:
            print(f"  !! {src} 转换失败: {e}; 已转换的 webp 保留, png 未删")
            raise
        dsts.append(dst)

    size_out = sum(os.path.getsize(d) for d in dsts)
    for fn in pngs:  # 全部成功, 删除旧 png
        os.remove(os.path.join(adir, fn))
    return len(pngs), size_in, size_out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--actions", nargs="*", default=None,
                    help="只转换指定动作(缺省=全部)")
    args = ap.parse_args()

    if not os.path.isdir(ROOT):
        print(f"!! 找不到素材目录 {ROOT}")
        sys.exit(1)

    dirs = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)))
    if args.actions:
        dirs = [d for d in dirs if d in args.actions]

    print(f"素材根: {ROOT}")
    print(f"待处理 {len(dirs)} 个动作: {dirs}\n")

    total_in = total_out = total_frames = 0
    for d in dirs:
        adir = os.path.join(ROOT, d)
        try:
            r = convert_action(adir)
        except Exception:
            print(f"  [{d}] 失败, 已中止")
            sys.exit(1)
        if not r:
            print(f"  [{d}] 无 png, 跳过")
            continue
        n, si, so = r
        total_frames += n
        total_in += si
        total_out += so
        print(f"  [{d}] {n}帧  {si:>10,}B -> {so:>9,}B  ({so/si*100:.0f}%)")

    print(f"\n完成: {total_frames} 帧, 共 {total_in:,}B -> {total_out:,}B  ({total_out/total_in*100:.0f}%, 省 {100-total_out/total_in*100:.0f}%)")


if __name__ == "__main__":
    main()
