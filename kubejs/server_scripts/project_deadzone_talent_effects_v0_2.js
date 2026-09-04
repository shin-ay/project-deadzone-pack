// PROJECT DEADZONE Talent effect bridge v0.2
// Counts individually acquired nodes. Attribute bonuses remain owned by Passive Skill Tree.

const PDZT_BRANCHES = {
  weapons:['precision','assault','handling','ammo'],
  security:['melee','speed','guard','control'],
  medic:['healing','revive','aura','stim'],
  engineer:['processing','power','automation','gunsmith'],
  mechanic:['repair','road','aviation','marine'],
  survivalist:['cooking','farming','fishing','hunting'],
  survivor:['health','hazard','carry','recovery'],
  scout:['stealth','scavenge','mobility','tracking']
}

const PDZT_ATTR = {
  health:['minecraft:generic.max_health','d34db200-0000-4000-8000-000000000001'],
  speed:['minecraft:generic.movement_speed','d34db200-0000-4000-8000-000000000002'],
  armor:['minecraft:generic.armor','d34db200-0000-4000-8000-000000000003'],
  toughness:['minecraft:generic.armor_toughness','d34db200-0000-4000-8000-000000000004'],
  knockback:['minecraft:generic.knockback_resistance','d34db200-0000-4000-8000-000000000005'],
  luck:['minecraft:generic.luck','d34db200-0000-4000-8000-000000000006'],
  melee:['minecraft:generic.attack_damage','d34db200-0000-4000-8000-000000000007'],
  attackSpeed:['minecraft:generic.attack_speed','d34db200-0000-4000-8000-000000000008']
}

// Per weighted rank. Lesser=1.0, Notable=1.5 and Keystone=3.0.
// Values without a vanilla attribute are exposed through persistentData so
// firearm, medical, loot and vehicle scripts can consume one shared source.
const PDZT_EFFECTS = {
  weapons:{
    precision:{gunDamage:0.012,weakpoint:0.008,luck:0.025},
    assault:{gunDamage:0.010,health:0.12,speed:0.0005},
    handling:{reload:0.006,handling:0.008,attackSpeed:0.0015},
    ammo:{ammoEfficiency:0.006,carry:0.5}
  },
  security:{
    melee:{melee:0.004,attackSpeed:0.002},
    speed:{speed:0.0015,stamina:0.005},
    guard:{health:0.18,armor:0.08,toughness:0.035},
    control:{knockback:0.003,stagger:0.008}
  },
  medic:{
    healing:{healing:0.01,health:0.10},
    revive:{revive:0.012,health:0.08,toughness:0.025},
    aura:{aura:0.008,armor:0.04},
    stim:{stim:0.01,speed:0.0008}
  },
  engineer:{
    processing:{processing:0.012,luck:0.035},
    power:{power:0.012,health:0.08,toughness:0.03},
    automation:{automation:0.012,carry:0.6},
    gunsmith:{gunsmith:0.012,gunDamage:0.006,attackSpeed:0.001}
  },
  mechanic:{
    repair:{repair:0.012,toughness:0.03},
    road:{vehicle:0.012,speed:0.0008,carry:0.4},
    aviation:{aviation:0.012,speed:0.0008,luck:0.025},
    marine:{marine:0.012,health:0.10,carry:0.4}
  },
  survivalist:{
    cooking:{cooking:0.012,health:0.10},
    farming:{farming:0.012,luck:0.035,carry:0.3},
    fishing:{fishing:0.014,luck:0.05},
    hunting:{hunting:0.012,melee:0.002,speed:0.0005}
  },
  survivor:{
    health:{health:0.22},
    hazard:{hazard:0.01,armor:0.05,toughness:0.025},
    carry:{carry:0.9},
    recovery:{recovery:0.01,health:0.10,speed:0.0004}
  },
  scout:{
    stealth:{stealth:0.012,speed:0.001},
    scavenge:{scavenge:0.012,luck:0.06},
    mobility:{mobility:0.012,speed:0.0015,stamina:0.004},
    tracking:{tracking:0.012,luck:0.04,weakpoint:0.003}
  }
}

const PDZT_CUSTOM_KEYS = [
  'gunDamage','weakpoint','reload','handling','ammoEfficiency','carry','stamina','stagger',
  'healing','revive','aura','stim','processing','power','automation','gunsmith','repair',
  'vehicle','aviation','marine','cooking','farming','fishing','hunting','hazard','recovery',
  'stealth','scavenge','mobility','tracking'
]

function pdztAdd(values,key,amount){values[key]=(values[key]||0)+amount}

function pdztValues(player){
  let values={health:0,speed:0,armor:0,toughness:0,knockback:0,luck:0,melee:0,attackSpeed:0}
  PDZT_CUSTOM_KEYS.forEach(key=>values[key]=0)
  Object.keys(PDZT_BRANCHES).forEach(sector=>PDZT_BRANCHES[sector].forEach(branch=>{
    let rank=pdztCount(player,sector,branch), effects=PDZT_EFFECTS[sector][branch]
    Object.keys(effects).forEach(key=>pdztAdd(values,key,effects[key]*rank))
  }))
  return values
}

function pdztApplyAttribute(player,key,amount,operation){
  let data=PDZT_ATTR[key]
  player.removeAttribute(data[0],data[1])
  if(Math.abs(amount)>0.000001)player.modifyAttribute(data[0],data[1],amount,operation)
}

function pdztApply(player){
  let v=pdztValues(player)
  // General combat/defence attributes are now owned by Mine and Slash in
  // project_deadzone_mns_progression_bridge_v0_1.js. Remove old modifiers so
  // migrated players do not receive the same Talent twice. The values below
  // remain available to TaCZ, medical, vehicle and survival bridge scripts.
  pdztApplyAttribute(player,'health',0,'addition')
  pdztApplyAttribute(player,'speed',0,'multiply_base')
  pdztApplyAttribute(player,'armor',0,'addition')
  pdztApplyAttribute(player,'toughness',0,'addition')
  pdztApplyAttribute(player,'knockback',0,'addition')
  pdztApplyAttribute(player,'luck',0,'addition')
  pdztApplyAttribute(player,'melee',0,'multiply_base')
  pdztApplyAttribute(player,'attackSpeed',0,'multiply_base')
  PDZT_CUSTOM_KEYS.forEach(key=>player.persistentData.putDouble('dz_talent_effect_'+key,v[key]))
  player.persistentData.putDouble('dz_talent_effect_health',v.health)
  player.persistentData.putDouble('dz_talent_effect_speed',v.speed)
  player.persistentData.putDouble('dz_talent_effect_armor',v.armor)
  player.persistentData.putDouble('dz_talent_effect_toughness',v.toughness)
  player.persistentData.putDouble('dz_talent_effect_knockback',v.knockback)
  player.persistentData.putDouble('dz_talent_effect_luck',v.luck)
  player.persistentData.putDouble('dz_talent_effect_melee',v.melee)
  player.persistentData.putDouble('dz_talent_effect_attack_speed',v.attackSpeed)
  if(player.health>player.maxHealth)player.health=player.maxHealth
}

function pdztCount(player,sector,branch){
  let count=0
  let prefix='pdz_talent_node_talent_'+sector+'_'+branch+'_'
  for(let i=1;i<=15;i++) if(player.tags.contains(prefix+i)) count+=(i===4||i===8||i===13||i===15?1.5:1)
  ;[4,8].forEach(depth=>{
    if(player.tags.contains(prefix+'side'+depth+'_1'))count+=1
    if(player.tags.contains(prefix+'side'+depth+'_2'))count+=1.5
  })
  if(player.tags.contains(prefix+'keystone')) count+=3
  if(player.tags.contains(prefix+'master_power')) count+=6
  if(player.tags.contains(prefix+'master_utility')) count+=4
  // Doctrine routes begin after the mutually-exclusive Mastery choice.
  // Power keeps full branch scaling; Utility trades half of it for the
  // general-purpose attributes embedded directly in each tree node.
  for(let i=16;i<=20;i++){
    if(player.tags.contains(prefix+'power_'+i))count+=(i===18||i===20?1.5:1)
    if(player.tags.contains(prefix+'utility_'+i))count+=(i===18||i===20?0.75:0.5)
  }
  if(player.tags.contains(prefix+'doctrine_power'))count+=8
  if(player.tags.contains(prefix+'doctrine_utility'))count+=4
  return count
}

function pdztRefresh(player){
  if(!player||player.level.clientSide)return
  Object.keys(PDZT_BRANCHES).forEach(sector=>PDZT_BRANCHES[sector].forEach(branch=>{
    player.persistentData.putDouble('dz_talent_rank_'+sector+'_'+branch,pdztCount(player,sector,branch))
  }))
  pdztApply(player)
}

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(80,()=>pdztRefresh(event.player)))
PlayerEvents.respawned(event=>event.server.scheduleInTicks(20,()=>pdztRefresh(event.player)))
PlayerEvents.tick(event=>{if(event.player.age%100===0)pdztRefresh(event.player)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonetalentstats')
  root.executes(ctx=>{
    let p=ctx.source.player
    pdztRefresh(p)
    p.tell(Text.of('=== TALENT EFFECT RANKS ===').gold())
    Object.keys(PDZT_BRANCHES).forEach(sector=>{
      let parts=[]
      PDZT_BRANCHES[sector].forEach(branch=>{
        let rank=p.persistentData.getDouble('dz_talent_rank_'+sector+'_'+branch)
        if(rank>0)parts.push(branch+' '+rank.toFixed(1)+'%')
      })
      if(parts.length>0)p.tell(Text.of(sector+': '+parts.join(' / ')).aqua())
    })
    let v=pdztValues(p)
    p.tell(Text.of('HP +'+v.health.toFixed(1)+' / Armor +'+v.armor.toFixed(1)+' / Toughness +'+v.toughness.toFixed(1)).green())
    p.tell(Text.of('Move '+(v.speed*100).toFixed(1)+'% / Melee '+(v.melee*100).toFixed(1)+'% / Attack Speed '+(v.attackSpeed*100).toFixed(1)+'%').red())
    p.tell(Text.of('Gun '+(v.gunDamage*100).toFixed(1)+'% / Reload '+(v.reload*100).toFixed(1)+'% / Healing '+(v.healing*100).toFixed(1)+'%').aqua())
    p.tell(Text.of('Carry +'+v.carry.toFixed(1)+'kg / Fishing '+(v.fishing*100).toFixed(1)+'% / Scavenge '+(v.scavenge*100).toFixed(1)+'%').yellow())
    p.tell(Text.of('All 32 branches include Advanced, Mastery and Doctrine scaling.').gray())
    return 1
  })
  event.register(root)
})
