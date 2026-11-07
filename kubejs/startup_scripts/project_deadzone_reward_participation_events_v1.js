// Native final-damage observation needs restart. Never grants at LivingHurtEvent.
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDamageEvent', event=>{
  if (!event.entity || event.entity.level.clientSide) return
  if (global.pdzRewardObserveDamage) global.pdzRewardObserveDamage(event)
})
// Only actual completed PlayerRevive helpers, not nearby players.
ForgeEvents.onEvent('team.creative.playerrevive.api.event.PlayerRevivedEvent', event=>{
  if (!event.entity || event.entity.level.clientSide) return
  if (!global.pdzRewardRecordSupport) return
  try {
    event.getBleeding().revivingPlayers().forEach(healer=>global.pdzRewardRecordSupport(healer,event.entity))
  } catch (error) { console.warn('[PDZ participation] revive evidence unavailable: '+error) }
})
