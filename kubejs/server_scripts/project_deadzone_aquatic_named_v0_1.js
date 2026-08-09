// PROJECT DEADZONE aquatic named encounters v0.1
// Dangerous Hybrid Aquatic predators can become visible named targets outside T0.

const DZ_AQUATIC_NAMED = {
  "hybrid_aquatic:bull_shark": ["裂潮のブルート", 70, 7],
  "hybrid_aquatic:great_white_shark": ["白い処刑者", 95, 10],
  "hybrid_aquatic:colossal_squid": ["深淵を掴むもの", 120, 13]
}

function dzAquaticRegion(entity) {
  try { return Math.max(0, Math.min(4, dzRegionTierAt(entity.server,entity.x,entity.z))) }
  catch (ignored) { return Math.max(0,Math.min(4,entity.server.persistentData.getInt("deadzone_world_tier"))) }
}

function dzPromoteAquatic(entity,def,force) {
  if (!entity || entity.level.clientSide || entity.tags.contains("dz_aquatic_named")) return
  let tier=dzAquaticRegion(entity)
  if (tier<=0 && !force) return
  if (tier<=0) tier=1
  let chance=[0,0.015,0.03,0.05,0.07][tier]
  if (!force && Math.random()>=chance) return
  let hp=Math.min(170,def[1]+tier*12)
  entity.addTag("dz_aquatic_named")
  entity.addTag("dz_named")
  entity.addTag("dz_aquatic_tier_"+tier)
  entity.runCommandSilent("attribute @s minecraft:generic.max_health base set "+hp)
  entity.runCommandSilent("attribute @s minecraft:generic.armor base set "+Math.min(12,2+tier*2))
  entity.runCommandSilent("attribute @s minecraft:generic.knockback_resistance base set 0.8")
  entity.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  entity.runCommandSilent("data merge entity @s {CustomName:'{\"text\":\""+def[0]+" [T"+tier+"]\",\"color\":\"aqua\",\"bold\":true}',CustomNameVisible:1b,PersistenceRequired:1b,Health:"+hp+".0f}")
  entity.server.runCommandSilent('tellraw @a [{"text":"[WATERSIDE] ","color":"aqua","bold":true},{"text":"危険水域でネームド個体 '+def[0]+' が確認された。","color":"red"}]')
}

Object.keys(DZ_AQUATIC_NAMED).forEach(type => {
  EntityEvents.spawned(type,event => event.server.scheduleInTicks(5,()=>dzPromoteAquatic(event.entity,DZ_AQUATIC_NAMED[type],false)))
})

EntityEvents.death(event => {
  let entity=event.entity
  if (!entity || entity.level.clientSide || !entity.tags.contains("dz_aquatic_named")) return
  let tier=1
  for(let i=1;i<=4;i++) if(entity.tags.contains("dz_aquatic_tier_"+i)) tier=i
  entity.block.popItem(Item.of("hybrid_aquatic:comically_large_nautilus_shell",1))
  if(Math.random()<0.45+tier*0.1) entity.block.popItem(Item.of("hybrid_aquatic:black_pearl",1))
  entity.block.popItem(Item.of("apocalypsenow:money",5+tier*3))
  entity.block.popItem(Item.of("aquaculture:neptunium_nugget",1+Math.floor(tier/2)))
  let killer=event.source?event.source.actual:null
  if(killer && killer.isPlayer && killer.isPlayer()) {
    killer.persistentData.putInt("dz_aquatic_named_kills",killer.persistentData.getInt("dz_aquatic_named_kills")+1)
    killer.tell(Text.of("[WATERSIDE] ネームド水棲個体を討伐。トロフィーを回収した。").aqua())
  }
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzoneaquatic").requires(s=>s.hasPermission(2))
  ;[["bull_shark","hybrid_aquatic:bull_shark"],["great_white","hybrid_aquatic:great_white_shark"],["colossal_squid","hybrid_aquatic:colossal_squid"]].forEach(x=>{
    root.then(Commands.literal("spawn_"+x[0]).executes(ctx=>{
      let p=ctx.source.player
      p.runCommandSilent("execute positioned ^ ^ ^8 run summon "+x[1]+" ~ ~ ~ {Tags:[\"dz_aquatic_force\"]}")
      // Force promotion for test entities because ordinary T0 chance is intentionally zero.
      p.server.scheduleInTicks(8,()=>p.level.entities.forEach(e=>{
        if(e.tags && e.tags.contains("dz_aquatic_force")){e.tags.remove("dz_aquatic_force"); dzPromoteAquatic(e,DZ_AQUATIC_NAMED[x[1]],true)}
      }))
      return 1
    }))
  })
  root.then(Commands.literal("status").executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of("Named aquatic kills: "+p.persistentData.getInt("dz_aquatic_named_kills")).aqua())
    return 1
  }))
  event.register(root)
})
