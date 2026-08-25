// PROJECT DEADZONE - Mine & Slash universal equipment bridge v0.1
// M&S is the single source of truth for combat equipment rarity, affixes,
// requirements and salvage. Mine and Weapons supplies the extra gear types;
// this bridge turns ordinary TaCZ/modded stacks into real M&S gear instances.

const PDZMNS_LOOT_INFO = Java.loadClass('com.robertx22.mine_and_slash.loot.LootInfo')
const PDZMNS_GEAR_BLUEPRINT = Java.loadClass('com.robertx22.mine_and_slash.loot.blueprints.GearBlueprint')
const PDZMNS_EXILE_STACK = Java.loadClass('com.robertx22.mine_and_slash.itemstack.ExileStack')
const PDZMNS_STACK_KEYS = Java.loadClass('com.robertx22.mine_and_slash.itemstack.StackKeys')
const PDZMNS_LIST_TAG = Java.loadClass('net.minecraft.nbt.ListTag')
const PDZMNS_STRING_TAG = Java.loadClass('net.minecraft.nbt.StringTag')

const PDZMNS_AUTO_CONVERT = true
let pdzMnsBridgeErrors = 0

// Mine and Weapons 1.40 adds many more official M&S gear types than the old
// bridge listed. Specific/runic types must be checked before their generic
// families because an item can intentionally belong to both tags.
const PDZMNS_TAG_TYPES = [
  'rune_great_sword','rune_longsword','rune_dagger','rune_throwing_dagger',
  'rune_hammer','rune_axe','rune_mace','rune_scythe','rune_spear',
  'rune_rapier','rune_knuckle','rune_bow','rune_revolver',
  'rune_shield_large','rune_shield_middle','rune_shield_small',
  'heavy_machine_gun','sniper_rifle','repeater_rifle','assault_rifle',
  'sub_machine_gun','s_shotgun','shotgun','s_revolver','revolver','magnum',
  's_handgun','handgun','launcher','kinetic_gun',
  'great_sword','short_sword','longsword','katana','warhammer','hammer',
  'great_axe','axe','dagger','throwing_dagger','spear','javelin','pike',
  'halberd','mace','scythe','rapier','quarter_staff','knuckle','tomahawk',
  'boomerang','great_bow','heavy_crossbow','crossbow','bow','trident',
  'shield_large','shield_middle','shield_small','staff','tome','totem'
]

// M&W 1.40 ships a few item tags whose names have no matching M&S base gear
// type. Map them to the nearest real type instead of producing soulless gear.
const PDZMNS_TAG_ALIASES = [
  ['mmorpg:rune_sword','rune_longsword'],
  ['mmorpg:rune_pike','rune_spear'],
  ['mmorpg:light_crossbow','crossbow'],
  ['mmorpg:short_bow','bow']
]

function pdzMnsHasAnyTag(stack,tags){
  for(let i=0;i<tags.length;i++){
    try{if(stack.hasTag(tags[i]))return true}catch(ignored){}
  }
  return false
}

function pdzMnsRoot(stack,create){
  if(!stack||stack.isEmpty())return null
  try{
    let root=stack.nbt
    if(!root&&create){stack.nbt={};root=stack.nbt}
    return root
  }catch(ignored){}
  try{return create?stack.getOrCreateTag():stack.getTag()}catch(ignored){}
  return null
}

function pdzMnsIsGun(stack){
  if(!stack||stack.isEmpty())return false
  let id=String(stack.id)
  if(id==='tacz:modern_kinetic_gun')return true
  try{return stack.hasTag('mmorpg:kinetic_gun')}catch(ignored){}
  return false
}

function pdzMnsGunType(stack){
  let root=pdzMnsRoot(stack,false),gunId=''
  try{if(root&&root.contains('GunId'))gunId=String(root.getString('GunId')).toLowerCase()}catch(ignored){}
  if(/rpg|rocket|launcher|grenade|mgl|m79|at4|javelin/.test(gunId))return 'launcher'
  if(/minigun|m249|m240|mg42|pkm|rpk|machine_gun|hmg|lmg/.test(gunId))return 'heavy_machine_gun'
  if(/sniper|awm|awp|m700|kar98|mosin|svd|dragunov|barrett|m82|m200|intervention/.test(gunId))return 'sniper_rifle'
  if(/shotgun|spas|m870|m1014|aa12|saiga|ks23|db_|double_barrel/.test(gunId))return 'shotgun'
  if(/magnum|deagle|desert_eagle|revolver|python/.test(gunId))return 'magnum'
  if(/smg|mp5|mp7|uzi|vector|p90|ump|pp19|mac10|tec9/.test(gunId))return 'sub_machine_gun'
  if(/pistol|glock|m1911|1911|usp|p226|m9|tt33|makarov|cz75|five_seven/.test(gunId))return 'handgun'
  return gunId ? 'assault_rifle' : 'kinetic_gun'
}

function pdzMnsArmorType(stack){
  let id=String(stack.id).toLowerCase(),material='plate'
  if(/cloth|fabric|hazmat|coat|robe|medical|medic/.test(id))material='cloth'
  else if(/leather|scout|light|hunter|ranger/.test(id))material='leather'
  if(pdzMnsHasAnyTag(stack,['minecraft:head_armor','forge:armors/helmets','c:armors/helmet']))return material+'_helmet'
  if(pdzMnsHasAnyTag(stack,['minecraft:chest_armor','forge:armors/chestplates','c:armors/chestplate']))return material+'_chest'
  if(pdzMnsHasAnyTag(stack,['minecraft:leg_armor','forge:armors/leggings','c:armors/leggings']))return material+'_pants'
  if(pdzMnsHasAnyTag(stack,['minecraft:foot_armor','forge:armors/boots','c:armors/boots']))return material+'_boots'
  // Last-resort slot detection for armor mods that expose no common item tag.
  // This uses the actual equipment slot before falling back to an item id.
  try{
    let slot=String(stack.item.getEquipmentSlot()).toLowerCase()
    if(slot.indexOf('head')>=0)return material+'_helmet'
    if(slot.indexOf('chest')>=0)return material+'_chest'
    if(slot.indexOf('legs')>=0)return material+'_pants'
    if(slot.indexOf('feet')>=0)return material+'_boots'
  }catch(ignored){}
  if(/(_helmet|helmet$|_hat$)/.test(id))return material+'_helmet'
  if(/(_chestplate|chestplate$|_cuirass$)/.test(id))return material+'_chest'
  if(/(_leggings|leggings$|_pants$)/.test(id))return material+'_pants'
  if(/(_boots|boots$)/.test(id))return material+'_boots'
  return null
}

function pdzMnsGearType(stack){
  if(!stack||stack.isEmpty()||Number(stack.count)!==1)return null
  if(pdzMnsIsGun(stack))return pdzMnsGunType(stack)
  for(let i=0;i<PDZMNS_TAG_ALIASES.length;i++){
    let alias=PDZMNS_TAG_ALIASES[i]
    try{if(stack.hasTag(alias[0]))return alias[1]}catch(ignored){}
  }
  for(let i=0;i<PDZMNS_TAG_TYPES.length;i++){
    let type=PDZMNS_TAG_TYPES[i]
    try{if(stack.hasTag('mmorpg:'+type))return type}catch(ignored){}
  }
  let armor=pdzMnsArmorType(stack)
  if(armor)return armor
  if(pdzMnsHasAnyTag(stack,['minecraft:crossbows','forge:tools/crossbows','c:crossbow','c:crossbows','skilltree:ranged_weapon/crossbow']))return 'crossbow'
  if(pdzMnsHasAnyTag(stack,['minecraft:bows','forge:tools/bows','c:bow','c:bows','skilltree:ranged_weapon/bow']))return 'bow'
  if(pdzMnsHasAnyTag(stack,['minecraft:swords','forge:tools/swords','c:sword','c:swords']))return 'longsword'
  if(pdzMnsHasAnyTag(stack,['minecraft:axes','forge:tools/axes','c:axe','c:axes']))return 'axe'
  if(pdzMnsHasAnyTag(stack,['forge:tools/shields','c:shield','c:shields']))return 'shield_middle'
  let id=String(stack.id).toLowerCase()
  if(id==='minecraft:bow')return 'bow'
  if(id==='minecraft:crossbow')return 'crossbow'
  if(id==='minecraft:trident')return 'trident'
  if(id==='minecraft:shield')return 'shield_middle'
  if(/great[_-]?sword|claymore|zweihander/.test(id))return 'great_sword'
  if(/short[_-]?sword/.test(id))return 'short_sword'
  if(/knife|dagger/.test(id))return 'dagger'
  if(/machete|katana/.test(id))return 'katana'
  if(/halberd/.test(id))return 'halberd'
  if(/javelin/.test(id))return 'javelin'
  if(/pike/.test(id))return 'pike'
  if(/spear/.test(id))return 'spear'
  if(/warhammer/.test(id))return 'warhammer'
  if(/hammer|sledge/.test(id))return 'hammer'
  if(/scythe/.test(id))return 'scythe'
  if(/rapier/.test(id))return 'rapier'
  if(/knuckle|gauntlet/.test(id))return 'knuckle'
  if(/baton|club|crowbar|mace/.test(id))return 'mace'
  return null
}

function pdzMnsHasGear(stack){
  try{return PDZMNS_EXILE_STACK.of(stack).get(PDZMNS_STACK_KEYS.GEAR).has()}catch(ignored){}
  return false
}

function pdzMnsCleanLegacy(stack){
  let root=pdzMnsRoot(stack,false)
  if(!root)return false
  let oldAffix=false,legacy=false
  try{
    oldAffix=root.contains('PDZAffix')
    legacy=oldAffix||root.contains('PDZMastery')||root.contains('PDZMnsRequiredLevel')||root.contains('PDZMnsRequiredStat')||root.contains('PDZMnsRequiredStatAmount')
  }catch(ignored){}
  if(!legacy)return false
  try{
    let display=root.contains('display')?root.getCompound('display'):null
    if(display){
      if(display.contains('PDZOriginalName')){
        display.remove('Name')
        display.remove('PDZOriginalName')
      }
      // The removed Affix system owned its entire generated lore. Equipment
      // mastery only appended three marked lines, so preserve unrelated lore.
      if(oldAffix)display.remove('Lore')
      else if(display.contains('Lore')){
        let old=display.getList('Lore',8),kept=new PDZMNS_LIST_TAG()
        for(let i=0;i<old.size();i++){
          let line=String(old.getString(i))
          let mastery=line.indexOf('pdzMastery')>=0||line.indexOf('[装備熟練度')>=0||line.indexOf('次Lv:')>=0||line.indexOf('耐久維持率上昇')>=0
          if(!mastery)kept.add(PDZMNS_STRING_TAG.valueOf(line))
        }
        if(kept.isEmpty())display.remove('Lore');else display.put('Lore',kept)
      }
    }
    root.remove('PDZAffix')
    root.remove('PDZMastery')
    root.remove('PDZMnsRequiredLevel')
    root.remove('PDZMnsRequiredStat')
    root.remove('PDZMnsRequiredStatAmount')
    root.remove('PDZAffixGlint')
    root.remove('lootbeams.color')
    root.remove('itemborders_colors')
  }catch(ignored){}
  return true
}

function pdzMnsConvert(stack,player,forced){
  if(!stack||stack.isEmpty())return false
  let cleanedLegacy=pdzMnsCleanLegacy(stack)
  if(pdzMnsHasGear(stack)){
    return cleanedLegacy
  }
  let type=pdzMnsGearType(stack)
  if(!type)return cleanedLegacy
  try{
    let info=player?PDZMNS_LOOT_INFO.ofPlayer(player):PDZMNS_LOOT_INFO.ofLevel(1)
    let blueprint=new PDZMNS_GEAR_BLUEPRINT(info)
    try{blueprint.item=stack.item}catch(ignored){blueprint.item=stack.getItem()}
    blueprint.setType(type)
    let data=blueprint.createData()
    data.apply(PDZMNS_EXILE_STACK.of(stack))
    let root=pdzMnsRoot(stack,true)
    if(root){
      root.putBoolean('PDZMnsUnified',true)
      root.putString('PDZMnsGearType',type)
    }
    return true
  }catch(err){
    if(pdzMnsBridgeErrors<8){
      console.error('[PDZ M&S Bridge] '+String(stack.id)+' / '+type+' : '+err)
      pdzMnsBridgeErrors++
    }
    return cleanedLegacy
  }
}

function pdzMnsConvertInventory(player){
  if(!player||player.level.clientSide)return 0
  let inv=player.getInventory(),changed=false,count=0
  for(let slot=0;slot<inv.getContainerSize();slot++){
    if(pdzMnsConvert(inv.getItem(slot),player,false)){changed=true;count++}
  }
  if(changed)inv.setChanged()
  return count
}

// Held equipment is normalized every tick so there is no window where a
// newly acquired soulless weapon can bypass M&S requirements. The complete
// inventory is scanned once per second for armor, trade output and old saves.
PlayerEvents.tick(event=>{
  if(!PDZMNS_AUTO_CONVERT)return
  let p=event.player
  if(p.level.clientSide)return
  pdzMnsConvert(p.mainHandItem,p,false)
  pdzMnsConvert(p.offHandItem,p,false)
  if(p.age%20===7)pdzMnsConvertInventory(p)
})

PlayerEvents.loggedIn(event=>{
  // One-way cleanup of player data used by removed PDZ item-progression tools.
  try{
    event.player.persistentData.remove('dz_affix_calibration_points')
    event.player.persistentData.remove('dz_affix_repair_cache')
    event.player.persistentData.remove('dz_mastery_repair_cache')
  }catch(ignored){}
  event.server.scheduleInTicks(20,()=>pdzMnsConvertInventory(event.player))
})

ItemEvents.crafted(event=>{
  if(PDZMNS_AUTO_CONVERT&&event.player&&!event.player.level.clientSide)pdzMnsConvert(event.item,event.player,false)
})

ItemEvents.rightClicked(event=>{
  if(PDZMNS_AUTO_CONVERT&&event.player&&!event.player.level.clientSide)pdzMnsConvert(event.item,event.player,false)
})

EntityEvents.spawned('minecraft:item',event=>{
  if(!PDZMNS_AUTO_CONVERT||event.entity.level.clientSide)return
  event.server.scheduleInTicks(1,()=>{
    let entity=event.entity
    if(!entity||!entity.alive)return
    let stack=null,player=null
    try{stack=entity.item}catch(ignored){}
    try{player=entity.level.getNearestPlayer(entity,96)}catch(ignored){}
    if(stack&&pdzMnsConvert(stack,player,false)){
      try{entity.item=stack}catch(ignored){}
    }
  })
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  // Player-facing /deadzonemns belongs to the progression bridge. Keep
  // conversion diagnostics on a separate admin root so Brigadier permissions
  // cannot hide the normal M&S status screen.
  let root=Commands.literal('deadzonemnsadmin').requires(source=>source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem,type=pdzMnsGearType(s)
    p.tell(Text.of('[M&S装備変換] '+String(s.hoverName.string)).gold())
    p.tell(Text.of('GearType: '+(type||'対象外')+' / M&S Gear: '+(pdzMnsHasGear(s)?'YES':'NO')+' / 旧PDZ Affix: '+(pdzMnsRoot(s,false)&&pdzMnsRoot(s,false).contains('PDZAffix')?'YES':'NO')).aqua())
    return 1
  }))
  root.then(Commands.literal('convert_hand').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem
    if(pdzMnsConvert(s,p,true)){
      p.tell(Text.of('[M&S統合] メインハンドをM&S装備へ変換しました。').green())
      return 1
    }
    p.tell(Text.of('[M&S装備変換] 変換不要、対象外、または変換失敗です。/deadzonemnsadmin status で確認してください。').yellow())
    return 0
  }))
  root.then(Commands.literal('convert_inventory').executes(ctx=>{
    let p=ctx.source.player,count=pdzMnsConvertInventory(p)
    p.tell(Text.of('[M&S統合] '+count+'個をM&S装備へ変換しました。').green())
    return count
  }))
  event.register(root)
})
