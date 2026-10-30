# PROJECT DEADZONE Distribution

Current pack version: `DEV-20261030-ENV-SYNC-RC1`

This development update adds the client-only PDZ Field Terminal 0.3.0 prototype:
F7 terminal/dictionary/party, conditional replacement HUD, and inventory status.
The existing world-authoring server is part of the development environment.
No Field Terminal server JAR, server restart, or world update is required.
Rendering, legacy HUD replacement, and multiplayer behavior still need in-game QA.
Use `/pdzhud` to toggle the replacement HUD for the current client session.
This is an internal development prototype, not a claim that the full game is complete.

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

## 2026-10-28 development bundle

Adds Thingamajigs 1.9.1, Cluttered 3.0.3, Yuushya 2.2.3 and Beautify 2.0.2 to match the current town server. Adds Incendium 5.3.5, Nullscape 1.2.8, official IBO 3.1.0 and the vanilla-loot compatibility pack. Includes the already-installed server IR 1.11.0 / TrackAPI 1.3 / UniversalModCore 1.3.0 dependencies for client parity. Existing Field UI 0.3.0 remains client-only. This is a development build; full campaign acceptance and visual/multiplayer checks remain pending.

Some CurseForge API-excluded files still require the owner-provided manual seed bundle before normal packwiz startup can finish.

## 2026-10-28 server parity correction

Removes retired M&S components, old JOB UI, Recipe Machine Stage and Calypso goggles from the client distribution to match the current development server. Replaces the M&S-specific SedParties build with the exact M&S-independent build already used by the server and town client. Existing client-only utilities, Field UI, building mods, IR and dimension packs are retained. This corrects client/server parity; it does not certify the whole M&S gameplay migration or full campaign as complete.

## 2026-10-30 environment synchronization

Adds the 11 building and dependency mods already used by the development server and active authoring client, including Rechiseled/Create, Fusion, SuperMartijn libraries, Decorative Blocks, Dustrial Decor and Macaw bridges/fences/paths/roofs. Also distributes the current client-only PDZ Builder Palette without personal bookmarks. A runtime lock and read-only verifier record the exact shared JARs and portable resource hashes. WorldEdit stays server-only; personal settings and world-specific authoring scripts are not copied.
