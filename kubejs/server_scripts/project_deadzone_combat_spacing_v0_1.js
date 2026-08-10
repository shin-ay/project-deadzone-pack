// Epic Fight advances the attacker; successful melee hits create safe spacing.
EntityEvents.hurt(event=>{
  let attacker=event.source.actual,target=event.entity
  if(!attacker || !attacker.isPlayer || !attacker.isPlayer() || !target || target.isPlayer())return
  let stack=attacker.mainHandItem,category=null
  if(!stack || stack.isEmpty())return
  try{category=dz2Category(stack)}catch(ignored){}
  if(category!=='melee')return
  let dx=Number(attacker.x)-Number(target.x),dz=Number(attacker.z)-Number(target.z)
  try{target.knockback(0.72,dx,dz)}catch(ignored){}
})
