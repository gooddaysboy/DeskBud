#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""同步「官网同源下载清单」-> website/data/download-latest.json

背景（2026-09-13 取证，重要）：
  gitee raw 只对 `Origin: https://gitee.com` 返回 `Access-Control-Allow-Origin`，
  对 `https://deskbud.xyz` **不返回** -> 浏览器从官网跨源 fetch gitee 清单必被 CORS 拦。
  也就是说：下载页过去那句 `fetch(version-download.json)` 在线上**从未生效过**，
  实际一直是 site.js 里的兜底常量在供链接。
  修法：官网自己存一份**同源副本**（本脚本产物），页面读同源 -> 无 CORS 问题。

真源（两个都要看）：
  1) version-download.json <- win / mac / android 三段
  2) version-android.json  <- 安卓发版即更，用它覆盖 1) 里的 android 段（1) 常忘记刷）

用法：
  python scripts/sync_download_manifest.py            # 刷新 data/download-latest.json
  python scripts/sync_download_manifest.py --check    # 只校验（有差异 -> 退出码 1，不写盘）
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'download-latest.json')
BASE = 'https://gitee.com/deskbud/version/raw/master/'
SRC_DL = BASE + 'version-download.json'
SRC_ANDROID = BASE + 'version-android.json'

NOTE = ('官网同源副本：官网(deskbud.xyz) 与 gitee 跨源，gitee raw 不回 ACAO，'
        '浏览器 fetch 会被 CORS 拦，故在官网存一份同源清单给站点读。'
        '真源 = gitee 升级仓 version-download.json + version-android.json；'
        '发版后跑 python scripts/sync_download_manifest.py 刷新本文件。')


def get_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'DeskBud-site-sync'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def build():
    dl = get_json(SRC_DL)
    out = {}
    for p in ('win', 'mac', 'android'):
        seg = dl.get(p) or {}
        if seg.get('url'):
            out[p] = {k: seg[k] for k in ('version', 'url', 'sha256', 'size') if k in seg}
    try:
        a = get_json(SRC_ANDROID)
        if a.get('url'):
            seg = {'version': a.get('version', ''), 'url': a['url']}
            if a.get('versionCode'):
                seg['versionCode'] = a['versionCode']
            out['android'] = seg
    except Exception as e:                                  # noqa: BLE001
        print('[warn] version-android.json 拉取失败，沿用 version-download.json 的 android 段：%s' % e)
    out['_note'] = NOTE
    return out


def dumps(d):
    return json.dumps(d, ensure_ascii=False, indent=2) + '\n'


def main():
    check = '--check' in sys.argv
    text = dumps(build())
    old = ''
    if os.path.exists(OUT):
        with open(OUT, 'r', encoding='utf-8', newline='') as f:
            old = f.read()
    if check:
        if old == text:
            print('[check] OK 同源清单与真源一致')
            return
        print('[check] 不一致，需要刷新（跑 python scripts/sync_download_manifest.py）')
        print('--- 盘上 ---')
        print(old)
        print('--- 真源 ---')
        print(text)
        sys.exit(1)
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(text.replace('\r\n', '\n'))
    print('[ok] written:', OUT)
    print(text)


if __name__ == '__main__':
    main()
