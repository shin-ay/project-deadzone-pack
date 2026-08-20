// PROJECT DEADZONE - universal Mine and Slash equipment requirements v0.2
// Native M&S gear keeps its own requirements. PDZ-compatible mod equipment
// receives a level-scaled primary-stat requirement and uses the same values
// for tooltip display and server-side enforcement.

const PDZ_REQ_LOAD = Java.loadClass('com.robertx22.mine_and_slash.uncommon.datasaving.Load')

const PDZ_REQ_NAMES = {
  strength:'\u5f37\u976d',
  dexterity:'\u6280\u91cf',
  intelligence:'\u89e3\u6790'
}

function pdzReqRoot(stack){
  if(!stack||stack.isEmpty())return null
  try{if(typeof stack.getTag==='function')return stack.getTag()}catch(ignored){}
  try{return stack.nbt}catch(ignored){}
  return null
}

function pdzReqLevel(player){
  try{return Math.max(1,PDZ_REQ_LOAD.Unit(player).getLevel())}catch(ignored){}
  try{return Math.max(1,PDZ_REQ_LOAD.Unit(player).level)}catch(ignored){}
  return 1
}

function pdzReqStatValue(player,stat){
  try{return Number(PDZ_REQ_LOAD.Unit(player).getUnit().getCalculatedStat(stat).getValue())||0}catch(ignored){}
  try{return Number(PDZ_REQ_LOAD.Unit(player).getCalculatedStat(stat).getValue())||0}catch(ignored){}
  return 0
}

function pdzReqCategory(stack){
  let id=String(stack.id)
  if(id.indexOf('tacz:modern_kinetic_gun')>=0||id.indexOf('gun')>=0||
     stack.hasTag('minecraft:bows')||stack.hasTag('minecraft:crossbows'))return 'gun'
  if(stack.hasTag('minecraft:head_armor')||stack.hasTag('minecraft:chest_armor')||
     stack.hasTag('minecraft:leg_armor')||stack.hasTag('minecraft:foot_armor'))return 'armor'
  if(stack.hasTag('minecraft:pickaxes')||stack.hasTag('minecraft:shovels')||stack.hasTag('minecraft:hoes'))return 'mining'
  if(stack.hasTag('minecraft:axes')||stack.hasTag('minecraft:swords')||
     /knife|machete|bat|hammer|spear|katana|club|cleaver|crowbar|scythe|sytche|baton/.test(id))return 'melee'
  return 'utility'
}

function pdzReqPrimaryStat(stack){
  let id=String(stack.id),category=pdzReqCategory(stack)
  if(category==='gun')return 'dexterity'
  if(category==='melee')return 'strength'
  if(category==='mining')return /drill|electric|powered|mekanism|immersiveengineering/.test(id)?'intelligence':'strength'
  if(category==='armor'){
    if(/hazmat|engineer|medic|medical|tech|radiation|chemical/.test(id))return 'intelligence'
    if(/heavy|soldier|riot|tactical|plate|juggernaut|security/.test(id))return 'strength'
    return 'dexterity'
  }
  return 'intelligence'
}

function pdzReqAmount(level){
  return Math.max(2,Math.min(20,Math.ceil(1.35+Number(level||1)*0.55)))
}

function pdzEnsureRequirement(stack){
  let root=pdzReqRoot(stack)
  if(!root||!root.contains('PDZMnsRequiredLevel'))return false
  // The compatibility marker is only written to equipment M&S did not
  // convert natively, so native requirements are never overwritten.
  if(!root.contains('PDZMnsRequiredStat'))root.putString('PDZMnsRequiredStat',pdzReqPrimaryStat(stack))
  if(!root.contains('PDZMnsRequiredStatAmount'))root.putInt('PDZMnsRequiredStatAmount',pdzReqAmount(root.getInt('PDZMnsRequiredLevel')))
  return true
}

function pdzItemRequirement(stack){
  let root=pdzReqRoot(stack)
  if(!root||!root.contains('PDZMnsRequiredLevel'))return null
  pdzEnsureRequirement(stack)
  return {
    level:root.getInt('PDZMnsRequiredLevel'),
    stat:String(root.getString('PDZMnsRequiredStat')),
    amount:root.getInt('PDZMnsRequiredStatAmount')
  }
}

function pdzReqBlocked(player,stack,notify){
  let req=pdzItemRequirement(stack)
  if(!req)return false
  let levelOk=pdzReqLevel(player)>=req.level
  let statOk=pdzReqStatValue(player,req.stat)>=req.amount
  if(levelOk&&statOk)return false
  if(notify&&player.age%20===0){
    let reason=!levelOk?'M&S Lv '+req.level:(PDZ_REQ_NAMES[req.stat]||req.stat)+' '+req.amount
    player.tell(Text.of('[\u88c5\u5099\u6761\u4ef6] '+reason+' \u304c\u5fc5\u8981\u3067\u3059\u3002').red())
  }
  return true
}

PlayerEvents.tick(event=>{
  let p=event.player
  if(p.level.clientSide||p.age%20!==7)return
  let inv=p.getInventory()
  // Retrofit every carried compatibility item, including hotbar, Curios-bound
  // candidates and armor before it is equipped.
  for(let slot=0;slot<inv.getContainerSize();slot++)pdzEnsureRequirement(inv.getItem(slot))
  // Armor slots are inventory indices 36-39. Invalid gear is returned safely.
  for(let slot=36;slot<=39;slot++){
    let stack=inv.getItem(slot)
    if(!pdzReqBlocked(p,stack,false))continue
    let copy=stack.copy()
    inv.setItem(slot,Item.empty)
    if(!inv.add(copy))p.drop(copy,false)
    p.tell(Text.of('[\u88c5\u5099\u6761\u4ef6] '+copy.hoverName.string+' \u306f\u73fe\u5728\u306e\u80fd\u529b\u5024\u3067\u306f\u88c5\u5099\u3067\u304d\u307e\u305b\u3093\u3002').red())
  }
})

ItemEvents.rightClicked(event=>{if(pdzReqBlocked(event.player,event.item,true))event.cancel()})
BlockEvents.broken(event=>{if(pdzReqBlocked(event.player,event.player.mainHandItem,true))event.cancel()})
EntityEvents.hurt(event=>{
  let attacker=null
  try{attacker=event.source.player}catch(ignored){}
  if(attacker&&pdzReqBlocked(attacker,attacker.mainHandItem,true))event.cancel()
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonereq').requires(source=>source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,stack=p.mainHandItem
    if(!stack||stack.isEmpty()){
      p.tell(Text.of('[\u88c5\u5099\u6761\u4ef6] \u30e1\u30a4\u30f3\u30cf\u30f3\u30c9\u306b\u88c5\u5099\u3092\u6301\u3063\u3066\u304f\u3060\u3055\u3044\u3002').yellow())
      return 0
    }
    pdzEnsureRequirement(stack)
    let req=pdzItemRequirement(stack)
    if(!req){
      p.tell(Text.of('[\u88c5\u5099\u6761\u4ef6] '+stack.hoverName.string+' : M&S\u30cd\u30a4\u30c6\u30a3\u30d6\u8981\u4ef6\u3001\u307e\u305f\u306f\u5bfe\u8c61\u5916').gray())
      return 1
    }
    let currentLevel=pdzReqLevel(p),currentStat=pdzReqStatValue(p,req.stat)
    p.tell(Text.of('[\u88c5\u5099\u6761\u4ef6] '+stack.hoverName.string).gold())
    p.tell(Text.of('M&S Lv '+currentLevel+' / '+req.level+' | '+(PDZ_REQ_NAMES[req.stat]||req.stat)+' '+currentStat.toFixed(1)+' / '+req.amount).aqua())
    return 1
  }))
  root.then(Commands.literal('refresh').executes(ctx=>{
    let p=ctx.source.player,inv=p.getInventory(),count=0
    for(let slot=0;slot<inv.getContainerSize();slot++)if(pdzEnsureRequirement(inv.getItem(slot)))count++
    p.tell(Text.of('[\u88c5\u5099\u6761\u4ef6] '+count+' \u500b\u306e\u8981\u4ef6\u3092\u540c\u671f\u3057\u307e\u3057\u305f\u3002').green())
    return 1
  }))
  event.register(root)
})
