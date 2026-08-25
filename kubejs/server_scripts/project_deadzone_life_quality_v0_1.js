// PROJECT DEADZONE seasonal produce and catch appraisal v0.1
// Converts diverse real supplies into compact certified lots without changing food NBT.

const DZ_QUALITY_SEASON_HELPER = Java.loadClass("sereneseasons.api.season.SeasonHelper")

const DZ_QUALITY_QUESTS = {
  intro: "6D4C010000000101",
  supply1: "6D4C010000000102",
  supply2: "6D4C010000000103",
  supply3: "6D4C010000000104",
  catch1: "6D4C010000000105",
  catch2: "6D4C010000000106",
  catch3: "6D4C010000000107",
  supplyContract: "6D4C010000000108",
  catchContract: "6D4C010000000109"
}

const DZ_QUALITY_SUPPLY_POOLS = {
  SPRING: [
    "minecraft:carrot", "minecraft:potato", "minecraft:sweet_berries", "farmersdelight:onion",
    "pamhc2crops:asparagusitem", "pamhc2crops:broccoliitem", "pamhc2crops:cabbageitem",
    "pamhc2crops:garlicitem", "pamhc2crops:peasitem", "pamhc2crops:spinachitem",
    "pamhc2crops:strawberryitem", "pamhc2crops:turnipitem"
  ],
  SUMMER: [
    "minecraft:wheat", "minecraft:melon_slice", "minecraft:sugar_cane", "farmersdelight:tomato",
    "farmersdelight:rice_panicle", "pamhc2crops:bellpepperitem", "pamhc2crops:cornitem",
    "pamhc2crops:cucumberitem", "pamhc2crops:grapeitem", "pamhc2crops:pineappleitem",
    "pamhc2crops:soybeanitem", "pamhc2crops:blueberryitem"
  ],
  AUTUMN: [
    "minecraft:wheat", "minecraft:carrot", "minecraft:beetroot", "minecraft:pumpkin",
    "farmersdelight:cabbage", "farmersdelight:onion", "farmersdelight:rice_panicle",
    "pamhc2crops:cornitem", "pamhc2crops:cranberryitem", "pamhc2crops:eggplantitem",
    "pamhc2crops:sweetpotatoitem", "pamhc2crops:wintersquashitem", "pamhc2crops:ryeitem"
  ],
  WINTER: [
    "farmersdelight:cabbage", "minecraft:sweet_berries", "minecraft:red_mushroom",
    "minecraft:brown_mushroom", "minecraft:glow_berries", "minecraft:bread",
    "minecraft:baked_potato", "minecraft:dried_kelp", "minecraft:cooked_beef",
    "aquaculture:fish_fillet_cooked", "farmersdelight:cooked_rice", "farmersdelight:smoked_ham"
  ]
}

const DZ_QUALITY_FISH_POOL = [
  "aquaculture:bluegill", "aquaculture:carp", "aquaculture:catfish", "aquaculture:rainbow_trout",
  "aquaculture:brown_trout", "aquaculture:perch", "aquaculture:smallmouth_bass",
  "aquaculture:atlantic_cod", "aquaculture:atlantic_herring", "aquaculture:pink_salmon",
  "aquaculture:pollock", "aquaculture:red_grouper", "aquaculture:tuna",
  "aquaculture:atlantic_halibut", "aquaculture:pacific_halibut", "aquaculture:arapaima",
  "aquaculture:gar", "aquaculture:muskellunge", "aquaculture:piranha", "aquaculture:tambaqui"
]

const DZ_QUALITY_RARE_FISH = [
  "aquaculture:tuna", "aquaculture:atlantic_halibut", "aquaculture:pacific_halibut",
  "aquaculture:arapaima", "aquaculture:gar", "aquaculture:muskellunge", "aquaculture:piranha"
]

const DZ_QUALITY_SUPPLY_GRADES = [
  {grade: 3, name: "特選", types: 7, perType: 10, item: "kubejs:seasonal_supply_lot_prime"},
  {grade: 2, name: "選別", types: 5, perType: 8, item: "kubejs:seasonal_supply_lot_select"},
  {grade: 1, name: "標準", types: 3, perType: 6, item: "kubejs:seasonal_supply_lot_standard"}
]

const DZ_QUALITY_CATCH_GRADES = [
  {grade: 3, name: "特選", types: 7, perType: 1, rare: 2, item: "kubejs:catch_lot_prime"},
  {grade: 2, name: "選別", types: 5, perType: 1, rare: 0, item: "kubejs:catch_lot_select"},
  {grade: 1, name: "標準", types: 3, perType: 1, rare: 0, item: "kubejs:catch_lot_standard"}
]

function dzQualitySeason(player) {
  try {
    return String(DZ_QUALITY_SEASON_HELPER.getSeasonState(player.level).getSeason()).toUpperCase()
  } catch (error) {
    console.warn("[PROJECT DEADZONE][Life Quality] Season lookup failed: " + error)
    return "UNKNOWN"
  }
}

function dzQualityItemCount(player, item) {
  return player.server.runCommandSilent("clear " + player.username + " " + item + " 0")
}

function dzQualityAvailable(player, pool, perType) {
  return pool.filter(item => dzQualityItemCount(player, item) >= perType)
}

function dzQualityPickSupply(player) {
  let season = dzQualitySeason(player)
  let pool = DZ_QUALITY_SUPPLY_POOLS[season]
  if (!pool) return {season: season, pool: [], grade: null, selected: []}
  for (let i = 0; i < DZ_QUALITY_SUPPLY_GRADES.length; i++) {
    let grade = DZ_QUALITY_SUPPLY_GRADES[i]
    let available = dzQualityAvailable(player, pool, grade.perType)
    if (available.length >= grade.types) return {season: season, pool: pool, grade: grade, selected: available.slice(0, grade.types)}
  }
  return {season: season, pool: pool, grade: null, selected: []}
}

function dzQualityPickCatch(player) {
  for (let i = 0; i < DZ_QUALITY_CATCH_GRADES.length; i++) {
    let grade = DZ_QUALITY_CATCH_GRADES[i]
    let available = dzQualityAvailable(player, DZ_QUALITY_FISH_POOL, grade.perType)
    let rare = available.filter(item => DZ_QUALITY_RARE_FISH.indexOf(item) >= 0)
    if (available.length < grade.types || rare.length < grade.rare) continue
    let selected = rare.slice(0, grade.rare)
    available.forEach(item => { if (selected.length < grade.types && selected.indexOf(item) < 0) selected.push(item) })
    return {grade: grade, selected: selected}
  }
  return {grade: null, selected: []}
}

function dzQualityCompleteGradeQuests(player, category, grade) {
  let keys = category === "supply" ? ["supply1", "supply2", "supply3"] : ["catch1", "catch2", "catch3"]
  for (let i = 0; i < grade; i++) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_QUALITY_QUESTS[keys[i]])
}

function dzQualitySyncQuests(player) {
  let supply = Math.max(0, Math.min(3, player.persistentData.getInt("dz_quality_supply_grade")))
  let caught = Math.max(0, Math.min(3, player.persistentData.getInt("dz_quality_catch_grade")))
  let supplyContracts = player.persistentData.getInt("dz_quality_supply_contracts")
  let catchContracts = player.persistentData.getInt("dz_quality_catch_contracts")
  if (supply > 0 || caught > 0 || supplyContracts > 0 || catchContracts > 0) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_QUALITY_QUESTS.intro)
  if (supply > 0) dzQualityCompleteGradeQuests(player, "supply", supply)
  if (caught > 0) dzQualityCompleteGradeQuests(player, "catch", caught)
  if (supplyContracts > 0) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_QUALITY_QUESTS.supplyContract)
  if (catchContracts > 0) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_QUALITY_QUESTS.catchContract)
}

function dzQualityCertify(player, category) {
  let result = category === "supply" ? dzQualityPickSupply(player) : dzQualityPickCatch(player)
  if (!result.grade) {
    if (category === "supply") {
      player.tell(Text.of("旬の供給品が不足しています。標準は同じ季節の3種類を各6個から。現在: " + result.season).red())
    player.tell(Text.of("候補はBase Coreの『食材検品』で確認できます。").gray())
    } else {
      player.tell(Text.of("魚種が不足しています。標準は異なる3魚種、特選は7魚種のうち希少魚2種が必要です。").red())
    }
    return 0
  }
  result.selected.forEach(item => player.server.runCommandSilent("clear " + player.username + " " + item + " " + result.grade.perType))
  player.server.runCommandSilent("give " + player.username + " " + result.grade.item + " 1")
  let key = category === "supply" ? "dz_quality_supply_grade" : "dz_quality_catch_grade"
  let oldGrade = player.persistentData.getInt(key)
  if (result.grade.grade > oldGrade) player.persistentData.putInt(key, result.grade.grade)
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_QUALITY_QUESTS.intro)
  dzQualityCompleteGradeQuests(player, category, result.grade.grade)
  player.tell(Text.of(result.grade.name + "ロットに認定しました。消費: " + result.selected.length + "種類 x" + result.grade.perType).green())
  player.tell(Text.of("[品質納品依頼を確認]").aqua().clickRunCommand("/deadzonecontracts"))
  return 1
}

function dzQualityStatus(player) {
  let supply = dzQualityPickSupply(player)
  let caught = dzQualityPickCatch(player)
  player.tell(Text.of("=== 生活供給 検品所 ===").gold())
  player.tell(Text.of("現在季節: " + supply.season + "｜旬の供給候補 " + supply.pool.length + "種類").aqua())
  player.tell(Text.of("供給ロット: " + (supply.grade ? supply.grade.name + "を作成可能" : "標準未達成")).gray())
  player.tell(Text.of("漁獲ロット: " + (caught.grade ? caught.grade.name + "を作成可能" : "標準未達成")).gray())
  player.tell(Text.of("供給条件  標準3種x6 / 選別5種x8 / 特選7種x10").yellow())
  player.tell(Text.of("漁獲条件  標準3魚種 / 選別5魚種 / 特選7魚種（希少2種）").yellow())
  player.tell(Text.of("[旬の供給品を検品]").green().clickRunCommand("/deadzonequality certify_supply"))
  player.tell(Text.of("[漁獲物を検品]").aqua().clickRunCommand("/deadzonequality certify_catch"))
  player.tell(Text.of("供給候補IDを表示").gray().clickRunCommand("/deadzonequality list_supply"))
  return 1
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonequality")
  root.executes(ctx => dzQualityStatus(ctx.source.player))
  root.then(Commands.literal("status").executes(ctx => dzQualityStatus(ctx.source.player)))
  root.then(Commands.literal("certify_supply").executes(ctx => dzQualityCertify(ctx.source.player, "supply")))
  root.then(Commands.literal("certify_catch").executes(ctx => dzQualityCertify(ctx.source.player, "catch")))
  root.then(Commands.literal("list_supply").executes(ctx => {
    let player = ctx.source.player
    let season = dzQualitySeason(player)
    player.tell(Text.of(season + " の検品対象:").gold())
    ;(DZ_QUALITY_SUPPLY_POOLS[season] || []).forEach(item => player.tell(Text.of("- " + item + " x" + dzQualityItemCount(player, item)).gray()))
    return 1
  }))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    ;["dz_quality_supply_grade", "dz_quality_catch_grade", "dz_quality_supply_contracts", "dz_quality_catch_contracts"].forEach(key => player.persistentData.remove(key))
    player.tell(Text.of("生活品質の個人試験記録を初期化しました。取得済みロットと評判は戻していません。").yellow())
    return 1
  }))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(120, callback => dzQualitySyncQuests(event.player)))

console.info("[PROJECT DEADZONE][Life Quality] v0.1 loaded.")
