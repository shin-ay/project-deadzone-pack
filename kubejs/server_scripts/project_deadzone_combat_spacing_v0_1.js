// Epic Fight advances the attacker; successful melee hits create safe spacing.
// Talent and Career contribute. Gear Affixes are owned exclusively by M&S.
function pdzSpacingIsMelee(stack){
  if(!stack||stack.isEmpty()||String(stack.id)==='tacz:modern_kinetic_gun')return false
  let tags=['great_sword','short_sword','longsword','katana','warhammer','hammer','great_axe','axe','dagger','spear','pike','halberd','mace','scythe']
  try{
    if(stack.hasTag('minecraft:swords')||stack.hasTag('minecraft:axes'))return true
    for(let i=0;i<tags.length;i++)if(stack.hasTag('mmorpg:'+tags[i]))return true
  }catch(ignored){}
  return /knife|machete|bat|hammer|spear|katana|club|cleaver|crowbar|scythe|sytche|baton/.test(String(stack.id).toLowerCase())
}
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
  let career=String(player.persistentData.getString('pdz_career_t2'))+' '+String(player.persistentData.getString('pdz_career_t3'))
  if(career.indexOf('enforcer')>=0 || career.indexOf('guardian')>=0)force+=0.12
  if(career.indexOf('juggernaut')>=0 || career.indexOf('riot_leader')>=0 || career.indexOf('breacher')>=0)force+=0.20
  return Math.min(1.65,force)
}
EntityEvents.hurt(event=>{
  let attacker=event.source.actual,target=event.entity
  if(!attacker || !attacker.isPlayer || !attacker.isPlayer() || !target || target.isPlayer())return
  let stack=attacker.mainHandItem
  if(!stack || stack.isEmpty())return
  if(!pdzSpacingIsMelee(stack))return
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
