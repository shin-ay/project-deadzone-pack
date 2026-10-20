// PROJECT DEADZONE starter loadout and certification v0.1
// Starter loadouts are one-time expedition supplies, not permanent classes.
// Certifications are non-exclusive GameStages that unlock specialist actions.

const PDZ_LOADOUT_VERSION = 1
const PDZ_LOADOUTS = {
  patrol: {
    name: "標準巡回",
    description: "拳銃と小型背包。探索と回収を試しやすい標準構成",
    gun: "tacz:glock_17", mode: "SEMI", ammo: "tacz:9mm", rounds: 40,
    items: [
      ["sophisticatedbackpacks:backpack", 1],
      ["survival_instinct:hand_axe", 1],
      ["survival_instinct:rope", 2]
    ]
  },
  close_quarters: {
    name: "近距離制圧",
    description: "SMGと閃光弾。屋内と近距離で扱いやすい構成",
    gun: "tacz:hk_mp5a5", mode: "AUTO", ammo: "tacz:9mm", rounds: 60,
    items: [
      ["tacz_tactical_breaching:flashbang_grenade", 2],
      ["survival_instinct:tactical_knife", 1]
    ]
  },
  breacher: {
    name: "突破",
    description: "散弾銃と修理用品。狭所と緊急対応を重視する構成",
    gun: "tacz:m870", mode: "SEMI", ammo: "tacz:12g", rounds: 24,
    items: [
      ["tacz_tactical_breaching:flashbang_grenade", 1],
      ["kubejs:field_repair_kit", 1],
      ["survival_instinct:tactical_knife", 1]
    ]
  },
  field_aid: {
    name: "救護",
    description: "拳銃と医療用品。負傷と感染への備えを厚くした構成",
    gun: "tacz:m1911", mode: "SEMI", ammo: "tacz:45acp", rounds: 30,
    items: [
      ["kubejs:field_medical_kit", 1],
      ["apocalypsenow:bandage", 4],
      ["apocalypsenow:morphine", 1]
    ]
  },
  scavenger: {
    name: "回収",
    description: "拳銃と探索用品。物資回収と地形確認を重視する構成",
    gun: "tacz:cz75", mode: "SEMI", ammo: "tacz:9mm", rounds: 36,
    items: [
      ["immersiveengineering:survey_tools", 1],
      ["survival_instinct:rope", 4],
      ["apocalypsenow:bandage", 2]
    ]
  }
}

const PDZ_LOADOUT_COMMON = [
  ["survival_instinct:bean_can", 1],
  ["survival_instinct:gallon_of_water", 1],
  ["apocalypsenow:bandage", 2]
]

const PDZ_CERTIFICATIONS = {
  field_medicine: {stage: "pdz_cert_field_medicine", name: "野外医療", description: "他者への高度処置と専門医療"},
  maintenance: {stage: "pdz_cert_maintenance", name: "整備", description: "完全修理、車両整備、上位修理"},
  engineering: {stage: "pdz_cert_engineering", name: "工学", description: "防衛設備、電力設備、上位機械"},
  anomaly: {stage: "pdz_cert_anomaly", name: "異常物取扱", description: "異常物の解析、封じ込め、対応設備"}
}

function pdzLoadoutGive(player, id, count, nbt) {
  let stack = nbt ? Item.of(id, count, nbt) : Item.of(id, count)
  if (stack.isEmpty()) {
    console.error("[PDZ][Loadout] unavailable item=" + id)
    player.tell(Text.of("支給アイテムを生成できません: " + id).red())
    return false
  }
  player.give(stack)
  return true
}

function pdzLoadoutValidate(player, loadout) {
  let all = PDZ_LOADOUT_COMMON.concat(loadout.items)
  for (let i = 0; i < all.length; i++) {
    if (Item.of(all[i][0], all[i][1]).isEmpty()) {
      player.tell(Text.of("Loadoutの構成アイテムが不足しています: " + all[i][0]).red())
      return false
    }
  }
  if (Item.of("tacz:modern_kinetic_gun").isEmpty() || Item.of("tacz:ammo").isEmpty()) {
    player.tell(Text.of("TaCZの武器または弾薬を生成できません。").red())
    return false
  }
  return true
}

function pdzEnsurePersonalSupplyCamp(player) {
  if (!player || !player.persistentData.getBoolean("pdz_registration_complete")) return false
  let data = player.persistentData
  if (data.getBoolean("pdz_minecolonies_supply_camp_received")) return true
  let camp = Item.of("minecolonies:supplycampdeployer", 1)
  if (camp.isEmpty()) {
    console.error("[PDZ][Loadout] MineColonies supply camp item is unavailable")
    return false
  }
  player.give(camp)
  data.putBoolean("pdz_minecolonies_supply_camp_received", true)
  player.tell(Text.of("個人用のMineColonies補給キャンプを1個支給しました。").green())
  return true
}

function pdzGrantStarterLoadout(player, id) {
  if (!player) return false
  let loadout = PDZ_LOADOUTS[id]
  if (!loadout) return false
  let data = player.persistentData
  if (data.getBoolean("pdz_starter_loadout_received")) {
    player.tell(Text.of("Starter Loadoutは受領済みです。装備は自由に交換できます。").yellow())
    return false
  }
  if (!pdzLoadoutValidate(player, loadout)) return false

  for (let i = 0; i < PDZ_LOADOUT_COMMON.length; i++) {
    let spec = PDZ_LOADOUT_COMMON[i]
    if (!pdzLoadoutGive(player, spec[0], spec[1], null)) return false
  }
  for (let i = 0; i < loadout.items.length; i++) {
    let spec = loadout.items[i]
    if (!pdzLoadoutGive(player, spec[0], spec[1], null)) return false
  }
  let gunNbt = `{GunFireMode:"${loadout.mode}",GunId:"${loadout.gun}",HasBulletInBarrel:1b}`
  let ammoNbt = `{AmmoId:"${loadout.ammo}"}`
  if (!pdzLoadoutGive(player, "tacz:modern_kinetic_gun", 1, gunNbt)) return false
  if (!pdzLoadoutGive(player, "tacz:ammo", loadout.rounds, ammoNbt)) return false

  data.putString("pdz_starter_loadout_id", id)
  data.putString("pdz_starter_loadout_name", loadout.name)
  data.putInt("pdz_starter_loadout_version", PDZ_LOADOUT_VERSION)
  data.putBoolean("pdz_starter_loadout_received", true)
  data.putBoolean("pdz_registration_complete", true)
  pdzEnsurePersonalSupplyCamp(player)

  player.tell(Text.of("初回遠征装備を支給しました: " + loadout.name).gold())
  player.tell(Text.of("これは永久クラスではありません。入手した装備へ自由に交換できます。").aqua())
  try {
    if (global.pdzOnStarterLoadoutSelected) global.pdzOnStarterLoadoutSelected(player)
    else if (global.pdzSetRegistrationProtection) global.pdzSetRegistrationProtection(player, false)
  } catch (error) {
    console.error("[PDZ][Loadout] onboarding callback failed: " + error)
  }
  return true
}

function pdzStarterLoadoutMenu(player) {
  if (!player) return false
  if (player.persistentData.getBoolean("pdz_starter_loadout_received")) {
    player.tell(Text.of("受領済み: " + player.persistentData.getString("pdz_starter_loadout_name")).gold())
    player.tell(Text.of("Loadoutは初回支給内容だけを表し、現在の役割を固定しません。").gray())
    return true
  }
  player.tell(Text.of("=== 最初の遠征装備を選択 ===").gold())
  player.tell(Text.of("選択は支給内容だけに影響します。能力補正や永久クラスはありません。").gray())
  Object.keys(PDZ_LOADOUTS).forEach(id => {
    let loadout = PDZ_LOADOUTS[id]
    player.tell(Text.of("[ " + loadout.name + " ]").green()
      .clickRunCommand("/deadzoneloadout choose_" + id)
      .hover(Text.of(loadout.description)))
  })
  return true
}

function pdzHasQualification(player, id) {
  let cert = PDZ_CERTIFICATIONS[String(id)]
  if (!player || !cert) return false
  try { return player.stages.has(cert.stage) } catch (ignored) { return false }
}

function pdzSetQualification(player, id, enabled) {
  let cert = PDZ_CERTIFICATIONS[String(id)]
  if (!player || !cert) return false
  try {
    if (enabled) player.stages.add(cert.stage)
    else player.stages.remove(cert.stage)
    if (global.pdzSyncRecipeStages) global.pdzSyncRecipeStages(player)
    player.tell(Text.of(cert.name + "資格を" + (enabled ? "取得しました。" : "解除しました。")).color(enabled ? "green" : "yellow"))
    return true
  } catch (error) {
    console.error("[PDZ][Certification] " + id + " enabled=" + enabled + " error=" + error)
    return false
  }
}

function pdzQualificationStatus(player) {
  player.tell(Text.of("=== 専門資格 ===").gold())
  Object.keys(PDZ_CERTIFICATIONS).forEach(id => {
    let cert = PDZ_CERTIFICATIONS[id]
    let has = pdzHasQualification(player, id)
    player.tell(Text.of((has ? "[取得済] " : "[未取得] ") + cert.name + " - " + cert.description)
      .color(has ? "green" : "gray"))
  })
  player.tell(Text.of("資格は複数取得でき、武器種と銃ダメージを制限しません。").aqua())
  return true
}

global.pdzStarterLoadoutMenu = pdzStarterLoadoutMenu
global.pdzGrantStarterLoadout = pdzGrantStarterLoadout
global.pdzEnsureStarterLoadout = player => !!player && player.persistentData.getBoolean("pdz_starter_loadout_received")
global.pdzEnsurePersonalSupplyCamp = pdzEnsurePersonalSupplyCamp
global.pdzHasQualification = pdzHasQualification
global.pdzSetQualification = pdzSetQualification
global.pdzQualificationStatus = pdzQualificationStatus

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event

  let loadout = Commands.literal("deadzoneloadout")
  loadout.executes(ctx => pdzStarterLoadoutMenu(ctx.source.player) ? 1 : 0)
  loadout.then(Commands.literal("menu").executes(ctx => pdzStarterLoadoutMenu(ctx.source.player) ? 1 : 0))
  loadout.then(Commands.literal("status").executes(ctx => {
    let p = ctx.source.player, d = p.persistentData
    p.tell(Text.of("登録: " + (d.getBoolean("pdz_registration_complete") ? "完了" : "未完了")).gold())
    p.tell(Text.of("初回装備: " + (d.getBoolean("pdz_starter_loadout_received") ? d.getString("pdz_starter_loadout_name") : "未選択")).aqua())
    return 1
  }))
  Object.keys(PDZ_LOADOUTS).forEach(id => {
    loadout.then(Commands.literal("choose_" + id).executes(ctx => pdzGrantStarterLoadout(ctx.source.player, id) ? 1 : 0))
  })
  loadout.then(Commands.literal("reset_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let d = ctx.source.player.persistentData
    ;["pdz_registration_complete", "pdz_starter_loadout_received", "pdz_minecolonies_supply_camp_received"].forEach(k => d.remove(k))
    ;["pdz_starter_loadout_id", "pdz_starter_loadout_name", "pdz_starter_loadout_version"].forEach(k => d.remove(k))
    ctx.source.player.tell(Text.of("Starter Loadoutのテスト状態をリセットしました。").yellow())
    return 1
  }))
  event.register(loadout)

  let cert = Commands.literal("deadzonequalification")
  cert.executes(ctx => pdzQualificationStatus(ctx.source.player) ? 1 : 0)
  cert.then(Commands.literal("status").executes(ctx => pdzQualificationStatus(ctx.source.player) ? 1 : 0))
  Object.keys(PDZ_CERTIFICATIONS).forEach(id => {
    cert.then(Commands.literal("grant_" + id).requires(s => s.hasPermission(2))
      .executes(ctx => pdzSetQualification(ctx.source.player, id, true) ? 1 : 0))
    cert.then(Commands.literal("revoke_" + id).requires(s => s.hasPermission(2))
      .executes(ctx => pdzSetQualification(ctx.source.player, id, false) ? 1 : 0))
  })
  event.register(cert)
})

console.info("[PROJECT DEADZONE][Loadout] jobless starter loadouts and GameStages certifications loaded")
