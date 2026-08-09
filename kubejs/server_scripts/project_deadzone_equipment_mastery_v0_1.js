// PROJECT DEADZONE Equipment Mastery v0.2
// Vanilla XP is absorbed by the held equipment and worn armor.
// Mastery level/XP NBT keys remain compatible with v0.1.

const PDZEM_COMPOUND=Java.loadClass('net.minecraft.nbt.CompoundTag')
const PDZEM_LIST=Java.loadClass('net.minecraft.nbt.ListTag')
const PDZEM_STRING=Java.loadClass('net.minecraft.nbt.StringTag')
const PDZEM_SLOT=Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
const PDZEM_MAX_LEVEL=30
const PDZEM_TYPE_NAMES={firearm:'銃器',melee:'近接武器',mining:'採掘工具',logging:'伐採工具',digging:'掘削工具',fishing:'釣具',armor:'防具',tool:'汎用工具'}

function pdzemRoot(stack,create) {
  if (!stack || stack.empty) return null
  try {let n=stack.getTag();if(n||!create)return n} catch(ignored) {}
  try {if(create)return stack.getOrCreateTag()} catch(ignored) {}
  try {let n=stack.nbt;if(n)return n;if(create){stack.nbt={};return stack.nbt}} catch(ignored) {}
  return null
}

function pdzemEligible(stack) {
  if (!stack || stack.empty) return false
  try {if(stack.isDamageableItem())return true} catch(ignored) {}
  let id=String(stack.id).toLowerCase()
  return id.startsWith('tacz:')||id.indexOf('gun')>=0||id.indexOf('fishing_rod')>=0
}

function pdzemHeldType(stack) {
  if (!stack || stack.empty) return 'tool'
  let id=String(stack.id).toLowerCase()
  try {
    if(stack.hasTag('minecraft:pickaxes'))return 'mining'
    if(stack.hasTag('minecraft:axes'))return 'logging'
    if(stack.hasTag('minecraft:shovels'))return 'digging'
    if(stack.hasTag('minecraft:swords'))return 'melee'
  } catch(ignored) {}
  if(id.indexOf('fishing_rod')>=0||id.indexOf('fishing')>=0)return 'fishing'
  if(id.startsWith('tacz:')||id.indexOf('gun')>=0||id.indexOf('rifle')>=0||id.indexOf('pistol')>=0||id.indexOf('shotgun')>=0)return 'firearm'
  if(id.indexOf('knife')>=0||id.indexOf('sword')>=0||id.indexOf('machete')>=0||id.indexOf('bat')>=0)return 'melee'
  return 'tool'
}

function pdzemData(stack,create) {
  let root=pdzemRoot(stack,create)
  if(!root)return null
  if(!root.contains('PDZMastery')&&create)root.put('PDZMastery',new PDZEM_COMPOUND())
  return root.contains('PDZMastery')?root.getCompound('PDZMastery'):null
}

function pdzemNeed(level){return 60+Math.max(0,level)*35}

function pdzemEffectText(type,level) {
  if(type==='firearm')return '銃撃ダメージ +'+level+'% / 作動安定性上昇'
  if(type==='melee')return '近接ダメージ +'+level+'% / ノックバック性能上昇'
  if(type==='armor')return '被ダメージ -'+(level*0.35).toFixed(1)+'% / 耐久維持率上昇'
  if(type==='mining')return '採掘速度 +'+(level*0.8).toFixed(1)+'% / Lv10・25で採掘強化'
  if(type==='logging')return '伐採速度 +'+(level*0.8).toFixed(1)+'% / Lv10・25で伐採強化'
  if(type==='digging')return '掘削速度 +'+(level*0.8).toFixed(1)+'% / Lv10・25で掘削強化'
  if(type==='fishing')return '釣果補正 +'+(level*0.5).toFixed(1)+'% / 耐久維持率上昇'
  return '作業速度 +'+(level*0.5).toFixed(1)+'% / 耐久維持率上昇'
}

function pdzemWriteLore(stack,data,typeOverride) {
  let root=pdzemRoot(stack,true)
  if(!root)return
  if(!root.contains('display'))root.put('display',new PDZEM_COMPOUND())
  let display=root.getCompound('display'),old=display.getList('Lore',8),lore=new PDZEM_LIST()
  for(let i=0;i<old.size();i++) {
    let line=String(old.getString(i))
    let masteryLine=line.indexOf('pdzMastery')>=0||line.indexOf('[装備熟練度')>=0||line.indexOf('次Lv:')>=0||line.indexOf('与ダメージ +')>=0||line.indexOf('耐久維持率上昇')>=0
    if(!masteryLine)lore.add(PDZEM_STRING.valueOf(line))
  }
  let level=data.getInt('level'),xp=data.getInt('xp'),type=typeOverride||String(data.getString('type'))||pdzemHeldType(stack)
  data.putString('type',type)
  lore.add(PDZEM_STRING.valueOf(JSON.stringify({text:'[装備熟練度・'+(PDZEM_TYPE_NAMES[type]||'装備')+'] Lv'+level,color:'aqua',italic:false,pdzMastery:true})))
  lore.add(PDZEM_STRING.valueOf(JSON.stringify({text:level>=PDZEM_MAX_LEVEL?'MAX':'次Lv: '+xp+' / '+pdzemNeed(level),color:'dark_aqua',italic:false,pdzMastery:true})))
  lore.add(PDZEM_STRING.valueOf(JSON.stringify({text:pdzemEffectText(type,level),color:'gray',italic:false,pdzMastery:true})))
  display.put('Lore',lore)
}

function pdzemAdd(stack,amount,type) {
  if(!pdzemEligible(stack)||amount<=0)return 0
  let data=pdzemData(stack,true),level=Math.max(0,data.getInt('level')),xp=Math.max(0,data.getInt('xp')),gained=0
  xp+=amount
  while(level<PDZEM_MAX_LEVEL&&xp>=pdzemNeed(level)){xp-=pdzemNeed(level);level++;gained++}
  if(level>=PDZEM_MAX_LEVEL)xp=0
  data.putInt('level',level);data.putInt('xp',xp);data.putInt('total_xp',data.getInt('total_xp')+amount);data.putString('type',type||pdzemHeldType(stack))
  pdzemWriteLore(stack,data,type)
  return gained
}

function pdzemXpForLevel(level){if(level<=16)return level*level+6*level;if(level<=31)return Math.floor(2.5*level*level-40.5*level+360);return Math.floor(4.5*level*level-162.5*level+2220)}
function pdzemCurrentXp(player){let levels=player.server.runCommandSilent('experience query '+player.username+' levels'),points=player.server.runCommandSilent('experience query '+player.username+' points');return Math.max(0,pdzemXpForLevel(Math.max(0,levels))+Math.max(0,points))}

function pdzemTargets(player) {
  let held=player.mainHandItem,armor=[]
  ;[PDZEM_SLOT.HEAD,PDZEM_SLOT.CHEST,PDZEM_SLOT.LEGS,PDZEM_SLOT.FEET].forEach(slot=>{let stack=player.getItemBySlot(slot);if(pdzemEligible(stack))armor.push(stack)})
  return {held:pdzemEligible(held)?held:null,heldType:pdzemEligible(held)?pdzemHeldType(held):null,armor:armor}
}

function pdzemAbsorb(player,announce) {
  let amount=pdzemCurrentXp(player)
  if(amount<=0)return 0
  let targets=pdzemTargets(player)
  if(!targets.held&&targets.armor.length===0)return 0
  player.server.runCommandSilent('experience set '+player.username+' 0 points');player.server.runCommandSilent('experience set '+player.username+' 0 levels')
  let heldShare=targets.held?(targets.armor.length?Math.ceil(amount*0.5):amount):0,armorPool=amount-heldShare,totalLevels=0
  if(targets.held)totalLevels+=pdzemAdd(targets.held,heldShare,targets.heldType)
  if(targets.armor.length){let each=Math.floor(armorPool/targets.armor.length),extra=armorPool%targets.armor.length;targets.armor.forEach((stack,i)=>totalLevels+=pdzemAdd(stack,each+(i<extra?1:0),'armor'))}
  if(totalLevels>0)player.persistentData.putInt('dz_affix_calibration_points',player.persistentData.getInt('dz_affix_calibration_points')+totalLevels)
  if(announce&&(totalLevels>0||amount>=10))player.tell(Text.of('[装備熟練] XP '+amount+'を装備へ吸収'+(totalLevels>0?' / Level Up +'+totalLevels:'')).aqua())
  return amount
}

PlayerEvents.tick(event=>{
  let p=event.player
  if(p.level.clientSide)return
  if(p.age%20===13)pdzemAbsorb(p,true)
  if(p.age%100!==31)return
  let targets=pdzemTargets(p),all=[]
  if(targets.held)all.push({stack:targets.held,type:targets.heldType})
  targets.armor.forEach(stack=>all.push({stack:stack,type:'armor'}))
  all.forEach(entry=>{
    let data=pdzemData(entry.stack,false)
    if(!data)return
    pdzemWriteLore(entry.stack,data,entry.type)
    let level=data.getInt('level')
    try{if(entry.stack.damageValue>0&&Math.random()<Math.min(0.35,level*0.01))entry.stack.damageValue=Math.max(0,entry.stack.damageValue-Math.max(1,Math.floor(level/10)))}catch(ignored){}
  })
  let heldData=targets.held?pdzemData(targets.held,false):null
  if(heldData&&heldData.getInt('level')>=10&&['mining','logging','digging'].indexOf(targets.heldType)>=0)p.potionEffects.add('minecraft:haste',30,heldData.getInt('level')>=25?1:0,false,false)
})

EntityEvents.hurt(event=>{
  let attacker=event.source?event.source.actual:null
  if(attacker&&attacker.isPlayer&&attacker.isPlayer()&&!attacker.level.clientSide){
    let data=pdzemData(attacker.mainHandItem,false)
    if(data){let type=String(data.getString('type'))||pdzemHeldType(attacker.mainHandItem);if(type==='firearm'||type==='melee'){let bonus=Math.max(0,Number(event.damage))*data.getInt('level')*0.01;if(bonus>0&&event.entity.health>1)event.entity.health=Math.max(1,event.entity.health-bonus)}}
  }
  let victim=event.entity
  if(!victim||!victim.isPlayer||!victim.isPlayer()||victim.level.clientSide)return
  let total=0
  ;[PDZEM_SLOT.HEAD,PDZEM_SLOT.CHEST,PDZEM_SLOT.LEGS,PDZEM_SLOT.FEET].forEach(slot=>{let data=pdzemData(victim.getItemBySlot(slot),false);if(data)total+=Math.max(0,data.getInt('level'))*0.0035})
  let reduced=Math.max(0,Number(event.damage))*(1-Math.min(0.42,total))
  if(reduced<Number(event.damage))event.damage=reduced
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneequipment')
  root.then(Commands.literal('status').executes(ctx=>{let p=ctx.source.player,data=pdzemData(p.mainHandItem,false);if(!data)p.tell(Text.of('メインハンド装備には熟練度がありません。通常XPを得ると自動吸収します。').yellow());else p.tell(Text.of('装備熟練 '+(PDZEM_TYPE_NAMES[String(data.getString('type'))]||'装備')+' Lv'+data.getInt('level')+' / XP '+data.getInt('xp')+'/'+pdzemNeed(data.getInt('level'))+' / 累計 '+data.getInt('total_xp')).aqua());return 1}))
  root.then(Commands.literal('absorb').executes(ctx=>{pdzemAbsorb(ctx.source.player,true);return 1}))
  root.then(Commands.literal('test_xp_100').requires(s=>s.hasPermission(2)).executes(ctx=>{let p=ctx.source.player;p.server.runCommandSilent('experience add '+p.username+' 100 points');p.server.scheduleInTicks(2,()=>pdzemAbsorb(p,true));return 1}))
  event.register(root)
})
