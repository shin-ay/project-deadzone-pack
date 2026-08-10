// PROJECT DEADZONE urgent multiplayer QoL v0.1
// Infection care, durability safety, fish economy and sapling relief.

const DZQ_INFECTIONS = [
  'apocalypsenow:infection',
  'apocalypsenow:posinfectioneffect',
  'infectious:infection'
]
const DZQ_ANTIBIOTICS = [
  'apocalypsenow:antibiotics',
  'apocalypsenow:homemadeantibiotics',
  'infectious:antibiotics'
]

function dzqHasInfection(player) {
  for (let i=0;i<DZQ_INFECTIONS.length;i++) {
    if (player.hasEffect(DZQ_INFECTIONS[i])) return true
  }
  return false
}
function dzqCureInfection(player) {
  let cured=false
  DZQ_INFECTIONS.forEach(id=>{
    if (player.hasEffect(id)) {
      player.removeEffect(id)
      cured=true
    }
  })
  return cured
}

// All three antibiotic families cure both infection mods consistently.
DZQ_ANTIBIOTICS.forEach(itemId=>ItemEvents.rightClicked(itemId,event=>{
  let p=event.player
  if (!p || p.level.clientSide || !dzqHasInfection(p)) return
  if (dzqCureInfection(p)) {
    p.tell(Text.of('抗生物質で感染症を治療しました。').green())
    p.runCommandSilent('playsound minecraft:block.brewing_stand.brew player @s ~ ~ ~ 0.7 1.15')
  }
}))

// Mastered gear is never allowed to disappear. This tick guard is a fallback;
// the dedicated Forge hook may clamp it earlier on damage-heavy interactions.
PlayerEvents.tick(event=>{
  let p=event.player
  if (!p || p.level.clientSide) return
  if (p.age%2!==0) return
  let stacks=[]
  for(let i=0;i<p.inventory.containerSize;i++) stacks.push(p.inventory.getItem(i))
  stacks.push(p.offHandItem)
  ;['head','chest','legs','feet'].forEach(slot=>{
    try { stacks.push(p.getItemBySlot(slot)) } catch(ignored) {}
  })
  stacks.forEach(stack=>{
    if (!stack || stack.empty || !stack.isDamageableItem()) return
    let root=null
    try {root=stack.getTag()} catch(ignored) {}
    if (!root || !root.contains('PDZMastery')) return
    // Cache the best copy per item id. Vanilla same-item repair strips custom
    // NBT from its output, so ItemEvents.crafted can restore this compound.
    let cache=p.persistentData.getCompound('dz_mastery_repair_cache')
    let key=String(stack.id).replace(/[^a-zA-Z0-9_]/g,'_')
    let old=cache.contains(key)?cache.getCompound(key):null
    let mastery=root.getCompound('PDZMastery')
    if(!old || mastery.getInt('total_xp')>=old.getInt('total_xp')) cache.put(key,mastery.copy())
    p.persistentData.put('dz_mastery_repair_cache',cache)
    // Keep the immutable roll too. Vanilla same-item repair creates a new
    // stack and would otherwise silently replace the player's long-used roll.
    if(root.contains('PDZAffix')) {
      let affixCache=p.persistentData.getCompound('dz_affix_repair_cache')
      affixCache.put(key,root.getCompound('PDZAffix').copy())
      p.persistentData.put('dz_affix_repair_cache',affixCache)
    }
    let cap=Math.max(0,Number(stack.maxDamage)-1)
    if (Number(stack.damageValue)>=Number(stack.maxDamage)) stack.damageValue=cap
  })

})

// Converted hostiles occasionally inherit NPC down tags. The old version
// scanned every entity once per player, which scaled terribly in multiplayer.
// One selector pass per server is both deterministic and much cheaper.
let dzqHostileCleanupTicks=0
ServerEvents.tick(event=>{
  if(++dzqHostileCleanupTicks<200)return
  dzqHostileCleanupTicks=0
  ;['minecraft:zombie','minecraft:husk','minecraft:drowned','minecraft:skeleton','minecraft:stray'].forEach(type=>{
    let selector='@e[type='+type+',tag=dz_npc_downed]'
    event.server.runCommandSilent('tag '+selector+' remove dz_npc_downed')
    event.server.runCommandSilent('tag '+selector+' remove dz_npc_revive_in_progress')
    event.server.runCommandSilent('tag '+selector+' remove dz_npc_bleedout_armed')
    event.server.runCommandSilent('execute as '+selector+' run data merge entity @s {Invulnerable:0b,NoAI:0b}')
  })
})

ItemEvents.crafted(event=>{
  let p=event.player,stack=event.item
  if(!p||!stack||stack.empty||!stack.isDamageableItem())return
  let root=null
  try{root=stack.getOrCreateTag()}catch(ignored){return}
  if(root.contains('PDZMastery'))return
  // A damaged crafted output is the vanilla two-identical-items repair path.
  if(Number(stack.damageValue)<=0)return
  let cache=p.persistentData.getCompound('dz_mastery_repair_cache')
  let key=String(stack.id).replace(/[^a-zA-Z0-9_]/g,'_')
  if(cache.contains(key))root.put('PDZMastery',cache.getCompound(key).copy())
  let affixCache=p.persistentData.getCompound('dz_affix_repair_cache')
  if(affixCache.contains(key))root.put('PDZAffix',affixCache.getCompound(key).copy())
})

// Dynamic Trees can become extremely stingy under seasonal multipliers.
// Add one seed/sapling at a modest rate when leaves are harvested by a player.
BlockEvents.broken(event=>{
  let p=event.player,block=event.block
  if (!p || p.level.clientSide || !block) return
  let id=String(block.id)
  let leafy=id.indexOf('leaves')>=0 || id.indexOf('leaves_')>=0
  if (!leafy || Math.random()>=0.18) return
  let seed='minecraft:oak_sapling'
  if(id.indexOf('spruce')>=0)seed='minecraft:spruce_sapling'
  else if(id.indexOf('birch')>=0)seed='minecraft:birch_sapling'
  else if(id.indexOf('jungle')>=0)seed='minecraft:jungle_sapling'
  else if(id.indexOf('acacia')>=0)seed='minecraft:acacia_sapling'
  else if(id.indexOf('dark_oak')>=0)seed='minecraft:dark_oak_sapling'
  else if(id.indexOf('cherry')>=0)seed='minecraft:cherry_sapling'
  block.popItem(Item.of(seed))
})

function dzqFishValue(stack) {
  let id=String(stack.id)
  if (id.indexOf('aquaculture:')===0 || id.indexOf('hybrid-aquatic:')===0 || id.indexOf('hybrid_aquatic:')===0) return 3
  try {if(stack.hasTag('forge:raw_fishes') || stack.hasTag('minecraft:fishes')) return 2} catch(ignored) {}
  if (id==='minecraft:cod'||id==='minecraft:salmon'||id==='minecraft:tropical_fish'||id==='minecraft:pufferfish') return 2
  return 0
}
function dzqTurnInFish(player) {
  let inv=player.inventory,earned=0,count=0
  for(let i=0;i<inv.containerSize;i++) {
    let stack=inv.getItem(i),value=dzqFishValue(stack)
    if(value<=0||stack.empty)continue
    let n=Number(stack.count)
    count+=n;earned+=n*value
    stack.count=0
  }
  if(count<=0){player.tell(Text.of('納品できる魚を持っていません。').yellow());return 0}
  player.give(Item.of('apocalypsenow:money',earned))
  // Fishing-only milestone roll: useful supplies, not raw power every turn-in.
  if(count>=12 && Math.random()<0.35) player.give(Item.of('minecraft:iron_ingot',2))
  if(count>=24 && Math.random()<0.20) player.give(Item.of('minecraft:nautilus_shell',1))
  player.tell(Text.of('魚 '+count+'匹を納品：Money x'+earned).aqua())
  return 1
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let fish=Commands.literal('deadzonefish')
  fish.then(Commands.literal('turnin').executes(ctx=>dzqTurnInFish(ctx.source.player)))
  event.register(fish)

  let care=Commands.literal('deadzoneinfection')
  care.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of(dzqHasInfection(p)?'感染症：陽性（抗生物質またはMedic治療が必要）':'感染症：陰性').color(dzqHasInfection(p)?'red':'green'))
    return 1
  }))
  care.then(Commands.literal('medic_cure').executes(ctx=>{
    let p=ctx.source.player
    if(String(p.persistentData.getString('dz_job_id'))!=='medic'){p.tell(Text.of('Medic専用処置です。').red());return 0}
    return dzqCureInfection(p)?1:0
  }))
  event.register(care)
})
