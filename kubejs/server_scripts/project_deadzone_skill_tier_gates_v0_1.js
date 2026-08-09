// PROJECT DEADZONE Skill Tier Gates v0.1
// Uses PufferfishSkillsJS to prevent unlocking skills above the shared World Tier.

const DZ_SKILL_GATE_DATA = {
  armor: [
    ["armor_core_1"],
    ["armor_core_2", "light_footed", "reinforced_stance", "shock_absorption"],
    ["armor_core_3", "armor_core_4", "mobile_bulwark", "juggernaut", "last_stand"],
    ["armor_core_5", "armor_core_6", "assault_armor", "immovable", "second_wind"]
  ],
  engineering: [
    ["engineering_core_1"],
    ["engineering_core_2", "workshop_basics", "field_construction", "arms_fabrication"],
    ["engineering_core_3", "engineering_core_4", "industrial_engineer", "fortification_expert", "weapons_engineer"],
    ["engineering_core_5", "engineering_core_6", "automation_expert", "stronghold_architect", "ordnance_master"]
  ],
  firearms: [
    ["firearms_core_1"],
    ["firearms_core_2", "ammo_discipline", "steady_hand", "field_maintenance"],
    ["firearms_core_3", "firearms_core_4", "tactical_reload", "mobile_operator", "quick_recovery"],
    ["firearms_core_5", "firearms_core_6", "last_magazine", "controlled_burst", "field_gunsmith"]
  ],
  fitness: [
    ["fitness_core_1"],
    ["fitness_core_2", "pack_training", "conditioning", "agile_step"],
    ["fitness_core_3", "fitness_core_4", "load_bearer", "marathoner", "evasive_movement"],
    ["fitness_core_5", "fitness_core_6", "human_mule", "second_lung", "parkour_master"]
  ],
  mechanics: [
    ["mechanics_core_1"],
    ["mechanics_core_2", "field_repair", "parts_recovery", "bike_technician"],
    ["mechanics_core_3", "mechanics_core_4", "master_mechanic", "strip_expert", "vehicle_specialist"],
    ["mechanics_core_5", "mechanics_core_6", "miracle_worker", "salvage_master", "motor_pool_chief"]
  ],
  medical: [
    ["medical_core_1"],
    ["medical_core_2", "first_responder", "careful_application", "triage"],
    ["medical_core_3", "medical_core_4", "trauma_care", "supply_saver", "combat_medic"],
    ["medical_core_5", "medical_core_6", "field_surgeon", "pharmacist", "life_saver"]
  ],
  melee: [
    ["melee_core_1"],
    ["melee_core_2", "heavy_strikes", "crowd_control", "endurance"],
    ["melee_core_3", "melee_core_4", "executioner", "stagger_specialist", "relentless"],
    ["melee_core_5", "melee_core_6", "finishing_blow", "line_breaker", "battle_trance"]
  ],
  reload: [
    ["reload_core_1"],
    ["reload_core_2", "quick_hands", "magazine_discipline", "clearing_drills"],
    ["reload_core_3", "reload_core_4", "combat_reload", "retention", "emergency_action"],
    ["reload_core_5", "reload_core_6", "speed_loader", "ammo_cycle", "failure_proof"]
  ],
  scavenging: [
    ["scavenging_core_1"],
    ["scavenging_core_2", "keen_eye", "careful_salvage", "pathfinder"],
    ["scavenging_core_3", "scavenging_core_4", "hidden_cache", "resourceful", "urban_scout"],
    ["scavenging_core_5", "scavenging_core_6", "treasure_sense", "nothing_wasted", "city_ghost"]
  ],
  survival: [
    ["survival_core_1"],
    ["survival_core_2", "rationing", "campcraft", "weathered"],
    ["survival_core_3", "survival_core_4", "efficient_metabolism", "outdoorsman", "adapted", "angler", "waterside_forager", "self_sufficient_waterside", "cook_field_kitchen", "cook_batch_cooking", "cook_preservation"],
    ["survival_core_5", "survival_core_6", "iron_stomach", "wilderness_home", "hazard_hardened", "angler_bait_keeper", "angler_deep_reader", "cook_team_meal", "cook_waste_nothing"]
  ]
}

function dzSkillGateWorldTier(player) {
  for (let tier = 5; tier >= 0; tier--) {
    if (player.stages.has("deadzone_tier_" + tier)) return tier
  }
  return 0
}

function dzSyncSkillTierGates(player, notify) {
  let worldTier = dzSkillGateWorldTier(player)

  Object.keys(DZ_SKILL_GATE_DATA).forEach(category => {
    let tierGroups = DZ_SKILL_GATE_DATA[category]
    tierGroups.forEach((skills, requiredTier) => {
      skills.forEach(skill => {
        if (worldTier >= requiredTier) {
          PufferfishSkills.allowSkillUnlock(player, category, skill)
        } else {
          PufferfishSkills.disallowSkillUnlock(player, category, skill)
        }
      })
    })
  })

  player.persistentData.putBoolean("dz_skill_gate_initialized", true)
  player.persistentData.putInt("dz_skill_gate_world_tier", worldTier)
  if (notify) {
    player.tell(Text.of(
      "スキル取得上限をWorld Tier T" + worldTier + "へ同期しました。"
    ).aqua())
  }
}

PlayerEvents.loggedIn(event => {
  event.player.server.scheduleInTicks(20, callback => {
    if (event.player && event.player.alive) dzSyncSkillTierGates(event.player, false)
  })
})

PlayerEvents.respawned(event => {
  dzSyncSkillTierGates(event.player, false)
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 100 !== 0) return

  let tier = dzSkillGateWorldTier(player)
  if (!player.persistentData.getBoolean("dz_skill_gate_initialized")
    || player.persistentData.getInt("dz_skill_gate_world_tier") !== tier) {
    dzSyncSkillTierGates(player, true)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneskillgate")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let tier = dzSkillGateWorldTier(player)
    player.tell(Text.of("Skill Gate: World Tier T" + tier).gold())
    player.tell(Text.of("T0: Core Lv1").gray())
    player.tell(Text.of("T1: Core Lv2 / Perk Tier 1").green())
    player.tell(Text.of("T2: Core Lv3-4 / Perk Tier 2").aqua())
    player.tell(Text.of("T3: Core Lv5-6 / Perk Tier 3").lightPurple())
    return 1
  }))

  root.then(Commands.literal("sync")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      dzSyncSkillTierGates(ctx.source.player, true)
      return 1
    }))

  event.register(root)
})
