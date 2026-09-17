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

版本号散落在**三处**（发版后必须一起刷，2026-09-17 扩成三处自动比对）：
  ① data/download-latest.json  <- 同源清单（正常路径）
  ② assets/js/site.js 的 FALLBACK  <- 全站最后一道防线（同源 + gitee raw 双失败时用）
  ③ get.html 内联的 FALLBACK     <- 安卓中间页（微信/扫码落到这里）自带兜底，只含 android
  ⚠ ③ 曾长期钉在 `android-v0.1.8`（落后 13 个版本）且注释自称"与 site.js 一致"——
    因为没有任何自动检查盯着它。本脚本现在把三处都算进 --check。

用法：
  python scripts/sync_download_manifest.py            # 刷新 data/download-latest.json
  python scripts/sync_download_manifest.py --check    # 只校验（有差异 -> 退出码 1，不写盘）
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'download-latest.json')
BASE = 'https://gitee.com/deskbud/version/raw/master/'
SRC_DL = BASE + 'version-download.json'
SRC_ANDROID = BASE + 'version-android.json'

# 兜底常量所在的文件（同源清单与 gitee 双失败时的最后防线）—— 必须与 OUT 同版本
SITE_JS = os.path.join(ROOT, 'assets', 'js', 'site.js')
GET_HTML = os.path.join(ROOT, 'get.html')
# site.js 形态：「win: GITEE + '/releases/download/<tag>/<file>'」（带平台键名）
FALLBACK_RE = re.compile(r"(\w+):\s*GITEE\s*\+\s*'/releases/download/([^']+)'")
# get.html 形态：单平台一行「GITEE + '/releases/download/<tag>/<file>'」（无键名，固定 android）
GET_FALLBACK_RE = re.compile(r"GITEE\s*\+\s*'/releases/download/([^']+)'")

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


def _read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def read_fallbacks():
    """-> (srcs, missing)

    srcs = {来源名: {plat: 'tag/file'}}；missing = 文件缺失的来源名列表。
    为什么要查（2026-09-17 踩过）：发版后只跑了本脚本刷同源清单、忘了同步
    site.js / get.html 的常量，几处差了几版 ⇒ 万一同源与 gitee 都取不到，用户会下到旧包。
    get.html 只有安卓一路、无平台键名，统一记作 android。
    """
    srcs, missing = {}, []
    if os.path.exists(SITE_JS):
        srcs['site.js'] = dict(FALLBACK_RE.findall(_read(SITE_JS)))
    else:
        missing.append('site.js')
    if os.path.exists(GET_HTML):
        hits = GET_FALLBACK_RE.findall(_read(GET_HTML))
        # 命不中也要留一个空壳 -> 下面比对时会报「None != 清单值」，抓到"正则失效/常量被删"
        srcs['get.html'] = {'android': hits[0]} if hits else {}
    else:
        missing.append('get.html')
    return srcs, missing


def fallback_mismatch(manifest_text):
    """-> (srcs, diffs, missing)；diffs = {来源: {plat: (该处值, 清单值)}}，空字典 = 全一致。"""
    srcs, missing = read_fallbacks()
    try:
        man = json.loads(manifest_text)
    except ValueError:
        return srcs, {}, missing
    want = {p: seg['url'].split('/releases/download/')[-1]
            for p, seg in man.items()
            if isinstance(seg, dict) and seg.get('url')}
    diffs = {}
    for name, values in srcs.items():
        # site.js 覆盖 win/mac/android；get.html 只管 android（它是安卓中间页）
        scope = want if name == 'site.js' else {'android': want['android']} if 'android' in want else {}
        d = {p: (values.get(p), v) for p, v in scope.items() if values.get(p) != v}
        if d:
            diffs[name] = d
    return srcs, diffs, missing


def report_diffs(diffs, header):
    for name in sorted(diffs):
        print(header % name)
        for p in sorted(diffs[name]):
            print('    %-8s %s = %s' % (p, name, diffs[name][p][0]))
            print('    %-8s %s   %s' % ('', '清单', diffs[name][p][1]))


def dumps(d):
    return json.dumps(d, ensure_ascii=False, indent=2) + '\n'


def main():
    check = '--check' in sys.argv
    text = dumps(build())
    old = ''
    if os.path.exists(OUT):
        with open(OUT, 'r', encoding='utf-8', newline='') as f:
            old = f.read()
    srcs, diffs, missing = fallback_mismatch(text)
    if check:
        bad = False
        if old == text:
            print('[check] OK 同源清单与真源一致')
        else:
            bad = True
            print('[check] 同源清单不一致，需要刷新（跑 python scripts/sync_download_manifest.py）')
            print('--- 盘上 ---')
            print(old)
            print('--- 真源 ---')
            print(text)
        for name in missing:
            print('[check] warn: 找不到 %s，跳过该处兜底常量比对' % name)
        if diffs:
            bad = True
            report_diffs(diffs, '[check] %s 兜底常量与清单不一致（发版后**三处都要刷**）：')
        elif not missing:
            print('[check] OK 三处兜底常量与同源清单一致（site.js / get.html）')
        if bad:
            sys.exit(1)
        return
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(text.replace('\r\n', '\n'))
    print('[ok] written:', OUT)
    print(text)
    if diffs:
        print('[warn] 兜底常量还是旧版，请一并更新（否则双失败时退回旧包）：')
        report_diffs(diffs, '[warn] %s：')


if __name__ == '__main__':
    main()
