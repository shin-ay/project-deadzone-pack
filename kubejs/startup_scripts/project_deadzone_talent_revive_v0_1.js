// PROJECT DEADZONE Talent / PlayerRevive bridge v0.1
// Startup script: requires full restart.

ForgeEvents.onEvent('team.creative.playerrevive.api.event.PlayerRevivedEvent', event=>{
  let revived=event.entity
  if (!revived || revived.level.clientSide) return
  try {
    let best=0, helper=null
    event.getBleeding().revivingPlayers().forEach(player=>{
      let value=Math.max(0,player.persistentData.getDouble('dz_talent_effect_revive'))
      if (value>best) { best=value; helper=player }
    })
    if (best<=0) return
    let heal=Math.max(2,revived.maxHealth*Math.min(0.50,0.15+best))
    revived.heal(heal)
    revived.potionEffects.add('minecraft:resistance',Math.round(80+best*300),best>=0.24?1:0,false,false)
    revived.potionEffects.add('minecraft:regeneration',Math.round(60+best*240),0,false,false)
    if (helper) helper.tell(Text.of('[Talent] 強化蘇生: HP '+heal.toFixed(1)+' 回復').green())
    revived.tell(Text.of('[Talent] 強化蘇生を受けた').aqua())
  } catch (error) {
    // PlayerRevive may clear helper references before another mod observes the
    // event. Never block the original revive when that happens.
  }
})
