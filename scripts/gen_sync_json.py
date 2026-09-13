# -*- coding: utf-8 -*-
"""
gen_sync_json.py  --  离线同步清单产线（website 侧）

背景：kotlin《离线快照与静默同步_设计方案》09-13 定稿，客户端 SyncHub 需要一份
      **线上可轮询的清单**，用来判断 5 类内置资源是否要更新（比对 sha256 → 决定是否下载）。

产出：website/data/sync.json

字段约定（与 kotlin 对齐）：
  generated  本文件生成时间（ISO 8601，含时区）
  base       资源根（绝对 URL 前缀）
  items      5 项：bubbles / privacy_zh / privacy_en / manual_zh / manual_en
             每项：
               ver       版本号，**仅当 sha256 变化时才 +1**（脚本读旧清单自增；内容没变就不动）
               url       绝对 URL
               sha256    文件内容 sha256（hex）
               bytes     文件字节数
               effective 仅隐私两项：生效日期文案（源头 = locales/{lang}.json 的 privacy.effective）

⚠️ 先跑 gen_offline_docs.py 再跑本脚本（否则清单里的 sha256 会指向旧快照）。
⚠️ 本脚本会自动把上一步（docs/privacy_*.html）的落盘结果算进 sha256 —— 所以产线顺序是固定两步：
      python scripts/gen_offline_docs.py  &&  python scripts/gen_sync_json.py

用法：
  python scripts/gen_sync_json.py           # 生成/更新 data/sync.json
  python scripts/gen_sync_json.py --print   # 只打印不写盘
"""
import argparse
import hashlib
import json
import os
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))
OUT = os.path.join(SITE, 'data', 'sync.json')
BASE = 'https://deskbud.xyz/'

# (key, 相对路径, 是否隐私项)
ITEMS = [
    ('bubbles',    'data/bubble.json',        False),
    ('privacy_zh', 'docs/privacy_zh.html',    True),
    ('privacy_en', 'docs/privacy_en.html',    True),
    ('manual_zh',  'docs/manual_zh.html',     False),
    ('manual_en',  'docs/manual_en.html',     False),
]


def read_bytes(p):
    with open(p, 'rb') as f:
        return f.read()


def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = prefix + k
        if isinstance(v, dict):
            out.update(flatten(v, key + '.'))
        else:
            out[key] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--print', dest='dry', action='store_true', help='只打印不写盘')
    args = ap.parse_args()

    old = {}
    if os.path.isfile(OUT):
        try:
            old = json.loads(read_bytes(OUT).decode('utf-8')).get('items', {}) or {}
        except Exception as e:
            print('  [warn] 旧清单解析失败，ver 从 1 起：%s' % e)

    eff = {}
    for lang in ('zh', 'en'):
        lp = os.path.join(SITE, 'locales', '%s.json' % lang)
        eff['privacy_%s' % lang] = flatten(
            json.loads(read_bytes(lp).decode('utf-8'))).get('privacy.effective', '')

    items, changed = {}, []
    for key, rel, is_priv in ITEMS:
        path = os.path.join(SITE, rel.replace('/', os.sep))
        if not os.path.isfile(path):
            raise SystemExit('缺少资源：%s（先跑 gen_offline_docs.py）' % path)
        data = read_bytes(path)
        sha = hashlib.sha256(data).hexdigest()
        prev = old.get(key) or {}
        prev_sha = prev.get('sha256')
        if prev_sha == sha and isinstance(prev.get('ver'), int):
            ver = prev['ver']
        else:
            ver = int(prev.get('ver') or 0) + 1
            if prev_sha:
                changed.append('%s: v%s -> v%s' % (key, prev.get('ver'), ver))

        item = {
            'ver': ver,
            'url': BASE + rel,
            'sha256': sha,
            'bytes': len(data),
        }
        if is_priv:
            item['effective'] = eff.get(key, '')
        items[key] = item

    out = {
        'generated': datetime.now().astimezone().isoformat(timespec='seconds'),
        'base': BASE,
        'items': items,
    }
    text = json.dumps(out, ensure_ascii=False, indent=2) + '\n'

    print('gen_sync_json  (%s)' % (SITE))
    for key, rel, is_priv in ITEMS:
        it = items[key]
        mark = '  ← ver+1' if any(c.startswith(key + ':') for c in changed) else ''
        extra = ('  effective=%s' % it['effective']) if is_priv else ''
        print('  %-11s v%-3s %8d B  %s%s%s' % (key, it['ver'], it['bytes'], rel, extra, mark))
    if changed:
        print('  内容变化的项：%s' % '；'.join(changed))
    else:
        print('  5 项内容均未变，ver 全部保持 ✓')

    if args.dry:
        print('  [--print] 未写盘。内容预览：')
        print(text)
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('  已写出 → data/sync.json （%d B）' % len(text.encode('utf-8')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
