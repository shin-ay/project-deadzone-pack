// PROJECT DEADZONE Growth Fishing Bridge v0.2
// ForgeEvents must live in startup_scripts. Requires a full client/server restart.

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.ItemFishedEvent', event => {
  let p=event.entity
  if (!p || p.level.clientSide) return

  let now=Date.now()
  let last=p.persistentData.getLong('dzg_cd_growth_fishing')
  if (now-last < 1500) return
  p.persistentData.putLong('dzg_cd_growth_fishing',now)

  if (global.pdzCharacterAwardXp) global.pdzCharacterAwardXp(p,4,'fishing',false)
})
