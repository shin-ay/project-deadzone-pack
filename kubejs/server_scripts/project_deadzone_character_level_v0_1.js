// PROJECT DEADZONE Character Level v0.1
// Small, equipment-neutral growth layer. It never changes weapon damage,
// enemy strength, loot rarity, carry weight or stamina.

const PDZ_CHARACTER_LEVEL_MAX = 30
const PDZ_CHARACTER_HP_MODIFIER = "5e54ac8f-7d89-44f3-aeba-8fc654c1b121"

function pdzCharacterXpForNext(level) {
  return 100 + Math.max(0, level - 1) * 50
}

function pdzCharacterTotalForLevel(level) {
  let n = Math.max(0, level - 1)
  return n * 100 + (n * (n - 1) / 2) * 50
}

function pdzCharacterLevelFromXp(total) {
  let xp = Math.max(0, Math.floor(Number(total) || 0))
  let level = 1
  while (level < PDZ_CHARACTER_LEVEL_MAX && xp >= pdzCharacterTotalForLevel(level + 1)) level++
  return level
}

function pdzCharacterHpBonus(level) {
  // +2 max HP (one heart) at Lv5/10/15/20/25/30; +12 HP maximum.
  return Math.floor(Math.max(1, level) / 5) * 2
}

function pdzCharacterApplyHealth(player, force) {
  if (!player || player.level.clientSide) return 0
  let data = player.persistentData
  let level = Math.max(1, data.getInt("pdz_character_level"))
  let bonus = pdzCharacterHpBonus(level)
  if (!force && data.getInt("pdz_character_hp_bonus_applied") === bonus) return bonus
  player.runCommandSilent("attribute @s minecraft:generic.max_health modifier remove " + PDZ_CHARACTER_HP_MODIFIER)
  if (bonus > 0) {
    player.runCommandSilent("attribute @s minecraft:generic.max_health modifier add " +
      PDZ_CHARACTER_HP_MODIFIER + " pdz_character_level_hp " + bonus + " add")
  }
  data.putInt("pdz_character_hp_bonus_applied", bonus)
  try { if (player.health > player.maxHealth) player.health = player.maxHealth } catch (ignored) {}
  return bonus
}

function pdzCharacterSync(player, force) {
  if (!player || player.level.clientSide) return 1
  let data = player.persistentData
  let xp = Math.max(0, data.getInt("pdz_character_xp_total"))
  let level = pdzCharacterLevelFromXp(xp)
  data.putInt("pdz_character_level", level)
  pdzCharacterApplyHealth(player, force === true)
  return level
}

function pdzCharacterAwardXp(player, amount, source, announce) {
  if (!player || player.level.clientSide) return 0
  if (!player.persistentData.getBoolean("pdz_registration_complete")) return 0
  let gain = Math.max(0, Math.floor(Number(amount) || 0))
  if (gain <= 0) return 0
  let data = player.persistentData
  let oldLevel = pdzCharacterSync(player, false)
  let total = Math.max(0, data.getInt("pdz_character_xp_total")) + gain
  data.putInt("pdz_character_xp_total", total)
  data.putString("pdz_character_last_xp_source", String(source || "activity"))
  let expectedLevel = pdzCharacterLevelFromXp(total)
  let level = pdzCharacterSync(player, expectedLevel !== oldLevel)
  if (level > oldLevel) {
    player.tell(Text.of("[PDZ] Character Lv " + oldLevel + " → " + level).gold())
    player.tell(Text.of("最大HP補正: +" + pdzCharacterHpBonus(level) + " / 武器ダメージ補正なし").aqua())
    player.runCommandSilent("playsound minecraft:entity.player.levelup player @s ~ ~ ~ 0.7 1.05")
  } else if (announce === true) {
    player.tell(Text.of("Character XP +" + gain + " (" + String(source || "activity") + ")").gray())
  }
  return gain
}

function pdzCharacterStatus(player) {
  let level = pdzCharacterSync(player, false)
  let xp = Math.max(0, player.persistentData.getInt("pdz_character_xp_total"))
  let currentFloor = pdzCharacterTotalForLevel(level)
  let nextFloor = level >= PDZ_CHARACTER_LEVEL_MAX ? currentFloor : pdzCharacterTotalForLevel(level + 1)
  player.tell(Text.of("=== CHARACTER LEVEL ===").gold())
  player.tell(Text.of("Lv " + level + " / " + PDZ_CHARACTER_LEVEL_MAX +
    "  XP " + (xp - currentFloor) + (level >= PDZ_CHARACTER_LEVEL_MAX ? " (MAX)" : " / " + (nextFloor - currentFloor))).aqua())
  player.tell(Text.of("最大HP +" + pdzCharacterHpBonus(level) + " / 火力・敵・Loot補正なし").gray())
  return 1
}

global.pdzCharacterAwardXp = pdzCharacterAwardXp
global.pdzCharacterLevel = player => pdzCharacterSync(player, false)
global.pdzCharacterStatus = pdzCharacterStatus
// Transitional entry points used by neutral activity scripts. These names no
// longer represent a JOB or M&S progression system.
global.pdzUnifiedProgressionAward = (player, source, amount) =>
  pdzCharacterAwardXp(player, amount, source, false)
global.pdzCareerAddXp = (player, amount, source, announce) =>
  pdzCharacterAwardXp(player, amount, source, announce === true)

PlayerEvents.loggedIn(event => pdzCharacterSync(event.player, true))
PlayerEvents.respawned(event => pdzCharacterSync(event.player, true))
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 200 !== 0) return
  pdzCharacterSync(player, false)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonelevel")
  root.then(Commands.literal("status").executes(ctx => pdzCharacterStatus(ctx.source.player)))
  root.then(Commands.literal("add_xp_100").requires(source => source.hasPermission(2)).executes(ctx => {
    pdzCharacterAwardXp(ctx.source.player, 100, "admin_test", true)
    return 1
  }))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    player.persistentData.putInt("pdz_character_xp_total", 0)
    player.persistentData.putInt("pdz_character_level", 1)
    player.persistentData.putInt("pdz_character_hp_bonus_applied", -1)
    pdzCharacterSync(player, true)
    player.tell(Text.of("Character Level test state reset to Lv1.").yellow())
    return 1
  }))
  event.register(root)
})

console.info("[PROJECT DEADZONE] Character Level v0.1 loaded (M&S independent)")
