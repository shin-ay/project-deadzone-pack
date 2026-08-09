// PROJECT DEADZONE Growth Effects v0.1
// Exact numeric effects for the six-category growth system.

const DZGFX = {
  health: ['minecraft:generic.max_health','d34db100-0000-4000-8000-000000000001'],
  speed: ['minecraft:generic.movement_speed','d34db100-0000-4000-8000-000000000002'],
  armor: ['minecraft:generic.armor','d34db100-0000-4000-8000-000000000003'],
  toughness: ['minecraft:generic.armor_toughness','d34db100-0000-4000-8000-000000000004'],
  knockback: ['minecraft:generic.knockback_resistance','d34db100-0000-4000-8000-000000000005'],
  luck: ['minecraft:generic.luck','d34db100-0000-4000-8000-000000000006'],
  meleeDamage: ['minecraft:generic.attack_damage','d34db100-0000-4000-8000-000000000007'],
  attackSpeed: ['minecraft:generic.attack_speed','d34db100-0000-4000-8000-000000000008']
}

// Base JOB passives. JOB defines the starting aptitude while Talents provide
// the large long-term scaling.
const DZGFX_JOB = {
  survivor:       {health:2, carry:10, luck:0.5},
  weapons_expert: {speed:0.02, attackSpeed:0.04},
  medic:          {health:2, speed:0.02},
  mechanic:       {health:2, carry:15},
  engineer:       {toughness:1, carry:10},
  scout:          {speed:0.05, luck:0.5},
  security:       {health:4, armor:2, toughness:1, knockback:0.10, meleeDamage:0.05},
  survivalist:    {health:2, luck:1.0, carry:5}
}

// Rank-2 career passives. These are deliberately smaller than a full Talent
// build, but they make the JOB choice matter immediately after promotion.
const DZGFX_CAREER_T2 = {
  scavenger:    {luck:1.0, carry:15},
  adapter:      {health:2, speed:0.02, toughness:0.5},
  marksman:     {speed:0.01, attackSpeed:0.03},
  assault:      {health:2, speed:0.03, attackSpeed:0.05},
  surgeon:      {health:2, luck:0.5},
  combat_medic: {health:2, armor:1, speed:0.02},
  ground_tech:  {toughness:0.5, carry:20},
  pilot:        {speed:0.03, luck:0.5},
  automation:   {toughness:0.5, carry:15},
  gunsmith:     {attackSpeed:0.03, luck:0.5},
  recon:        {speed:0.04, luck:1.0},
  infiltrator:  {speed:0.06, attackSpeed:0.02},
  guardian:     {health:4, armor:2, toughness:1, knockback:0.10},
  enforcer:     {health:2, meleeDamage:0.08, attackSpeed:0.04},
  provider:     {luck:1.0, carry:10},
  ranger:       {speed:0.04, luck:1.0, meleeDamage:0.05}
}

// Rank-3 specialization passives. These stack with the selected Rank-2
// career and provide the first clearly recognizable role power spike.
const DZGFX_CAREER_T3 = {
  quartermaster:        {luck:1.0, carry:35},
  prospector:           {armor:1, luck:2.0},
  expeditionist:        {health:2, speed:0.05, carry:10},
  wasteland_veteran:    {health:4, armor:1, toughness:1},
  sniper:               {speed:0.02, attackSpeed:0.02, luck:1.0},
  overwatch:            {armor:1, speed:0.02, luck:1.0},
  gunner:               {health:2, attackSpeed:0.08, carry:10},
  breacher:             {armor:2, speed:0.03, meleeDamage:0.08},
  trauma_specialist:    {health:4, luck:1.0},
  lifesaver:            {health:4, speed:0.03},
  bio_support:          {health:4, toughness:1, luck:0.5},
  rescue_operator:      {health:2, armor:1, speed:0.05},
  convoy_master:        {armor:1, carry:40},
  armor_mechanic:       {armor:2, toughness:1, carry:25},
  ace_pilot:            {speed:0.06, luck:1.0},
  crew_chief:           {health:2, luck:0.5, carry:25},
  systems_engineer:     {toughness:1, carry:25},
  industrial_architect: {armor:1, carry:35},
  weapon_engineer:      {attackSpeed:0.05, luck:1.0},
  ordnance_specialist:  {armor:1, luck:1.0, carry:20},
  pathfinder:           {speed:0.07, luck:1.0},
  spotter:              {speed:0.04, luck:2.0},
  ghost:                {speed:0.08, attackSpeed:0.03, luck:1.0},
  saboteur:             {speed:0.05, meleeDamage:0.05, luck:1.0},
  bulwark:              {health:6, armor:4, toughness:2, knockback:0.15},
  sentinel:             {health:4, armor:3, speed:0.02},
  juggernaut:           {health:8, armor:3, toughness:2, knockback:0.15, meleeDamage:0.10},
  riot_leader:          {health:4, armor:2, meleeDamage:0.08, attackSpeed:0.05},
  angler:               {luck:2.0, carry:10},
  chef:                 {health:4, luck:1.0},
  hunter:               {speed:0.05, luck:2.0, meleeDamage:0.08},
  homesteader:          {health:4, luck:1.0, carry:20}
}

function dzgfxHas(p,suffix) { return p.tags.contains('dz_growth_' + suffix) }
function dzgfxAdd(p,key,amount,operation) {
  let data=DZGFX[key]
  p.removeAttribute(data[0],data[1])
  if (Math.abs(amount)>0.000001) p.modifyAttribute(data[0],data[1],amount,operation)
}

function dzgfxValues(p) {
  let v={health:0,speed:0,armor:0,toughness:0,knockback:0,luck:0,meleeDamage:0,attackSpeed:0,carry:0}
  let job=String(p.persistentData.getString('dz_job_id'))
  let base=DZGFX_JOB[job]
  if (base) Object.keys(base).forEach(k=>v[k]+=base[k])
  let tier2=String(p.persistentData.getString('dz_career_t2'))
  let career2=DZGFX_CAREER_T2[tier2]
  if (career2) Object.keys(career2).forEach(k=>v[k]+=career2[k])
  let tier3=String(p.persistentData.getString('dz_career_t3'))
  let career3=DZGFX_CAREER_T3[tier3]
  if (career3) Object.keys(career3).forEach(k=>v[k]+=career3[k])
  if (dzgfxHas(p,'survival_trailcraft')) v.speed+=0.02
  if (dzgfxHas(p,'survival_pathfinder')) v.speed+=0.04
  if (dzgfxHas(p,'survival_hardy')) {v.health+=2;v.toughness+=0.5}
  if (dzgfxHas(p,'survival_tracker')) v.luck+=0.5
  if (dzgfxHas(p,'survival_last_stand')) {v.health+=2;v.toughness+=1.0}
  if (dzgfxHas(p,'survival_apex_hunter')) {v.speed+=0.05;v.luck+=1.0}
  if (dzgfxHas(p,'survival_field_survivor')) {v.health+=4;v.toughness+=1.5}

  if (dzgfxHas(p,'scavenging_quick_hands')) v.speed+=0.02
  if (dzgfxHas(p,'scavenging_urban_eye')) {v.speed+=0.02;v.luck+=0.5}
  if (dzgfxHas(p,'scavenging_rare_finder')) v.luck+=1.5
  if (dzgfxHas(p,'scavenging_pack_rat')) v.carry+=15
  if (dzgfxHas(p,'scavenging_heavy_hauler')) v.carry+=25
  if (dzgfxHas(p,'scavenging_master_appraiser')) v.luck+=2.0
  if (dzgfxHas(p,'scavenging_master_hauler')) v.carry+=50

  if (dzgfxHas(p,'combat_melee_path')) {v.meleeDamage+=0.05;v.attackSpeed+=0.04}
  if (dzgfxHas(p,'combat_gun_path')) v.meleeDamage-=0.05
  if (dzgfxHas(p,'combat_guardian_path')) {v.health+=2;v.armor+=1}
  if (dzgfxHas(p,'combat_berserker')) {v.meleeDamage+=0.10;v.attackSpeed+=0.06}
  if (dzgfxHas(p,'combat_operator')) v.meleeDamage-=0.05
  if (dzgfxHas(p,'combat_tank')) {v.health+=4;v.armor+=2;v.toughness+=1.5;v.knockback+=0.10}
  if (dzgfxHas(p,'combat_executioner')) {v.meleeDamage+=0.15;v.attackSpeed+=0.08}
  if (dzgfxHas(p,'combat_marksman')) v.meleeDamage-=0.10
  if (dzgfxHas(p,'combat_bulwark')) {v.health+=4;v.armor+=3;v.toughness+=2;v.knockback+=0.15}
  return v
}

function dzgfxRefresh(p) {
  if (!p || p.level.clientSide) return
  let v=dzgfxValues(p)
  dzgfxAdd(p,'health',v.health,'addition')
  dzgfxAdd(p,'speed',v.speed,'multiply_base')
  dzgfxAdd(p,'armor',v.armor,'addition')
  dzgfxAdd(p,'toughness',v.toughness,'addition')
  dzgfxAdd(p,'knockback',v.knockback,'addition')
  dzgfxAdd(p,'luck',v.luck,'addition')
  dzgfxAdd(p,'meleeDamage',v.meleeDamage,'multiply_base')
  dzgfxAdd(p,'attackSpeed',v.attackSpeed,'multiply_base')
  p.persistentData.putInt('dz_growth_carry_bonus',v.carry)
  p.persistentData.putString('dz_effective_job',String(p.persistentData.getString('dz_job_id')))
  p.persistentData.putDouble('dz_effective_health_flat',v.health)
  p.persistentData.putDouble('dz_effective_speed_pct',v.speed*100)
  p.persistentData.putDouble('dz_effective_armor_flat',v.armor)
  p.persistentData.putDouble('dz_effective_toughness_flat',v.toughness)
  p.persistentData.putDouble('dz_effective_knockback_pct',v.knockback*100)
  p.persistentData.putDouble('dz_effective_melee_pct',v.meleeDamage*100)
  p.persistentData.putDouble('dz_effective_attack_speed_pct',v.attackSpeed*100)
  p.persistentData.putDouble('dz_effective_luck_flat',v.luck)
  p.persistentData.putInt('dz_effective_carry_kg',v.carry)
  if (p.health>p.maxHealth) p.health=p.maxHealth
}

PlayerEvents.loggedIn(e=>dzgfxRefresh(e.player))
PlayerEvents.respawned(e=>dzgfxRefresh(e.player))
PlayerEvents.tick(e=>{if(e.player.age%100===0) dzgfxRefresh(e.player)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonegrowthstats')
  root.executes(ctx=>{
    let p=ctx.source.player,v=dzgfxValues(p)
    p.tell(Text.of('=== 現在の成長ステータス ===').gold())
    p.tell(Text.of('最大HP +' + v.health.toFixed(1) + ' / 移動速度 ' + (v.speed>=0?'+':'') + (v.speed*100).toFixed(1) + '%').aqua())
    p.tell(Text.of('防具値 +' + v.armor.toFixed(1) + ' / 防具強度 +' + v.toughness.toFixed(1) + ' / KB耐性 +' + (v.knockback*100).toFixed(0) + '%').gray())
    p.tell(Text.of('近接攻撃力 ' + (v.meleeDamage>=0?'+':'') + (v.meleeDamage*100).toFixed(1) + '% / 攻撃速度 +' + (v.attackSpeed*100).toFixed(1) + '%').red())
    p.tell(Text.of('Luck +' + v.luck.toFixed(1) + ' / 携行上限 +' + v.carry + ' kg').green())
    return 1
  })
  event.register(root)
})
