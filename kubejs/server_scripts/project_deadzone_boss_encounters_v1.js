// PROJECT DEADZONE boss encounters v1
// B02 Axel encounter. The dedicated PDZ Bosses entity owns visuals, movement
// and its single native boss bar; this file bridges weak points, phase objects,
// fail-open recovery, cleanup, rewards and test commands.

const PDZ_BOSS_AXEL_TAG = "dz_boss_axel"
const PDZ_BOSS_AXEL_BEARER_TAG = "dz_axel_bearer"
const PDZ_BOSS_AXEL_PARTICIPANT_TAG = "dz_axel_participant"
const PDZ_BOSS_AXEL_CLEAR_TAG = "pdz_boss_axel_clear"
const PDZ_BOSS_AXEL_RESET_TAG = "dz_boss_resetting"
const PDZ_BOSS_AXEL_ENTITY = "pdzbosses:axel"
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
const PDZ_BOSS_AXEL_QUEST = "3AE47B2BEA8C8EB9"
const PDZ_BOSS_AXEL_INIT_TAG = "dz_axel_encounter_initialized"

function pdzAxelRuntimeTags(extraTags) {
  return [PDZ_BOSS_RUNTIME_TAG, PDZ_BOSS_AXEL_RUNTIME_TAG].concat(extraTags)
}

function pdzAxelTagsNbt(tags) {
  return '["' + tags.join('","') + '"]'
}

function pdzAxelBroadcast(entity, message, color) {
  entity.runCommandSilent('tellraw @a[distance=..96] {"text":"[BOSS] ' + message + '","color":"' + color + '","bold":true}')
}

function pdzAxelLog(message) {
  console.info('[PROJECT DEADZONE][Axel] ' + message)
}

function pdzAxelIntro(entity) {
  entity.runCommandSilent('title @a[distance=..96,gamemode=!spectator] times 10 55 15')
  entity.runCommandSilent('title @a[distance=..96,gamemode=!spectator] title {"text":"AXEL // ROAD KING","color":"red","bold":true}')
  entity.runCommandSilent('title @a[distance=..96,gamemode=!spectator] subtitle {"text":"背面の燃料タンクを破壊せよ","color":"gold"}')
  entity.runCommandSilent('playsound minecraft:entity.warden.emerge hostile @a[distance=..96,gamemode=!spectator] ~ ~ ~ 0.8 1.35')
}

function pdzAxelSpawnFuelTanks(server, positioned) {
  let boss = "@e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1]"
  let leftTankTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_TANK_TAG, PDZ_BOSS_AXEL_TANK_LEFT_TAG, "dz_pdz_boss_weakpoint"])
  let rightTankTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_TANK_TAG, PDZ_BOSS_AXEL_TANK_RIGHT_TAG, "dz_pdz_boss_weakpoint"])
  let leftTank = "{Size:0,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:28.0f,Attributes:[{Name:\"minecraft:generic.max_health\",Base:28.0d}],CustomName:'{\"text\":\"左燃料タンク\",\"color\":\"yellow\"}',Team:\"pdz_axel\",Tags:" + pdzAxelTagsNbt(leftTankTags) + "}"
  let rightTank = "{Size:0,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:28.0f,Attributes:[{Name:\"minecraft:generic.max_health\",Base:28.0d}],CustomName:'{\"text\":\"右燃料タンク\",\"color\":\"yellow\"}',Team:\"pdz_axel\",Tags:" + pdzAxelTagsNbt(rightTankTags) + "}"

  // The dedicated GeckoLib model owns the visible tanks. These two invisible
  // entities provide independent, shootable hitboxes only.
  server.runCommandSilent(positioned + " as " + boss + " at @s rotated as @s run summon minecraft:slime ^-0.48 ^1.68 ^-0.46 " + leftTank)
  server.runCommandSilent(positioned + " as " + boss + " at @s rotated as @s run summon minecraft:slime ^0.48 ^1.68 ^-0.46 " + rightTank)

  let tankCount = server.runCommandSilent(positioned + " if entity @e[tag=" + PDZ_BOSS_AXEL_TANK_LEFT_TAG + ",distance=..24] if entity @e[tag=" + PDZ_BOSS_AXEL_TANK_RIGHT_TAG + ",distance=..24] run tag " + boss + " add dz_axel_tanks_verified")
  pdzAxelLog('weakpoint_spawn verified=' + (tankCount > 0) + ' commandResult=' + tankCount)
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

function pdzAxelInitialize(candidate) {
  if (!candidate || !candidate.alive || !candidate.tags || candidate.tags.contains(PDZ_BOSS_SHOWROOM_TAG)) return false
  if (candidate.tags.contains(PDZ_BOSS_AXEL_INIT_TAG)) return true
  candidate.addTag(PDZ_BOSS_AXEL_TAG)
  candidate.addTag(PDZ_BOSS_AXEL_INIT_TAG)
  candidate.addTag("dz_pdz_boss")
  candidate.server.runCommandSilent("team add pdz_axel")
  candidate.runCommandSilent("team join pdz_axel @s")
  let positioned = "execute in " + String(candidate.level.dimension) + " positioned " +
    Number(candidate.x) + " " + Number(candidate.y) + " " + Number(candidate.z)
  pdzAxelSpawnFuelTanks(candidate.server, positioned)
  if (!candidate.tags.contains("dz_axel_tanks_destroyed"))
    candidate.runCommandSilent("effect give @s minecraft:resistance 9999 0 true")
  pdzAxelIntro(candidate)
  pdzAxelBroadcast(candidate, "ロードキング先遣隊長アクセルが燃料拠点を封鎖した。背面燃料タンクを破壊せよ！", "red")
  pdzAxelLog('initialize uuid=' + String(candidate.uuid) + ' dimension=' + String(candidate.level.dimension) +
    ' pos=' + Number(candidate.x).toFixed(1) + ',' + Number(candidate.y).toFixed(1) + ',' + Number(candidate.z).toFixed(1) +
    ' hp=' + Number(candidate.health).toFixed(1) + '/' + Number(candidate.maxHealth).toFixed(1))
  return true
}

function pdzAxelSpawnPhaseCylinders(boss) {
  let cylinderBase = "Size:1,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:22.0f,Attributes:[{Name:\"minecraft:generic.max_health\",Base:22.0d}],Team:\"pdz_axel\""
  // A vanilla barrel is intentionally used for these temporary arena props.
  // The old IE block display rendered as an untextured white box on several
  // shader paths. The attached fuel tanks remain part of Axel's custom model.
  let visualBase = "block_state:{Name:\"minecraft:barrel\"},Glowing:1b,brightness:{sky:15,block:10},view_range:1.0f,transformation:{translation:[-0.35f,-0.65f,-0.35f],scale:[0.7f,1.3f,0.7f]}"
  let offsets = ["^-2.8 ^0.2 ^1.8", "^2.8 ^0.2 ^1.8", "^0 ^0.2 ^3.4"]
  for (let i = 1; i <= 3; i++) {
    let hitboxTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_CYLINDER_TAG, "dz_axel_cylinder_" + i, "dz_pdz_boss_weakpoint"])
    let visualTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_CYLINDER_VISUAL_TAG, "dz_axel_cylinder_visual_" + i])
    let name = "緊急燃料ボンベ " + ["A", "B", "C"][i - 1]
    boss.runCommandSilent("execute at @s rotated as @s run summon minecraft:slime " + offsets[i - 1] + " {" + cylinderBase + ",CustomName:'{\"text\":\"" + name + "\",\"color\":\"gold\"}',CustomNameVisible:1b,Tags:" + pdzAxelTagsNbt(hitboxTags) + "}")
    boss.runCommandSilent("execute at @s rotated as @s run summon minecraft:block_display " + offsets[i - 1] + " {" + visualBase + ",Tags:" + pdzAxelTagsNbt(visualTags) + "}")
  }

  let spawned = boss.runCommandSilent("execute if entity @e[tag=" + PDZ_BOSS_AXEL_CYLINDER_TAG + ",distance=..16,limit=1] run tag @s add dz_axel_cylinders_verified")
  pdzAxelLog('phase2_cylinders verified=' + (spawned > 0) + ' commandResult=' + spawned + ' boss=' + String(boss.uuid))
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
  pdzAxelLog('cylinder_destroyed index=' + index + ' uuid=' + String(cylinder.uuid))

  let allDestroyed = cylinder.runCommandSilent("execute if entity @e[tag=" + PDZ_BOSS_AXEL_TAG + ",tag=dz_axel_cylinder_1_destroyed,tag=dz_axel_cylinder_2_destroyed,tag=dz_axel_cylinder_3_destroyed,distance=..48,limit=1] run tag " + boss + " add dz_axel_cylinders_destroyed")
  if (allDestroyed > 0) {
    cylinder.runCommandSilent("effect give " + boss + " minecraft:glowing 12 0 true")
    cylinder.runCommandSilent("effect give " + boss + " minecraft:slowness 10 2 true")
    cylinder.runCommandSilent("effect give " + boss + " minecraft:weakness 10 1 true")
    pdzAxelBroadcast(cylinder, "全ボンベ誘爆。アクセルが大きく体勢を崩した！", "aqua")
    pdzAxelLog('cylinders_all_destroyed bossSelectorResult=' + allDestroyed)
  }
}

function pdzAxelCleanupAround(entity, radius) {
  entity.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=.." + radius + "] add " + PDZ_BOSS_AXEL_RESET_TAG)
  entity.runCommandSilent("kill @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",distance=.." + radius + "]")
}

// Attach authored encounter phases to the dedicated Axel entity only.
EntityEvents.spawned(PDZ_BOSS_AXEL_ENTITY, event => {
  let candidate = event.entity
  event.server.scheduleInTicks(10, () => {
    if (!candidate || !candidate.alive || !candidate.tags) return
    if (candidate.tags.contains(PDZ_BOSS_SHOWROOM_TAG)) return
    let name = ""
    try { name = String(candidate.name.string) } catch (ignored) { try { name = String(candidate.name) } catch (ignored2) {} }
    if (!candidate.tags.contains(PDZ_BOSS_AXEL_TAG) && name.indexOf("アクセル") < 0 && name.indexOf("Axel") < 0) return
    pdzAxelInitialize(candidate)
  })
})

function pdzAxelComponentPlayerHitOnly(event) {
  let target = event.entity
  if (!target || !target.tags ||
      (!target.tags.contains(PDZ_BOSS_AXEL_TANK_TAG) && !target.tags.contains(PDZ_BOSS_AXEL_CYLINDER_TAG))) return false
  // Administrative reset marks components before /kill; never block cleanup.
  if (target.tags.contains(PDZ_BOSS_AXEL_RESET_TAG)) return false
  let attacker = event.source ? event.source.actual : null
  if (!attacker || !attacker.isPlayer || !attacker.isPlayer()) event.cancel()
  return true
}

function pdzAxelFuelTankDestroyed(tank) {
  let left = tank.tags.contains(PDZ_BOSS_AXEL_TANK_LEFT_TAG)
  let destroyedTag = left ? "dz_axel_left_tank_destroyed" : "dz_axel_right_tank_destroyed"
  let sideName = left ? "左" : "右"

  tank.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..24,sort=nearest,limit=1] add " + destroyedTag)
  tank.runCommandSilent("particle minecraft:explosion ~ ~ ~ 0 0 0 0 1 force @a[distance=..96]")
  tank.runCommandSilent("playsound minecraft:entity.generic.explode master @a[distance=..96] ~ ~ ~ 0.8 1.35")
  tank.runCommandSilent('tellraw @a[distance=..96] {"text":"[WEAKPOINT] ' + sideName + '燃料タンク破壊。アクセルの機動力が低下した。","color":"yellow","bold":true}')
  pdzAxelLog('fuel_tank_destroyed side=' + sideName + ' uuid=' + String(tank.uuid))
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
    pdzAxelLog('fuel_tanks_all_destroyed bossSelectorResult=' + both)
  }
}

function pdzAxelForEachLoadedBoss(server, consumer) {
  let seen = {}
  server.players.forEach(player => {
    if (player.level.clientSide) return
    player.level.getEntities(player, player.boundingBox.inflate(128)).forEach(entity => {
      if (!entity.alive || !entity.tags || !entity.tags.contains(PDZ_BOSS_AXEL_TAG) ||
          entity.tags.contains(PDZ_BOSS_AXEL_RESET_TAG) || entity.tags.contains(PDZ_BOSS_SHOWROOM_TAG)) return
      let id = String(entity.uuid)
      if (seen[id]) return
      seen[id] = true
      consumer(entity)
    })
  })
}

function pdzAxelUpdateHud(server) {
  server.players.forEach(player => {
    if (player.spectator) return
    let nearest = null, best = 96 * 96
    player.level.getEntities(player, player.boundingBox.inflate(96)).forEach(entity => {
      if (!entity.alive || !entity.tags || !entity.tags.contains(PDZ_BOSS_AXEL_TAG) ||
          entity.tags.contains(PDZ_BOSS_AXEL_RESET_TAG) || entity.tags.contains(PDZ_BOSS_SHOWROOM_TAG)) return
      let dx = entity.x - player.x, dy = entity.y - player.y, dz = entity.z - player.z
      let distance = dx * dx + dy * dy + dz * dz
      if (distance < best) { best = distance; nearest = entity }
    })
    if (!nearest) return
    let hp = Math.max(0, Math.ceil(Number(nearest.health)))
    let max = Math.max(1, Math.ceil(Number(nearest.maxHealth)))
    let objective = "本体を攻撃"
    let color = "red"
    if (!nearest.tags.contains("dz_axel_tanks_destroyed")) {
      let left = nearest.tags.contains("dz_axel_left_tank_destroyed") ? 0 : 1
      let right = nearest.tags.contains("dz_axel_right_tank_destroyed") ? 0 : 1
      objective = "弱点：背面燃料タンク ×" + (left + right)
      color = "yellow"
    } else if (nearest.tags.contains("dz_axel_phase2") && !nearest.tags.contains("dz_axel_phase3") &&
               !nearest.tags.contains("dz_axel_cylinders_destroyed")) {
      objective = "支援兵／緊急燃料ボンベを破壊"
      color = "gold"
    } else if (nearest.tags.contains("dz_axel_phase3")) {
      objective = "最終攻勢：アクセルを制圧"
    }
    player.runCommandSilent('title @s actionbar {"text":"AXEL  ' + hp + ' / ' + max + ' HP  |  ' +
      objective + '","color":"' + color + '","bold":true}')
  })
}

function pdzAxelLaunchGrenades(server) {
  pdzAxelForEachLoadedBoss(server, boss => {
    let target = null, best = 40 * 40
    server.players.forEach(player => {
      if (player.spectator || player.creative || String(player.level.dimension) !== String(boss.level.dimension)) return
      let dx = player.x - boss.x, dy = player.y - boss.y, dz = player.z - boss.z
      let distance = dx * dx + dy * dy + dz * dz
      if (distance < best) { best = distance; target = player }
    })
    if (!target) return
    let dimension = String(boss.level.dimension)
    let x = Number(target.x).toFixed(2), y = Number(target.y).toFixed(2), z = Number(target.z).toFixed(2)
    let positioned = 'execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z
    server.runCommandSilent(positioned + ' run particle minecraft:dust 1 0.25 0 1 ~ ~0.15 ~ 2.5 0.1 2.5 0 80 force @a[distance=..96]')
    server.runCommandSilent(positioned + ' run playsound minecraft:block.note_block.bell hostile @a[distance=..96] ~ ~ ~ 1.1 0.55')
    server.runCommandSilent(positioned + ' run tellraw @a[distance=..96] {"text":"[WARNING] 焼夷グレネード着弾まで1.5秒。赤い範囲から退避！","color":"red","bold":true}')
    pdzAxelLog('grenade_warning boss=' + String(boss.uuid) + ' target=' + String(target.username) +
      ' pos=' + x + ',' + y + ',' + z)
    let source = boss
    ;[10, 20].forEach(delay => server.scheduleInTicks(delay, () => {
      if (!source || !source.alive || source.tags.contains(PDZ_BOSS_AXEL_RESET_TAG)) return
      server.runCommandSilent(positioned + ' run particle minecraft:dust 1 0.1 0 1 ~ ~0.12 ~ 2.5 0.08 2.5 0 54 force @a[distance=..96]')
      server.runCommandSilent(positioned + ' run playsound minecraft:block.note_block.hat hostile @a[distance=..96] ~ ~ ~ 0.65 ' + (delay === 10 ? '0.75' : '1.15'))
    }))
    server.scheduleInTicks(30, () => {
      if (!source || !source.alive || source.tags.contains(PDZ_BOSS_AXEL_RESET_TAG)) {
        pdzAxelLog('grenade_cancelled boss_missing_or_reset=true pos=' + x + ',' + y + ',' + z)
        return
      }
      server.runCommandSilent(positioned + ' run particle minecraft:explosion_emitter ~ ~0.2 ~ 0 0 0 0 1 force @a[distance=..96]')
      server.runCommandSilent(positioned + ' run particle minecraft:flame ~ ~0.2 ~ 1.8 0.25 1.8 0.03 60 force @a[distance=..96]')
      server.runCommandSilent(positioned + ' run playsound minecraft:entity.generic.explode hostile @a[distance=..96] ~ ~ ~ 1.1 1.15')
      let hitCount = server.runCommandSilent(positioned + ' run damage @a[distance=..3.5,gamemode=!creative,gamemode=!spectator] 4 minecraft:explosion')
      let slowCount = server.runCommandSilent(positioned + ' run effect give @a[distance=..3.5,gamemode=!creative,gamemode=!spectator] minecraft:slowness 3 0 true')
      pdzAxelLog('grenade_detonate boss=' + String(source.uuid) + ' hits=' + hitCount + ' slowed=' + slowCount +
        ' pos=' + x + ',' + y + ',' + z)
    })
  })
}

let pdzAxelTankTicks = 0
ServerEvents.tick(event => {
  if (++pdzAxelTankTicks % 3 !== 0) return
  let server = event.server
  server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + "] at @s rotated as @s run tp @e[tag=" + PDZ_BOSS_AXEL_TANK_LEFT_TAG + ",distance=..8,sort=nearest,limit=1] ^-0.48 ^1.68 ^-0.46 ~ ~")
  server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_TAG + "] at @s rotated as @s run tp @e[tag=" + PDZ_BOSS_AXEL_TANK_RIGHT_TAG + ",distance=..8,sort=nearest,limit=1] ^0.48 ^1.68 ^-0.46 ~ ~")

  // Runtime objects are never allowed to remain as arena debris. An unloaded boss
  // does not match the local selector, so cleanup is limited to objects whose own
  // chunk is loaded and which have no Axel within 128 blocks.
  if (pdzAxelTankTicks % 60 === 0) {
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + "] at @s unless entity @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..128,limit=1] run tag @s add " + PDZ_BOSS_AXEL_RESET_TAG)
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",tag=" + PDZ_BOSS_AXEL_RESET_TAG + "] run kill @s")
  }
  if (pdzAxelTankTicks % 30 === 0) pdzAxelUpdateHud(server)
  if (pdzAxelTankTicks % 240 === 0) pdzAxelLaunchGrenades(server)
})

EntityEvents.hurt(event => {
  if (pdzAxelComponentPlayerHitOnly(event)) return
  let boss = event.entity
  if (!boss || boss.level.clientSide || !boss.tags.contains(PDZ_BOSS_AXEL_TAG)) return
  if (boss.tags.contains(PDZ_BOSS_AXEL_RESET_TAG)) return

  try { if (global.pdzBossEnsureDurability) global.pdzBossEnsureDurability(boss) } catch (ignored) {}

  let hp = Number(boss.health)
  let max = Math.max(1, Number(boss.maxHealth))
  let incoming = Math.max(0, Number(event.damage || 0))
  let ratio = Math.max(0, hp - incoming) / max
  boss.runCommandSilent("tag @a[distance=..64,gamemode=!spectator] add " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)

  if (ratio <= 0.65 && !boss.tags.contains("dz_axel_phase2")) {
    boss.addTag("dz_axel_phase2")
    let bearerTags = pdzAxelRuntimeTags([PDZ_BOSS_AXEL_BEARER_TAG, "dz_pdz_boss_minion"])
    let bearerSpawned = boss.runCommandSilent('summon ' + PDZ_BOSS_AXEL_BEARER_ENTITY + ' ~3 ~ ~ {CustomName:\'{"text":"弾薬手ラチェット","color":"gold"}\',CustomNameVisible:1b,PersistenceRequired:1b,Tags:' + pdzAxelTagsNbt(bearerTags) + ',Team:"pdz_axel"}')
    if (!boss.tags.contains("dz_axel_tanks_destroyed")) boss.runCommandSilent("effect give @s minecraft:resistance 9999 1 true")
    pdzAxelSpawnPhaseCylinders(boss)
    pdzAxelBroadcast(boss, "弾薬手ラチェットが防護支援を開始。支援役か燃料ボンベを崩せ！", "gold")
    pdzAxelLog('phase2_enter boss=' + String(boss.uuid) + ' ratio=' + ratio.toFixed(3) +
      ' bearerSpawned=' + bearerSpawned)
  }

  else if (ratio <= 0.3 && !boss.tags.contains("dz_axel_phase3")) {
    boss.addTag("dz_axel_phase3")
    boss.runCommandSilent("effect give @s minecraft:strength 9999 0 true")
    boss.runCommandSilent("effect give @s minecraft:glowing 9999 0 true")
    pdzAxelBroadcast(boss, "最終攻勢。アクセルが前線へ出た！", "red")
    pdzAxelLog('phase3_enter boss=' + String(boss.uuid) + ' ratio=' + ratio.toFixed(3))
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
    pdzAxelLog('bearer_destroyed uuid=' + String(entity.uuid))
    return
  }

  if (!entity.tags.contains(PDZ_BOSS_AXEL_TAG) || entity.tags.contains("dz_boss_rewarded")) return
  entity.addTag("dz_boss_rewarded")
  entity.runCommandSilent("tag @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] add " + PDZ_BOSS_AXEL_CLEAR_TAG)
  entity.runCommandSilent("ftbquests change_progress @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] complete " + PDZ_BOSS_AXEL_QUEST)
  entity.runCommandSilent("give @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] lightmanscurrency:coin_copper 10")
  entity.runCommandSilent("give @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] immersiveengineering:ingot_steel 4")
  entity.runCommandSilent("give @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + ",distance=..64,gamemode=!spectator] apocalypsenow:bandage 3")
  pdzAxelCleanupAround(entity, 96)
  entity.runCommandSilent("tag @a[tag=" + PDZ_BOSS_AXEL_PARTICIPANT_TAG + "] remove " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)
  pdzAxelBroadcast(entity, "アクセル撃破。周辺参加者へ個人報酬を支給した。", "green")
  pdzAxelLog('defeated uuid=' + String(entity.uuid) + ' cleanupRadius=96')
})

// Appearance-only boss showroom. Every exhibit has a stable numbered tag so
// screenshots can be reviewed and visual changes can be requested by number.
// Exhibits are frozen, silent and invulnerable; they never award boss loot.
const PDZ_BOSS_SHOWROOM_TAG = "dz_boss_showroom"
const PDZ_BOSS_SHOWROOM_IDS = ["01","02","03","04","06","07","08","09","10","11","12","13","14"]

const PDZ_BOSS_SHOWROOM_ENTRIES = [
  { id: "01", x: -18, z: 10, entity: "pdzbosses:axel", name: "AXEL // ROAD KING", color: "red", hp: 191 },
  { id: "02", x: -12, z: 10, entity: "pdzbosses:argus_fragment", name: "ARGUS FRAGMENT", color: "gold", hp: 240 },
  { id: "03", x: -6, z: 10, entity: "pdzbosses:choir_vessel", name: "CHOIR VESSEL", color: "dark_purple", hp: 280 },
  { id: "04", x: 0, z: 10, entity: "pdzbosses:cinder", name: "CINDER", color: "dark_red", hp: 210 },
  { id: "06", x: 6, z: 10, entity: "pdzbosses:brass_hound", name: "BRASS HOUND", color: "gold", hp: 230 },
  { id: "07", x: 12, z: 10, entity: "pdzbosses:white_stitch", name: "WHITE STITCH", color: "white", hp: 205 },
  { id: "08", x: 18, z: 10, entity: "pdzbosses:marshal_graves", name: "MARSHAL GRAVES", color: "blue", hp: 250 },
  { id: "09", x: -15, z: 20, entity: "pdzbosses:primordial", name: "PRIMORDIAL", color: "dark_purple", hp: 300 },
  { id: "10", x: -9, z: 20, entity: "pdzbosses:echo_7", name: "ECHO-7", color: "aqua", hp: 225 },
  { id: "11", x: -3, z: 20, entity: "pdzbosses:reactor_saint", name: "REACTOR SAINT", color: "green", hp: 330 },
  { id: "12", x: 4, z: 20, entity: "pdzbosses:siege_tank", name: "SIEGE TANK", color: "dark_red", hp: 360 },
  { id: "13", x: 12, z: 20, entity: "pdzbosses:ancient_abomination", name: "ANCIENT ABOMINATION", color: "dark_purple", hp: 420 },
  { id: "14", x: 21, z: 20, entity: "pdzbosses:relay_shepherd", name: "RELAY SHEPHERD", color: "light_purple", hp: 520 }
]

function pdzBossShowroomNbt(entry) {
  let label = "[" + entry.id + "] " + entry.name
  let sideBossReady = (entry.entity === "pdzbosses:siege_tank" || entry.entity === "pdzbosses:ancient_abomination")
    ? ",\"dz_sideboss_ready\"" : ""
  let hands = ""
  return "{NoAI:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b," +
    "CustomName:'{\"text\":\"" + label + "\",\"color\":\"" + entry.color + "\",\"bold\":true}'," +
    "CustomNameVisible:1b,Health:" + entry.hp + ".0f," +
    "Attributes:[{Name:\"minecraft:generic.max_health\",Base:" + entry.hp + ".0d}]" + hands + "," +
    "Tags:[\"" + PDZ_BOSS_SHOWROOM_TAG + "\",\"dz_boss_showroom_" + entry.id + "\"" + sideBossReady + "]}"
}

function pdzBossShowroomClear(player) {
  player.runCommandSilent("tag @e[tag=" + PDZ_BOSS_AXEL_RUNTIME_TAG + ",tag=" + PDZ_BOSS_SHOWROOM_TAG + ",distance=..96] add " + PDZ_BOSS_AXEL_RESET_TAG)
  let count = player.runCommandSilent("kill @e[tag=" + PDZ_BOSS_SHOWROOM_TAG + ",distance=..96]")
  return count
}

function pdzBossShowroomSpawn(player, server) {
  pdzBossShowroomClear(player)

  PDZ_BOSS_SHOWROOM_ENTRIES.forEach(entry => {
    player.runCommandSilent("execute positioned ^" + entry.x + " ^ ^" + entry.z + " run summon " + entry.entity + " ~ ~ ~ " + pdzBossShowroomNbt(entry))
  })

  server.scheduleInTicks(5, () => {
    // Dedicated entities need neither delayed Brutal Bosses identification nor
    // external weapon/display attachments. Reassert gallery safety only.
    server.runCommandSilent("execute as @e[tag=" + PDZ_BOSS_SHOWROOM_TAG + "] run data merge entity @s {NoAI:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b}")
    // Validate the actual entities instead of claiming success merely because
    // summon commands were issued. Retry direct entries once after all spawn
    // gates and mod initialization hooks have run.
    PDZ_BOSS_SHOWROOM_ENTRIES.forEach(entry => {
      let exists=server.runCommandSilent("execute if entity @e[tag=dz_boss_showroom_" + entry.id + ",limit=1]")
      if (exists<=0) player.runCommandSilent("execute positioned ^" + entry.x + " ^ ^" + entry.z + " run summon " + entry.entity + " ~ ~ ~ " + pdzBossShowroomNbt(entry))
    })
    server.scheduleInTicks(8, () => {
      let present=[]
      PDZ_BOSS_SHOWROOM_IDS.forEach(id=>{
        let found=server.runCommandSilent("execute if entity @e[tag=dz_boss_showroom_" + id + ",limit=1]")
        if(found>0)present.push(id)
      })
      if(present.length===13)player.tell(Text.of("ボス展示13/13体を確認しました。頭上の番号で修正対象を指定できます。").aqua())
      else{
        let missing=[]
        PDZ_BOSS_SHOWROOM_IDS.forEach(id=>{if(present.indexOf(id)<0)missing.push(id)})
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
    server.runCommandSilent(positioned + " run summon " + PDZ_BOSS_AXEL_ENTITY + " ~ ~ ~ {PersistenceRequired:1b,Tags:[\"" + PDZ_BOSS_AXEL_TAG + "\",\"dz_story_boss_gasstation\",\"dz_story_boss\",\"dz_raider\",\"dz_hostile\"],CustomName:'{\"text\":\"AXEL // ROAD KING\",\"color\":\"red\",\"bold\":true}',CustomNameVisible:1b}")
    server.scheduleInTicks(5, () => {
      let found = server.runCommandSilent(positioned + " if entity @e[type=" + PDZ_BOSS_AXEL_ENTITY + ",tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..16,sort=nearest,limit=1]")
      server.runCommandSilent(positioned + " as @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..16,sort=nearest,limit=1] run tag @s add dz_pdz_boss")
      server.runCommandSilent(positioned + " as @e[tag=" + PDZ_BOSS_AXEL_TAG + ",distance=..16,sort=nearest,limit=1] run team join pdz_axel @s")
      server.runCommandSilent(positioned + " run tag @a[distance=..64,gamemode=!spectator] add " + PDZ_BOSS_AXEL_PARTICIPANT_TAG)
      if (found > 0) {
        server.runCommandSilent(positioned + ' run tellraw @a[distance=..96] {"text":"[BOSS] アクセルを識別。戦闘システムを接続中…","color":"gold","bold":true}')
      } else {
        player.tell(Text.of("アクセル本体の召喚に失敗しました。PDZ Bosses MODを確認してください。").red())
      }
    })
    player.tell(Text.of("アクセルを召喚しました。自動的にPDZ戦闘状態へ接続します。").gold())
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
