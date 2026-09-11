// PROJECT DEADZONE Currency v0.2
// Lightman's Currency is the only live money system.
// 1 legacy Apocalypse Now note = 1 Credit during automatic migration.

const DZ_CREDIT_CHAIN = "main"
const DZ_CREDIT_ITEM = "lightmanscurrency:coin_copper"
const DZ_CREDIT_WALLET = "lightmanscurrency:wallet_leather"
const DZ_LEGACY_MONEY_ITEMS = ["apocalypsenow:money", "apocalypsenow:coins"]
const DZ_CREDIT_WALLET_GRANT = "pdz_credit_wallet_granted_v1"
const DZ_ADMIN_MARKET_GRANT = "pdz_admin_market_granted_v1"
const DZ_ADMIN_MARKET_CARD_GRANT = "pdz_admin_market_card_granted_v1"

const DZ_CREDIT_MONEY_API = Java.loadClass("io.github.lightman314.lightmanscurrency.api.money.MoneyAPI")
const DZ_CREDIT_COIN_VALUE = Java.loadClass("io.github.lightman314.lightmanscurrency.api.money.value.builtin.CoinValue")
const DZ_CREDIT_COIN_API = Java.loadClass("io.github.lightman314.lightmanscurrency.api.money.coins.CoinAPI")

function dzCreditValue(amount) {
  return DZ_CREDIT_COIN_VALUE.fromNumber(DZ_CREDIT_CHAIN, Math.max(0, Math.floor(Number(amount) || 0)))
}

function dzCreditHandler(player) {
  return DZ_CREDIT_MONEY_API.getApi().GetPlayersMoneyHandler(player)
}

function dzCreditBalance(player) {
  try {
    let probe = dzCreditValue(1)
    return Number(dzCreditHandler(player).getStoredMoney().valueOf(probe.getUniqueName()).getCoreValue())
  } catch (error) {
    console.error("[PROJECT DEADZONE][Credit] balance lookup failed for " + player.username + ": " + error)
    return Number(player.inventory.count(Item.of(DZ_CREDIT_ITEM)))
  }
}

function dzCreditCanAfford(player, amount) {
  amount = Math.max(0, Math.floor(Number(amount) || 0))
  if (amount === 0) return true
  try { return dzCreditHandler(player).getStoredMoney().containsValue(dzCreditValue(amount)) }
  catch (ignored) { return dzCreditBalance(player) >= amount }
}

function dzCreditTake(player, amount) {
  amount = Math.max(0, Math.floor(Number(amount) || 0))
  if (amount === 0) return true
  try {
    let handler = dzCreditHandler(player)
    let value = dzCreditValue(amount)
    if (!handler.extractMoney(value, true).isEmpty()) return false
    return handler.extractMoney(value, false).isEmpty()
  } catch (error) {
    console.error("[PROJECT DEADZONE][Credit] payment failed for " + player.username + ": " + error)
    return false
  }
}

function dzCreditGive(player, amount) {
  amount = Math.max(0, Math.floor(Number(amount) || 0))
  if (amount === 0) return true
  try {
    let remainder = dzCreditHandler(player).insertMoney(dzCreditValue(amount), false)
    let missing = Number(remainder.getCoreValue())
    while (missing > 0) {
      let stackSize = Math.min(64, missing)
      player.give(Item.of(DZ_CREDIT_ITEM, stackSize))
      missing -= stackSize
    }
    return true
  } catch (error) {
    console.error("[PROJECT DEADZONE][Credit] API reward fallback for " + player.username + ": " + error)
    let left = amount
    while (left > 0) {
      let stackSize = Math.min(64, left)
      player.give(Item.of(DZ_CREDIT_ITEM, stackSize))
      left -= stackSize
    }
    return true
  }
}

global.pdzCreditBalance = dzCreditBalance
global.pdzCreditCanAfford = dzCreditCanAfford
global.pdzCreditTake = dzCreditTake
global.pdzCreditGive = dzCreditGive

function dzCreditHasEquippedWallet(player) {
  try { return !DZ_CREDIT_COIN_API.getApi().getEquippedWallet(player).isEmpty() }
  catch (ignored) { return false }
}

function dzCreditMigrateLegacy(player, announce) {
  let converted = 0
  DZ_LEGACY_MONEY_ITEMS.forEach(legacyId => {
    let before = Number(player.inventory.count(Item.of(legacyId)))
    if (before <= 0) return
    player.runCommandSilent("clear @s " + legacyId + " " + before)
    let after = Number(player.inventory.count(Item.of(legacyId)))
    converted += Math.max(0, before - after)
  })
  if (converted > 0) {
    dzCreditGive(player, converted)
    if (announce) player.tell(Text.of("旧紙幣 " + converted + "枚を " + converted + " Creditへ自動移行しました。").gold())
    console.info("[PROJECT DEADZONE][Credit] migrated " + converted + " legacy currency items for " + player.username)
  }
  return converted
}

function dzCreditPreparePlayer(player) {
  dzCreditMigrateLegacy(player, true)
  if (!player.persistentData.getBoolean(DZ_CREDIT_WALLET_GRANT)) {
    if (!dzCreditHasEquippedWallet(player)) player.give(Item.of(DZ_CREDIT_WALLET))
    player.persistentData.putBoolean(DZ_CREDIT_WALLET_GRANT, true)
    player.tell(Text.of("PDZ Credit Walletを支給しました。CuriosのWallet枠へ装備してください。").aqua())
    player.tell(Text.of("拾ったCreditは財布へ自動収納され、商人・治療・修理でも直接使えます。").gray())
  }
  if (String(player.username).toLowerCase() === 'natsumamire' &&
      !player.persistentData.getBoolean(DZ_ADMIN_MARKET_GRANT)) {
    player.give(Item.of('lightmanscurrency:vending_machine_large'))
    player.persistentData.putBoolean(DZ_ADMIN_MARKET_GRANT, true)
    player.tell(Text.of('管理拠点用の大型自動販売機を支給しました。').gold())
    player.tell(Text.of('設置者が所有者になり、12枠の販売・買取・物々交換を設定できます。').gray())
    console.info('[PROJECT DEADZONE][Credit] granted admin market to ' + player.username)
  }
  if ((String(player.username).toLowerCase() === 'natsumamire' || player.hasPermissions(2)) &&
      !player.persistentData.getBoolean(DZ_ADMIN_MARKET_CARD_GRANT)) {
    player.give(Item.of('minecraft:paper', '{PDZMarketSetupCard:1b,display:{Name:\'{"text":"PDZ Server Market Setup Card","color":"gold","italic":false}\',Lore:[\'{"text":"Sneak-right-click a vending machine to register/repair it","color":"gray","italic":false}\']}}'))
    player.persistentData.putBoolean(DZ_ADMIN_MARKET_CARD_GRANT, true)
  }
}

ServerEvents.loaded(event => {
  // Keep the wallet itself, but drop 20% of carried wallet contents on death.
  // Bank deposits remain safe.
  // Lightman's Currency resolves its custom game rules through the active
  // server instance. Delay one second so that reference exists after startup.
  event.server.scheduleInTicks(20, callback => {
    event.server.runCommandSilent("gamerule keepWallet true")
    event.server.runCommandSilent("gamerule coinDropPercent 20")
  })
})

PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(60, callback => dzCreditPreparePlayer(event.player))
})

PlayerEvents.tick(event => {
  // Old notes recovered from already-generated containers are converted too.
  if (event.player.age % 200 === 91) dzCreditMigrateLegacy(event.player, true)
})

ServerEvents.recipes(event => {
  // Apocalypse Now paper money and Lightman's resource minting are disabled.
  event.remove({id: "apocalypsenow:cointomoney"})
  event.remove({id: "apocalypsenow:moneyrecipe"})
  event.remove({id: "apocalypsenow:coinsre"})
  event.remove({output: "lightmanscurrency:coinmint"})
  ;[
    "lightmanscurrency:coin_copper",
    "lightmanscurrency:coin_iron",
    "lightmanscurrency:coin_gold",
    "lightmanscurrency:coin_emerald",
    "lightmanscurrency:coin_diamond",
    "lightmanscurrency:coin_netherite"
  ].forEach(id => event.remove({output: id}))
})
