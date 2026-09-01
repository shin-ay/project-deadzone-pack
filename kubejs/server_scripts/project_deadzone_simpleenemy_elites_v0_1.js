// PROJECT DEADZONE Simple Enemies elite variants v0.1
// A small percentage of hostile human NPCs become visible mid-bosses. Their
// durability is capped; difficulty comes from armor, speed and mixed rewards.

const DZ_ELITE_TYPES = {
  "minecraft:zombie": "変異感染者",
  "simpleenemymod:ruunit": "RU Veteran",
  "simpleenemymod:pmcunit": "PMC Specialist"
}
const DZ_ELITE_CHANCE_BY_REGION = [0.00, 0.02, 0.04, 0.06, 0.08]
const DZ_ELITE_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const DZ_ELITE_MNS_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')

function dzEliteTier(server) {
  let tier = 0
  try { if (global.pdzThreatTier) tier = global.pdzThreatTier(server) }
  catch (ignored) {}
  return Math.max(0, Math.min(4, tier))
}

function dzPromoteElite(entity, title) {
  if (!entity || entity.level.clientSide || entity.tags.contains("dz_elite")) return
  if (entity.tags.contains("dz_buddy") || entity.tags.contains("dz_survivor") ||
      entity.tags.contains("dz_usunit_friendly")) return
  try { if (entity.getOwnerUUID() != null) return } catch (ignored) {}
  let regionTier = 0
  try { regionTier = dzRegionTierAt(entity.server, entity.x, entity.z) }
  catch (ignored) { regionTier = dzEliteTier(entity.server) }
  let pressureTier = Math.max(regionTier, dzEliteTier(entity.server))
  let chance = DZ_ELITE_CHANCE_BY_REGION[Math.max(0,
    Math.min(DZ_ELITE_CHANCE_BY_REGION.length - 1, pressureTier))]
  if (Math.random() >= chance) return
  let tier = pressureTier
  let health = Math.min(60, Math.max(30, Math.round(entity.maxHealth * 1.55 + tier * 5)))
  let armor = Math.min(14, 5 + tier * 2)
  entity.addTag("dz_elite")
  entity.addTag("dz_elite_tier_" + tier)
  entity.runCommandSilent("attribute @s minecraft:generic.max_health base set " + health)
  entity.runCommandSilent("attribute @s minecraft:generic.armor base set " + armor)
  entity.runCommandSilent("attribute @s minecraft:generic.knockback_resistance base set 0.55")
  entity.runCommandSilent("effect give @s minecraft:speed infinite 0 true")
  entity.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  let mnsHealth = health
  try {
    let mns = DZ_ELITE_MNS_ENTITY_DATA.get(entity)
    mns.setRarity(tier >= 4 ? 'legendary' : (tier >= 2 ? 'epic' : 'rare'))
    mns.recalcStats_DONT_CALL()
    mnsHealth = Math.round(DZ_ELITE_MNS_HEALTH.getMaxHealth(entity))
    entity.health = entity.maxHealth
  } catch (err) {
    console.warn('[PROJECT DEADZONE][Elite] M&S profile failed: ' + err)
  }
  entity.runCommandSilent("data merge entity @s {CustomName:'{\"text\":\"" + title + " [T" + tier + "]\",\"color\":\"gold\",\"bold\":true}',CustomNameVisible:1b,Health:" + health + ".0f}")
  console.info("[PROJECT DEADZONE][Elite] promoted " + String(entity.type) + " T" + tier + " M&S HP=" + mnsHealth)
}

Object.keys(DZ_ELITE_TYPES).forEach(type => {
  EntityEvents.spawned(type, event => dzPromoteElite(event.entity, DZ_ELITE_TYPES[type]))
})

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide || !entity.tags.contains("dz_elite")) return
  let tier = 0
  for (let i = 0; i <= 4; i++) if (entity.tags.contains("dz_elite_tier_" + i)) tier = i
  let money = 3 + tier * 2 + Math.floor(Math.random() * 3)
  entity.block.popItem(Item.of("lightmanscurrency:coin_copper", money))
  entity.block.popItem(Item.of(tier >= 2 ? "apocalypsenow:pain_killers" : "apocalypsenow:bandage", tier >= 2 ? 2 : 3))
  entity.block.popItem(Item.of(tier >= 3 ? "minecraft:gold_ingot" : "minecraft:iron_ingot", 2 + tier))
  if (tier >= 2) entity.block.popItem(Item.of("immersiveengineering:component_iron", 1))
  let killer = event.source ? event.source.actual : null
  if (killer && killer.isPlayer && killer.isPlayer()) {
    let all = Math.min(10, killer.persistentData.getInt("dz_bounty_rare_kills") + 1)
    killer.persistentData.putInt("dz_bounty_rare_kills", all)
    killer.tell(Text.of("危険個体狩り: " + all + "/10").yellow())
    if (all >= 10) killer.server.runCommandSilent("ftbquests change_progress " + killer.username +
      " complete 7FF938D798C2F6A7")

    let armed = entity.tags.contains("dz_elite") &&
      (String(entity.type) === "simpleenemymod:ruunit" || String(entity.type) === "simpleenemymod:pmcunit")
    if (armed) {
      killer.server.runCommandSilent("ftbquests change_progress " + killer.username +
        " complete 22B25F7F82A652C8")
      let armedCount = Math.min(5, killer.persistentData.getInt("dz_bounty_armed_elite_kills") + 1)
      killer.persistentData.putInt("dz_bounty_armed_elite_kills", armedCount)
      killer.tell(Text.of("武装勢力の精鋭: " + armedCount + "/5").gold())
      if (armedCount >= 5) killer.server.runCommandSilent("ftbquests change_progress " + killer.username +
        " complete 346A353468F42A27")
    }
  }
})
