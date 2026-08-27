// PROJECT DEADZONE Jobs v0.2.3 - Role-focused Starter Kits
// MC 1.20.1 / KubeJS 6.x
// First multiplayer test: job selection, persistent skills/stage, one-time starter kit.

const DZ_JOBS = {
  survivor: {
    name: "Survivor",
    skills: {Survival:3, Scavenging:2, Melee:2, Medical:1, Firearms:1, Fitness:3},
    fixed: [
      ["survival_instinct:hand_axe",1],
      ["sophisticatedbackpacks:backpack",1],
      ["apocalypsenow:bandage",2],
      ["survival_instinct:rope",4]
    ],
    random: [],
    gunStarter: true
  },
  weapons_expert: {
    name: "Weapons Expert",
    skills: {Firearms:4, Reload:3, Scavenging:1, Melee:1, Survival:1, Fitness:3},
    fixed: [
      ["tacz_tactical_breaching:flashbang_grenade",2],
      ["survival_instinct:tactical_knife",1]
    ],
    random: [],
    smgStarter: true
  },
  medic: {
    name: "Medic",
    skills: {Medical:4, Survival:2, Scavenging:1, Melee:1, Fitness:3},
    fixed: [
      ["kubejs:field_medical_kit",1],
      ["apocalypsenow:bandage",4],
      ["apocalypsenow:morphine",1],
      ["apocalypsenow:adrenaline_syringe",1],
      ["apocalypsenow:medicalkit",1]
    ],
    random: [],
    gunStarter: true
  },
  mechanic: {
    name: "Mechanic",
    skills: {Mechanics:4, Engineering:2, Scavenging:2, Survival:1, Fitness:3},
    fixed: [
      ["mts:mtsofficialpack.blowtorch",1],
      ["mts:mtsofficialpack.repairkit",1],
      ["mts:mtsofficialpack.sparkplug",2],
      ["mts:mtsofficialpack.copperwire",4]
    ],
    random: [],
    gunStarter: true
  },
  engineer: {
    name: "Engineer",
    skills: {Engineering:4, Mechanics:2, Survival:1, Scavenging:1, Fitness:3},
    fixed: [
      ["immersiveengineering:toolbox",1],
      ["immersiveengineering:hammer",1],
      ["immersiveengineering:wirecutter",1],
      ["create:wrench",1]
    ],
    random: [],
    gunStarter: true
  },
  scout: {
    name: "Scout",
    skills: {Scavenging:4, Survival:2, Firearms:1, Melee:1, Fitness:4},
    fixed: [
      ["basic_nvg:nvg",1],
      ["sophisticatedbackpacks:backpack",1],
      ["sophisticatedbackpacks:pickup_upgrade",1],
      ["immersiveengineering:survey_tools",1]
    ],
    random: [],
    gunStarter: true
  },
  security: {
    name: "Security",
    skills: {Melee:4, Armor:3, Firearms:1, Survival:1, Fitness:4},
    fixed: [
      ["survival_instinct:police_baton_mace",1],
      ["apocalypsenow:swatriotcontrol_helmet",1],
      ["apocalypsenow:swatriotcontrol_chestplate",1],
      ["apocalypsenow:riot_shield",1]
    ],
    random: []
  },
  survivalist: {
    name: "Survivalist",
    skills: {Survival:4, Scavenging:2, Medical:1, Melee:1, Fitness:3},
    fixed: [
      ["survival_instinct:hunt_knife",1],
      ["survival_instinct:bear_trap",2],
      ["survival_instinct:medkit_bag",1],
      ["legendarysurvivaloverhaul:water_purifier",1]
    ],
    random: [],
    gunStarter: true
  }
}

const DZ_COMMON_STARTER = [
  ["survival_instinct:bean_can",1],
  ["survival_instinct:gallon_of_water",1]
]

const DZ_STARTER_GUNS = [
  {gun:"tacz:glock_17", ammo:"tacz:9mm", minAmmo:22, maxAmmo:30, mode:"SEMI"},
  {gun:"tacz:m1911", ammo:"tacz:45acp", minAmmo:18, maxAmmo:24, mode:"SEMI"},
  {gun:"tacz:cz75", ammo:"tacz:9mm", minAmmo:22, maxAmmo:30, mode:"SEMI"}
]

const DZ_SKILL_CATEGORIES = {
  Firearms:"firearms",
  Melee:"melee",
  Reload:"reload",
  Armor:"armor",
  Survival:"survival",
  Medical:"medical",
  Scavenging:"scavenging",
  Fitness:"fitness",
  Mechanics:"mechanics",
  Engineering:"engineering"
}

const DZ_ALL_SKILLS = Object.keys(DZ_SKILL_CATEGORIES)
const DZ_RETRAIN_COST = 24
const DZ_RETRAIN_CURRENCY = "apocalypsenow:money"
const DZ_STARTER_GRANT_VERSION = 6
const DZ_MINECOLONIES_SUPPLY_CAMP_ITEM = "minecolonies:supplycampdeployer"
const DZ_MINECOLONIES_SUPPLY_CAMP_FLAG = "dz_minecolonies_supply_camp_received"

function dzPick(a) { return a[Math.floor(Math.random()*a.length)] }

function dzGive(player, spec) {
  let stack=Item.of(spec[0], spec[1])
  if (stack.isEmpty()) {
    console.error("[PROJECT DEADZONE][Starter Kit] Invalid item: "+spec[0])
    player.tell(Text.of("Starter Kit item is unavailable: "+spec[0]).red())
    return false
  }
  player.give(stack)
  return true
}

function dzStarterItemCount(player, itemId) {
  // runCommandSilent does not reliably return /clear's matched-item count on a
  // dedicated server. It returned 0 and duplicated the full kit on every audit.
  try { return Number(player.inventory.count(Item.of(itemId))) }
  catch (ignored) { return 0 }
}

// Verify normal kit components after inventory/mod hooks have settled.
// Supply only the missing amount so a healthy grant never duplicates gear.
function dzAuditStarterSpecs(player, specs) {
  if (!player) return false
  let expectedById = {}
  for (let i = 0; i < specs.length; i++) {
    let id = String(specs[i][0])
    expectedById[id] = Number(expectedById[id] || 0) + Number(specs[i][1])
  }
  let repaired = []
  Object.keys(expectedById).forEach(id => {
    let expected = expectedById[id]
    let have = dzStarterItemCount(player, id)
    if (have < expected) {
      let missing = expected - have
      if (dzGive(player, [id, missing])) repaired.push(id + " x" + missing)
    }
  })
  if (repaired.length > 0) {
    player.tell(Text.of("[PDZ] Missing starter items were restored: " + repaired.join(", ")).yellow())
    console.warn("[PROJECT DEADZONE][Starter Kit] repaired for " + player.username + ": " + repaired.join(", "))
  }
  let ready = true
  Object.keys(expectedById).forEach(id => {
    if (dzStarterItemCount(player, id) < expectedById[id]) ready = false
  })
  return ready
}

function dzAuditStarterLoadout(player, job, specs) {
  if (!player || !job) return false
  let specsReady = dzAuditStarterSpecs(player, specs)
  if (!job.gunStarter && !job.smgStarter) return specsReady

  let guns = dzStarterItemCount(player, "tacz:modern_kinetic_gun")
  let ammo = dzStarterItemCount(player, "tacz:ammo")
  if (guns > 0 && ammo > 0) return specsReady

  let restored = job.smgStarter ? dzGiveSmg(player) : dzGiveGun(player)
  if (restored) {
    player.tell(Text.of("[PDZ] 不足していたスターター武器・弾薬を再支給しました。").yellow())
    console.warn("[PROJECT DEADZONE][Starter Kit] restored weapon package for " + player.username)
  }
  guns = dzStarterItemCount(player, "tacz:modern_kinetic_gun")
  ammo = dzStarterItemCount(player, "tacz:ammo")
  return specsReady && guns > 0 && ammo > 0
}

function dzGiveGun(player) {
  let g=dzPick(DZ_STARTER_GUNS)
  let ammoCount = g.minAmmo + Math.floor(Math.random() * (g.maxAmmo - g.minAmmo + 1))

  let gun = Item.of("tacz:modern_kinetic_gun",
    `{GunFireMode:"${g.mode}",GunId:"${g.gun}",HasBulletInBarrel:1b}`)
  let ammo = Item.of("tacz:ammo", ammoCount, `{AmmoId:"${g.ammo}"}`)
  if (gun.isEmpty() || ammo.isEmpty()) {
    console.error("[PROJECT DEADZONE][Starter Kit] TaCZ starter gun or ammo is unavailable")
    return false
  }

  player.give(gun)

  // KubeJS Item.of: item, count, NBT. v0.1 had count/NBT reversed, which produced one ammo item.
  player.give(ammo)
  player.tell(Text.of(`Starter ammo: ${ammoCount} rounds (${g.ammo})`).gray())
  return true
}

function dzGiveSmg(player) {
  let gun = Item.of("tacz:modern_kinetic_gun",
    '{GunFireMode:"AUTO",GunId:"tacz:hk_mp5a5",HasBulletInBarrel:1b}')
  let ammo = Item.of("tacz:ammo", 60, '{AmmoId:"tacz:9mm"}')
  if (gun.isEmpty() || ammo.isEmpty()) {
    console.error("[PROJECT DEADZONE][Starter Kit] TaCZ MP5 starter kit is unavailable")
    return false
  }
  player.give(gun)
  player.give(ammo)
  player.tell(Text.of("Starter weapon: HK MP5A5 / 9mm x60").gold())
  return true
}

function dzPrepareStarterKit(job) {
  let specs = []
  DZ_COMMON_STARTER.forEach(x => specs.push(x))
  job.fixed.forEach(x => specs.push(x))
  job.random.forEach(pool => specs.push(dzPick(pool)))
  return specs
}

// Random starter choices must stay stable. Re-rolling them during an audit made a
// valid kit look incomplete and could also duplicate unrelated food/tools.
function dzStarterSpecsFor(player, job, reset) {
  let data = player.persistentData
  if (reset) data.remove("dz_starter_specs_json")
  let raw = data.getString("dz_starter_specs_json")
  if (raw) {
    try {
      let parsed = JSON.parse(String(raw))
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch (e) {
      console.warn("[PROJECT DEADZONE][Starter Kit] invalid saved spec for " + player.username + ": " + e)
    }
  }
  let specs = dzPrepareStarterKit(job)
  data.putString("dz_starter_specs_json", JSON.stringify(specs))
  return specs
}

function dzStarterKitIsValid(player, job, specs) {
  for (let i = 0; i < specs.length; i++) {
    if (Item.of(specs[i][0], specs[i][1]).isEmpty()) {
      console.error("[PROJECT DEADZONE][Starter Kit] Invalid item before grant: " + specs[i][0])
      player.tell(Text.of("スターターキットの構成アイテムが不足しています: " + specs[i][0]).red())
      return false
    }
  }
  if ((job.gunStarter || job.smgStarter) &&
      (Item.of("tacz:modern_kinetic_gun").isEmpty() || Item.of("tacz:ammo").isEmpty())) {
    player.tell(Text.of("TaCZのスターター武器を生成できません。管理者へ連絡してください。 ").red())
    return false
  }
  return true
}

function dzGiveStarterKit(player, job) {
  let specs = dzStarterSpecsFor(player, job, false)
  if (!dzStarterKitIsValid(player, job, specs)) return false
  for (let i = 0; i < specs.length; i++) {
    if (!dzGive(player, specs[i])) return false
  }
  if (job.gunStarter && !dzGiveGun(player)) return false
  if (job.smgStarter && !dzGiveSmg(player)) return false
  // Several inventory/capability mods finish initialization after the JOB event.
  // Audit once after one second, but only as part of the initial grant flow.
  player.server.scheduleInTicks(20, callback => dzAuditStarterLoadout(player, job, specs))
  player.tell(Text.of("[PDZ] スターターキットを支給しました。1秒後に不足品を自動点検します。").green())
  player.tell(Text.of("不足時は /deadzonejob starter_claim で不足分だけ復旧できます。").gray())
  return dzAuditStarterLoadout(player, job, specs)
}

function dzEnsureStarterKit(player) {
  if (!player) return false
  let data = player.persistentData
  let id = data.getString("dz_job_id"), job = DZ_JOBS[id]
  if (!data.getBoolean("dz_job_chosen") || !job) return false
  // Login/onboarding verification must never treat consumed starter supplies as
  // missing. A current, completed grant is immutable; manual starter_claim is
  // the only path that may audit and restore individual items afterwards.
  if (data.getBoolean("dz_starter_received") &&
      data.getInt("dz_starter_grant_version") >= DZ_STARTER_GRANT_VERSION) return true
  let specs = dzStarterSpecsFor(player, job, false)
  if (!dzStarterKitIsValid(player, job, specs)) return false
  let ready = dzAuditStarterLoadout(player, job, specs)
  data.putBoolean("dz_starter_received", ready)
  if (ready) data.putInt("dz_starter_grant_version", DZ_STARTER_GRANT_VERSION)
  return ready
}

global.pdzEnsureStarterKit = dzEnsureStarterKit

// Each registered survivor receives exactly one personal MineColonies supply camp.
// Keep this grant separate from starter-kit versioning so kit audits cannot duplicate it.
function dzEnsureMineColoniesSupplyCamp(player) {
  if (!player) return false
  let data = player.persistentData
  if (!data.getBoolean("dz_job_chosen")) return false
  if (data.getBoolean(DZ_MINECOLONIES_SUPPLY_CAMP_FLAG)) return true

  let camp = Item.of(DZ_MINECOLONIES_SUPPLY_CAMP_ITEM, 1)
  if (camp.isEmpty()) {
    console.error("[PROJECT DEADZONE][MineColonies] Supply camp item is unavailable: " + DZ_MINECOLONIES_SUPPLY_CAMP_ITEM)
    player.tell(Text.of("[PDZ] MineColonies補給キャンプを生成できませんでした。MOD構成を確認してください。").red())
    return false
  }

  try {
    player.give(camp)
  } catch (error) {
    console.error("[PROJECT DEADZONE][MineColonies] Failed to grant supply camp to " + player.username + ": " + error)
    player.tell(Text.of("[PDZ] 補給キャンプの支給に失敗しました。管理者へログ確認を依頼してください。").red())
    return false
  }
  data.putBoolean(DZ_MINECOLONIES_SUPPLY_CAMP_FLAG, true)
  player.tell(Text.of("[PDZ] 個人用のMineColonies補給キャンプを1個支給しました。").green())
  player.tell(Text.of("設置場所は自分で選べます。PDZ復興本部のNPCはこのキャンプには生成されません。").gray())
  console.info("[PROJECT DEADZONE][MineColonies] Granted one supply camp to " + player.username)
  return true
}

global.pdzEnsureMineColoniesSupplyCamp = dzEnsureMineColoniesSupplyCamp

function dzPuffishCommand(player, command) {
  try {
    player.server.runCommandSilent(command.replace("{player}", player.username))
    return true
  } catch (e) {
    player.tell(Text.of("Pufferfish Skills command failed: "+e).red())
    return false
  }
}

function dzMenu(player) {
  player.tell(Text.of("=== PROJECT DEADZONE : JOB SELECT ===").gold())
  player.tell(Text.of("ジョブ名をクリックして選択してください。選択後は通常変更できません。").gray())
  let ids=["survivor","weapons_expert","medic","mechanic","engineer","scout","security","survivalist"]
  ids.forEach(id => {
    let j=DZ_JOBS[id]
    player.tell(
      Text.of("[ "+j.name+" ]")
        .green()
        .clickRunCommand("/deadzonejob choose "+id)
        .hover(Text.of("Select "+j.name))
    )
  })
}

function dzRetrainMenu(player) {
  let d=player.persistentData
  if (!d.getBoolean("dz_job_chosen")) {
    player.tell(Text.of("先に初期JOBを選択してください。").red())
    return
  }

  let free=!d.getBoolean("dz_retrain_free_used")
  player.tell(Text.of("=== ミナト：JOB再訓練 ===").gold())
  player.tell(Text.of(free
    ? "初回の再訓練は無料です。スターターキットは再配布されません。"
    : "再訓練費用：Money ×"+DZ_RETRAIN_COST+"（スターターキット再配布なし）").gray())
  player.tell(Text.of("JOB初期値を超えて獲得した成長Lvは維持され、取得Perkは一度リセットして振り直せます。").aqua())

  Object.keys(DZ_JOBS).forEach(id => {
    let j=DZ_JOBS[id]
    let current=d.getString("dz_job_id")===id
    player.tell(current
      ? Text.of("[ "+j.name+"：現在のJOB ]").darkGray()
      : Text.of("[ "+j.name+"へ再訓練 ]")
          .green()
          .clickRunCommand("/deadzonejob retrain_preview "+id)
          .hover(Text.of(j.name+"への変更内容を確認")))
  })
}

function dzRetrainPreview(player,id) {
  let j=DZ_JOBS[id], d=player.persistentData
  if (!j || !d.getBoolean("dz_job_chosen")) return false
  if (d.getString("dz_job_id")===id) {
    player.tell(Text.of("現在と同じJOBです。").yellow())
    return false
  }

  d.putString("dz_retrain_pending",id)
  let free=!d.getBoolean("dz_retrain_free_used")
  player.tell(Text.of("=== 再訓練の最終確認 ===").gold())
  player.tell(Text.of(d.getString("dz_job_name")+" → "+j.name).white())
  player.tell(Text.of(free ? "費用：初回無料" : "費用：Money ×"+DZ_RETRAIN_COST).yellow())
  player.tell(Text.of("取得Perkと各Tree内XPはリセットされますが、獲得済みの成長Lvは維持されます。").gray())
  player.tell(
    Text.of("[ この内容で再訓練する ]")
      .red()
      .clickRunCommand("/deadzonejob retrain_confirm "+id)
      .hover(Text.of("クリックすると確定します"))
  )
  player.tell(Text.of("[ 戻る ]").green().clickRunCommand("/deadzonejob retrain"))
  return true
}

function dzRetrainJob(player,id) {
  let j=DZ_JOBS[id], d=player.persistentData
  if (!j || !d.getBoolean("dz_job_chosen")) return false
  if (d.getString("dz_retrain_pending")!==id) {
    player.tell(Text.of("確認画面の有効期限が切れました。もう一度選択してください。").red())
    return false
  }
  if (d.getString("dz_job_id")===id) return false

  let free=!d.getBoolean("dz_retrain_free_used")
  if (!free) {
    let held=player.server.runCommandSilent(
      "clear "+player.username+" "+DZ_RETRAIN_CURRENCY+" 0")
    if (held < DZ_RETRAIN_COST) {
      player.tell(Text.of("Moneyが不足しています（必要："+DZ_RETRAIN_COST+" / 所持："+held+"）。").red())
      return false
    }
    player.server.runCommandSilent(
      "clear "+player.username+" "+DZ_RETRAIN_CURRENCY+" "+DZ_RETRAIN_COST)
  }

  let oldId=d.getString("dz_job_id")
  DZ_ALL_SKILLS.forEach(skillName => {
    let oldLevel=d.getInt("dz_skill_"+skillName)
    let oldFloor=d.getInt("dz_skill_floor_"+skillName)
    let earned=Math.max(0,oldLevel-oldFloor)
    let newFloor=j.skills[skillName] || 0
    d.putInt("dz_skill_floor_"+skillName,newFloor)
    d.putInt("dz_skill_"+skillName,newFloor+earned)
    // Full Perk respec: earned levels and XP remain, only the choices are refunded.
    dzPuffishCommand(player,
      "puffish_skills category erase {player} "+DZ_SKILL_CATEGORIES[skillName])
    dzPuffishCommand(player,
      "puffish_skills points set {player} "+DZ_SKILL_CATEGORIES[skillName]+" "+(newFloor+earned))
  })

  try { if (oldId) player.stages.remove("deadzone_job_"+oldId) } catch(e) {}
  try { player.stages.add("deadzone_job_"+id) } catch(e) {}
  d.putString("dz_job_id",id)
  d.putString("dz_job_name",j.name)
  d.putBoolean("dz_retrain_free_used",true)
  d.remove("dz_retrain_pending")

  // Synchronize the Class Mod profile shown in its GUI.
  player.server.runCommandSilent("class set "+id+" "+player.username)

  player.tell(Text.of("再訓練完了："+j.name).gold())
  player.tell(Text.of("KキーでPerkを振り直してください。スターターキットは再配布されません。").green())
  return true
}

function dzApplyJob(player,id) {
  let j=DZ_JOBS[id]
  if (!j) return false
  let d=player.persistentData
  if (d.getBoolean("dz_job_chosen")) {
    player.tell(Text.of("Jobはすでに選択済みです: "+d.getString("dz_job_name")).red())
    return false
  }

  // Never mark a player as registered before the complete starter kit exists.
  // This keeps a broken/missing mod item from permanently consuming the claim.
  d.remove("dz_starter_specs_json")
  if (!dzGiveStarterKit(player,j)) {
    d.putBoolean("dz_starter_received",false)
    player.tell(Text.of("JOB登録を中止しました。スターターキットの生成に失敗したため、選択は確定していません。 ").red())
    return false
  }

  d.putBoolean("dz_job_chosen",true)
  d.putBoolean("dz_onboarding_complete",true)
  d.putString("dz_job_id",id)
  d.putString("dz_job_name",j.name)
  d.putBoolean("dz_starter_received",true)
  d.putInt("dz_starter_grant_version",DZ_STARTER_GRANT_VERSION)
  try {
    if (global.pdzSetJobSelectionProtection) global.pdzSetJobSelectionProtection(player,false)
    else player.removeTag("dz_job_selection_protected")
  } catch (ignored) {}
  dzEnsureMineColoniesSupplyCamp(player)
  // Main story: choosing a JOB is an actual objective, not a manual checkbox.
  player.server.runCommandSilent(
    "ftbquests change_progress " + player.username + " complete 52F2869C3820DF98")

  Object.keys(j.skills).forEach(k => {
    d.putInt("dz_skill_"+k,j.skills[k])
    d.putInt("dz_skill_floor_"+k,j.skills[k])
    d.putInt("dz_skill_xp_"+k,0)
  })

  // KubeJS Stages: future recipe/job unlock base.
  try { player.stages.add("deadzone_job_"+id) } catch(e) {}

  // Job starting Skill Lv becomes initial points in each corresponding tree.
  // Existing test characters can use /deadzonejob skills_grant_test.
  Object.keys(j.skills).forEach(skillName => {
    let category=DZ_SKILL_CATEGORIES[skillName]
    if (category) {
      dzPuffishCommand(player,
        "puffish_skills points set {player} "+category+" "+j.skills[skillName])
    }
  })

  player.tell(Text.of("JOB登録完了: "+j.name).gold())
  player.tell(Text.of("スターターキットと個人用補給キャンプを確認してください。").green())
  return true
}

// Initial selection UI is handled by Class Selection Mod.
ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root=Commands.literal("deadzonejob")

  root.then(Commands.literal("menu").executes(ctx => { dzMenu(ctx.source.player); return 1 }))

  // Migration-safe starter kit tests. These do not change the selected JOB.
  root.then(Commands.literal("starter_medic_test").executes(ctx => {
    dzGiveStarterKit(ctx.source.player, DZ_JOBS.medic)
    ctx.source.player.tell(Text.of("Medic starter kit test granted.").green())
    return 1
  }))
  root.then(Commands.literal("starter_regrant_test").executes(ctx => {
    let player=ctx.source.player
    let id=player.persistentData.getString("dz_job_id")
    let job=DZ_JOBS[id]
    if (!job) {
      player.tell(Text.of("No PDZ JOB is currently recorded. Use starter_medic_test for the isolated test.").red())
      return 0
    }
    dzGiveStarterKit(player, job)
    player.tell(Text.of("Starter kit re-granted for: "+job.name).green())
    return 1
  }))

  // Migration-safe recovery for players created before verified starter grants.
  // Versioning allows one recovery claim without opening an infinite item source.
  root.then(Commands.literal("starter_claim_legacy").executes(ctx => {
    let player=ctx.source.player, data=player.persistentData
    let id=data.getString("dz_job_id"), job=DZ_JOBS[id]
    if (!data.getBoolean("dz_job_chosen") || !job) {
      player.tell(Text.of("先にロビー受付でJOBを登録してください。 ").red())
      return 0
    }
    if (data.getInt("dz_starter_grant_version") >= DZ_STARTER_GRANT_VERSION) {
      player.tell(Text.of("このバージョンのスターターキットは受領済みです。 ").yellow())
      return 0
    }
    if (!dzGiveStarterKit(player,job)) {
      data.putBoolean("dz_starter_received",false)
      player.tell(Text.of("スターターキットの復旧に失敗しました。受領権は消費されていません。 ").red())
      return 0
    }
    data.putBoolean("dz_starter_received",true)
    data.putInt("dz_starter_grant_version",DZ_STARTER_GRANT_VERSION)
    player.tell(Text.of("スターターキットを復旧支給しました: "+job.name).green())
    return 1
  }))

  // Repeatable and idempotent recovery. It only restores missing components,
  // so a stale version flag can never block a genuinely incomplete kit.
  root.then(Commands.literal("starter_claim").executes(ctx => {
    let player=ctx.source.player, data=player.persistentData
    let id=data.getString("dz_job_id"), job=DZ_JOBS[id]
    if (!data.getBoolean("dz_job_chosen") || !job) {
      player.tell(Text.of("先に初期JOBを登録してください。").red())
      return 0
    }
    let specs=dzStarterSpecsFor(player,job,false)
    if (!dzStarterKitIsValid(player,job,specs)) {
      data.putBoolean("dz_starter_received",false)
      player.tell(Text.of("スターターキットの構成アイテムが不足しているため、復旧できませんでした。").red())
      return 0
    }
    let ready=dzAuditStarterLoadout(player,job,specs)
    data.putBoolean("dz_starter_received",ready)
    if (!ready) {
      player.tell(Text.of("スターターキットの実物確認に失敗しました。もう一度実行してください。").red())
      return 0
    }
    data.putInt("dz_starter_grant_version",DZ_STARTER_GRANT_VERSION)
    player.tell(Text.of("スターターキットを再検査し、不足分を復旧しました: "+job.name).green())
    return 1
  }))

  root.then(Commands.literal("supply_camp_claim").executes(ctx => {
    let player=ctx.source.player, data=player.persistentData
    if (!data.getBoolean("dz_job_chosen")) {
      player.tell(Text.of("先に初期JOBを選択してください。").red())
      return 0
    }
    if (data.getBoolean(DZ_MINECOLONIES_SUPPLY_CAMP_FLAG)) {
      player.tell(Text.of("個人用MineColonies補給キャンプは受領済みです。").yellow())
      return 0
    }
    return dzEnsureMineColoniesSupplyCamp(player) ? 1 : 0
  }))

  let choose=Commands.literal("choose")
  Object.keys(DZ_JOBS).forEach(id => {
    choose.then(Commands.literal(id).executes(ctx => {
      dzApplyJob(ctx.source.player,id)
      return 1
    }))
  })
  root.then(choose)

  root.then(Commands.literal("retrain").executes(ctx => {
    dzRetrainMenu(ctx.source.player)
    return 1
  }))

  let retrainPreview=Commands.literal("retrain_preview")
  Object.keys(DZ_JOBS).forEach(id => {
    retrainPreview.then(Commands.literal(id).executes(ctx => {
      return dzRetrainPreview(ctx.source.player,id) ? 1 : 0
    }))
  })
  root.then(retrainPreview)

  let retrainConfirm=Commands.literal("retrain_confirm")
  Object.keys(DZ_JOBS).forEach(id => {
    retrainConfirm.then(Commands.literal(id).executes(ctx => {
      return dzRetrainJob(ctx.source.player,id) ? 1 : 0
    }))
  })
  root.then(retrainConfirm)

  let starterPreview=Commands.literal("starter_preview").requires(s => s.hasPermission(2))
  Object.keys(DZ_JOBS).forEach(id => {
    starterPreview.then(Commands.literal(id).executes(ctx => {
      let p=ctx.source.player
      dzGiveStarterKit(p,DZ_JOBS[id])
      p.tell(Text.of("Starter Kit preview: "+DZ_JOBS[id].name).gold())
      return 1
    }))
  })
  root.then(starterPreview)

  let apply=Commands.literal("apply")
  Object.keys(DZ_JOBS).forEach(id => {
    apply.then(Commands.literal(id).executes(ctx => {
      dzApplyJob(ctx.source.player,id)
      return 1
    }))
  })
  root.then(apply)

  root.then(Commands.literal("info").executes(ctx => {
    let p=ctx.source.player, d=p.persistentData
    if (!d.getBoolean("dz_job_chosen")) { dzMenu(p); return 1 }
    p.tell(Text.of("=== "+d.getString("dz_job_name")+" ===").gold())
    let j=DZ_JOBS[d.getString("dz_job_id")]
    if (j) Object.keys(j.skills).forEach(k => {
      p.tell(Text.of(k+": Lv"+d.getInt("dz_skill_"+k)+"  XP:"+d.getInt("dz_skill_xp_"+k)).gray())
    })
    return 1
  }))

  // Firearms Tree prototype helpers.
  // XP sources are intentionally disabled until TACZ firearm detection is implemented.
  root.then(Commands.literal("firearms_xp_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    dzPuffishCommand(p, "puffish_skills experience add {player} firearms 100")
    p.tell(Text.of("Added 100 Firearms XP. Open the Skill Tree with K.").aqua())
    return 1
  }))

  root.then(Commands.literal("firearms_grant_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    let level=p.persistentData.getInt("dz_skill_Firearms")
    if (level < 1) level=1
    dzPuffishCommand(p, "puffish_skills points set {player} firearms "+level)
    p.tell(Text.of("Firearms prototype points set to "+level+". Open the Skill Tree with K.").aqua())
    return 1
  }))

  root.then(Commands.literal("firearms_reset_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    dzPuffishCommand(p, "puffish_skills category erase {player} firearms")
    // Remove tags from both the v0.1 prototype and the v0.2 reworked tree.
    let tags=[
      "dz_firearms_training",
      "dz_firearms_core_1","dz_firearms_core_2","dz_firearms_core_3",
      "dz_firearms_core_4","dz_firearms_core_5","dz_firearms_core_6",
      "dz_firearms_ammo_1","dz_firearms_ammo_2","dz_firearms_ammo_3",
      "dz_firearms_handling_1","dz_firearms_handling_2","dz_firearms_handling_3",
      "dz_firearms_maintenance_1","dz_firearms_maintenance_2","dz_firearms_maintenance_3"
    ]
    tags.forEach(tag => p.server.runCommandSilent("tag "+p.username+" remove "+tag))
    p.tell(Text.of("Firearms prototype tree and legacy tags erased.").yellow())
    return 1
  }))

  root.then(Commands.literal("firearms_rework_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    dzPuffishCommand(p, "puffish_skills points set {player} firearms 10")
    p.tell(Text.of("Firearms Rework test points set to 10. Open the Skill Tree with K.").aqua())
    return 1
  }))

  root.then(Commands.literal("skills_grant_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player, d=p.persistentData
    let job=DZ_JOBS[d.getString("dz_job_id")]
    if (!job) {
      p.tell(Text.of("No DEADZONE Job is registered for this player.").red())
      return 0
    }
    Object.keys(job.skills).forEach(skillName => {
      let category=DZ_SKILL_CATEGORIES[skillName]
      if (category) {
        dzPuffishCommand(p,
          "puffish_skills points set {player} "+category+" "+job.skills[skillName])
      }
    })
    p.tell(Text.of("All Job Skill Tree points were synchronized. Open the tree with K.").aqua())
    return 1
  }))

  root.then(Commands.literal("skills_rework_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    Object.keys(DZ_SKILL_CATEGORIES).forEach(skillName => {
      dzPuffishCommand(p,
        "puffish_skills points set {player} "+DZ_SKILL_CATEGORIES[skillName]+" 10")
    })
    p.tell(Text.of("All DEADZONE Rework trees now have 10 test points. Open the tree with K.").aqua())
    return 1
  }))

  root.then(Commands.literal("skills_reset_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    Object.keys(DZ_SKILL_CATEGORIES).forEach(skillName => {
      dzPuffishCommand(p,
        "puffish_skills category erase {player} "+DZ_SKILL_CATEGORIES[skillName])
    })
    p.tell(Text.of("All DEADZONE Skill Trees were erased.").yellow())
    return 1
  }))

  Object.keys(DZ_SKILL_CATEGORIES).forEach(skillName => {
    let category=DZ_SKILL_CATEGORIES[skillName]
    root.then(Commands.literal("xp_test_"+category).requires(s => s.hasPermission(2)).executes(ctx => {
      let p=ctx.source.player
      dzPuffishCommand(p,
        "puffish_skills experience add {player} "+category+" 100")
      p.tell(Text.of("Added 100 "+skillName+" XP.").aqua())
      return 1
    }))
  })

  // OP-only test reset. Clears job/skill data; does not remove already received items.
  root.then(Commands.literal("reset_test").requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player, d=p.persistentData
    let old=d.getString("dz_job_id")
    try { if (old) p.stages.remove("deadzone_job_"+old) } catch(e) {}
    d.remove("dz_job_chosen"); d.remove("dz_job_id"); d.remove("dz_job_name"); d.remove("dz_starter_received")
    d.remove("dz_starter_grant_version")
    d.remove(DZ_MINECOLONIES_SUPPLY_CAMP_FLAG)
    d.remove("dz_retrain_free_used"); d.remove("dz_retrain_pending")
    let all=["Survival","Scavenging","Melee","Medical","Firearms","Fitness","Reload","Mechanics","Engineering","Armor"]
    all.forEach(k => { d.remove("dz_skill_"+k); d.remove("dz_skill_floor_"+k); d.remove("dz_skill_xp_"+k) })
    p.tell(Text.of("DEADZONE Job test data reset. Use /deadzonejob menu").yellow())
    return 1
  }))

  event.register(root)
})
