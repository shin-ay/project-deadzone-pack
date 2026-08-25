// PROJECT DEADZONE first Survivor Camp raid v0.1
// A short, one-time event: warning -> two waves -> clear reward.

const DZ_RAID_STATE = "dz_basecamp_first_raid_state"
const DZ_RAID_TIME = "dz_basecamp_first_raid_time"
const DZ_RAID_REMAINING = "dz_basecamp_first_raid_remaining"
const DZ_RAID_FLOW_VERSION = "dz_basecamp_raid_flow_version"
const DZ_RAID_WARNING_TICKS = 1200
const DZ_RAID_WAVE_GAP = 600
const DZ_RAID_INTERMISSION = 300
const DZ_RAID_QUEST = "41F0ABB18B9685AC"

function dzRaidGameTime(server) {
  return Number(server.runCommandSilent("time query gametime"))
}

function dzRaidHasCamp(server) {
  return server.runCommandSilent(
    "execute if entity @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,limit=1]"
  ) > 0
}

function dzRaidHasPlayerAtCamp(server) {
  return server.runCommandSilent(
    "execute at @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,limit=1] " +
    "if entity @a[distance=..80]"
  ) > 0
}

function dzRaidCoreIntact(server) {
  // Camps created before this update have no core marker; refresh/activation
  // upgrades them without breaking an already-running alpha world.
  if (server.runCommandSilent(
    "execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1]"
  ) <= 0) return true
  return server.runCommandSilent(
    "execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] " +
    "if block ~ ~ ~ kubejs:deadzone_base_core"
  ) > 0
}

function dzRaidEnemiesAlive(server) {
  return server.runCommandSilent(
    "execute if entity @e[tag=dz_basecamp_raider,limit=1]"
  ) > 0
}

function dzRaidT1BossDefeated(server) {
  // The gas-station boss is the T1 story boss. Keep both keys for old saves.
  return server.persistentData.getBoolean("dz_story_boss_complete_gasstation") ||
    server.persistentData.getBoolean("dz_story_gasstation_secured")
}

function dzRaidNearbyPlayerCount(server) {
  let count = 0
  server.players.forEach(player => {
    if (player.runCommandSilent(
      "execute if entity @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,distance=..96,limit=1]"
    ) > 0) count++
  })
  return Math.max(1, count)
}

function dzRaidAnnounce(server, text, color) {
  server.runCommandSilent(
    'tellraw @a [{"text":"[CAMP RAID] ","color":"dark_red","bold":true},' +
    '{"text":"' + text + '","color":"' + color + '"}]'
  )
}

function dzRaidStartWarning(server, now) {
  server.persistentData.putInt(DZ_RAID_FLOW_VERSION, 2)
  server.persistentData.putInt(DZ_RAID_STATE, 1)
  server.persistentData.putLong(DZ_RAID_TIME, now + DZ_RAID_WARNING_TICKS)
  server.persistentData.putInt(DZ_RAID_REMAINING, DZ_RAID_WARNING_TICKS)
  console.info("[DEADZONE RAID] Warning started; wave 1 in " + DZ_RAID_WARNING_TICKS + " ticks")
  dzRaidAnnounce(server, "T1ボス討伐時の戦闘痕跡からキャンプが特定された。敵襲まで約60秒。", "yellow")
  server.runCommandSilent(
    'title @a title {"text":"拠点襲撃警報","color":"red","bold":true}'
  )
  server.runCommandSilent(
    'title @a subtitle {"text":"装備を整え、キャンプへ戻れ","color":"yellow"}'
  )
  if (typeof dzDefenseOnWarning === "function") dzDefenseOnWarning(server)
}

function dzRaidSpawnWave(server, wave, now) {
  let result = server.runCommandSilent(
    "function project_deadzone:basecamp/raid/spawn_wave_" + wave
  )
  server.persistentData.putInt(DZ_RAID_STATE, wave === 1 ? 2 : 3)
  server.persistentData.putLong(DZ_RAID_TIME, now + DZ_RAID_WAVE_GAP)
  server.persistentData.putInt(DZ_RAID_REMAINING, DZ_RAID_WAVE_GAP)
  console.info("[DEADZONE RAID] Wave " + wave + " function result=" + result)
  // One extra Raider per additional connected player (maximum three).
  let playerCount = dzRaidNearbyPlayerCount(server)
  // Five nearby players produce six reinforcements: ten attackers per wave.
  let reinforcements = Math.max(0, Math.min(8, Math.ceil((playerCount - 1) * 1.5)))
  for (let i = 0; i < reinforcements; i++) {
    server.runCommandSilent("function project_deadzone:basecamp/raid/spawn_reinforcement")
  }
  // A five-player team gets a readable squad composition, not only more bodies.
  if (playerCount >= 5) {
    server.runCommandSilent("function project_deadzone:basecamp/raid/spawn_elite")
    if (wave === 1) server.runCommandSilent("function project_deadzone:basecamp/raid/spawn_medic")
  }
  console.info("[DEADZONE RAID] Players=" + playerCount + ", reinforcements=" + reinforcements)
  dzRaidAnnounce(server, "Wave " + wave + " 接近。キャンプ外周を防衛せよ。", "red")
  if (typeof dzDefenseOnWave === "function") dzDefenseOnWave(server, wave)
}

function dzRaidComplete(server) {
  server.persistentData.putInt(DZ_RAID_STATE, 5)
  server.persistentData.putLong(DZ_RAID_TIME, 0)
  server.persistentData.putInt(DZ_RAID_REMAINING, 0)
  dzRaidAnnounce(server, "襲撃部隊を排除。Survivor Campを防衛した。", "green")
  server.runCommandSilent(
    "execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] " +
    "run ftbquests change_progress @a[distance=..112] complete " + DZ_RAID_QUEST
  )
  // Individual rewards live in the FTB Quest. This is the one shared camp cache.
  server.runCommandSilent(
    "execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] " +
    "run loot spawn ~ ~1 ~ loot project_deadzone:chests/tier1_utility"
  )
  server.persistentData.putBoolean("dz_story_t2_intro_unlocked", true)
  dzRaidAnnounce(server, "敵の通信記録から警察署の位置情報を回収。T2導入ルートを解放した。", "aqua")
  if (typeof dzDefenseOnComplete === "function") dzDefenseOnComplete(server)
}

function dzRaidFail(server) {
  server.persistentData.putInt(DZ_RAID_STATE, 6)
  server.persistentData.putLong(DZ_RAID_TIME, 0)
  server.persistentData.putInt(DZ_RAID_REMAINING, 0)
  server.runCommandSilent("kill @e[tag=dz_basecamp_raider]")
  dzRaidAnnounce(server, "Base Coreが破壊された。防衛失敗。修復後に襲撃状態をリセットせよ。", "red")
  if (typeof dzDefenseOnFail === "function") dzDefenseOnFail(server)
}

let DZ_RAID_SERVER_TICKS = 0
ServerEvents.tick(event => {
  let server = event.server
  DZ_RAID_SERVER_TICKS++
  if (DZ_RAID_SERVER_TICKS % 20 !== 0) return
  let now = dzRaidGameTime(server)
  if (!Number.isFinite(now)) now = 0

  let state = server.persistentData.getInt(DZ_RAID_STATE)
  let remaining = server.persistentData.getInt(DZ_RAID_REMAINING)
  // In the previous flow state 4 meant completed; migrate old worlds safely.
  if (server.persistentData.getInt(DZ_RAID_FLOW_VERSION) < 2 && state === 4) {
    server.persistentData.putInt(DZ_RAID_STATE, 5)
    state = 5
  }

  if (state === 0) {
    // Story gate: calendar time no longer starts the first raid.
    if (!dzRaidT1BossDefeated(server) || !dzRaidHasCamp(server)) return
    // The raid waits until someone is actually at the camp.
    if (!dzRaidHasPlayerAtCamp(server)) return
    dzRaidStartWarning(server, now)
    return
  }

  if (state >= 1 && state <= 4 && !dzRaidCoreIntact(server)) {
    dzRaidFail(server)
    return
  }

  if ((state === 1 || state === 4) && remaining > 0) {
    remaining = Math.max(0, remaining - 20)
    server.persistentData.putInt(DZ_RAID_REMAINING, remaining)
  }

  if (state === 1 && remaining <= 0) {
    dzRaidSpawnWave(server, 1, now)
    return
  }

  // Wave 1 has no time limit. Wave 2 is queued only after every tagged
  // attacker is defeated, followed by a short preparation interval.
  if (state === 2 && !dzRaidEnemiesAlive(server)) {
    server.persistentData.putInt(DZ_RAID_STATE, 4)
    server.persistentData.putInt(DZ_RAID_REMAINING, DZ_RAID_INTERMISSION)
    dzRaidAnnounce(server, "Wave 1 排除。次の襲撃まで15秒。", "yellow")
    return
  }

  if (state === 4 && remaining <= 0) {
    dzRaidSpawnWave(server, 2, now)
    return
  }

  if (state === 3 && !dzRaidEnemiesAlive(server)) {
    dzRaidComplete(server)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecampraid")

  root.then(Commands.literal("status").executes(ctx => {
    let server = ctx.source.server
    let state = server.persistentData.getInt(DZ_RAID_STATE)
    let remaining = server.persistentData.getInt(DZ_RAID_REMAINING)
    let labels = ["待機中", "警告中", "Wave 1 戦闘中", "Wave 2 戦闘中", "次Wave準備中", "初回襲撃クリア", "防衛失敗"]
    ctx.source.player.tell(Text.of(
      "Camp Raid: " + (labels[state] || ("不明(" + state + ")")) +
      " / Next: " + Math.ceil(remaining / 20) + "s" +
      " / Enemies: " + (dzRaidEnemiesAlive(server) ? "YES" : "NO")
    ).gold())
    return 1
  }))

  root.then(Commands.literal("test_start")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let server = ctx.source.server
      if (!dzRaidHasCamp(server)) {
        ctx.source.player.tell(Text.of("襲撃アンカーが見つかりません。").red())
        return 0
      }
      server.persistentData.putInt(DZ_RAID_STATE, 0)
      dzRaidStartWarning(server, dzRaidGameTime(server))
      return 1
    }))

  root.then(Commands.literal("test_wave")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      dzRaidSpawnWave(ctx.source.server, 1, dzRaidGameTime(ctx.source.server))
      return 1
    }))

  root.then(Commands.literal("reset")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let server = ctx.source.server
      server.runCommandSilent("kill @e[tag=dz_basecamp_raider]")
      server.persistentData.putInt(DZ_RAID_STATE, 0)
      server.persistentData.putLong(DZ_RAID_TIME, 0)
      server.persistentData.putInt(DZ_RAID_REMAINING, 0)
      if (typeof dzDefenseAdminReset === "function") dzDefenseAdminReset(server)
      ctx.source.player.tell(Text.of("初回襲撃の状態をリセットしました。").yellow())
      return 1
    }))

  event.register(root)
})
