// PROJECT DEADZONE urgent multiplayer QoL v0.1
// Infection care, durability safety, fish economy and sapling relief.

function dzqHasInfection(player) {
  return typeof dzInfectionHas === 'function' ? dzInfectionHas(player) : false
}
function dzqCureInfection(player) {
  return typeof dzInfectionClear === 'function' ? dzInfectionClear(player,6000) : false
}

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
  player.give(Item.of('lightmanscurrency:coin_copper',earned))
  // Fishing-only milestone roll: useful supplies, not raw power every turn-in.
  if(count>=12 && Math.random()<0.35) player.give(Item.of('minecraft:iron_ingot',2))
  if(count>=24 && Math.random()<0.20) player.give(Item.of('minecraft:nautilus_shell',1))
    player.tell(Text.of('魚 '+count+'匹を納品：Credit x'+earned).aqua())
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
    let stage=typeof dzInfectionSnapshot==='function'?dzInfectionSnapshot(p).severity:(dzqHasInfection(p)?1:0)
    let name=typeof dzInfectionName==='function'?dzInfectionName(stage):(stage>0?'陽性':'陰性')
    p.tell(Text.of('感染症：'+name+(stage>0?'（段階に合う治療薬またはMedic治療が必要）':'')).color(stage>=3?'red':stage>0?'yellow':'green'))
    return 1
  }))
  care.then(Commands.literal('medic_cure').executes(ctx=>{
    let p=ctx.source.player
    if(String(p.persistentData.getString('dz_job_id'))!=='medic'){p.tell(Text.of('Medic専用処置です。').red());return 0}
    return dzqCureInfection(p)?1:0
  }))
  event.register(care)
})
