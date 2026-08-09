PROJECT DEADZONE Jobs v0.1 Test
================================

INSTALL
Copy/overwrite the included kubejs folder into the Minecraft instance.
Restart Minecraft/server completely.

TEST
1. Join with a player that has never selected a job.
2. After ~2 seconds a clickable job menu appears in chat.
3. Click one of 8 jobs.
4. Starter items are given once and job/initial skills are stored in player persistent data.
5. /deadzonejob info  -> show current job/skill values
6. /deadzonejob menu  -> show menu again
7. /deadzonejob reset_test -> OP-only test reset.
   IMPORTANT: reset_test does NOT remove previously given starter items.

v0.1 deliberately uses a clickable chat menu rather than a custom GUI.
This minimizes dependencies for the first multiplayer test. A full GUI can replace it later.

Weapons Expert starter test:
- Glock 17 / M1911 / CZ75 randomly
- matching small TACZ ammo stack
- gun NBT format is based on the TACZ loot tables already present in this kubejs folder.

Skill storage:
dz_skill_<Skill>
dz_skill_floor_<Skill>
dz_skill_xp_<Skill>

The floor value is reserved for the future death penalty so skill level cannot fall below its job starting level.

KubeJS Stages:
deadzone_job_<jobid> is added when available.
This is intended for later Engineer/Mechanic recipe gates.

NOTE:
This is a gameplay test build. If latest.log reports an unknown item ID in a starter kit,
send the log and that individual candidate can be replaced without changing the job system.
