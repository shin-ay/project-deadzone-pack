# PROJECT DEADZONE Distribution

Current pack version: `BETA-20260825-MULTIPLAYER-2`

This public repository contains only the packwiz manifest and multiplayer
client configuration required to update PROJECT DEADZONE.

It does not contain saves, player data, server secrets, logs, screenshots, or
the private development history.

## Player installation

1. Install Prism Launcher.
2. Import the `PROJECT_DEADZONE_Prism_Initial.zip` supplied by the pack owner.
3. Start the imported PROJECT DEADZONE instance.
4. Wait for the automatic packwiz update to finish before Minecraft starts.

After the first import, normal updates are installed automatically at launch.
Do not manually overwrite `mods`, `config`, or `kubejs` unless the pack owner
explicitly asks you to do so.

## 2026-08-25 multiplayer beta

This build consolidates the previously unpublished multiplayer baseline with
the current T0-T4 quests, MineColonies operations, settlement/life systems,
boss encounters, Mine and Slash equipment unification, village loot,
beginner industry guides, and village performance adjustments.

MULTIPLAYER-2 adds the expanded camp/faction/Boss soundtrack with stable
non-combat transitions, Mine and Slash-authoritative player/party/enemy HP,
M&S Boss/Elite profiles, duplicate Scaling Health progression removal, and
16-stack Potion support for the thirst-focused survival loop.

Restart the client completely after the update. Existing worlds keep their
already-generated structures; structure density and new chest loot are tested
in newly generated chunks.

## Pack manifest

The installer entry point is:

`https://raw.githubusercontent.com/shin-ay/project-deadzone-pack/main/pack.toml`
