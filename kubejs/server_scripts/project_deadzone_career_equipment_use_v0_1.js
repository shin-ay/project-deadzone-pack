// PROJECT DEADZONE active career equipment v0.2

const PDZ_CAREER_MNS_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')

const PDZ_CAREER_GEAR = {
  'kubejs:career_salvage_scanner':{career:'scavenger',name:'Salvage Scanner',cd:90,effects:[['minecraft:luck',45,1],['minecraft:haste',25,0]],summary:'Luck II 45s / Haste I 25s'},
  'kubejs:career_survival_rig':{career:'adapter',name:'Adaptive Survival Rig',cd:120,effects:[['minecraft:absorption',30,1],['minecraft:regeneration',10,0],['minecraft:resistance',10,0]],summary:'Absorption II 30s / Regeneration I 10s / Resistance I 10s'},
  'kubejs:career_rangefinder':{career:'marksman',name:'Ballistic Rangefinder',cd:60,effects:[['minecraft:luck',35,1],['minecraft:speed',20,0],['minecraft:strength',12,0]],summary:'Luck II 35s / Speed I 20s / Strength I 12s'},
  'kubejs:career_assault_injector':{career:'assault',name:'Assault Injector',cd:120,effects:[['minecraft:speed',18,1],['minecraft:resistance',10,0],['minecraft:strength',12,0]],summary:'Speed II 18s / Resistance I 10s / Strength I 12s'},
  'kubejs:career_trauma_station':{career:'surgeon',name:'Portable Trauma Station',cd:90,heal:8,effects:[['minecraft:regeneration',10,1]],summary:'M&S HP +8 / Regeneration II 10s'},
  'kubejs:career_responder_beacon':{career:'combat_medic',name:'Responder Beacon',cd:120,auraHeal:6,effects:[['minecraft:regeneration',8,0]],summary:'Nearby allies M&S HP +6 / Regeneration I 8s'},
  'kubejs:career_diagnostic_tool':{career:'ground_tech',name:'Vehicle Diagnostic Tool',cd:90,effects:[['minecraft:haste',60,1],['minecraft:luck',30,0]],summary:'Haste II 60s / Luck I 30s'},
  'kubejs:career_flight_computer':{career:'pilot',name:'Portable Flight Computer',cd:60,effects:[['minecraft:slow_falling',50,0],['minecraft:speed',25,1]],summary:'Slow Falling 50s / Speed II 25s'},
  'kubejs:career_control_tablet':{career:'automation',name:'Automation Control Tablet',cd:90,effects:[['minecraft:haste',75,1],['minecraft:resistance',15,0]],summary:'Haste II 75s / Resistance I 15s'},
  'kubejs:career_gunsmith_gauge':{career:'gunsmith',name:'Gunsmith Calibration Gauge',cd:90,effects:[['minecraft:haste',50,0],['minecraft:strength',25,0],['minecraft:luck',25,0]],summary:'Haste I / Strength I / Luck I'},
  'kubejs:career_recon_sensor':{career:'recon',name:'Recon Threat Sensor',cd:60,effects:[['minecraft:speed',30,1],['minecraft:luck',40,1],['minecraft:invisibility',8,0]],summary:'Speed II 30s / Luck II 40s / Invisibility 8s'},
  'kubejs:career_signal_jammer':{career:'infiltrator',name:'Portable Signal Jammer',cd:150,effects:[['minecraft:invisibility',16,0],['minecraft:speed',16,1],['minecraft:resistance',8,0]],summary:'Invisibility 16s / Speed II 16s / Resistance I 8s'},
  'kubejs:career_barrier_projector':{career:'guardian',name:'Barrier Projector',cd:120,effects:[['minecraft:resistance',20,1],['minecraft:absorption',40,2]],summary:'Resistance II 20s / Absorption III 40s'},
  'kubejs:career_breaching_actuator':{career:'enforcer',name:'Breaching Actuator',cd:120,effects:[['minecraft:strength',22,1],['minecraft:resistance',14,0]],summary:'Strength II 22s / Resistance I 14s'},
  'kubejs:career_field_cooker':{career:'provider',name:'Compact Field Cooker',cd:180,food:10,effects:[['minecraft:saturation',1,1],['minecraft:regeneration',10,0]],summary:'Food +5 / Saturation / Regeneration I 10s'},
  'kubejs:career_tracking_module':{career:'ranger',name:'Wilderness Tracking Module',cd:90,effects:[['minecraft:speed',45,1],['minecraft:luck',45,1],['minecraft:jump_boost',30,0]],summary:'Speed II / Luck II 45s / Jump Boost I 30s'}
}

function pdzCareerGearT3(player){return String(player.persistentData.getString('dz_career_t3')).length>0}
function pdzCareerHealMns(player,amount){
  let real=Math.max(0,Number(amount))
  if(real<=0)return
  PDZ_CAREER_MNS_HEALTH.heal(player,Math.max(0,Number(PDZ_CAREER_MNS_HEALTH.realToVanilla(player,real))))
}
function pdzCareerGearEffect(player,effect,t3){
  let seconds=effect[1]+(t3?Math.ceil(effect[1]*0.35):0)
  let amp=effect[2]+(t3?1:0)
  player.runCommandSilent('effect give @s '+effect[0]+' '+seconds+' '+amp+' true')
}

Object.keys(PDZ_CAREER_GEAR).forEach(itemId=>ItemEvents.rightClicked(itemId,event=>{
  let p=event.player
  if(!p||p.level.clientSide)return
  let gear=PDZ_CAREER_GEAR[itemId],owned=String(p.persistentData.getString('dz_career_t2'))
  if(owned!==gear.career){p.tell(Text.of('[JOB] '+gear.name+' is restricted to '+gear.career+'.').red());return}
  let key='dz_career_gear_cd_'+gear.career,now=Date.now(),remaining=gear.cd*1000-(now-p.persistentData.getLong(key))
  if(remaining>0){p.tell(Text.of('[JOB] Cooldown: '+Math.ceil(remaining/1000)+'s').gray());return}
  p.persistentData.putLong(key,now)
  let t3=pdzCareerGearT3(p)
  if(gear.heal)pdzCareerHealMns(p,gear.heal+(t3?4:0))
  if(gear.food)p.foodData.setFoodLevel(Math.min(20,p.foodData.getFoodLevel()+gear.food+(t3?4:0)))
  ;(gear.effects||[]).forEach(effect=>pdzCareerGearEffect(p,effect,t3))
  if(gear.auraHeal)p.server.players.forEach(friend=>{
    if(!friend||!friend.alive||!friend.level.dimension.equals(p.level.dimension))return
    let dx=friend.x-p.x,dy=friend.y-p.y,dz=friend.z-p.z
    if(dx*dx+dy*dy+dz*dz<=(t3?100:49))pdzCareerHealMns(friend,gear.auraHeal+(t3?2:0))
  })
  p.runCommandSilent('playsound minecraft:block.beacon.activate player @s ~ ~ ~ 0.7 1.1')
  p.tell(Text.of('[JOB EQUIPMENT] '+gear.name).gold())
  p.tell(Text.of('Effect: '+gear.summary+(t3?' [T3 BOOSTED]':'')).aqua())
}))

ServerEvents.recipes(event=>Object.keys(PDZ_CAREER_GEAR).forEach(itemId=>event.remove({output:itemId})))

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonecareer_gear').requires(source=>source.hasPermission(2))
  root.then(Commands.literal('test_menu').executes(ctx=>{
    let p=ctx.source.player;p.tell(Text.of('=== JOB Equipment Test ===').gold())
    Object.keys(PDZ_CAREER_GEAR).forEach(itemId=>{let gear=PDZ_CAREER_GEAR[itemId];p.tell(Text.of('[ '+gear.career+' ] '+gear.name).aqua().clickRunCommand('/deadzonecareer_gear test_'+gear.career))})
    p.tell(Text.of('[ T3 BOOST ON/OFF ]').lightPurple().clickRunCommand('/deadzonecareer_gear toggle_t3'));return 1
  }))
  Object.keys(PDZ_CAREER_GEAR).forEach(itemId=>{let gear=PDZ_CAREER_GEAR[itemId];root.then(Commands.literal('test_'+gear.career).executes(ctx=>{let p=ctx.source.player;p.persistentData.putString('dz_career_t2',gear.career);p.persistentData.putLong('dz_career_gear_cd_'+gear.career,0);p.give(Item.of(itemId,1));p.tell(Text.of('[TEST] '+gear.name+' ready.').green());return 1}))})
  root.then(Commands.literal('toggle_t3').executes(ctx=>{let p=ctx.source.player,on=String(p.persistentData.getString('dz_career_t3')).length>0;p.persistentData.putString('dz_career_t3',on?'':'equipment_test_t3');p.tell(Text.of('[TEST] T3 BOOST '+(on?'OFF':'ON'))[on?'gray':'lightPurple']());return 1}))
  event.register(root)
})
