// PROJECT DEADZONE Affixes v0.2
// One immutable Division-style roll for guns, melee weapons, tools and armor.
// TaCZ gun internals, attachments and magazine NBT are never rewritten.

const DZ2_IGUN = Java.loadClass("com.tacz.guns.api.item.IGun")
const DZ2_LIST = Java.loadClass("net.minecraft.nbt.ListTag")
const DZ2_STRING = Java.loadClass("net.minecraft.nbt.StringTag")
const DZ2_COMPOUND = Java.loadClass("net.minecraft.nbt.CompoundTag")
const DZ2_UUID = Java.loadClass("java.util.UUID")

// Mine and Slash is the only source of truth for newly generated equipment.
// Existing PDZAffix NBT is still read temporarily so old test-world equipment
// does not lose its effects before it is replaced or salvaged, but this script
// must never create another legacy roll.  Mine and Weapons supplies M&S gear
// slots for TaCZ and the other supported weapon mods.
const DZ2_AUTO_ROLL_ENABLED = false
const DZ2_LEGACY_REROLL_ENABLED = false

function dz2MnsRequiredLevel(player) {
  let tier=0
  try { tier=Math.max(player.server.persistentData.getInt("deadzone_world_tier"),player.persistentData.getInt("dz_region_tier")) } catch (ignored) {}
  return [1,5,10,20,30][Math.max(0,Math.min(4,tier))]
}

const DZ2_QUALITY = {
  common:    {jp:"コモン", color:"gray", traits:1, scale:0.55},
  uncommon:  {jp:"アンコモン", color:"green", traits:2, scale:0.75},
  rare:      {jp:"レア", color:"aqua", traits:2, scale:1.00},
  epic:      {jp:"エピック", color:"light_purple", traits:3, scale:1.20},
  legendary: {jp:"レジェンダリー", color:"gold", traits:3, scale:1.35}
}

const DZ2_RARITY_HEX = {
  common:"0xAAAAAA", uncommon:"0x55FF55", rare:"0x55FFFF",
  epic:"0xFF55FF", legendary:"0xFFAA00"
}

const DZ2_TRAITS = {
  gun: [
    ["damage", "武器ダメージ", 0.025, 0.12],
    ["headshot", "ヘッドショット", 0.04, 0.20],
    ["infected", "感染体ダメージ", 0.05, 0.22],
    ["armored", "装甲目標ダメージ", 0.04, 0.18],
    ["ammo_save", "弾薬回収率", 0.04, 0.18]
  ],
  melee: [
    ["knockback", "Impact Force", 0.08, 0.35],
    ["damage", "近接ダメージ", 0.03, 0.16],
    ["attack_speed", "攻撃速度", 0.03, 0.12],
    ["infected", "感染体ダメージ", 0.05, 0.22],
    ["armor_break", "装甲破砕", 0.04, 0.16],
    ["lifesteal", "処刑時回復", 0.02, 0.08]
  ],
  mining: [
    ["mining_speed", "採掘速度", 0.05, 0.25],
    ["durability_save", "耐久消費軽減", 0.05, 0.22],
    ["salvage", "素材回収率", 0.03, 0.14],
    ["utility", "作業効率", 0.04, 0.18]
  ],
  armor: [
    ["body_guard", "部位ダメージ耐性", 0.03, 0.14],
    ["bleed_guard", "出血耐性", 0.04, 0.18],
    ["weight_relief", "重量負担軽減", 0.03, 0.15],
    ["emergency", "緊急防護", 0.04, 0.16]
  ],
  armor_head: [
    ["respiration", "水中活動", 1.0, 1.0],
    ["aqua_worker", "水中作業補助", 1.0, 1.0]
  ],
  armor_chest: [
    ["last_defense", "緊急防護システム", 1.0, 1.0]
  ],
  armor_legs: [
    ["low_profile", "低姿勢機動", 1.0, 1.0]
  ],
  armor_feet: [
    ["shock_absorber", "衝撃吸収", 1.0, 1.0]
  ],
  maintenance: [
    ["self_repair", "自己修復機構", 1.0, 1.0]
  ],
  utility: [
    ["durability_save", "耐久消費軽減", 0.05, 0.22],
    ["utility", "取り回し", 0.04, 0.18],
    ["salvage", "副産物発見率", 0.03, 0.14]
  ]
}

const DZ2_TALENTS = {
  gun: [
    ["focused_fire", "集中砲火", "同じ敵への連続命中で威力上昇"],
    ["executioner", "処刑人", "ヘッドショット撃破後に短時間強化"],
    ["preservation", "生存本能", "撃破時に少量回復"],
    ["scavenger", "弾薬漁り", "撃破時に弾薬回収率上昇"]
  ],
  melee: [
    ["relentless", "不屈", "近接撃破時に少量回復"],
    ["breacher", "突破口", "装甲目標への威力上昇"],
    ["crowd_control", "群衆制圧", "感染体への威力上昇"]
  ],
  mining: [
    ["field_repair", "現地修理", "作業中に低確率で耐久を維持"],
    ["prospector", "選鉱眼", "採掘時に低確率で素材を追加回収"]
  ],
  armor: [
    ["last_stand", "最後の抵抗", "瀕死時に短い緊急防護"],
    ["trauma_plate", "対外傷プレート", "大ダメージ時の追撃を軽減"]
  ]
}

function dz2IsGun(stack) {
  try { return stack && !stack.isEmpty() && DZ2_IGUN.getIGunOrNull(stack) != null }
  catch (ignored) { return false }
}

function dz2Category(stack) {
  if (!stack || stack.isEmpty()) return null
  if (dz2IsGun(stack)) return "gun"
  let id = String(stack.id)
  if (stack.hasTag("minecraft:head_armor") || stack.hasTag("minecraft:chest_armor") ||
      stack.hasTag("minecraft:leg_armor") || stack.hasTag("minecraft:foot_armor")) return "armor"
  if (!stack.isDamageableItem()) return null
  if (stack.hasTag("minecraft:pickaxes") || stack.hasTag("minecraft:shovels") ||
      stack.hasTag("minecraft:hoes")) return "mining"
  if (stack.hasTag("minecraft:bows") || stack.hasTag("minecraft:crossbows") ||
      id === "minecraft:trident") return "gun"
  if (id === "minecraft:shield" || id === "minecraft:fishing_rod" ||
      id === "minecraft:shears" || id.indexOf("wrench") >= 0 ||
      id.indexOf("drill") >= 0 || id.indexOf("saw") >= 0) return "utility"
  if (stack.hasTag("minecraft:axes") || stack.hasTag("minecraft:swords") ||
      id.indexOf("knife") >= 0 || id.indexOf("machete") >= 0 ||
      id.indexOf("bat") >= 0 || id.indexOf("hammer") >= 0 ||
      id.indexOf("spear") >= 0 || id.indexOf("katana") >= 0) return "melee"
  // Apocalypse Now implements most melee weapons as custom MCreator items
  // without the vanilla sword/axe tags. Match its weapon names explicitly,
  // while excluding consumables such as pipe bombs and gunpowder cans.
  if (id.indexOf("apocalypsenow:") === 0 &&
      id.indexOf("bomb") < 0 && id.indexOf("gunpowder") < 0 &&
      (id.indexOf("club") >= 0 || id.indexOf("cleaver") >= 0 ||
       id.indexOf("crowbar") >= 0 || id.indexOf("pipe") >= 0 ||
       id.indexOf("baton") >= 0 || id.indexOf("sword") >= 0 ||
       id.indexOf("scythe") >= 0 || id.indexOf("sytche") >= 0 ||
       id.indexOf("wrench") >= 0 || id.indexOf("baseball_bat") >= 0 ||
       id.indexOf("cricket_bat") >= 0)) return "melee"
  // Affixes replace enchanting entirely: no durable equipment may fall
  // through the category audit just because a mod omitted vanilla tags.
  return "utility"
}

function dz2Quality(player, crafted) {
  let worldTier = player.server.persistentData.getInt("deadzone_world_tier")
  let regionTier = player.persistentData.getInt("dz_region_tier")
  let tier = Math.max(0, Math.min(4, Math.max(worldTier, regionTier)))
  let weights = crafted
    ? [[68,29,3,0,0],[58,34,7,1,0],[48,38,12,2,0],[38,40,18,4,0],[30,40,23,6,1]][tier]
    : [[48,39,12,1,0],[34,42,21,3,0],[22,38,32,8,0],[12,30,40,17,1],[6,23,42,25,4]][tier]
  let roll = Math.random() * 100, sum = 0
  let names = ["common","uncommon","rare","epic","legendary"]
  for (let i = 0; i < weights.length; i++) { sum += weights[i]; if (roll < sum) return names[i] }
  return "common"
}

function dz2Json(text, color) { return JSON.stringify({text:String(text),color:color,italic:false}) }

// KubeJS can expose a vanilla ItemStack or an ItemStackJS wrapper depending on
// the mod item. Vanilla tools have getTag(); several Survival Instinct weapons
// (including hunt_knife) only expose the nbt property.
function dz2Root(stack, create) {
  if (!stack || stack.isEmpty()) return null
  try {
    if (typeof stack.getTag === "function") {
      let root=stack.getTag()
      if (root || !create) return root
    }
  } catch (ignored) {}
  try {
    let root=stack.nbt
    if (root) return root
    if (create) {
      stack.nbt={}
      root=stack.nbt
      if (root) return root
    }
  } catch (ignored) {}
  try {
    if (create && typeof stack.getOrCreateTag === "function") return stack.getOrCreateTag()
  } catch (ignored) {}
  return null
}

function dz2Display(stack) {
  let root = dz2Root(stack,true)
  if (!root) return null
  if (!root.contains("display")) root.put("display", new DZ2_COMPOUND())
  return root.getCompound("display")
}

function dz2OriginalName(stack) {
  let display = dz2Display(stack)
  if (!display) return String(stack.hoverName.string)
  if (display.contains("PDZOriginalName")) return display.getString("PDZOriginalName")
  let name = String(stack.hoverName.string)
  display.putString("PDZOriginalName", name)
  return name
}

function dz2WriteDisplay(stack, data) {
  let quality = data.getString("quality")
  let q = DZ2_QUALITY[quality] || DZ2_QUALITY.common
  let category = data.getString("category")
  let lore = new DZ2_LIST()
  lore.add(DZ2_STRING.valueOf(dz2Json("[ " + q.jp + " ]", q.color)))
  let displayTraits=(DZ2_TRAITS[category] || []).slice()
  if (category === "armor") {
    displayTraits=displayTraits.concat(DZ2_TRAITS.armor_head || [], DZ2_TRAITS.armor_chest || [], DZ2_TRAITS.armor_legs || [], DZ2_TRAITS.armor_feet || [])
  }
  displayTraits=displayTraits.concat(DZ2_TRAITS.maintenance || [])
  ;displayTraits.forEach(t => {
    if (!data.contains(t[0])) return
    lore.add(DZ2_STRING.valueOf(dz2Json("+" + (Math.round(data.getDouble(t[0]) * 1000) / 10) + "% " + t[1], "blue")))
  })
  let talentId = data.getString("talent")
  ;(DZ2_TALENTS[category] || []).forEach(t => {
    if (t[0] !== talentId) return
    lore.add(DZ2_STRING.valueOf(dz2Json("◆ " + t[1], "gold")))
    lore.add(DZ2_STRING.valueOf(dz2Json(t[2], "yellow")))
  })
  lore.add(DZ2_STRING.valueOf(dz2Json("ROLL " + data.getString("roll_id").substring(0,8), "dark_gray")))
  let display = dz2Display(stack)
  if (!display) return
  display.put("Lore", lore)
  // TaCZ resolves the actual gun name dynamically from GunId. Keep rarity in
  // lore/glint, but leave TaCZ in charge of the visible weapon name.
  if (dz2IsGun(stack)) {
    display.remove("Name")
    display.remove("PDZOriginalName")
  } else {
    display.putString("Name", dz2Json(dz2OriginalName(stack), q.color))
  }
  let root=dz2Root(stack,true)
  if (root) {
    let hex=DZ2_RARITY_HEX[quality] || DZ2_RARITY_HEX.common
    // Loot Beams supports per-stack NBT color overrides. Item Borders can
    // mirror the same rarity color in inventories and hotbars.
    root.putString("lootbeams.color",hex)
    let borders=new DZ2_COMPOUND()
    borders.putString("top",hex.replace("0x","#"))
    borders.putString("bottom",hex.replace("0x","#"))
    root.put("itemborders_colors",borders)
    if (quality === "epic" || quality === "legendary") root.putBoolean("PDZAffixGlint", true)
  }
}

function dz2Roll(stack, player, forcedQuality, crafted) {
  let category = dz2Category(stack)
  if (!category) return false
  let quality = forcedQuality || dz2Quality(player, crafted === true)
  let q = DZ2_QUALITY[quality] || DZ2_QUALITY.common
  let data = new DZ2_COMPOUND()
  data.putInt("version", 2)
  data.putString("quality", quality)
  data.putString("category", category)
  data.putString("roll_id", String(DZ2_UUID.randomUUID()))
  data.putBoolean("crafted", crafted === true)
  let pool = (DZ2_TRAITS[category] || []).slice()
  // Utility enchantment replacements are attached only to the equipment slot
  // where their vanilla counterpart would make sense.
  if (category === "armor" && stack.hasTag("minecraft:head_armor")) {
    pool = pool.concat(DZ2_TRAITS.armor_head || [])
  }
  if (category === "armor" && stack.hasTag("minecraft:chest_armor")) {
    pool = pool.concat(DZ2_TRAITS.armor_chest || [])
  }
  if (category === "armor" && stack.hasTag("minecraft:leg_armor")) {
    pool = pool.concat(DZ2_TRAITS.armor_legs || [])
  }
  if (category === "armor" && stack.hasTag("minecraft:foot_armor")) {
    pool = pool.concat(DZ2_TRAITS.armor_feet || [])
  }
  // True Mending replacement is intentionally restricted to high-rarity
  // equipment so ordinary drops still create repair-material demand.
  if ((quality === "epic" || quality === "legendary") && !dz2IsGun(stack)) {
    pool = pool.concat(DZ2_TRAITS.maintenance || [])
  }
  for (let i = pool.length - 1; i > 0; i--) { let j=Math.floor(Math.random()*(i+1)); let x=pool[i]; pool[i]=pool[j]; pool[j]=x }
  for (let i=0; i<Math.min(q.traits,pool.length); i++) {
    let t=pool[i], value=(t[2]+Math.random()*(t[3]-t[2]))*q.scale
    data.putDouble(t[0], Math.round(value*10000)/10000)
  }
  if (quality === "rare" || quality === "epic" || quality === "legendary") {
    let talents = DZ2_TALENTS[category] || []
    if (talents.length) data.putString("talent", talents[Math.floor(Math.random()*talents.length)][0])
  }
  let root=dz2Root(stack,true)
  if (!root) return false
  if (!root.contains("PDZMnsRequiredLevel")) root.putInt("PDZMnsRequiredLevel",dz2MnsRequiredLevel(player))
  root.put("PDZAffix", data)
  dz2WriteDisplay(stack, data)
  return true
}

function dz2Data(stack) {
  if (!stack || stack.isEmpty()) return null
  let root=dz2Root(stack,false)
  return root && root.contains("PDZAffix") ? root.getCompound("PDZAffix") : null
}

function dz2Announce(player, stack, data) {
  let quality=data.getString("quality"), q=DZ2_QUALITY[quality]
  if (quality !== "epic" && quality !== "legendary") return
  player.server.runCommandSilent('tellraw '+player.username+' [{"text":"[AFFIX] ","color":"gold","bold":true},{"text":"'+String(stack.hoverName.string).replace(/"/g,"\\\"")+'","color":"'+q.color+'"}]')
  player.runCommandSilent("playsound minecraft:entity.player.levelup player @s ~ ~ ~ 0.55 " + (quality === "legendary" ? "1.35" : "1.1"))
  player.runCommandSilent("particle minecraft:" + (quality === "legendary" ? "totem_of_undying" : "enchant") + " ~ ~1 ~ 0.35 0.55 0.35 0.05 18 force @s")
}

const DZ2_QUALITY_ORDER=["common","uncommon","rare","epic","legendary"]
function dz2MasteryLevel(stack) {
  let root=dz2Root(stack,false)
  return root && root.contains("PDZMastery") ? Math.max(0,root.getCompound("PDZMastery").getInt("level")) : 0
}
function dz2GuaranteedQuality(player,stack) {
  let level=dz2MasteryLevel(stack)
  let floor=level>=20?3:level>=10?2:level>=5?1:0
  let rolled=DZ2_QUALITY_ORDER.indexOf(dz2Quality(player,false))
  return DZ2_QUALITY_ORDER[Math.max(floor,rolled)]
}

ItemEvents.rightClicked("kubejs:affix_calibrator",event=>{
  let player=event.player
  if(!player||player.level.clientSide)return
  if(!DZ2_LEGACY_REROLL_ENABLED){
    player.tell(Text.of("この旧Affix校正器は廃止されました。装備強化・解体はMine & Slash設備を使用してください。").yellow())
    event.cancel();return
  }
  let target=player.offHandItem
  if(!dz2Category(target)){
    player.tell(Text.of("オフ手に銃・近接武器・工具・防具を持ってください。").red())
    event.cancel();return
  }
  let existing=dz2Data(target),cost=existing?2:1
  let points=player.persistentData.getInt("dz_affix_calibration_points")
  if(points<cost){
    player.tell(Text.of("AFFIX校正ポイント不足: "+points+" / "+cost+"（装備熟練Lv上昇で獲得）").red())
    event.cancel();return
  }
  let quality=dz2GuaranteedQuality(player,target)
  let root=dz2Root(target,true)
  if(root)root.remove("PDZAffix")
  dz2Roll(target,player,quality,false)
  player.persistentData.putInt("dz_affix_calibration_points",points-cost)
  player.tell(Text.of("[AFFIX校正] "+String(target.hoverName.string)+" → "+quality+" / 熟練Lv"+dz2MasteryLevel(target)+" / 残り "+(points-cost)+"pt").gold())
  dz2Announce(player,target,dz2Data(target))
  event.cancel()
})

// Roll world drops before they are picked up so Loot Beams can read the
// per-stack `lootbeams.color` NBT while the item is still on the ground.
// Inventory processing below remains as a fallback for crafted/given items.
EntityEvents.spawned("minecraft:item", event => {
  if (!DZ2_AUTO_ROLL_ENABLED) return
  let entity=event.entity
  if (!entity || entity.level.clientSide) return
  event.server.scheduleInTicks(1, () => {
    if (!entity || !entity.alive) return
    let stack=null
    try { stack=entity.item } catch (ignored) {}
    if (!stack || stack.isEmpty() || dz2Data(stack) || !dz2Category(stack)) return
    let player=null
    try { player=entity.level.getNearestPlayer(entity,96) } catch (ignored) {}
    if (!player) {
      // KubeJS exposes this as a Java List on some builds and a JS array on
      // others. Handle both so dedicated servers do not spam a TypeError.
      let players=event.server.players
      try {
        if (players && players.size && players.size()>0) player=players.get(0)
        else if (players && players.length>0) player=players[0]
      } catch (ignored) {}
    }
    if (!player || !dz2Roll(stack,player,null,false)) return
    try { entity.item=stack } catch (ignored) {
      try { entity.setItem(stack) } catch (ignored2) {}
    }
  })
})

PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 40 !== 9) return
  let inv=player.getInventory(), changed=false
  for (let slot=0; slot<inv.getContainerSize(); slot++) {
    let stack=inv.getItem(slot), category=dz2Category(stack)
    if (!category) continue
    let data=dz2Data(stack)
    if (data && data.getInt("version") >= 2) {
      let oldDisplay = dz2Display(stack)
      let existingRoot=dz2Root(stack,false)
      if ((dz2IsGun(stack) && oldDisplay && oldDisplay.contains("PDZOriginalName")) ||
          (existingRoot && !existingRoot.contains("lootbeams.color"))) {
        dz2WriteDisplay(stack, data)
        changed = true
      }
      continue
    }
    if (DZ2_AUTO_ROLL_ENABLED && dz2Roll(stack,player,null,false)) { changed=true; dz2Announce(player,stack,dz2Data(stack)) }
  }
  if (changed) inv.setChanged()
})

// Tool Affix execution. Haste level is intentionally capped; the percentage
// roll still matters through the threshold while avoiding instant mining.
PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 10 !== 1) return
  let data=dz2Data(player.mainHandItem)
  if (!data || data.getString("category")!=="mining" || !data.contains("mining_speed")) return
  let value=data.getDouble("mining_speed")
  player.potionEffects.add("minecraft:haste",20,value>=0.16 ? 1 : 0,true,false)
})

// High-rarity Mending replacement: one durability is restored every ten
// seconds while the item is carried. It consumes no vanilla XP.
PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 200 !== 41) return
  let inv=player.getInventory(), changed=false
  for (let slot=0; slot<inv.getContainerSize(); slot++) {
    let stack=inv.getItem(slot), data=dz2Data(stack)
    if (!data || !data.contains("self_repair") || Number(stack.damageValue)<=0) continue
    stack.damageValue=Math.max(0,Number(stack.damageValue)-1)
    let root=dz2Root(stack,true)
    if (root) root.putInt("PDZLastDamage",Number(stack.damageValue))
    changed=true
  }
  if (changed) inv.setChanged()
})

// Mending/Unbreaking replacement. Durability-save Affixes probabilistically
// refund newly consumed durability without using vanilla XP. Existing vanilla
// enchantments are intentionally left untouched during the transition period.
PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 5 !== 3) return
  let inv=player.getInventory(), changed=false
  for (let slot=0; slot<inv.getContainerSize(); slot++) {
    let stack=inv.getItem(slot)
    if (!stack || stack.isEmpty() || !stack.isDamageableItem()) continue
    let data=dz2Data(stack)
    if (!data || !data.contains("durability_save")) continue
    let root=dz2Root(stack,true)
    if (!root) continue
    let current=Number(stack.damageValue)
    let previous=root.contains("PDZLastDamage") ? root.getInt("PDZLastDamage") : current
    if (current>previous) {
      let chance=Math.max(0,Math.min(0.75,data.getDouble("durability_save")))
      let refund=0
      for (let point=previous; point<current; point++) if (Math.random()<chance) refund++
      if (refund>0) {
        stack.damageValue=Math.max(0,current-refund)
        current=Number(stack.damageValue)
        changed=true
      }
    }
    root.putInt("PDZLastDamage",current)
  }
  if (changed) inv.setChanged()
})

// Enchantment replacement: a helmet rolled with Water Operations keeps
// Water Breathing active. The short duration is refreshed server-side and
// disappears naturally as soon as the helmet is removed.
PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 10 !== 7) return
  let helmet=player.getInventory().getArmor(3)
  let chest=player.getInventory().getArmor(2)
  let legs=player.getInventory().getArmor(1)
  let feet=player.getInventory().getArmor(0)
  let headData=dz2Data(helmet)
  let chestData=dz2Data(chest)
  let legData=dz2Data(legs)
  let feetData=dz2Data(feet)

  if (headData && headData.contains("respiration")) {
    player.potionEffects.add("minecraft:water_breathing", 30, 0, true, false)
  }
  if (headData && headData.contains("aqua_worker") && player.isInWater()) {
    player.potionEffects.add("minecraft:haste", 20, 0, true, false)
  }
  // Strong but conditional: it saves a downed build without becoming a
  // permanent Resistance buff at full health.
  if (chestData && chestData.contains("last_defense") && player.health <= player.maxHealth * 0.35) {
    player.potionEffects.add("minecraft:resistance", 20, 0, true, false)
  }
  if (legData && legData.contains("low_profile") && player.isCrouching()) {
    player.potionEffects.add("minecraft:speed", 20, 0, true, false)
  }
  // Slow Falling is applied only during an actual dangerous fall, avoiding
  // the floaty feel during normal jumps.
  if (feetData && feetData.contains("shock_absorber") && player.fallDistance > 3.0) {
    player.potionEffects.add("minecraft:slow_falling", 20, 0, true, false)
  }
})

ItemEvents.crafted(event => {
  let stack=event.item, player=event.player
  if (!player || player.level.clientSide || !dz2Category(stack)) return
  let root=dz2Root(stack,true)
  // Damaged crafting output is the vanilla same-item repair path. Restore the
  // old roll cached by urgent_qol instead of treating repair as a fresh drop.
  if (Number(stack.damageValue)>0) {
    let key=String(stack.id).replace(/[^a-zA-Z0-9_]/g,'_')
    let cache=player.persistentData.getCompound('dz_affix_repair_cache')
    if (root && cache.contains(key)) {
      root.put('PDZAffix',cache.getCompound(key).copy())
      dz2WriteDisplay(stack,root.getCompound('PDZAffix'))
      return
    }
  }
  if (!DZ2_AUTO_ROLL_ENABLED) return
  if (root) root.remove("PDZAffix")
  dz2Roll(stack,player,null,true)
  dz2Announce(player,stack,dz2Data(stack))
})

EntityEvents.hurt(event => {
  let attacker=event.source.actual
  if (!attacker || !attacker.isPlayer || !attacker.isPlayer() || attacker.level.clientSide) return
  let stack=attacker.mainHandItem, data=dz2Data(stack)
  if (!data) return
  let target=event.entity, mult=1.0+data.getDouble("damage")
  let id=String(target.type)
  if (id.indexOf("zombie")>=0 || id.indexOf("infect")>=0 || id.indexOf("walker")>=0) mult+=data.getDouble("infected")
  try { if (target.getArmorValue()>0) mult+=data.getDouble("armor_break") } catch (ignored) {}
  if (dz2IsGun(stack)) {
    // Firearm Affix damage is folded into TaCZ's pre-damage event by the
    // firearms runtime. Returning here prevents a second direct HP subtraction.
    return
  } else if (data.getString("category") === "melee") {
    if (data.getString("talent") === "breacher") { try { if (target.getArmorValue()>0) mult+=0.12 } catch (ignored) {} }
    if (data.getString("talent") === "crowd_control" && id.indexOf("zombie")>=0) mult+=0.15
  } else return
  // KubeJS 6 exposes damage read-only (getDamage) on this event wrapper.
  // Apply only the affix bonus directly and leave the original hit/death path intact.
  let baseDamage=Number(event.damage)
  let bonusDamage=Math.max(0,baseDamage*(mult-1.0))
  if (bonusDamage>0) target.health=Math.max(1,target.health-bonusDamage)
})

EntityEvents.death(event => {
  let killer=event.source ? event.source.actual : null
  if (!killer || !killer.isPlayer || !killer.isPlayer()) return
  let data=dz2Data(killer.mainHandItem)
  if (!data || data.getString("category") !== "melee") return
  let heal=data.getDouble("lifesteal")
  if (data.getString("talent") === "relentless") heal+=0.08
  if (heal>0) killer.heal(Math.max(0.5, killer.maxHealth*heal))
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzoneaffix").requires(source=>source.hasPermission(2))
  root.then(Commands.literal("points").executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of("AFFIX校正ポイント: "+p.persistentData.getInt("dz_affix_calibration_points")+"pt").aqua())
    return 1
  }))
  root.then(Commands.literal("test_points_20").executes(ctx=>{
    let p=ctx.source.player
    p.persistentData.putInt("dz_affix_calibration_points",p.persistentData.getInt("dz_affix_calibration_points")+20)
    p.tell(Text.of("テスト用AFFIX校正ポイント +20").green())
    return 1
  }))
  ;["common","uncommon","rare","epic","legendary"].forEach(quality => {
    root.then(Commands.literal("roll_"+quality).executes(ctx => {
      let p=ctx.source.player, stack=p.mainHandItem
      if (!DZ2_LEGACY_REROLL_ENABLED) { p.tell(Text.of("旧PDZ Affixの新規付与は停止済みです。M&S統合コマンドを使用してください。").yellow()); return 0 }
      if (!dz2Category(stack)) { p.tell(Text.of("Affix対応装備をメインハンドに持ってね。").red()); return 0 }
      let oldRoot=dz2Root(stack,true)
      if (oldRoot) oldRoot.remove("PDZAffix")
      dz2Roll(stack,p,quality,false); dz2Announce(p,stack,dz2Data(stack))
      p.tell(Text.of("Affixを"+DZ2_QUALITY[quality].jp+"で再抽選しました。").green())
      return 1
    }))
  })
  root.then(Commands.literal("test_respiration").executes(ctx => {
    let p=ctx.source.player, stack=p.mainHandItem
    if (!DZ2_LEGACY_REROLL_ENABLED) { p.tell(Text.of("旧PDZ Affixテストは停止済みです。").yellow()); return 0 }
    if (!stack || stack.isEmpty() || !stack.hasTag("minecraft:head_armor")) {
      p.tell(Text.of("頭装備をメインハンドに持って実行してください。").red())
      return 0
    }
    let oldRoot=dz2Root(stack,true)
    if (oldRoot) oldRoot.remove("PDZAffix")
    dz2Roll(stack,p,"rare",false)
    let data=dz2Data(stack)
    data.putDouble("respiration",1.0)
    dz2WriteDisplay(stack,data)
    p.tell(Text.of("水中活動Affixを付与しました。装備中は水中呼吸が維持されます。").aqua())
    return 1
  }))
  root.then(Commands.literal("test_armor_utility").executes(ctx => {
    let p=ctx.source.player, stack=p.mainHandItem, trait=null, label=null
    if (!DZ2_LEGACY_REROLL_ENABLED) { p.tell(Text.of("旧PDZ Affixテストは停止済みです。").yellow()); return 0 }
    if (!stack || stack.isEmpty()) return 0
    if (stack.hasTag("minecraft:head_armor")) { trait="respiration"; label="水中活動" }
    else if (stack.hasTag("minecraft:chest_armor")) { trait="last_defense"; label="緊急防護システム" }
    else if (stack.hasTag("minecraft:leg_armor")) { trait="low_profile"; label="低姿勢機動" }
    else if (stack.hasTag("minecraft:foot_armor")) { trait="shock_absorber"; label="衝撃吸収" }
    if (!trait) {
      p.tell(Text.of("防具をメインハンドに持って実行してください。").red())
      return 0
    }
    let oldRoot=dz2Root(stack,true)
    if (oldRoot) oldRoot.remove("PDZAffix")
    dz2Roll(stack,p,"rare",false)
    let data=dz2Data(stack)
    data.putDouble(trait,1.0)
    dz2WriteDisplay(stack,data)
    p.tell(Text.of(label+" Affixを付与しました。").aqua())
    return 1
  }))
  root.then(Commands.literal("test_self_repair").executes(ctx => {
    let p=ctx.source.player, stack=p.mainHandItem
    if (!DZ2_LEGACY_REROLL_ENABLED) { p.tell(Text.of("旧PDZ Affixテストは停止済みです。").yellow()); return 0 }
    if (!stack || stack.isEmpty() || !stack.isDamageableItem() || !dz2Category(stack)) {
      p.tell(Text.of("耐久値を持つAffix対応装備をメインハンドに持ってください。").red())
      return 0
    }
    let oldRoot=dz2Root(stack,true)
    if (oldRoot) oldRoot.remove("PDZAffix")
    dz2Roll(stack,p,"legendary",false)
    let data=dz2Data(stack)
    data.putDouble("self_repair",1.0)
    dz2WriteDisplay(stack,data)
    p.tell(Text.of("自己修復機構Affixを付与しました。10秒ごとに耐久値を1回復します。").gold())
    return 1
  }))
  root.then(Commands.literal("inspect").executes(ctx => {
    let data=dz2Data(ctx.source.player.mainHandItem)
    if (!data) { ctx.source.player.tell(Text.of("この装備にはAffixがありません。").red()); return 0 }
    ctx.source.player.tell(Text.of("Quality="+data.getString("quality")+" Category="+data.getString("category")+" Talent="+data.getString("talent")).aqua())
    return 1
  }))
  event.register(root)
})
