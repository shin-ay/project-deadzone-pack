#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PROJECT DEADZONE - Mod Block ID Scanner
Minecraft 1.20.1 / Forge向け

modsフォルダ内のJARを直接解析して、
assets/<namespace>/blockstates/*.json からBlock ID候補を抽出します。

使い方:
    python deadzone_mod_block_scanner.py "C:\Users\...\PROJECT DEADZONE v0.1\mods"

出力:
    deadzone_block_scan/
      deadzone_block_ids.csv
      summary.txt
      block_ids/
        refurbished_furniture.txt
        doomsday_decoration.txt
        ...

備考:
- Minecraftを起動する必要はありません。
- blockstatesのファイル名をBlock IDとして扱うので、通常のMODではかなり正確です。
"""

from __future__ import annotations

import csv
import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

TARGET_NAMESPACES = {
    "refurbished_furniture",
    "doomsday_decoration",
    "horror_element_mod",
    "immersive_weathering",
    "createdeco",
    "securitycraft",
    "immersiveengineering",
    "create",
    "framedblocks",
    "farmersdelight",
}

def scan_jar(jar_path: Path):
    found = defaultdict(set)

    try:
        with zipfile.ZipFile(jar_path, "r") as zf:
            for name in zf.namelist():
                parts = name.split("/")

                # assets/<namespace>/blockstates/<file>.json
                if len(parts) >= 4 and parts[0] == "assets" and parts[2] == "blockstates" and name.endswith(".json"):
                    namespace = parts[1]
                    if namespace not in TARGET_NAMESPACES:
                        continue

                    filename = parts[-1]
                    block_name = filename[:-5]  # remove .json

                    # サブフォルダがあるケースも一応保持
                    rel = "/".join(parts[3:])[:-5]
                    block_id = f"{namespace}:{rel}"
                    found[namespace].add(block_id)

    except zipfile.BadZipFile:
        print(f"[WARN] Not a valid JAR/ZIP: {jar_path.name}")
    except Exception as e:
        print(f"[WARN] Failed to scan {jar_path.name}: {e}")

    return found

def classify(block_id: str) -> str:
    name = block_id.split(":", 1)[1].lower()

    keywords = {
        "furniture": ["chair", "table", "desk", "sofa", "couch", "cabinet", "shelf", "drawer", "fridge", "freezer", "sink", "toilet", "stool", "bench", "lamp"],
        "industrial": ["pipe", "tank", "barrel", "crate", "metal", "steel", "generator", "machine", "engine", "vent", "grate"],
        "apocalypse": ["blood", "barricade", "barbed", "debris", "broken", "damaged", "trash", "corpse", "skull", "bone", "warning", "hazard"],
        "shop": ["shelf", "counter", "register", "display", "sign", "vending", "fridge", "freezer"],
        "gas_station": ["pump", "fuel", "gas", "barrel", "canister", "tank", "sign", "light", "lamp", "counter", "shelf"],
    }

    tags = []
    for tag, words in keywords.items():
        if any(w in name for w in words):
            tags.append(tag)

    return ",".join(tags) if tags else "other"

def main() -> int:
    if len(sys.argv) != 2:
        print("Usage:")
        print('  python deadzone_mod_block_scanner.py "<mods folder>"')
        return 2

    mods_dir = Path(sys.argv[1]).expanduser()

    if not mods_dir.is_dir():
        print(f"[ERROR] mods folder not found: {mods_dir}")
        return 2

    output_dir = mods_dir.parent / "deadzone_block_scan"
    ids_dir = output_dir / "block_ids"
    ids_dir.mkdir(parents=True, exist_ok=True)

    all_found = defaultdict(set)
    jars_scanned = 0

    print(f"Scanning: {mods_dir}")

    for jar in sorted(mods_dir.glob("*.jar")):
        jars_scanned += 1
        found = scan_jar(jar)

        for namespace, block_ids in found.items():
            all_found[namespace].update(block_ids)

    if not all_found:
        print("[ERROR] No matching blockstates found.")
        return 1

    csv_path = output_dir / "deadzone_block_ids.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["namespace", "block_id", "category_hint"])

        for namespace in sorted(all_found):
            ids = sorted(all_found[namespace])

            (ids_dir / f"{namespace}.txt").write_text(
                "\n".join(ids) + "\n",
                encoding="utf-8"
            )

            for block_id in ids:
                writer.writerow([
                    namespace,
                    block_id,
                    classify(block_id)
                ])

    summary_path = output_dir / "summary.txt"
    with summary_path.open("w", encoding="utf-8") as f:
        f.write("PROJECT DEADZONE - Block ID Scan Summary\n\n")
        f.write(f"JAR files scanned: {jars_scanned}\n")
        f.write(f"Namespaces found: {len(all_found)}\n")
        f.write(f"Total block IDs: {sum(len(v) for v in all_found.values())}\n\n")

        for namespace in sorted(all_found):
            f.write(f"{namespace}: {len(all_found[namespace])}\n")

    print()
    print("Done.")
    print(f"Output: {output_dir}")
    print(f"CSV:    {csv_path}")
    print()

    for namespace in sorted(all_found):
        print(f"  {namespace}: {len(all_found[namespace])} blocks")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
