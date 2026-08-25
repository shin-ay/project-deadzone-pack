// PROJECT DEADZONE JOB Unlocks v0.1 - test profile
// Career promotion grants one-time field equipment and production bonuses.
// Recipes themselves are universal and are never gated by JOB or World Tier.

const PDZ_JOB_STAGE_UNLOCKS = {
  ground_tech:[['dz_mechanics_vehicle_1',0]],
  convoy_master:[['dz_mechanics_vehicle_2',1]],
  armor_mechanic:[['dz_mechanics_vehicle_2',1]],
  ace_pilot:[['dz_mechanics_vehicle_3',2]],
  crew_chief:[['dz_mechanics_vehicle_3',2]],
  automation:[['dz_engineering_industry_1',0]],
  systems_engineer:[['dz_engineering_industry_2',1]],
  industrial_architect:[['dz_engineering_industry_2',1],['dz_engineering_industry_3',2],['dz_engineering_fortification_1',1],['dz_engineering_fortification_2',2]],
  gunsmith:[['dz_engineering_weapons_1',0]],
  weapon_engineer:[['dz_engineering_weapons_2',1],['dz_engineering_weapons_3',2]],
  ordnance_specialist:[['dz_engineering_weapons_2',1],['dz_engineering_weapons_3',2],['dz_engineering_fortification_2',1],['dz_engineering_fortification_3',2]]
}

const PDZ_JOB_PROMOTION_KITS = {
  scavenger:[['kubejs:career_salvage_scanner',1]], adapter:[['kubejs:career_survival_rig',1]],
  marksman:[['kubejs:career_rangefinder',1]], assault:[['kubejs:career_assault_injector',1]],
  surgeon:[['kubejs:career_trauma_station',1]], combat_medic:[['kubejs:career_responder_beacon',1]],
  ground_tech:[['kubejs:career_diagnostic_tool',1]], pilot:[['kubejs:career_flight_computer',1]],
  automation:[
    ['kubejs:career_control_tablet',1],
    ['createmechanicalcompanion:mechanical_wolf_link',1],
    ['createmechanicalcompanion:mob_radar',1],
    ['createmechanicalcompanion:mounted_light',1]
  ], gunsmith:[['kubejs:career_gunsmith_gauge',1]],
  recon:[['kubejs:career_recon_sensor',1]], infiltrator:[['kubejs:career_signal_jammer',1]],
  guardian:[['kubejs:career_barrier_projector',1]], enforcer:[['kubejs:career_breaching_actuator',1]],
  provider:[['kubejs:career_field_cooker',1]], ranger:[['kubejs:career_tracking_module',1]]
}

// T3 enhances the T2 device itself; it intentionally does not add another
// inventory item. This keeps one career tool relevant through both ranks.
// T3 rewards are one-time promotion equipment. Combat items are normalized by
// the M&S bridge and may be replaced by stronger loot without losing JOB power.
const PDZ_JOB_T3_KIT = {
  quartermaster:[['survival_instinct:military_chestplate',1,'{}','Quartermaster Load-Bearing Vest']],
  prospector:[['immersiveengineering:drill',1,'{}','Deep-Core Prospector Drill']],
  expeditionist:[['survival_instinct:artic_guillie_boots',1,'{}','Whiteout Expedition Boots']],
  wasteland_veteran:[['survival_instinct:exo_chestplate',1,'{}','Veteran Exo Rig']],
  sniper:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"SEMI",GunId:"tacz:m700",HasBulletInBarrel:1b}','Long Silence']],
  overwatch:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"AUTO",GunId:"tacz:hk_mp5a5",HasBulletInBarrel:1b}','Watchtower']],
  gunner:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"AUTO",GunId:"tacz:ak47",HasBulletInBarrel:1b}','Endless Argument']],
  breacher:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"SEMI",GunId:"tacz:m870",HasBulletInBarrel:1b}','Door Knocker']],
  trauma_specialist:[['survival_instinct:hazmat_helmet',1,'{}','Trauma Isolation Hood']],
  lifesaver:[['survival_instinct:medkit_bag',1,'{}','Lifesaver Field Kit']],
  bio_support:[['survival_instinct:hazmat_chestplate',1,'{}','Bio-Support Carrier']],
  rescue_operator:[['survival_instinct:fire_fighter_chestplate',1,'{}','Rescue Operator Coat']],
  convoy_master:[['survival_instinct:motorcycle_helmet',1,'{}','Convoy Command Helmet']],
  armor_mechanic:[['survival_instinct:exo_heavy_black_chestplate',1,'{}','Armor Mechanic Exo Plate']],
  ace_pilot:[['immersive_aircraft:gyroscope_hud',1,'{}','Ace Gyroscopic HUD']],
  crew_chief:[['immersiveengineering:maintenance_kit',1,'{}','Crew Chief Service Kit']],
  systems_engineer:[
    ['immersiveengineering:powerpack',1,'{}','Systems Engineer Powerpack'],
    ['createmechanicalcompanion:regenerative_casing',1]
  ],
  industrial_architect:[
    ['immersiveengineering:buzzsaw',1,'{}','Industrial Architect Saw'],
    ['createmechanicalcompanion:reinforced_plates',1],
    ['createmechanicalcompanion:mounted_crossbow',1]
  ],
  weapon_engineer:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"AUTO",GunId:"tacz:m4a1",HasBulletInBarrel:1b}','Perfect Standard']],
  ordnance_specialist:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"AUTO",GunId:"tacz:ump45",HasBulletInBarrel:1b}','Controlled Detonation']],
  pathfinder:[['survival_instinct:guillie_boots',1,'{}','Pathfinder Trail Boots']],
  spotter:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"AUTO",GunId:"tacz:p90",HasBulletInBarrel:1b}','Forward Observer']],
  ghost:[['survival_instinct:spruce_guillie_chestplate',1,'{}','Ghost Shroud']],
  saboteur:[['tacz:modern_kinetic_gun',1,'{GunFireMode:"AUTO",GunId:"tacz:uzi",HasBulletInBarrel:1b}','Short Circuit']],
  bulwark:[['survival_instinct:green_juggernaut_chestplate',1,'{}','Bulwark Juggernaut Plate']],
  sentinel:[['survival_instinct:military_helmet',1,'{}','Sentinel Command Helmet']],
  juggernaut:[['survival_instinct:black_juggernaut_chestplate',1,'{}','Blackwall Assault Plate']],
  riot_leader:[['survival_instinct:swat_shield',1,'{}','Riot Leader Shield']],
  angler:[['aquaculture:neptunium_fishing_rod',1,'{}','Abyssal Angler Rod']],
  chef:[['aquaculture:neptunium_fillet_knife',1,'{}','Chef Precision Fillet Knife']],
  hunter:[['survival_instinct:tactical_knife',1,'{}','Hunter Trophy Knife']],
  homesteader:[['survival_instinct:sickle',1,'{}','Homesteader Harvest Sickle']]
}

const PDZ_JOB_T3_EQUIPMENT_EFFECT = {
  quartermaster:'敵物資回収量上昇 / 携行上限強化', prospector:'鉱石採掘時に副産物を発見',
  expeditionist:'長距離移動で吸収HPを獲得', wasteland_veteran:'瀕死時に緊急再生・耐性',
  sniper:'ヘッドショット撃破でGhost Focus', overwatch:'射撃撃破で周囲の味方を支援',
  gunner:'射撃撃破で制圧耐性・吸収HP', breacher:'射撃撃破で突破用近接バフ',
  trauma_specialist:'医療品の再生効果を大幅強化', lifesaver:'周囲の味方を定期回復',
  bio_support:'毒を自動除去', rescue_operator:'周囲の味方へ移動支援',
  convoy_master:'車両部品の回収率上昇', armor_mechanic:'車両・装甲部品の回収率上昇',
  ace_pilot:'常時落下制御', crew_chief:'車両・航空部品の回収率上昇',
  systems_engineer:'工業部品の追加生産と回収', industrial_architect:'工業・要塞部品の追加生産と回収',
  weapon_engineer:'弾薬部品の追加生産と回収', ordnance_specialist:'弾薬・爆発物部品の追加生産と回収',
  pathfinder:'長距離移動で加速', spotter:'広範囲の敵を索敵表示',
  ghost:'しゃがみ中に高速隠密', saboteur:'撃破後に短時間隠密',
  bulwark:'瀕死時に強力な耐性', sentinel:'周囲の味方へ防御Aura',
  juggernaut:'撃破時に強力な攻撃バフ', riot_leader:'周囲の味方へ攻撃Aura',
  angler:'食事後にLuck・釣り性能強化', chef:'食事で再生・吸収HP',
  hunter:'狩猟素材・戦闘性能強化', homesteader:'収穫時に栽培副産物'
}

function pdzJobWorldTier(player) {
  for (let i=5;i>=0;i--) if (player.stages.has('deadzone_tier_'+i)) return i
  return 0
}

function pdzJobApplyIdentity(stack,id,tier,name) {
  let root=stack.nbt||{}
  root.PDZCareerTier=tier
  root.PDZCareerLoreVersion=2
  if (tier===3) {
    // Old T3 grants were unbreakable and career-locked. The role ability is
    // already owned by the selected JOB, so the physical reward is a sidegrade.
    try {
      root.remove('Unbreakable')
      root.remove('HideFlags')
      root.remove('PDZCareerRequired')
    } catch(ignored) {
      delete root.Unbreakable
      delete root.HideFlags
      delete root.PDZCareerRequired
    }
    root.PDZCareerOrigin=id
  } else {
    root.PDZCareerRequired=id
  }
  root.display=root.display||{}
  root.display.Lore=tier===3?[
    JSON.stringify({text:'T3昇格時の保証装備 / 交換・更新可能',color:'gold',italic:false}),
    JSON.stringify({text:'支給元専門職: '+id,color:'gray',italic:false}),
    JSON.stringify({text:'JOB能力はこの装備を交換した後も維持される',color:'aqua',italic:false})
  ]:[
    JSON.stringify({text:'JOB専用装備 / 譲渡不可',color:'gold',italic:false}),
    JSON.stringify({text:'必要専門職: '+id,color:'gray',italic:false}),
    JSON.stringify({text:'右クリックで専用能力を発動',color:'aqua',italic:false}),
    JSON.stringify({text:'T3昇格後に効果強化',color:'light_purple',italic:false})
  ]
  if (name) {
    root.PDZCareerWeaponName=name
    root.display.Name=JSON.stringify({text:name,color:'light_purple',italic:false})
  }
  stack.nbt=root
}

function pdzJobBuildStack(spec,id,tier,player) {
  let stack=spec[2]?Item.of(spec[0],spec[1],spec[2]):Item.of(spec[0],spec[1])
  if (stack.isEmpty()) return stack
  pdzJobApplyIdentity(stack,id,tier,spec[3])
  return stack
}

function pdzJobMigrateInventory(player) {
  let inv=player.getInventory(),changed=0
  for (let slot=0;slot<inv.getContainerSize();slot++) {
    let stack=inv.getItem(slot)
    if (!stack||stack.empty||!stack.nbt) continue
    let root=stack.nbt,tier=Number(root.PDZCareerTier||0)
    let id=String(root.PDZCareerRequired||root.PDZCareerOrigin||'')
    if (!id||Number(root.PDZCareerLoreVersion||0)>=2) continue
    pdzJobApplyIdentity(stack,id,tier,String(root.PDZCareerWeaponName||''))
    changed++
  }
  return changed
}

function pdzJobGiveSpec(player,spec,id,tier) {
  let stack=pdzJobBuildStack(spec,id,tier,player)
  if (!stack.isEmpty()) {player.give(stack);return true}
  console.error('[PROJECT DEADZONE][JOB KIT] Invalid item: '+spec[0])
  return false
}

function pdzJobGiveKit(player,id,tier) {
  // v4 replaces vanilla placeholders with unique modded signature equipment.
  let key='dz_career_kit_v4_t'+tier+'_'+id
  if (player.persistentData.getBoolean(key)) return
  let kit=(tier===2?PDZ_JOB_PROMOTION_KITS:PDZ_JOB_T3_KIT)[id]||[]
  kit.forEach(spec=>pdzJobGiveSpec(player,spec,id,tier))
  player.persistentData.putBoolean(key,true)
  if (kit.length>0) player.tell(Text.of('[JOB] 昇格専用支給品を受領しました。').aqua())
}

function pdzJobHasSpec(player,spec,id,tier) {
  // New grants carry a career tag. Old T2 saves may still have an untagged
  // unique device, so its item ID is accepted as a migration fallback.
  let tagged=spec[0]+'{PDZCareerRequired:"'+id+'",PDZCareerTier:'+tier+'}'
  if (player.server.runCommandSilent('clear '+player.username+' '+tagged+' 0')>0) return true
  return tier===2 && player.server.runCommandSilent('clear '+player.username+' '+spec[0]+' 0')>0
}

function pdzJobRecoverMissing(player,tier,id) {
  if (!id) return false
  let kit=(tier===2?PDZ_JOB_PROMOTION_KITS:PDZ_JOB_T3_KIT)[id]||[],recovered=0
  kit.forEach(spec=>{
    if (!pdzJobHasSpec(player,spec,id,tier) && pdzJobGiveSpec(player,spec,id,tier)) recovered++
  })
  if (recovered>0) player.tell(Text.of('[JOB] 紛失した専用装備 '+recovered+'点を再支給しました。').aqua())
  return recovered>0
}

function pdzJobEnforceSignature(player) {
  let selectedT2=String(player.persistentData.getString('dz_career_t2'))
  let selectedT3=String(player.persistentData.getString('dz_career_t3')),bad=false
  let stacks=[player.mainHandItem,player.offHandItem]
  try {player.armorSlots.forEach(stack=>stacks.push(stack))} catch(ignored) {}
  stacks.forEach(stack=>{
    if (!stack||stack.empty||!stack.nbt)return
    let required=String(stack.nbt.PDZCareerRequired||'')
    let tier=Number(stack.nbt.PDZCareerTier||0)
    let selected=tier===2?selectedT2:selectedT3
    if (required&&required!==selected) bad=true
  })
  if (bad) {
    player.potionEffects.add('minecraft:weakness',30,4,false,false)
    player.potionEffects.add('minecraft:mining_fatigue',30,2,false,false)
    if (player.age%100===0) player.tell(Text.of('[JOB] この専用装備は現在の専門職では使用できません。').red())
  }
}

// T2 devices remain career actions. T3 promotion equipment no longer carries
// PDZCareerRequired and is governed by normal M&S level/stat requirements.
ItemEvents.rightClicked(event=>{
  let p=event.player,stack=event.item
  if (!p||p.level.clientSide||!stack||!stack.nbt) return
  let required=String(stack.nbt.PDZCareerRequired||'')
  if (!required) return
  let tier=Number(stack.nbt.PDZCareerTier||0)
  let selected=String(p.persistentData.getString(tier===2?'dz_career_t2':'dz_career_t3'))
  if (selected===required) return
  event.cancel()
  p.tell(Text.of('[JOB] この装備は '+required+' 専用です。').red())
})

function pdzJobSyncUnlocks(player,announce) {
  let t2=String(player.persistentData.getString('dz_career_t2'))
  let t3=String(player.persistentData.getString('dz_career_t3'))
  if (t2) pdzJobGiveKit(player,t2,2)
  if (t3) pdzJobGiveKit(player,t3,3)
  let tier=pdzJobWorldTier(player)
  ;[t2,t3].forEach(id=>(PDZ_JOB_STAGE_UNLOCKS[id]||[]).forEach(entry=>{
    let stage=entry[0],neededTier=entry[1]
    if (tier>=neededTier) {
      // recipe_stage_sync treats the same-named tag as the source of truth.
      // Adding both keeps the career route compatible with its 40-tick sync.
      if (!player.tags.contains(stage)) player.addTag(stage)
      if (!player.stages.has(stage)) {
        player.stages.add(stage)
        if (announce) player.tell(Text.of('[JOB RECIPE] '+stage+' を解禁しました。').gold())
      }
    }
  }))
}

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(100,()=>{
  pdzJobSyncUnlocks(event.player,true)
  pdzJobMigrateInventory(event.player)
}))
PlayerEvents.respawned(event=>event.server.scheduleInTicks(20,()=>{
  pdzJobSyncUnlocks(event.player,false)
}))
PlayerEvents.tick(event=>{
  if(event.player.age%20===0)pdzJobEnforceSignature(event.player)
  if(event.player.age%200===0)pdzJobSyncUnlocks(event.player,false)
  if(event.player.age%400===0)pdzJobMigrateInventory(event.player)
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonecareer_unlocks').requires(s=>s.hasPermission(2))
  root.then(Commands.literal('t3_test_menu').executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of('=== T3 Signature Equipment Test ===').gold())
    Object.keys(PDZ_JOB_T3_KIT).forEach(id=>p.tell(Text.of('[ '+id+' ]').lightPurple().clickRunCommand('/deadzonecareer_unlocks test_'+id)))
    return 1
  }))
  Object.keys(PDZ_JOB_T3_KIT).forEach(id=>root.then(Commands.literal('test_'+id).executes(ctx=>{
    let p=ctx.source.player,key='dz_career_kit_v4_t3_'+id
    p.persistentData.putBoolean(key,false)
    pdzJobGiveKit(p,id,3)
    return 1
  })))
  root
    .then(Commands.literal('recover_missing').executes(ctx=>{
      let p=ctx.source.player,recovered=false
      recovered=pdzJobRecoverMissing(p,2,String(p.persistentData.getString('dz_career_t2')))||recovered
      if (!recovered) p.tell(Text.of('[JOB] 現在のT2専用デバイスに不足はありません。T3保証装備は一度だけ支給されます。').green())
      return 1
    }))
    .then(Commands.literal('validate').executes(ctx=>{
      let p=ctx.source.player,invalid=0,total=0,missingEffect=0
      ;[[2,PDZ_JOB_PROMOTION_KITS],[3,PDZ_JOB_T3_KIT]].forEach(group=>{
        let tier=group[0],kits=group[1]
        Object.keys(kits).forEach(id=>(kits[id]||[]).forEach(spec=>{
          total++
          let stack=spec[2]?Item.of(spec[0],spec[1],spec[2]):Item.of(spec[0],spec[1])
          if(stack.isEmpty()){
            invalid++
            p.tell(Text.of('[INVALID T'+tier+'] '+id+' -> '+spec[0]).red())
          }
        }))
      })
      Object.keys(PDZ_JOB_T3_KIT).forEach(id=>{
        if (!PDZ_JOB_T3_EQUIPMENT_EFFECT[id]) {
          missingEffect++
          p.tell(Text.of('[MISSING EFFECT] '+id).red())
        }
      })
      p.tell(Text.of('[JOB KIT] '+total+' items / invalid '+invalid+' / T3 careers '+Object.keys(PDZ_JOB_T3_KIT).length+' / missing effects '+missingEffect)[invalid===0&&missingEffect===0?'green':'red']())
      return invalid===0&&missingEffect===0?1:0
    }))
    .then(Commands.literal('sync').executes(ctx=>{pdzJobSyncUnlocks(ctx.source.player,true);return 1}))
    .then(Commands.literal('status').executes(ctx=>{
      let p=ctx.source.player,t2=String(p.persistentData.getString('dz_career_t2')),t3=String(p.persistentData.getString('dz_career_t3'))
      p.tell(Text.of('=== JOB Unlock Status ===').gold())
      p.tell(Text.of('World Tier: T'+pdzJobWorldTier(p)+' / T2: '+(t2||'-')+' / T3: '+(t3||'-')).aqua())
      ;[t2,t3].forEach(id=>(PDZ_JOB_STAGE_UNLOCKS[id]||[]).forEach(e=>p.tell(Text.of((p.stages.has(e[0])?'OPEN ':'LOCK ')+e[0]+' (T'+e[1]+')')[p.stages.has(e[0])?'green':'gray']())))
      return 1
    }))
  event.register(root)
})
