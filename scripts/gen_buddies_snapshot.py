#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成「伙伴之家」离线数据快照 data/buddies-snapshot.json

背景（协同板 09-14 13:03 跨端倡议①·治本）：
  客户端（kotlin / pyside6）当前在 App 内实时拉 deskbud.xyz/buddies.html，
  伙伴之家 100% 卡域名（慢/挂/未备案被墙 → 全端伙伴页死）。
  根治 = 把「伙伴之家」所需数据打包成一份版本化 JSON 快照，客户端在
  「检查更新」时拉取并缓存，离线也能原生渲染；运行时不再硬依赖域名。

设计（仿 assets/docs / bubbles.json 离线渲染范式）：
  - 单一数据源 = data/works.json（站点已有宠物目录）。
  - 收 status=="online" 或 builtin==true 的宠物（对齐 buddies 页当前只显 3 只：
    linekit(online) / panda(builtin) / rabbit(builtin)；cat-nap 等 4 只 status=="hidden" 不进）。
  - 每个宠物带：元数据 + lite 缩略图 + poses 姿态图清单 + adoption（内置/付费领养）
    + platforms（可用平台）。
  - 顶层 meta + schemaVersion + hash（payload 的 sha256，供客户端判断增量）+ resources
    （全部需缓存的 webp 相对路径清单，均落盘校验）。
  - 付费宠 adoption.checkout 用模板，客户端替换 {device_id} 后跳收银台。

运行：python scripts/gen_buddies_snapshot.py
产出：data/buddies-snapshot.json（LF、utf-8、可直链 deskbud.xyz/data/）
"""
import json
import glob
import os
import hashlib
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rel(p):
    return os.path.relpath(p, ROOT).replace("\\", "/")


def lite_thumb(pet):
    """优先用 works/<id>-lite 的轻量 idle，否则回退 works.json 的 thumb。"""
    pid = pet["id"]
    for cand in (f"works/{pid}-lite/{pid}_idle.webp", f"works/{pid}-lite/idle.webp"):
        if os.path.exists(os.path.join(ROOT, cand)):
            return cand
    return pet.get("thumb")


def poses(pid):
    d = os.path.join(ROOT, "works", f"{pid}-poses")
    out = []
    for p in sorted(glob.glob(os.path.join(d, "*.webp"))):
        name = os.path.splitext(os.path.basename(p))[0]
        out.append({"src": rel(p), "caption": {"zh": name, "en": name}})
    return out


def author_str(a):
    if isinstance(a, dict):
        return a.get("zh") or a.get("en") or ""
    return a or ""


def main():
    with open(os.path.join(ROOT, "data", "works.json"), encoding="utf-8") as f:
        works = json.load(f)

    pets_in = works.get("works", [])
    out_pets = []
    resources = set()

    for pet in pets_in:
        if pet.get("status") != "online" and not pet.get("builtin"):
            continue
        pid = pet["id"]
        thumb = lite_thumb(pet)
        ps = poses(pid)
        if pet.get("builtin"):
            adoption = {"type": "builtin"}
        else:
            adoption = {
                "type": "paid",
                "checkout": f"pay.deskbud.xyz/checkout.html?device_id={{device_id}}&pet_ids={pid}&embed=1",
            }
        entry = {
            "id": pid,
            "status": pet.get("status"),
            "builtin": bool(pet.get("builtin")),
            "title": pet.get("title"),
            "category": pet.get("category"),
            "author": author_str(pet.get("author")),
            "summary": pet.get("summary"),
            "thumb": thumb,
            "poses": ps,
            "adoption": adoption,
            "platforms": {"win": True, "mac": True, "android": True},
        }
        out_pets.append(entry)
        if thumb:
            resources.add(thumb)
        for x in ps:
            resources.add(x["src"])

    # 资源落盘校验（避免线下引用线上 404 的图）
    missing = [r for r in resources if not os.path.exists(os.path.join(ROOT, r))]
    if missing:
        print("WARN: 以下资源在盘缺失（快照仍生成，但客户端会 404）:")
        for m in sorted(missing):
            print("  -", m)

    payload = {"pets": out_pets}
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    h = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    site = works.get("site", {})
    snap = {
        "schemaVersion": 1,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "hash": h,
        "meta": {
            "title": site.get("title"),
            "slogan": site.get("slogan"),
            "home": "https://deskbud.xyz/buddies.html",
        },
        "pets": out_pets,
        "resources": sorted(resources),
    }

    out_path = os.path.join(ROOT, "data", "buddies-snapshot.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(
        f"OK wrote {rel(out_path)}: {len(out_pets)} pets, "
        f"{len(resources)} resources, hash={h[:12]}..."
    )
    for p in out_pets:
        print(
            f"  - {p['id']:8s} builtin={p['builtin']!s:5s} "
            f"thumb={p['thumb']} poses={len(p['poses'])} adoption={p['adoption']['type']}"
        )


if __name__ == "__main__":
    main()
