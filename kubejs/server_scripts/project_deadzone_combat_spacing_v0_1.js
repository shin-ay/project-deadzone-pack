// Epic Fight advances the attacker; successful melee hits create safe spacing.
// Talent, Career and the held weapon Affix all contribute to the result.
function pdzMeleeSpacing(player,stack){
  let force=0.68,meleeNodes=0,controlNodes=0
  try{
    player.tags.forEach(tag=>{
      let value=String(tag)
      if(value.indexOf('pdz_node_talent_security_melee_')===0)meleeNodes++
      if(value.indexOf('pdz_node_talent_security_control_')===0)controlNodes++
    })
  }catch(ignored){}
  force+=Math.min(0.24,meleeNodes*0.025)+Math.min(0.24,controlNodes*0.045)
  try{
    let data=dz2Data(stack)
    if(data)force+=Math.max(0,Number(data.getDouble('knockback')))
    if(data && data.getString('talent')==='crowd_control')force+=0.18
  }catch(ignored){}
  let career=String(player.persistentData.getString('pdz_career_t2'))+' '+String(player.persistentData.getString('pdz_career_t3'))
  if(career.indexOf('enforcer')>=0 || career.indexOf('guardian')>=0)force+=0.12
  if(career.indexOf('juggernaut')>=0 || career.indexOf('riot_leader')>=0 || career.indexOf('breacher')>=0)force+=0.20
  return Math.min(1.65,force)
}
EntityEvents.hurt(event=>{
  let attacker=event.source.actual,target=event.entity
  if(!attacker || !attacker.isPlayer || !attacker.isPlayer() || !target || target.isPlayer())return
  let stack=attacker.mainHandItem,category=null
  if(!stack || stack.isEmpty())return
  try{category=dz2Category(stack)}catch(ignored){}
  if(category!=='melee')return
  let dx=Number(attacker.x)-Number(target.x),dz=Number(attacker.z)-Number(target.z)
  try{target.knockback(pdzMeleeSpacing(attacker,stack),dx,dz)}catch(ignored){}
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  event.register(Commands.literal('deadzonecombatspacing').then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of('Melee spacing force: '+pdzMeleeSpacing(p,p.mainHandItem).toFixed(2)).aqua())
    return 1
  })))
})
