// PROJECT DEADZONE - TAA isolated local pilot v0.1
//
// TAA is only the TaCZ-native property executor during this pilot. PDZ's
// existing firearm hook remains the sole damage owner, so none of these test
// profiles changes TAA gun-damage attributes.

// Ownership contract while TaCZ Tweaks and TAA coexist:
// - TaCZ Tweaks: controls, movement/QoL and compatibility only.
// - TAA: TaCZ-native build properties (handling, precision, multishot, etc.).
// - PDZ + M&S: weapon baseline/rules and final combat resolution.
// TaCZ Tweaks' entire modifiers section must remain neutral (0 / 1 / empty).

const DZ_TAA_DEFAULTS = {
  'taa:ads_time': 1.0,
  'taa:ammo_speed': 1.0,
  'taa:armor_ignore': 1.0,
  'taa:effective_range': 1.0,
  'taa:explosion_radius': 1.0,
  'taa:explosion_damage': 1.0,
  'taa:explosion_knockbacknew': 1.0,
  'taa:explosion_destroy_blocknew': 1.0,
  'taa:explosion_delay': 1.0,
  'taa:explosion_enabled': 1.0,
  'taa:move_speed': 1.0,
  'taa:headshot_multiplier': 1.0,
  'taa:ignitefire': 1.0,
  'taa:inaccuracy': 1.0,
  'taa:inaccuracy_stand': 1.0,
  'taa:inaccuracy_move': 1.0,
  'taa:inaccuracy_sneak': 1.0,
  'taa:inaccuracy_lie': 1.0,
  'taa:inaccuracy_aim': 1.0,
  'taa:knockback': 1.0,
  'taa:pierce': 1.0,
  'taa:recoil': 1.0,
  'taa:recoil_pitch': 1.0,
  'taa:recoil_yaw': 1.0,
  'taa:rounds_per_minute': 1.0,
  'taa:silencenew': 1.0,
  'taa:weight': 1.0,
  'taa:bullet_count': 1.0,
  'taa:magazine_capacity': 1.0,
  'taa:reload_time': 1.0,
  'taa:melee_damage': 1.0,
  'taa:melee_distance': 0.0,
  'taa:heat_max': 1.0,
  'taa:heat_cooling': 1.0,
  'taa:heat_cooling_delay': 1.0,
  'taa:heat_overheat_time': 1.0,
  'taa:bullet_gundamage': 1.0,
  'taa:bullet_gundamage_pistol': 1.0,
  'taa:bullet_gundamage_rifle': 1.0,
  'taa:bullet_gundamage_shotgun': 1.0,
  'taa:bullet_gundamage_sniper': 1.0,
  'taa:bullet_gundamage_smg': 1.0,
  'taa:bullet_gundamage_lmg': 1.0,
  'taa:bullet_gundamage_launcher': 1.0
}

const DZ_TAA_PROFILES = {
  handling: {
    'taa:ads_time': 0.80,
    'taa:reload_time': 0.75,
    'taa:recoil': 0.70,
    'taa:inaccuracy': 0.82,
    'taa:magazine_capacity': 1.25
  },
  precision: {
    'taa:effective_range': 1.30,
    'taa:ammo_speed': 1.20,
    'taa:headshot_multiplier': 1.35,
    'taa:armor_ignore': 1.25,
    'taa:knockback': 1.40
  },
  multishot: {
    'taa:bullet_count': 2.0,
    'taa:recoil': 1.20,
    'taa:inaccuracy': 1.15
  },
  incendiary: {
    // TAA enables ignition only above its boolean threshold.
    'taa:ignitefire': 2.10
  }
}

function dzTaaSet(player, attribute, value) {
  player.runCommandSilent('attribute @s ' + attribute + ' base set ' + value)
}

function dzTaaReset(player) {
  Object.keys(DZ_TAA_DEFAULTS).forEach(attribute => {
    dzTaaSet(player, attribute, DZ_TAA_DEFAULTS[attribute])
  })
  player.persistentData.putString('dz_taa_pilot_profile', 'baseline')
}

function dzTaaApply(player, name) {
  dzTaaReset(player)
  let profile = DZ_TAA_PROFILES[name]
  Object.keys(profile).forEach(attribute => dzTaaSet(player, attribute, profile[attribute]))
  player.persistentData.putString('dz_taa_pilot_profile', name)
  player.tell(Text.of('[TAA PILOT] ' + name + ' を適用。持ち替え後に銃詳細と実射を確認してください。').aqua())
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonetaa').requires(source => source.hasPermission(2))

  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let profile = String(player.persistentData.getString('dz_taa_pilot_profile')) || 'baseline'
    player.tell(Text.of('[TAA PILOT] profile=' + profile + ' / damage owner=PDZ+M&S / TAA damage=1.0').aqua())
    player.tell(Text.of('確認順: handling → precision → multishot(単発銃推奨) → incendiary → clear').gray())
    return 1
  }))

  root.then(Commands.literal('ownership').executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of('[TAA/TWEAKS] TaCZ Tweaks = 操作・移動・MOD互換（数値Modifierは等倍固定）').gold())
    player.tell(Text.of('[TAA/TWEAKS] TAA = ADS・装填・反動・精度・弾数・弾道などのビルド補正').aqua())
    player.tell(Text.of('[TAA/TWEAKS] PDZ = 武器カテゴリ基準値・ランダム幅・特殊弾ルール').yellow())
    player.tell(Text.of('[TAA/TWEAKS] M&S = 装備Affix・防御・最終クリティカル・HP').lightPurple())
    return 1
  }))

  Object.keys(DZ_TAA_PROFILES).forEach(name => {
    root.then(Commands.literal(name).executes(ctx => {
      dzTaaApply(ctx.source.player, name)
      return 1
    }))
  })

  root.then(Commands.literal('clear').executes(ctx => {
    dzTaaReset(ctx.source.player)
    ctx.source.player.tell(Text.of('[TAA PILOT] 全属性を標準値へ戻しました。').green())
    return 1
  }))

  event.register(root)
})
