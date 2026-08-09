// PROJECT DEADZONE fishing rare-drop progression v0.3
// JOB / Action XP is handled by the Career bridge. This file only adds catches.

function dzFishingTier(player) {
  for (let tier=3; tier>=1; tier--) {
    if (player.tags.contains("dz_survival_angling_"+tier)) return tier
  }
  return 0
}

ForgeEvents.onEvent("net.minecraftforge.event.entity.player.ItemFishedEvent", event => {
  let player=event.entity
  if (!player || player.level.clientSide) return

  let skillTier=dzFishingTier(player)
  let worldTier=Math.max(0,Math.min(4,player.server.persistentData.getInt("deadzone_world_tier")))
  let roll=Math.random()
  let rareChance=0.035+skillTier*0.012+worldTier*0.004
  let epicChance=skillTier>=1 ? 0.007+skillTier*0.004+worldTier*0.002 : 0
  let legendaryChance=skillTier>=3 && worldTier>=2 ? 0.0015+worldTier*0.0005 : 0

  if (roll<legendaryChance) {
    player.give(Item.of("aquaculture:neptunes_bounty"))
    player.tell(Text.of("[LEGENDARY] 海底からネプチューンの財宝を釣り上げた！").gold())
    player.runCommandSilent("playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 0.8 1.1")
  } else if (roll<legendaryChance+epicChance) {
    player.give(Item.of("aquaculture:treasure_chest"))
    player.tell(Text.of("[EPIC] 沈没船の宝箱を釣り上げた！").lightPurple())
    player.runCommandSilent("playsound minecraft:entity.player.levelup player @s ~ ~ ~ 0.65 1.2")
  } else if (roll<legendaryChance+epicChance+rareChance) {
    player.give(Item.of("aquaculture:lockbox"))
    player.tell(Text.of("[RARE] 鍵付きの漂流物資を発見した。").aqua())
  } else if (skillTier>=2 && Math.random()<0.12) {
    player.give(Item.of("aquaculture:worm"))
    player.tell(Text.of("水辺で追加の釣り餌を見つけた。").green())
  }
})
