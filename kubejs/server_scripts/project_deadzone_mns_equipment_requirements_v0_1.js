// PROJECT DEADZONE - universal Mine and Slash equipment requirements v0.1
// Covers durable equipment from mods that Mine and Slash does not recognise.

const PDZ_REQ_LOAD = Java.loadClass('com.robertx22.mine_and_slash.uncommon.datasaving.Load')

function pdzReqLevel(player){
  try { return Math.max(1,PDZ_REQ_LOAD.Unit(player).getLevel()) } catch(ignored) {}
  try { return Math.max(1,PDZ_REQ_LOAD.Unit(player).level) } catch(ignored) {}
  return 1
}

function pdzItemReq(stack){
  if(!stack||stack.isEmpty())return 0
  try{
    let root=typeof stack.getTag==='function'?stack.getTag():stack.nbt
    return root&&root.contains('PDZMnsRequiredLevel')?root.getInt('PDZMnsRequiredLevel'):0
  }catch(ignored){return 0}
}

function pdzReqBlocked(player,stack,notify){
  let req=pdzItemReq(stack)
  if(req<=0||pdzReqLevel(player)>=req)return false
  if(notify&&player.age%20===0)player.tell(Text.of('[装備条件] Mine and Slash Lv '+req+' が必要です。').red())
  return true
}

// Armor slots are inventory indices 36-39.  Invalid gear is returned to the
// normal inventory instead of being deleted or dropped.
PlayerEvents.tick(event=>{
  let p=event.player
  if(p.level.clientSide||p.age%20!==7)return
  let inv=p.getInventory()
  for(let slot=36;slot<=39;slot++){
    let stack=inv.getItem(slot)
    if(!pdzReqBlocked(p,stack,false))continue
    let copy=stack.copy()
    inv.setItem(slot,Item.empty)
    if(!inv.add(copy))p.drop(copy,false)
    p.tell(Text.of('[装備条件] '+copy.hoverName.string+' は現在のレベルでは装備できません。').red())
  }
})

ItemEvents.rightClicked(event=>{
  if(pdzReqBlocked(event.player,event.item,true))event.cancel()
})

BlockEvents.broken(event=>{
  if(pdzReqBlocked(event.player,event.player.mainHandItem,true))event.cancel()
})

EntityEvents.hurt(event=>{
  let attacker=null
  try{attacker=event.source.player}catch(ignored){}
  if(attacker&&pdzReqBlocked(attacker,attacker.mainHandItem,true))event.cancel()
})
