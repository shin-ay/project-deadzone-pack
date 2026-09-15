// PROJECT DEADZONE - localized injury gameplay penalties v0.1
// Legendary Survival Overhaul remains the owner of limb health and its
// threshold effects. This bridge only connects arm trauma to TAA gun handling
// and chest trauma to Epic Fight stamina regeneration, which LSO cannot target.

const PDZ_LP_BODY_UTIL = Java.loadClass('sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyDamageUtil')
const PDZ_LP_PART = Java.loadClass('sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyPartEnum')

const PDZ_LP_MODIFIERS = {
  ads:     {attribute:'taa:ads_time', uuid:'d2b72949-3730-4bcd-801f-f64d14d09c11'},
  reload:  {attribute:'taa:reload_time', uuid:'a07b9145-64b4-4b64-b992-9618f1c73e12'},
  recoil:  {attribute:'taa:recoil', uuid:'4bde3c48-5813-4794-8840-23e3e4be6c13'},
  spread:  {attribute:'taa:inaccuracy', uuid:'0fa76141-1916-4486-9034-37bc6213fd14'},
  stamina: {attribute:'epicfight:stamina_regen', uuid:'e4d23b51-e99d-480b-8a91-e5b72c7ce115'}
}

function pdzLpRatio(player,part){
  try{return Math.max(0,Math.min(1,Number(PDZ_LP_BODY_UTIL.getHealthRatio(player,part))))}
  catch(ignored){return 1}
}

function pdzLpArmState(player){
  let left=pdzLpRatio(player,PDZ_LP_PART.LEFT_ARM)
  let right=pdzLpRatio(player,PDZ_LP_PART.RIGHT_ARM)
  if(Math.min(left,right)<=0.25||(left<=0.45&&right<=0.45))return 2
  if(Math.min(left,right)<=0.65)return 1
  return 0
}

function pdzLpChestState(player){
  let chest=pdzLpRatio(player,PDZ_LP_PART.CHEST)
  if(chest<=0.25)return 2
  if(chest<=0.60)return 1
  return 0
}

function pdzLpLegState(player){
  let leftLeg=pdzLpRatio(player,PDZ_LP_PART.LEFT_LEG)
  let rightLeg=pdzLpRatio(player,PDZ_LP_PART.RIGHT_LEG)
  let leftFoot=pdzLpRatio(player,PDZ_LP_PART.LEFT_FOOT)
  let rightFoot=pdzLpRatio(player,PDZ_LP_PART.RIGHT_FOOT)
  if((leftLeg<=0.60&&rightLeg<=0.60)||(leftFoot<=0.65&&rightFoot<=0.65))return 2
  if(Math.min(leftLeg,rightLeg)<=0.65||Math.min(leftFoot,rightFoot)<=0.55)return 1
  return 0
}

function pdzLpSetModifier(player,entry,amount){
  try{player.removeAttribute(entry.attribute,entry.uuid)}catch(ignored){}
  if(Math.abs(amount)<=0.0001)return
  try{player.modifyAttribute(entry.attribute,entry.uuid,amount,'multiply_total')}
  catch(error){
    let key='dz_limb_modifier_error_'+entry.attribute.replace(':','_')
    if(!player.persistentData.getBoolean(key)){
      player.persistentData.putBoolean(key,true)
      console.error('[PROJECT DEADZONE][Limb Penalty] attribute '+entry.attribute+' failed: '+error)
    }
  }
}

function pdzLpApplyArms(player,state){
  let ads=state===2?0.18:(state===1?0.08:0)
  let reload=state===2?0.25:(state===1?0.10:0)
  let recoil=state===2?0.35:(state===1?0.15:0)
  let spread=state===2?0.28:(state===1?0.12:0)
  pdzLpSetModifier(player,PDZ_LP_MODIFIERS.ads,ads)
  pdzLpSetModifier(player,PDZ_LP_MODIFIERS.reload,reload)
  pdzLpSetModifier(player,PDZ_LP_MODIFIERS.recoil,recoil)
  pdzLpSetModifier(player,PDZ_LP_MODIFIERS.spread,spread)
}

function pdzLpApplyChest(player,state){
  pdzLpSetModifier(player,PDZ_LP_MODIFIERS.stamina,state===2?-0.30:(state===1?-0.15:0))
}

function pdzLpNotify(player,key,oldState,newState,label,penalty){
  if(oldState===newState)return
  if(newState>oldState){
    player.tell(Text.of('[負傷] '+label+'損傷 '+(newState===2?'重度':'軽度')+'：'+penalty).color(newState===2?'red':'yellow'))
  }else if(newState===0){
    player.tell(Text.of('[回復] '+label+'の機能ペナルティが解除されました。').green())
  }else{
    player.tell(Text.of('[回復] '+label+'損傷が軽度まで改善しました。').yellow())
  }
  player.persistentData.putInt(key,newState)
}

let PDZ_LP_TICKS=0
ServerEvents.tick(event=>{
  if(++PDZ_LP_TICKS%20!==0)return
  event.server.players.forEach(player=>{
    if(!player||player.level.clientSide||!player.alive)return
    let data=player.persistentData
    let arms=pdzLpArmState(player)
    let chest=pdzLpChestState(player)
    let legs=pdzLpLegState(player)
    let oldArms=data.getInt('dz_limb_arms_penalty')
    let oldChest=data.getInt('dz_limb_chest_penalty')
    let oldLegs=data.getInt('dz_limb_legs_penalty')
    let initialized=data.getBoolean('dz_limb_penalty_initialized')
    if(!initialized||arms!==oldArms)pdzLpApplyArms(player,arms)
    if(!initialized||chest!==oldChest)pdzLpApplyChest(player,chest)
    if(!initialized)data.putBoolean('dz_limb_penalty_initialized',true)
    pdzLpNotify(player,'dz_limb_arms_penalty',oldArms,arms,'腕部','照準・反動・装填が悪化')
    pdzLpNotify(player,'dz_limb_chest_penalty',oldChest,chest,'胴体','スタミナ回復が低下')
    pdzLpNotify(player,'dz_limb_legs_penalty',oldLegs,legs,'脚部','移動能力が低下')
  })
})

PlayerEvents.loggedIn(event=>{
  // Rebuild transient attribute modifiers after reconnect without producing a
  // fake injury notification for an already wounded player.
  let player=event.player
  let arms=pdzLpArmState(player),chest=pdzLpChestState(player),legs=pdzLpLegState(player)
  pdzLpApplyArms(player,arms)
  pdzLpApplyChest(player,chest)
  player.persistentData.putInt('dz_limb_arms_penalty',arms)
  player.persistentData.putInt('dz_limb_chest_penalty',chest)
  player.persistentData.putInt('dz_limb_legs_penalty',legs)
  player.persistentData.putBoolean('dz_limb_penalty_initialized',true)
})

global.pdzLimbPenaltySummary=function(player){
  let arms=pdzLpArmState(player),chest=pdzLpChestState(player),legs=pdzLpLegState(player)
  return '腕 '+['正常','軽度','重度'][arms]+' / 胴 '+['正常','軽度','重度'][chest]+
    ' / 脚 '+['正常','軽度','重度'][legs]
}

console.info('[PROJECT DEADZONE][Limb Penalty] v0.1 loaded: LSO limbs -> TAA handling / Epic Fight stamina / movement feedback.')
