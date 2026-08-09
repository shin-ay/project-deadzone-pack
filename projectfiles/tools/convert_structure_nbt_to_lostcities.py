import argparse
import json
from pathlib import Path

import nbtlib


def plain(value):
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    if hasattr(value, "unpack"):
        return plain(value.unpack())
    if isinstance(value, (str, int, float)) or value is None:
        return value
    return str(value)


def state_string(entry):
    name = str(entry["Name"])
    props = entry.get("Properties")
    if not props:
        return name
    values = ",".join(f"{k}={props[k]}" for k in sorted(props))
    return f"{name}[{values}]"


def palette_char(index):
    # Lost Cities accepts one Unicode code point per palette entry.
    return chr(0xE000 + index)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("nbt")
    parser.add_argument("lostcities_root")
    parser.add_argument("building_id")
    parser.add_argument("--cell-height", type=int, default=6)
    args = parser.parse_args()

    source = nbtlib.load(args.nbt)
    sx, sy, sz = (int(v) for v in source["size"])
    if sx % 16 or sz % 16 or sy % args.cell_height:
        raise SystemExit(f"Unsupported size {sx}x{sy}x{sz}")

    states = [state_string(v) for v in source["palette"]]
    blocks = {}
    for block in source["blocks"]:
        x, y, z = (int(v) for v in block["pos"])
        tag = plain(block["nbt"]) if "nbt" in block else None
        blocks[(x, y, z)] = (states[int(block["state"])], tag)

    root = Path(args.lostcities_root)
    parts_dir = root / "parts"
    buildings_dir = root / "buildings"
    multi_dir = root / "multibuildings"
    for folder in (parts_dir, buildings_dir, multi_dir):
        folder.mkdir(parents=True, exist_ok=True)

    dimx, dimz, floors = sx // 16, sz // 16, sy // args.cell_height
    building_grid = []
    for cx in range(dimx):
        column = []
        for cz in range(dimz):
            building_name = f"{args.building_id}_{cx}_{cz}"
            column.append(f"lostcities:{building_name}")
            refs = []
            for floor in range(floors):
                part_name = f"{args.building_id}_{cx}_{cz}_{floor}"
                refs.append({"part": f"lostcities:{part_name}", "floor": floor})
                entries = []
                chars = {}
                slices = []
                for ly in range(args.cell_height):
                    rows = []
                    for z in range(16):
                        row = []
                        for x in range(16):
                            state, tag = blocks.get(
                                (cx * 16 + x, floor * args.cell_height + ly, cz * 16 + z),
                                ("minecraft:air", None),
                            )
                            key = (state, json.dumps(tag, ensure_ascii=False, sort_keys=True) if tag else "")
                            if key not in chars:
                                ch = palette_char(len(chars))
                                chars[key] = ch
                                entry = {"char": ch, "block": state}
                                if tag:
                                    entry["tag"] = tag
                                    if "LootTable" in tag:
                                        entry["loot"] = str(tag["LootTable"])
                                entries.append(entry)
                            row.append(chars[key])
                        rows.append("".join(row))
                    slices.append(rows)
                part = {
                    "xsize": 16,
                    "zsize": 16,
                    "palette": {"palette": entries},
                    "slices": slices,
                }
                (parts_dir / f"{part_name}.json").write_text(
                    json.dumps(part, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            building = {
                "filler": "#",
                "rubble": "}",
                "minfloors": floors,
                "maxfloors": floors,
                "maxcellars": 0,
                "allowDoors": False,
                "parts": refs,
            }
            (buildings_dir / f"{building_name}.json").write_text(
                json.dumps(building, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        building_grid.append(column)

    multi = {"dimx": dimx, "dimz": dimz, "buildings": building_grid}
    (multi_dir / f"{args.building_id}.json").write_text(
        json.dumps(multi, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"generated {dimx * dimz * floors} parts, {dimx * dimz} buildings, 1 multibuilding")


if __name__ == "__main__":
    main()
