// PROJECT DEADZONE Growth Fishing Bridge v0.1
// ForgeEvents must live in startup_scripts. Requires a full client/server restart.

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.ItemFishedEvent', event => {
  let p=event.entity
  if (!p || p.level.clientSide) return

  let now=Date.now()
  let last=p.persistentData.getLong('dzg_cd_growth_fishing')
  if (now-last < 1500) return
  p.persistentData.putLong('dzg_cd_growth_fishing',now)

  let talent=Math.max(0,p.persistentData.getDouble('dz_talent_effect_fishing'))
  // One-shot server bridge token. Without this, players could type the
  // internal event command repeatedly and farm unified M&S XP without fishing.
  p.persistentData.putLong('dz_career_bridge_fishing_until',Date.now()+1500)
  p.server.runCommandSilent('execute as '+p.username+' run deadzonecareer event_fishing')

  // Talent fishing is evaluated on the real Forge fishing event. It raises
  // the chance of useful secondary catches without replacing the base loot.
  if (talent>0 && Math.random()<Math.min(0.35,talent*0.8)) {
    let roll=Math.random()
    if (roll<0.55) p.give(Item.of('aquaculture:worm',1))
    else if (roll<0.90) p.give(Item.of('aquaculture:fish_bones',1))
    else p.give(Item.of('aquaculture:lockbox',1))
    p.tell(Text.of('[Talent] 追加の釣果を引き上げた！').aqua())
  }
})
