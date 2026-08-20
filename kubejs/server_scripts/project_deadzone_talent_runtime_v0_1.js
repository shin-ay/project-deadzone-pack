// PROJECT DEADZONE Talent runtime v0.1
// Connects stored Talent specialty values to gameplay events.

function pdztrValue(player,key) {
  if (!player) return 0
  return Math.max(0,player.persistentData.getDouble('dz_talent_effect_'+key))
}

function pdztrCooldown(player,key,ticks) {
  let nbt='dz_talent_runtime_cd_'+key, now=player.age
  let last=player.persistentData.getInt(nbt)
  if (now-last<ticks) return false
  player.persistentData.putInt(nbt,now)
  return true
}

function pdztrIsGun(stack) {
  if (!stack || stack.empty) return false
  let id=String(stack.id).toLowerCase()
  if (id.startsWith('tacz:') || id.indexOf('gun')>=0 || id.indexOf('firearm')>=0) return true
  try {
    return stack.hasTag('tacz:modern_kinetic_gun/gun') || stack.hasTag('tacz:gun')
  } catch (ignored) { return false }
}

function pdztrMedical(id) {
  id=String(id).toLowerCase()
  return id.indexOf('bandage')>=0 || id.indexOf('medical')>=0 || id.indexOf('medkit')>=0 ||
    id.indexOf('morphine')>=0 || id.indexOf('syringe')>=0 || id.indexOf('first_aid')>=0
}

function pdztrIndustrial(id) {
  id=String(id)
  return id.startsWith('create:') || id.startsWith('immersiveengineering:') ||
    id.startsWith('mekanism:') || id.startsWith('pneumaticcraft:')
}

function pdztrVehicle(id) {
  id=String(id)
  return id.startsWith('mts:') || id.startsWith('vehicle:') || id.startsWith('immersivevehicles:') ||
    id.startsWith('blocky_bikes:') || id.startsWith('smallships:')
}

function pdztrCrop(id) {
  id=String(id).toLowerCase()
  return id.indexOf('wheat')>=0 || id.indexOf('carrot')>=0 || id.indexOf('potato')>=0 ||
    id.indexOf('beetroot')>=0 || id.indexOf('crop')>=0 || id.indexOf('rice')>=0 || id.indexOf('tomato')>=0
}

function pdztrAnimal(entity) {
  if (!entity) return false
  let id=String(entity.type).toLowerCase()
  return ['cow','pig','sheep','chicken','rabbit','deer','boar','bear','moose','goat','turkey','duck','fish'].some(x=>id.indexOf(x)>=0)
}

const PDZTR_TACZ_IGUN = Java.loadClass('com.tacz.guns.api.item.IGun')
const PDZTR_TACZ_ASSETS = Java.loadClass('com.tacz.guns.resource.CommonAssetsManager')

function pdztrAmmoId(stack) {
  try {
    let gun=PDZTR_TACZ_IGUN.getIGunOrNull(stack)
    if (!gun) return null
    let data=PDZTR_TACZ_ASSETS.get().getGunData(gun.getGunId(stack))
    return data&&data.ammoId?String(data.ammoId):null
  } catch (ignored) { return null }
}

function pdztrGiveAmmo(player,stack,count,label) {
  let ammo=pdztrAmmoId(stack)
  if (!ammo || count<=0) return false
  player.give(Item.of('tacz:ammo',count,`{AmmoId:"${ammo}"}`))
  player.tell(Text.of('[Talent] '+label+' +'+count+'発').gold())
  return true
}

// Firearm Talent is additive with the normal hit and the independent Affix
// bonus. Direct health subtraction avoids recursively firing another hurt event.
EntityEvents.hurt(event=>{
  let player=event.source?event.source.actual:null
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return
  if (!pdztrIsGun(player.mainHandItem)) {
    let stagger=pdztrValue(player,'stagger')
    if (stagger>0 && Math.random()<Math.min(0.40,stagger)) {
      event.entity.potionEffects.add('minecraft:slowness',Math.round(30+stagger*160),stagger>=0.20?1:0,false,false)
      event.entity.potionEffects.add('minecraft:weakness',Math.round(25+stagger*100),0,false,false)
    }
    return
  }
  // Firearm damage is applied once by project_deadzone_firearms_perks through
  // TaCZ's pre-damage event. Do not subtract target HP a second time here.
  return
})

// TaCZ exposes real head-shot and reload events. Weak-point and ammunition
// branches therefore do not need to guess from generic damage events.
TimelessGunEvents.entityKillByGun(event=>{
  let p=event.attacker
  if (!p || !p.isPlayer || !p.isPlayer() || p.level.clientSide) return
  let weak=pdztrValue(p,'weakpoint'), ammo=pdztrValue(p,'ammoEfficiency')
  if (event.headShot && weak>0) {
    p.potionEffects.add('minecraft:speed',Math.round(40+weak*180),0,false,false)
    p.potionEffects.add('minecraft:strength',Math.round(30+weak*120),0,false,false)
  }
  if (ammo>0 && Math.random()<Math.min(0.45,ammo)) {
    pdztrGiveAmmo(p,p.mainHandItem,event.headShot&&ammo>=0.20?2:1,'弾薬効率')
  }
})

TimelessGunEvents.gunReload(event=>{
  let p=event.entity
  if (!p || !p.isPlayer || p.level.clientSide) return
  let reload=pdztrValue(p,'reload'), handling=pdztrValue(p,'handling'), ammo=pdztrValue(p,'ammoEfficiency')
  if (reload>0) p.potionEffects.add('minecraft:speed',Math.round(25+reload*120),reload>=0.20?1:0,false,false)
  if (handling>0) p.potionEffects.add('minecraft:resistance',Math.round(25+handling*100),0,false,false)
  if (ammo>0 && pdztrCooldown(p,'reload_refund',30) && Math.random()<Math.min(0.30,ammo*0.65)) {
    pdztrGiveAmmo(p,event.gunItemStack,1,'マガジン保持')
  }
})

// Medical branches improve every recognized medical item without duplicating it.
ItemEvents.rightClicked(event=>{
  let p=event.player
  if (!p || p.level.clientSide || !pdztrMedical(event.item.id) || !pdztrCooldown(p,'medical',20)) return
  let healing=pdztrValue(p,'healing'), stim=pdztrValue(p,'stim')
  if (healing>0) {
    let amplifier=Math.min(2,Math.floor(healing/0.18))
    p.potionEffects.add('minecraft:regeneration',Math.round(40+healing*300),amplifier,false,false)
  }
  if (stim>0) p.potionEffects.add('minecraft:speed',Math.round(60+stim*200),0,false,false)
})

// Cooking and recovery make prepared food more useful than scavenged snacks.
ItemEvents.foodEaten(event=>{
  let p=event.entity
  if (!p || !p.isPlayer || !p.isPlayer() || p.level.clientSide) return
  let cooking=pdztrValue(p,'cooking'), recovery=pdztrValue(p,'recovery')
  if (cooking>0) {
    p.potionEffects.add('minecraft:absorption',Math.round(200+cooking*800),Math.min(1,Math.floor(cooking/0.25)),false,false)
  }
  if (recovery>0) p.potionEffects.add('minecraft:regeneration',Math.round(30+recovery*180),0,false,false)
})

// Industrial, vehicle and farming branches occasionally recover one component.
ItemEvents.crafted(event=>{
  let p=event.player
  if (!p || p.level.clientSide) return
  let id=String(event.item.id), chance=0
  if (pdztrIndustrial(id)) chance=Math.max(chance,pdztrValue(p,'processing'),pdztrValue(p,'automation')*0.75)
  if (pdztrVehicle(id)) chance=Math.max(chance,pdztrValue(p,'repair')*0.75,pdztrValue(p,'vehicle')*0.75,pdztrValue(p,'aviation')*0.6,pdztrValue(p,'marine')*0.75)
  if (id.indexOf('ammo')>=0 || id.indexOf('bullet')>=0 || id.indexOf('shell')>=0) chance=Math.max(chance,pdztrValue(p,'gunsmith')*0.75)
  chance=Math.min(0.35,chance)
  if (chance>0 && Math.random()<chance) {
    let bonus=event.item.copy(); bonus.count=1; p.give(bonus)
    p.tell(Text.of('[Talent] Component Recovery +1').gold())
  }
})

BlockEvents.broken(event=>{
  let p=event.player
  if (!p || p.level.clientSide) return
  let id=String(event.block.id)
  let scavenge=pdztrValue(p,'scavenge'), farming=pdztrValue(p,'farming')
  if (scavenge>0 && (event.block.hasTag('forge:ores') || id.indexOf('scrap')>=0) && Math.random()<Math.min(0.30,scavenge*0.6)) {
    p.give(Item.of('minecraft:iron_nugget',1))
  }
  if (farming>0 && pdztrCrop(id) && Math.random()<Math.min(0.30,farming*0.65)) {
    // A universal cultivation bonus avoids invalid block-to-item conversion
    // for crops such as minecraft:carrots and modded multi-block plants.
    p.give(Item.of('minecraft:bone_meal',1))
  }
})

EntityEvents.death(event=>{
  let p=event.source?event.source.actual:null
  if (!p || !p.isPlayer || !p.isPlayer() || p.level.clientSide || !pdztrAnimal(event.entity)) return
  let hunting=pdztrValue(p,'hunting')
  if (hunting>0 && Math.random()<Math.min(0.35,hunting*0.7)) p.give(Item.of('minecraft:leather',1))
})

// Periodic effects are intentionally subtle; stealth assists disengagement
// without granting permanent invisibility while standing in combat.
PlayerEvents.tick(event=>{
  let p=event.player
  if (p.level.clientSide || p.age%20!==0) return
  let stealth=pdztrValue(p,'stealth'), hazard=pdztrValue(p,'hazard')
  let stamina=pdztrValue(p,'stamina'), aura=pdztrValue(p,'aura'), revive=pdztrValue(p,'revive')
  let power=pdztrValue(p,'power'), marine=pdztrValue(p,'marine'), aviation=pdztrValue(p,'aviation')
  let tracking=pdztrValue(p,'tracking'), fishing=pdztrValue(p,'fishing')
  if (stealth>=0.08 && p.isCrouching()) p.potionEffects.add('minecraft:invisibility',25,0,false,false)
  if (hazard>=0.12) {
    p.potionEffects.add('minecraft:fire_resistance',30,0,false,false)
  }
  if (stamina>=0.08 && p.isSprinting() && p.age%100===0) p.potionEffects.add('minecraft:saturation',2,0,false,false)
  if (power>=0.10) p.potionEffects.add('minecraft:haste',30,power>=0.25?1:0,false,false)
  if (marine>=0.08 && p.isInWater()) p.potionEffects.add('minecraft:water_breathing',30,0,false,false)
  if (aviation>=0.10 && p.fallDistance>4) p.potionEffects.add('minecraft:slow_falling',30,0,false,false)
  if (fishing>=0.08 && String(p.mainHandItem.id).indexOf('fishing_rod')>=0) {
    p.potionEffects.add('minecraft:luck',30,Math.min(2,Math.floor(fishing/0.15)),false,false)
    p.persistentData.putDouble('dz_fishing_talent_loot_bonus',Math.min(0.50,fishing))
  }
  if (p.age%100===0 && tracking>=0.08) {
    p.server.runCommandSilent('execute at '+p.username+' run effect give @e[type=#minecraft:hostile,distance=..'+Math.round(8+tracking*40)+',sort=nearest,limit=6] minecraft:glowing 2 0 true')
  }
  if (p.age%100===0 && (aura>0 || revive>0)) {
    let radius=Math.round(4+aura*18+revive*8)
    if (aura>0) p.server.runCommandSilent('execute at '+p.username+' run effect give @a[distance=0.1..'+radius+'] minecraft:regeneration 3 0 true')
    if (revive>=0.12) p.server.runCommandSilent('execute at '+p.username+' run effect give @a[distance=0.1..'+radius+'] minecraft:resistance 3 0 true')
  }
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonetalentruntime')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of('=== TALENT RUNTIME ===').gold())
    p.tell(Text.of('Gun '+(pdztrValue(p,'gunDamage')*100).toFixed(1)+'% / Healing '+(pdztrValue(p,'healing')*100).toFixed(1)+'% / Stim '+(pdztrValue(p,'stim')*100).toFixed(1)+'%').aqua())
    p.tell(Text.of('Processing '+(pdztrValue(p,'processing')*100).toFixed(1)+'% / Repair '+(pdztrValue(p,'repair')*100).toFixed(1)+'% / Scavenge '+(pdztrValue(p,'scavenge')*100).toFixed(1)+'%').yellow())
    p.tell(Text.of('Cooking '+(pdztrValue(p,'cooking')*100).toFixed(1)+'% / Farming '+(pdztrValue(p,'farming')*100).toFixed(1)+'% / Hunting '+(pdztrValue(p,'hunting')*100).toFixed(1)+'%').green())
    p.tell(Text.of('Ammo '+(pdztrValue(p,'ammoEfficiency')*100).toFixed(1)+'% / Weak Point '+(pdztrValue(p,'weakpoint')*100).toFixed(1)+'% / Revive '+(pdztrValue(p,'revive')*100).toFixed(1)+'%').lightPurple())
    p.tell(Text.of('Fishing '+(pdztrValue(p,'fishing')*100).toFixed(1)+'% / Tracking '+(pdztrValue(p,'tracking')*100).toFixed(1)+'% / Aura '+(pdztrValue(p,'aura')*100).toFixed(1)+'%').gray())
    return 1
  }))
  event.register(root)
})
