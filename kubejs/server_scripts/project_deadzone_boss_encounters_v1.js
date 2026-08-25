// PROJECT DEADZONE boss encounters v1
// B02 Axel vertical slice. Brutal Bosses owns combat AI; this file bridges
// encounter state, boss-attached weak points, trigger-summoned temporary objects,
// fail-open recovery, cleanup, rewards and test commands.

const PDZ_BOSS_AXEL_TAG = "dz_boss_axel"
const PDZ_BOSS_AXEL_BEARER_TAG = "dz_axel_bearer"
const PDZ_BOSS_AXEL_PARTICIPANT_TAG = "dz_axel_participant"
const PDZ_BOSS_AXEL_CLEAR_TAG = "pdz_boss_axel_clear"
const PDZ_BOSS_AXEL_RESET_TAG = "dz_boss_resetting"
const PDZ_BOSS_AXEL_PREEXISTING_TAG = "dz_axel_preexisting"
const PDZ_BOSS_AXEL_ENTITY = "tacz_hostiles:soldier"
const PDZ_BOSS_AXEL_BEARER_ENTITY = "tacz_hostiles:scavenger"
const PDZ_BOSS_RUNTIME_TAG = "dz_pdz_boss_runtime"
const PDZ_BOSS_AXEL_RUNTIME_TAG = "dz_axel_runtime"

const PDZ_BOSS_AXEL_TANK_TAG = "dz_axel_fuel_tank"
const PDZ_BOSS_AXEL_TANK_LEFT_TAG = "dz_axel_fuel_tank_left"
const PDZ_BOSS_AXEL_TANK_RIGHT_TAG = "dz_axel_fuel_tank_right"
const PDZ_BOSS_AXEL_TANK_VISUAL_TAG = "dz_axel_fuel_tank_visual"
const PDZ_BOSS_AXEL_TANK_LEFT_VISUAL_TAG = "dz_axel_fuel_tank_visual_left"
const PDZ_BOSS_AXEL_TANK_RIGHT_VISUAL_TAG = "dz_axel_fuel_tank_visual_right"

const PDZ_BOSS_AXEL_CYLINDER_TAG = "dz_axel_phase_cylinder"
const PDZ_BOSS_AXEL_CYLINDER_VISUAL_TAG = "dz_axel_phase_cylinder_visual"
const PDZ_BOSS_AXEL_QUEST = "A1E1000000000001"

function pdzAxelRuntimeTags(extraTags) {
  return [PDZ_BOSS_RUNTIME_TAG, PDZ_BOSS_AXEL_RUNTIME_TAG].concat(extraTags)
}

function pdzAxelTagsNbt(tags) {
  return '["' + tags.join('","') + '"]'
}

function pdzAxelBroadcast(entity, message, color) {
  entity.runCommandSilent('tellraw @a[distance=..96] {"text":"[BOSS] ' + message + '","color":"' + color + '","bold":true}')
}

function pdzAxelSpawnFuelTanks(server, positioned) {
  let boss = "@e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1]"
  let leftTankTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_TANK_TAG, PDZ_BOSS_AXEL_TANK_LEFT_TAG, "dz_pdz_boss_weakpoint"])
  let rightTankTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_TANK_TAG, PDZ_BOSS_AXEL_TANK_RIGHT_TAG, "dz_pdz_boss_weakpoint"])
  let leftVisualTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_TANK_VISUAL_TAG, PDZ_BOSS_AXEL_TANK_LEFT_VISUAL_TAG])
  let rightVisualTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_TANK_VISUAL_TAG, PDZ_BOSS_AXEL_TANK_RIGHT_VISUAL_TAG])
  let leftTank = "{Size:0,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:28.0f,Attributes:[{Name:\"minecraft:generic.max_health\",Base:28.0d}],CustomName:'{\"text\":\"左燃料タンク\",\"color\":\"yellow\"}',Team:\"pdz_axel\",Tags:" + pdzAxelTagsNbt(leftTankTags) + "}"
  let rightTank = "{Size:0,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:28.0f,Attributes:[{Name:\"minecraft:generic.max_health\",Base:28.0d}],CustomName:'{\"text\":\"右燃料タンク\",\"color\":\"yellow\"}',Team:\"pdz_axel\",Tags:" + pdzAxelTagsNbt(rightTankTags) + "}"
  let leftVisual = "{block_state:{Name:\"immersiveengineering:metal_barrel\"},Glowing:1b,brightness:{sky:15,block:8},view_range:1.0f,transformation:{translation:[-0.18f,-0.34f,-0.18f],scale:[0.36f,0.68f,0.36f]},Tags:" + pdzAxelTagsNbt(leftVisualTags) + "}"
  let rightVisual = "{block_state:{Name:\"immersiveengineering:metal_barrel\"},Glowing:1b,brightness:{sky:15,block:8},view_range:1.0f,transformation:{translation:[-0.18f,-0.34f,-0.18f],scale:[0.36f,0.68f,0.36f]},Tags:" + pdzAxelTagsNbt(rightVisualTags) + "}"

  server.runCommandSilent(positioned + " as " + boss + " at @s rotated as @s run summon minecraft:slime ^-0.34 ^1.05 ^-0.38 " + leftTank)
  server.runCommandSilent(positioned + " as " + boss + " at @s rotated as @s run summon minecraft:slime ^0.34 ^1.05 ^-0.38 " + rightTank)
  server.runCommandSilent(positioned + " as " + boss + " at @s rotated as @s run summon minecraft:block_display ^-0.34 ^1.05 ^-0.38 " + leftVisual)
  server.runCommandSilent(positioned + " as " + boss + " at @s rotated as @s run summon minecraft:block_display ^0.34 ^1.05 ^-0.38 " + rightVisual)

  let tankCount = server.runCommandSilent(positioned + " if entity @e[tag=" + PDZ_BOSS_AXEL_TANK_LEFT_TAG + ",distance=..24] if entity @e[tag=" + PDZ_BOSS_AXEL_TANK_RIGHT_TAG + ",distance=..24] run tag " + boss + " add dz_axel_tanks_verified")
  if (tankCount <= 0) {
    server.runCommandSilent(positioned + " run tag " + boss + " add dz_axel_left_tank_destroyed")
    server.runCommandSilent(positioned + " run tag " + boss + " add dz_axel_right_tank_destroyed")
    server.runCommandSilent(positioned + " run tag " + boss + " add dz_axel_tanks_destroyed")
    server.runCommandSilent(positioned + " run effect clear " + boss + " minecraft:fire_resistance")
    server.runCommandSilent(positioned + " run effect clear " + boss + " minecraft:resistance")
    server.runCommandSilent(positioned + " run effect give " + boss + " minecraft:glowing 15 0 true")
    server.runCommandSilent(positioned + ' run tellraw @a[distance=..96] {"text":"[FAIL-OPEN] 弱点生成に失敗したため、アクセルの防護を自動解除しました。戦闘は続行できます。","color":"yellow","bold":true}')
  }
}

function pdzAxelSpawnPhaseCylinders(boss) {
  let cylinderBase = "Size:1,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:22.0f,Attributes:[{Name:\"minecraft:generic.max_health\",Base:22.0d}],Team:\"pdz_axel\""
  let visualBase = "block_state:{Name:\"immersiveengineering:metal_barrel\"},Glowing:1b,brightness:{sky:15,block:10},view_range:1.0f,transformation:{translation:[-0.35f,-0.65f,-0.35f],scale:[0.7f,1.3f,0.7f]}"
  let offsets = ["^-2.8 ^0.2 ^1.8", "^2.8 ^0.2 ^1.8", "^0 ^0.2 ^3.4"]
  for (let i = 1; i <= 3; i++) {
    let hitboxTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_CYLINDER_TAG, "dz_axel_cylinder_" + i, "dz_pdz_boss_weakpoint"])
    let visualTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_CYLINDER_VISUAL_TAG, "dz_axel_cylinder_visual_" + i])
    let name = "緊急燃料ボンベ " + ["A", "B", "C"][i - 1]
    boss.runCommandSilent("execute at @s rotated as @s run summon minecraft:slime " + offsets[i - 1] + " {" + cylinderBase + ",CustomName:'{\"text\":\"" + name + "\",\"color\":\"gold\"}',CustomNameVisible:1b,Tags:" + pdzAxelTagsNbt(hitboxTags) + "}")
    boss.runCommandSilent("execute at @s rotated as @s run summon minecraft:block_display " + offsets[i - 1] + " {" + visualBase + ",Tags:" + pdzAxelTagsNbt(visualTags) + "}")
  }

  let spawned = boss.runCommandSilent("execute if entity @e[tag=" + PDZ_BOSS_AXEL_CYLINDER_TAG + ",distance=..16,limit=1] run tag @s add dz_axel_cylinders_verified")
  if (spawned <= 0) {
    boss.addTag("dz_axel_cylinders_failed_open")
    boss.runCommandSilent("effect clear @s minecraft:resistance")
    boss.runCommandSilent("effect give @s minecraft:weakness 12 0 true")
    pdzAxelBroadcast(boss, "燃料ボンベ生成失敗を検知。防護支援を自動解除した。", "yellow")
  } else {
    pdzAxelBroadcast(boss, "緊急燃料ボンベ展開。破壊すれば爆圧でアクセルを崩せる！", "gold")
  }
}

function pdzAxelPhaseCylinderDestroyed(cylinder) {
  let index = 0
  for (let i = 1; i <= 3; i++) if (cylinder.tags.contains("dz_axel_cylinder_" + i)) index = i
  if (index <= 0) return

  let boss = "@e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..48,sort=nearest,limit=1]"
  cylinder.runCommandSilent("kill @e[type=minecraft:block_display,tag=dz_axel_cylinder_visual_" + index + ",distance=..8,sort=nearest,limit=1]")
  cylinder.runCommandSilent("tag " + boss + " add dz_axel_cylinder_" + index + "_destroyed")
  cylinder.runCommandSilent("particle minecraft:explosion_emitter ~ ~ ~ 0 0 0 0 1 force @a[distance=..96]")
  cylinder.runCommandSilent("playsound minecraft:entity.generic.explode master @a[distance=..96] ~ ~ ~ 1.0 0.85")
  cylinder.runCommandSilent("damage " + boss + " 18 minecraft:explosion")
  cylinder.runCommandSilent("effect clear " + boss + " minecraft:resistance")
  cylinder.runCommandSilent("effect give " + boss + " minecraft:slowness 5 1 true")
  cylinder.runCommandSilent("effect give " + boss + " minecraft:weakness 5 0 true")
  cylinder.runCommandSilent('tellraw @a[distance=..96] {"text":"[DETONATION] 燃料ボンベ ' + index + ' 爆破。アクセルに18ダメージ＋短時間弱体化！","color":"aqua","bold":true}')

  let allDestroyed = cylinder.runCommandSilent("execute if entity @e[tag=" + PDZ_BOSS_AXEL_TAG + ",tag=dz_axel_cylinder_1_destroyed,tag=dz_axel_cylinder_2_destroyed,tag=dz_axel_cylinder_3_destroyed,distance=..48,limit=1] run tag " + boss + " add dz_axel_cylinders_destroyed")
  if (allDestroyed > 0) {
    cylinder.runCommandSilent("effect give " + boss + " minecraft:glowing 12 0 true")
    cylinder.runCommandSilent("effect give " + boss + " minecraft:slowness 10 2 true")
    cylinder.runCommandSilent("effect give " + boss + " minecraft:weakness 10 1 true")
    pdzAxelBroadcast(cylinder, "全ボンベ誘爆。アクセルが大きく体勢を崩した！", "aqua")
  }
}

function pdzAxelCleanupAround(entity, radius) {
  entity.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=.." + radius + "] add " + PDZ_BOSS_AXEL_RESET_TAG)
  entity.runCommandSilent("kill @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=.." + radius + "]")
}

// Brutal Bosses owns natural treasure-guardian spawning. This bridge recognizes
// only the named Axel profile and attaches PDZ phases/rewards without turning
// ordinary TaCZ soldiers into bosses.
EntityEvents.spawned(PDZ_BOSS_AXEL_ENTITY, event => {
  let candidate = event.entity
  event.server.scheduleInTicks(10, () => {
    if (!candidate || !candidate.alive || !candidate.tags) return
    if (candidate.tags.contains(PDZ_BOSS_AXEL_TAG) || candidate.tags.contains(PDZ_BOSS_SHOWROOM_TAG)) return
    let name = ""
    try { name = String(candidate.name.string) } catch (ignored) { try { name = String(candidate.name) } catch (ignored2) {} }
    if (name.indexOf("アクセル") < 0 && name.indexOf("Axel") < 0) return
    candidate.addTag(PDZ_BOSS_AXEL_TAG)
    candidate.addTag("dz_pdz_boss")
    candidate.server.runCommandSilent("team add pdz_axel")
    candidate.runCommandSilent("team join pdz_axel @s")
    let positioned = "execute in " + String(candidate.level.dimension) + " positioned " +
      Number(candidate.x) + " " + Number(candidate.y) + " " + Number(candidate.z)
    pdzAxelSpawnFuelTanks(candidate.server, positioned)
    pdzAxelBroadcast(candidate, "ロードキング先遣隊長アクセルが戦利品庫を封鎖した。背面燃料タンクを破壊せよ！", "red")
  })
})

function pdzAxelFuelTankDestroyed(tank) {
  let left = tank.tags.contains(PDZ_BOSS_AXEL_TANK_LEFT_TAG)
  let destroyedTag = left ? "dz_axel_left_tank_destroyed" : "dz_axel_right_tank_destroyed"
  let visualTag = left ? PDZ_BOSS_AXEL_TANK_LEFT_VISUAL_TAG : PDZ_BOSS_AXEL_TANK_RIGHT_VISUAL_TAG
  let sideName = left ? "左" : "右"

  tank.runCommandSilent("kill @e[type=minecraft:block_display,tag=" + visualTag + ",distance=..8,sort=nearest,limit=1]")
  tank.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] add " + destroyedTag)
  tank.runCommandSilent("particle minecraft:explosion ~ ~ ~ 0 0 0 0 1 force @a[distance=..96]")
  tank.runCommandSilent("playsound minecraft:entity.generic.explode master @a[distance=..96] ~ ~ ~ 0.8 1.35")
  tank.runCommandSilent('tellraw @a[distance=..96] {"text":"[WEAKPOINT] ' + sideName + '燃料タンク破壊。アクセルの機動力が低下した。","color":"yellow","bold":true}')
  tank.runCommandSilent("effect clear @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] minecraft:speed")
  tank.runCommandSilent("effect give @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] minecraft:slowness 9999 0 true")

  let both = tank.runCommandSilent("execute if entity @e[tag=" + PDZ_BOSS_AXEL_TAG + ",tag=dz_axel_left_tank_destroyed,tag=dz_axel_right_tank_destroyed,distance=..24,limit=1]")
  if (both > 0) {
    tank.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] add dz_axel_tanks_destroyed")
    tank.runCommandSilent("effect clear @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] minecraft:fire_resistance")
    tank.runCommandSilent("effect clear @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] minecraft:resistance")
    tank.runCommandSilent("effect give @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] minecraft:slowness 9999 1 true")
    tank.runCommandSilent("effect give @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] minecraft:glowing 15 0 true")
    tank.runCommandSilent('tellraw @a[distance=..96] {"text":"[BREAK] 両燃料タンク破壊。耐火・防護・機動強化が停止した！","color":"aqua","bold":true}')
  }
}

let pdzAxelTankTicks = 0
ServerEvents.tick(event => {
  if (++pdzAxelTankTicks % 3 !== 0) return
  let server = event.server
  server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + "] at @s rotated as @s run tp @e[tag=" + PDZ_BOSS_AXEL_TANK_LEFT_TAG + ",distance=..8,sort=nearest,limit=1] ^-0.34 ^1.05 ^-0.38 ~ ~")
  server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + "] at @s rotated as @s run tp @e[tag=" + PDZ_BOSS_AXEL_TANK_RIGHT_TAG + ",distance=..8,sort=nearest,limit=1] ^0.34 ^1.05 ^-0.38 ~ ~")
  server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + "] at @s rotated as @s run tp @e[tag=" + PDZ_BOSS_AXEL_TANK_LEFT_VISUAL_TAG + ",distance=..8,sort=nearest,limit=1] ^-0.34 ^1.05 ^-0.38 ~ ~")
  server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + "] at @s rotated as @s run tp @e[tag=" + PDZ_BOSS_AXEL_TANK_RIGHT_VISUAL_TAG + ",distance=..8,sort=nearest,limit=1] ^0.34 ^1.05 ^-0.38 ~ ~")

  // Runtime objects are never allowed to remain as arena debris. An unloaded boss
  // does not match the local selector, so cleanup is limited to objects whose own
  // chunk is loaded and which have no Axel within 128 blocks.
  if (pdzAxelTankTicks % 60 === 0) {
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + "] at @s unless entity @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128,limit=1] run tag @s add " + PDZ_BOSS_AXEL_RESET_TAG)
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",tag=" + PDZ_BOSS_AXEL_RESET_TAG + "] run kill @s")
  }
})

EntityEvents.hurt(event => {
  let boss = event.entity
  if (!boss || boss.level.clientSide || !boss.tags.contains(PDZ_BOSS_AXEL_TAG)) return
  if (boss.tags.contains(PDZ_BOSS_AXEL_RESET_TAG)) return

  let hp = Number(boss.health)
  let max = Math.max(1, Number(boss.maxHealth))
  let incoming = Math.max(0, Number(event.damage || 0))
  let ratio = Math.max(0, hp - incoming) / max
  boss.runCommandSilent("tag @a[distance=..64,gamemode=!spectator] add " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)

  if (ratio <= 0.65 && !boss.tags.contains("dz_axel_phase2")) {
    boss.addTag("dz_axel_phase2")
    let bearerTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_BEARER_TAG, "dz_pdz_boss_minion"])
    boss.runCommandSilent('summon ' + PDZ_BOSS_AXEL_BEARER_ENTITY + ' ~3 ~ ~ {CustomName:\'{"text":"弾薬手ラチェット","color":"gold"}\',CustomNameVisible:1b,PersistenceRequired:1b,Tags:' + pdzAxelTagsNbt(bearerTags) + ',Team:"pdz_axel"}')
    if (!boss.tags.contains("dz_axel_tanks_destroyed")) boss.runCommandSilent("effect give @s minecraft:resistance 9999 1 true")
    pdzAxelSpawnPhaseCylinders(boss)
    pdzAxelBroadcast(boss, "弾薬手ラチェットが防護支援を開始。支援役か燃料ボンベを崩せ！", "gold")
  }

  if (ratio <= 0.3 && !boss.tags.contains("dz_axel_phase3")) {
    boss.addTag("dz_axel_phase3")
    boss.runCommandSilent("effect give @s minecraft:strength 9999 0 true")
    boss.runCommandSilent("effect give @s minecraft:glowing 9999 0 true")
    pdzAxelBroadcast(boss, "最終攻勢。アクセルが前線へ出た！", "red")
  }
})

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide) return
  if (entity.tags.contains(PDZ_BOSS_AXEL_RESET_TAG)) return

  if (entity.tags.contains(PDZ_BOSS_AXEL_TANK_TAG)) {
    pdzAxelFuelTankDestroyed(entity)
    return
  }

  if (entity.tags.contains(PDZ_BOSS_AXEL_CYLINDER_TAG)) {
    pdzAxelPhaseCylinderDestroyed(entity)
    return
  }

  if (entity.tags.contains(PDZ_BOSS_AXEL_BEARER_TAG)) {
    entity.runCommandSilent("effect clear @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..64,limit=1,sort=nearest] minecraft:resistance")
    pdzAxelBroadcast(entity, "弾薬手を排除。アクセルの防護支援が解除された！", "yellow")
    return
  }

  if (!entity.tags.contains(PDZ_BOSS_AXEL_TAG) || entity.tags.contains("dz_boss_rewarded")) return
  entity.addTag("dz_boss_rewarded")
  entity.runCommandSilent("tag @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] add " + PDZ_BOSS_AXEL_CLEAR_TAG)
  entity.runCommandSilent("ftbquests change_progress @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] complete " + PDZ_BOSS_AXEL_QUEST)
  entity.runCommandSilent("give @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] apocalypsenow:money 10")
  entity.runCommandSilent("give @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] immersiveengineering:ingot_steel 4")
  entity.runCommandSilent("give @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] apocalypsenow:bandage 3")
  pdzAxelCleanupAround(entity, 96)
  entity.runCommandSilent("tag @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + "] remove " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)
  pdzAxelBroadcast(entity, "アクセル撃破。周辺参加者へ個人報酬を支給した。", "green")
})

// Appearance-only boss showroom. Every exhibit has a stable numbered tag so
// screenshots can be reviewed and visual changes can be requested by number.
// Exhibits are frozen, silent and invulnerable; they never award boss loot.
const PDZ_BOSS_SHOWROOM_TAG = "dz_boss_showroom"
const PDZ_BOSS_SHOWROOM_ANCHOR_TAG = "dz_boss_showroom_axel_anchor"

const PDZ_BOSS_SHOWROOM_ENTRIES = [
  { id: "02", x: -12, z: 10, entity: "infectious:mecha_zombie", name: "ARGUS Fragment", color: "gold", hp: 240 },
  { id: "03", x: -6, z: 10, entity: "infectious:giant_zombie", name: "CHOIR VESSEL", color: "dark_purple", hp: 280 },
  { id: "04", x: 0, z: 10, entity: "tacz_bandits:bandit", name: "Raider Ash Captain", color: "dark_red", hp: 55, gun: "tacz:fn_evolys", ammo: 100 },
  { id: "05", x: 6, z: 10, entity: "tacz_bandits:bandit", name: "Fuel Route Scout", color: "red", hp: 16, gun: "elitex:mcs_spear", ammo: 30 },
  { id: "06", x: 12, z: 10, entity: "tacz_bandits:bandit", name: "Gun Shop Enforcer", color: "dark_red", hp: 28, gun: "elitex:m249x", ammo: 100 },
  { id: "07", x: 18, z: 10, entity: "tacz_bandits:bandit", name: "Corrupt Field Medic", color: "dark_red", hp: 70, gun: "elitex:fh_scar18", ammo: 30 },
  { id: "08", x: -15, z: 18, entity: "tacz_bandits:bandit", name: "Raider Warden", color: "dark_red", hp: 40, gun: "tacz:scar_h", ammo: 20 },
  { id: "09", x: -9, z: 18, entity: "infectious:mutant_zombie", name: "原初感染体", color: "dark_purple", hp: 180 },
  { id: "10", x: -3, z: 18, entity: "simpleenemymod:ruunit", name: "Remnant Signal Hunter", color: "dark_purple", hp: 75 },
  { id: "11", x: 3, z: 18, entity: "infectious:radioactive_zombie", name: "REACTOR SAINT", color: "green", hp: 220 },
  { id: "12", x: 9, z: 18, entity: "apocalypse_zombies:tank", name: "Siege Tank", color: "dark_red", hp: 90 },
  { id: "13", x: 15, z: 18, entity: "infectious:ancient_zombie_boss", name: "Ancient Abomination", color: "dark_purple", hp: 120 }
]

function pdzBossShowroomNbt(entry) {
  let label = "[" + entry.id + "] " + entry.name
  let sideBossReady = (entry.entity === "apocalypse_zombies:tank" || entry.entity === "infectious:ancient_zombie_boss")
    ? ",\"dz_sideboss_ready\"" : ""
  let hands = entry.gun ? ",HandItems:[{id:\"tacz:modern_kinetic_gun\",Count:1b,tag:{GunId:\"" + entry.gun + "\",GunFireMode:\"AUTO\",GunCurrentAmmoCount:" + entry.ammo + ",HasBulletInBarrel:1b,MaxDummyAmmo:" + entry.ammo + ",DummyAmmo:" + entry.ammo + "}},{}],HandDropChances:[0.0f,0.0f]" : ""
  return "{NoAI:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b," +
    "CustomName:'{\"text\":\"" + label + "\",\"color\":\"" + entry.color + "\",\"bold\":true}'," +
    "CustomNameVisible:1b,Health:" + entry.hp + ".0f," +
    "Attributes:[{Name:\"minecraft:generic.max_health\",Base:" + entry.hp + ".0d}]" + hands + "," +
    "Tags:[\"" + PDZ_BOSS_SHOWROOM_TAG + "\",\"dz_boss_showroom_" + entry.id + "\"" + sideBossReady + "]}"
}

function pdzBossShowroomClear(player) {
  player.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",tag=" + PDZ_BOSS_SHOWROOM_TAG + ",distance=..96] add " + PDZ_BOSS_AXEL_RESET_TAG)
  let count = player.runCommandSilent("kill @e[tag=" + PDZ_BOSS_SHOWROOM_TAG + ",distance=..96]")
  player.runCommandSilent("kill @e[tag=" + PDZ_BOSS_SHOWROOM_ANCHOR_TAG + ",distance=..96]")
  return count
}

function pdzBossShowroomSpawn(player, server) {
  pdzBossShowroomClear(player)

  // Axel is spawned through Brutal Bosses so its configured visual scale is
  // represented accurately. A marker preserves the requested gallery slot
  // across the short delayed identification step.
  player.runCommandSilent("execute positioned ^-18 ^ ^10 run summon minecraft:marker ~ ~ ~ {Tags:[\"" + PDZ_BOSS_SHOWROOM_ANCHOR_TAG + "\"]}")
  player.runCommandSilent("execute at @e[tag=" + PDZ_BOSS_SHOWROOM_ANCHOR_TAG + ",distance=..40,sort=nearest,limit=1] run tag @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",distance=..8] add " + PDZ_BOSS_AXEL_PREEXISTING_TAG)
  player.runCommandSilent("execute at @e[tag=" + PDZ_BOSS_SHOWROOM_ANCHOR_TAG + ",distance=..40,sort=nearest,limit=1] run brutalbosses spawnboss pdz_axel")

  PDZ_BOSS_SHOWROOM_ENTRIES.forEach(entry => {
    player.runCommandSilent("execute positioned ^" + entry.x + " ^ ^" + entry.z + " run summon " + entry.entity + " ~ ~ ~ " + pdzBossShowroomNbt(entry))
  })

  server.scheduleInTicks(5, () => {
    let anchor = "@e[tag=" + PDZ_BOSS_SHOWROOM_ANCHOR_TAG + ",sort=nearest,limit=1]"
    let axel = "@e[type=" + PDZ_BOSS_AXEL_ENTITY + ",tag=!" + PDZ_BOSS_AXEL_PREEXISTING_TAG + ",distance=..8,sort=nearest,limit=1]"
    server.runCommandSilent("execute at " + anchor + " run tag " + axel + " add " + PDZ_BOSS_SHOWROOM_TAG)
    server.runCommandSilent("execute at " + anchor + " run tag " + axel + " add dz_boss_showroom_01")
    server.runCommandSilent("execute at " + anchor + " run tag " + axel + " add " + PDZ_BOSS_AXEL_TAG)
    server.runCommandSilent("execute at " + anchor + " run tag " + axel + " add " + PDZ_BOSS_AXEL_RESET_TAG)
    server.runCommandSilent("execute at " + anchor + " run data merge entity " + axel + " {NoAI:1b,Invulnerable:1b,Silent:1b,CustomName:'{\"text\":\"[01] アクセル『ロードキング先遣隊長』\",\"color\":\"gold\",\"bold\":true}',CustomNameVisible:1b}")
    server.runCommandSilent("execute at " + anchor + " as " + axel + " run item replace entity @s weapon.mainhand with tacz:modern_kinetic_gun{GunId:\"tacz:minigun\",GunFireMode:\"AUTO\",GunCurrentAmmoCount:100,HasBulletInBarrel:1b,MaxDummyAmmo:100,DummyAmmo:100}")
    server.runCommandSilent("execute at " + anchor + " as " + axel + " run data merge entity @s {HandDropChances:[0.0f,0.0f]}")
    server.runCommandSilent("execute at " + anchor + " run tag @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",tag=" + PDZ_BOSS_AXEL_PREEXISTING_TAG + ",distance=..8] remove " + PDZ_BOSS_AXEL_PREEXISTING_TAG)
    pdzAxelSpawnFuelTanks(server, "execute at " + anchor)
    server.runCommandSilent("execute at " + anchor + " run tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=..8] add " + PDZ_BOSS_SHOWROOM_TAG)
    server.runCommandSilent("execute at " + anchor + " run tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=..8] add " + PDZ_BOSS_AXEL_RESET_TAG)

    // Some mod entities apply their defaults a tick or two after spawning.
    // Reassert showroom safety after those hooks have completed.
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_SHOWROOM_TAG + ",tag=!" + PDZ_BOSS_AXEL_RUNTIME_TAG + "] run data merge entity @s {NoAI:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b}")
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_SHOWROOM_TAG + ",tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + "] run data merge entity @s {Invulnerable:1b,Silent:1b}")
    // Validate the actual entities instead of claiming success merely because
    // summon commands were issued. Retry direct entries once after all spawn
    // gates and mod initialization hooks have run.
    PDZ_BOSS_SHOWROOM_ENTRIES.forEach(entry => {
      let exists=server.runCommandSilent("execute if entity @e[tag=dz_boss_showroom_" + entry.id + ",limit=1]")
      if (exists<=0) player.runCommandSilent("execute positioned ^" + entry.x + " ^ ^" + entry.z + " run summon " + entry.entity + " ~ ~ ~ " + pdzBossShowroomNbt(entry))
    })
    server.scheduleInTicks(8, () => {
      let present=[]
      for(let i=1;i<=13;i++){
        let id=(i<10?"0":"")+i
        let found=server.runCommandSilent("execute if entity @e[tag=dz_boss_showroom_" + id + ",limit=1]")
        if(found>0)present.push(id)
      }
      if(present.length===13)player.tell(Text.of("ボス展示13/13体を確認しました。頭上の[01]～[13]で修正対象を指定できます。").aqua())
      else{
        let missing=[]
        for(let i=1;i<=13;i++){let id=(i<10?"0":"")+i;if(present.indexOf(id)<0)missing.push(id)}
        player.tell(Text.of("ボス展示は"+present.length+"/13体です。未生成: ["+missing.join("][")+"]").red())
      }
    })
  })
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  let root = Commands.literal("deadzoneboss")

  root.then(Commands.literal("axel_spawn").executes(ctx => {
    let player = ctx.source.player
    let server = ctx.source.server
    let x = Math.floor(player.x), y = Math.floor(player.y), z = Math.floor(player.z)
    let positioned = "execute positioned " + x + " " + y + " " + z
    let active = server.runCommandSilent(positioned + " run tag @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128,limit=1] add dz_axel_active_probe")
    server.runCommandSilent(positioned + " run tag @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128] remove dz_axel_active_probe")
    if (active > 0) {
      player.tell(Text.of("128m以内ですでにアクセル戦が進行中です。").red())
      return 0
    }

    server.runCommandSilent("team add pdz_axel")
    server.runCommandSilent("tag @a remove " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)
    server.runCommandSilent(positioned + " run tag @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",distance=..24] add " + PDZ_BOSS_AXEL_PREEXISTING_TAG)
    server.runCommandSilent(positioned + " run brutalbosses spawnboss pdz_axel")
    server.scheduleInTicks(5, () => {
      let found = server.runCommandSilent(positioned + " as @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",tag=!" + PDZ_BOSS_AXEL_PREEXISTING_TAG + ",tag=!" + PDZ_BOSS_AXEL_TAG + ",distance=..16,sort=nearest,limit=1] run tag @s add " + PDZ_BOSS_AXEL_TAG)
      server.runCommandSilent(positioned + " as @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..16,sort=nearest,limit=1] run tag @s add dz_pdz_boss")
      server.runCommandSilent(positioned + " as @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..16,sort=nearest,limit=1] run team join pdz_axel @s")
      server.runCommandSilent(positioned + " run tag @a[distance=..64,gamemode=!spectator] add " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)
      server.runCommandSilent(positioned + " run tag @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",tag=" + PDZ_BOSS_AXEL_PREEXISTING_TAG + ",distance=..24] remove " + PDZ_BOSS_AXEL_PREEXISTING_TAG)
      if (found > 0) {
        pdzAxelSpawnFuelTanks(server, positioned)
        server.runCommandSilent(positioned + ' run tellraw @a[distance=..96] {"text":"[BOSS] アクセル出現。背面の左右燃料タンクを撃ち抜け！","color":"red","bold":true}')
      } else {
        player.tell(Text.of("アクセル本体の識別に失敗しました。ログとBrutal Bosses設定を確認してください。").red())
      }
    })
    player.tell(Text.of("アクセルを召喚しました。5tick後にPDZ戦闘状態へ接続します。").gold())
    return 1
  }))

  root.then(Commands.literal("axel_break_tanks").executes(ctx => {
    let p = ctx.source.player
    let count = p.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TANK_TAG + ",distance=..48] run damage @s 100 minecraft:generic_kill")
    p.tell(Text.of(count > 0 ? "燃料タンク破壊テストを実行しました。" : "48m以内に燃料タンクがありません。").yellow())
    return count > 0 ? 1 : 0
  }))

  root.then(Commands.literal("axel_phase2").executes(ctx => {
    let p = ctx.source.player
    let found = p.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128,sort=nearest,limit=1,tag=!dz_axel_phase2] at @s run damage @s 70 minecraft:generic")
    p.tell(Text.of(found > 0 ? "Axelをフェーズ2閾値まで進めました。" : "未移行のAxelが128m以内にいません。").gold())
    return found > 0 ? 1 : 0
  }))

  root.then(Commands.literal("axel_break_cylinders").executes(ctx => {
    let p = ctx.source.player
    let count = p.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_CYLINDER_TAG + ",distance=..64] run damage @s 100 minecraft:generic_kill")
    p.tell(Text.of(count > 0 ? "召喚ボンベ破壊テストを実行しました。" : "64m以内に召喚ボンベがありません。").yellow())
    return count > 0 ? 1 : 0
  }))

  root.then(Commands.literal("axel_status").executes(ctx => {
    let p = ctx.source.player
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',distance=..128] run tellraw @s {"text":"アクセル: ACTIVE（128m以内）","color":"green"}')
    p.runCommandSilent('execute unless entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',distance=..128] run tellraw @s {"text":"アクセル: NOT FOUND","color":"yellow"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TANK_LEFT_TAG + ',distance=..128] run tellraw @s {"text":"左燃料タンク: 稼働中","color":"yellow"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',tag=dz_axel_left_tank_destroyed,distance=..128] run tellraw @s {"text":"左燃料タンク: 破壊済み","color":"aqua"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TANK_RIGHT_TAG + ',distance=..128] run tellraw @s {"text":"右燃料タンク: 稼働中","color":"yellow"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',tag=dz_axel_right_tank_destroyed,distance=..128] run tellraw @s {"text":"右燃料タンク: 破壊済み","color":"aqua"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',tag=dz_axel_phase2,distance=..128] run tellraw @s {"text":"フェーズ: 2以上","color":"gold"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',tag=dz_axel_phase3,distance=..128] run tellraw @s {"text":"フェーズ: 最終攻勢","color":"red"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_BEARER_TAG + ',distance=..128] run tellraw @s {"text":"弾薬手ラチェット: 生存","color":"gold"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_CYLINDER_TAG + ',distance=..128] run tellraw @s {"text":"召喚ボンベ: 残存中","color":"gold"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',tag=dz_axel_cylinders_destroyed,distance=..128] run tellraw @s {"text":"召喚ボンベ: 全破壊済み","color":"aqua"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_TAG + ',tag=dz_axel_cylinders_failed_open,distance=..128] run tellraw @s {"text":"召喚ボンベ: 生成失敗・救済適用済み","color":"yellow"}')
    p.runCommandSilent('execute if entity @e[tag=' + PDZ_BOSS_AXEL_RUNTIME_TAG + ',distance=..128] run tellraw @s {"text":"一時オブジェクト: 残存あり","color":"gray"}')
    p.runCommandSilent('execute if entity @s[tag=' + PDZ_BOSS_AXEL_CLEAR_TAG + '] run tellraw @s {"text":"クリア記録: 取得済み","color":"aqua"}')
    p.runCommandSilent('execute unless entity @s[tag=' + PDZ_BOSS_AXEL_CLEAR_TAG + '] run tellraw @s {"text":"クリア記録: 未取得","color":"gray"}')
    return 1
  }))

  root.then(Commands.literal("axel_reset").executes(ctx => {
    let p = ctx.source.player
    let server = ctx.source.server
    let positioned = "execute positioned " + Math.floor(p.x) + " " + Math.floor(p.y) + " " + Math.floor(p.z)
    server.runCommandSilent(positioned + " run tag @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128] add " + PDZ_BOSS_AXEL_RESET_TAG)
    server.runCommandSilent(positioned + " run tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=..128] add " + PDZ_BOSS_AXEL_RESET_TAG)
    server.runCommandSilent(positioned + " run kill @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128]")
    server.runCommandSilent(positioned + " run kill @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=..128]")
    server.runCommandSilent("tag @a remove " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)
    server.runCommandSilent(positioned + " run tag @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",tag=" + PDZ_BOSS_AXEL_PREEXISTING_TAG + ",distance=..128] remove " + PDZ_BOSS_AXEL_PREEXISTING_TAG)
    p.tell(Text.of("128m以内のアクセル戦を報酬なしでリセットしました。").yellow())
    return 1
  }))

  root.then(Commands.literal("axel_cleanup").executes(ctx => {
    let p = ctx.source.player
    let count = p.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=..128] add " + PDZ_BOSS_AXEL_RESET_TAG)
    p.runCommandSilent("kill @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=..128]")
    p.tell(Text.of("128m以内のAxel一時オブジェクトを掃除しました: " + count).yellow())
    return 1
  }))

  root.then(Commands.literal("showroom").requires(source => source.hasPermission(2)).executes(ctx => {
    pdzBossShowroomSpawn(ctx.source.player, ctx.source.server)
    return 1
  }))

  root.then(Commands.literal("showroom_clear").requires(source => source.hasPermission(2)).executes(ctx => {
    let count = pdzBossShowroomClear(ctx.source.player)
    ctx.source.player.tell(Text.of("96m以内のボス展示を撤去しました: " + count).yellow())
    return 1
  }))

  event.register(root)
})
