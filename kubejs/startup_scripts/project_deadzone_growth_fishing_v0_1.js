// PROJECT DEADZONE Growth Fishing Bridge v0.1
// ForgeEvents must live in startup_scripts. Requires a full client/server restart.

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.ItemFishedEvent', event => {
  let p=event.entity
  if (!p || p.level.clientSide) return

  let now=Date.now()
  let last=p.persistentData.getLong('dzg_cd_growth_fishing')
  if (now-last < 1500) return
  p.persistentData.putLong('dzg_cd_growth_fishing',now)

  let job=String(p.persistentData.getString('dz_job_id'))
  let talent=Math.max(0,p.persistentData.getDouble('dz_talent_effect_fishing'))
  let multiplier=(job === 'survivalist') ? 1.25 : 1.0
  if (p.tags.contains('dz_growth_livelihood_master_chef')) multiplier+=0.20
  if (p.tags.contains('dz_growth_livelihood_master_angler')) multiplier+=0.25
  if (p.tags.contains('dz_growth_livelihood_master_farmer')) multiplier+=0.20
  multiplier+=Math.min(1.0,talent)
  let amount=Math.ceil(3*multiplier)
  p.server.runCommandSilent('puffish_skills experience add ' + p.username + ' dz_livelihood ' + amount)
  // One-shot server bridge token. Without this, players could type the
  // internal event command repeatedly and farm JOB XP without fishing.
  p.persistentData.putLong('dz_career_bridge_fishing_until',p.level.gameTime+20)
  p.server.runCommandSilent('execute as '+p.username+' run deadzonecareer event_fishing')
  p.server.runCommandSilent('title ' + p.username + ' actionbar {"text":"+' + amount + ' LIVELIHOOD XP（釣り）","color":"aqua"}')

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
