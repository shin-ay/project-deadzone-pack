// PROJECT DEADZONE - Mine & Slash universal equipment bridge v0.1
// M&S is the single source of truth for combat equipment rarity, affixes,
// requirements and salvage. Mine and Weapons supplies the extra gear types;
// this bridge turns ordinary TaCZ/modded stacks into real M&S gear instances.

const PDZMNS_LOOT_INFO = Java.loadClass('com.robertx22.mine_and_slash.loot.LootInfo')
const PDZMNS_GEAR_BLUEPRINT = Java.loadClass('com.robertx22.mine_and_slash.loot.blueprints.GearBlueprint')
const PDZMNS_EXILE_STACK = Java.loadClass('com.robertx22.mine_and_slash.itemstack.ExileStack')
const PDZMNS_STACK_KEYS = Java.loadClass('com.robertx22.mine_and_slash.itemstack.StackKeys')

const PDZMNS_AUTO_CONVERT = true
let pdzMnsBridgeErrors = 0

const PDZMNS_TAG_TYPES = [
  'heavy_machine_gun','sniper_rifle','assault_rifle','sub_machine_gun',
  'shotgun','magnum','handgun','launcher','kinetic_gun',
  'great_sword','short_sword','longsword','katana','warhammer','hammer',
  'great_axe','axe','dagger','spear','pike','halberd','mace','scythe',
  'crossbow','bow','trident','shield_large','shield_middle','shield_small'
]

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
  try{
    if(stack.hasTag('minecraft:head_armor'))return material+'_helmet'
    if(stack.hasTag('minecraft:chest_armor'))return material+'_chest'
    if(stack.hasTag('minecraft:leg_armor'))return material+'_pants'
    if(stack.hasTag('minecraft:foot_armor'))return material+'_boots'
  }catch(ignored){}
  return null
}

function pdzMnsGearType(stack){
  if(!stack||stack.isEmpty()||Number(stack.count)!==1)return null
  if(pdzMnsIsGun(stack))return pdzMnsGunType(stack)
  for(let i=0;i<PDZMNS_TAG_TYPES.length;i++){
    let type=PDZMNS_TAG_TYPES[i]
    try{if(stack.hasTag('mmorpg:'+type))return type}catch(ignored){}
  }
  let armor=pdzMnsArmorType(stack)
  if(armor)return armor
  try{
    if(stack.hasTag('minecraft:crossbows'))return 'crossbow'
    if(stack.hasTag('minecraft:bows'))return 'bow'
    if(stack.hasTag('minecraft:swords'))return 'longsword'
    if(stack.hasTag('minecraft:axes'))return 'axe'
  }catch(ignored){}
  let id=String(stack.id).toLowerCase()
  if(/knife|dagger/.test(id))return 'dagger'
  if(/machete|katana/.test(id))return 'katana'
  if(/spear|pike/.test(id))return 'spear'
  if(/hammer|sledge/.test(id))return 'hammer'
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
  let legacy=false
  try{legacy=root.contains('PDZAffix')}catch(ignored){}
  if(!legacy)return false
  try{
    let display=root.contains('display')?root.getCompound('display'):null
    if(display){
      if(display.contains('PDZOriginalName')){
        display.remove('Name')
        display.remove('PDZOriginalName')
      }
      display.remove('Lore')
    }
    root.remove('PDZAffix')
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
  if(pdzMnsHasGear(stack)){
    pdzMnsCleanLegacy(stack)
    return false
  }
  let type=pdzMnsGearType(stack)
  if(!type)return false
  try{
    let info=player?PDZMNS_LOOT_INFO.ofPlayer(player):PDZMNS_LOOT_INFO.ofLevel(1)
    let blueprint=new PDZMNS_GEAR_BLUEPRINT(info)
    try{blueprint.item=stack.item}catch(ignored){blueprint.item=stack.getItem()}
    blueprint.setType(type)
    let data=blueprint.createData()
    data.apply(PDZMNS_EXILE_STACK.of(stack))
    pdzMnsCleanLegacy(stack)
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
    return false
  }
}

// Existing inventories and newly granted kits are normalized in small batches.
PlayerEvents.tick(event=>{
  if(!PDZMNS_AUTO_CONVERT)return
  let p=event.player
  if(p.level.clientSide||p.age%80!==23)return
  let inv=p.getInventory(),changed=false
  for(let slot=0;slot<inv.getContainerSize();slot++){
    if(pdzMnsConvert(inv.getItem(slot),p,false))changed=true
  }
  if(changed)inv.setChanged()
})

ItemEvents.crafted(event=>{
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
  let root=Commands.literal('deadzonemns').requires(source=>source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem,type=pdzMnsGearType(s)
    p.tell(Text.of('[M&S統合] '+String(s.hoverName.string)).gold())
    p.tell(Text.of('GearType: '+(type||'対象外')+' / M&S Gear: '+(pdzMnsHasGear(s)?'YES':'NO')+' / 旧PDZ Affix: '+(pdzMnsRoot(s,false)&&pdzMnsRoot(s,false).contains('PDZAffix')?'YES':'NO')).aqua())
    return 1
  }))
  root.then(Commands.literal('convert_hand').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem
    if(pdzMnsConvert(s,p,true)){
      p.tell(Text.of('[M&S統合] メインハンドをM&S装備へ変換しました。').green())
      return 1
    }
    p.tell(Text.of('[M&S統合] 変換不要、対象外、または変換失敗です。/deadzonemns status で確認してください。').yellow())
    return 0
  }))
  root.then(Commands.literal('convert_inventory').executes(ctx=>{
    let p=ctx.source.player,inv=p.getInventory(),count=0
    for(let slot=0;slot<inv.getContainerSize();slot++)if(pdzMnsConvert(inv.getItem(slot),p,true))count++
    if(count>0)inv.setChanged()
    p.tell(Text.of('[M&S統合] '+count+'個をM&S装備へ変換しました。').green())
    return count
  }))
  event.register(root)
})
