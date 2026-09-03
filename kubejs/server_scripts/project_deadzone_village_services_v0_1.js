// PROJECT DEADZONE village public services v0.2
//
// Village detection is supplied by the existing wilderness-site scan. That
// scan only samples already-loaded terrain when a player changes chunks, so
// this feature adds no global chunk walk, forced loads, or per-tick block scan.
// One successful installation is recorded by the exact structure start and is
// shared by every player through server persistent data.

const PDZ_VILLAGE_SERVICES_REGISTRY = 'dz_village_services_registry_v1'
const PDZ_VILLAGE_BLOCKPOS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_VILLAGE_POI_TYPES = Java.loadClass('net.minecraft.world.entity.ai.village.poi.PoiTypes')
const PDZ_VILLAGE_POI_OCCUPANCY = Java.loadClass('net.minecraft.world.entity.ai.village.poi.PoiManager$Occupancy')
const PDZ_VILLAGE_HEIGHTMAP = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
const PDZ_VILLAGE_ITEM_STACK = Java.loadClass('net.minecraft.world.item.ItemStack')
const PDZ_VILLAGE_RESOURCE_LOCATION = Java.loadClass('net.minecraft.resources.ResourceLocation')
const PDZ_VILLAGE_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const PDZ_VILLAGE_TRADE_DIRECTION = Java.loadClass('io.github.lightman314.lightmanscurrency.api.traders.trade.TradeDirection')
const PDZ_VILLAGE_PLAYER_TRADE_LIMIT = Java.loadClass('io.github.lightman314.lightmanscurrency.common.traders.rules.types.PlayerTradeLimit')
const PDZ_VILLAGE_MARKET_VERSION = 1
const PDZ_VILLAGE_MARKET_RESET_MS = 86400000

const PDZ_VILLAGE_MARKETS = {
  agriculture: {
    name:'PDZ 農業集積所',
    offers:[
      {direction:'purchase', item:'minecraft:wheat', count:16, price:8, limit:12, label:'小麦納入'},
      {direction:'purchase', item:'minecraft:carrot', count:16, price:8, limit:12, label:'ニンジン納入'},
      {direction:'purchase', item:'minecraft:beef', count:8, price:12, limit:8, label:'生肉納入'},
      {direction:'sale', item:'minecraft:bread', count:8, price:12, limit:8, label:'主食パック'},
      {direction:'sale', item:'minecraft:cooked_beef', count:4, price:16, limit:6, label:'保存食パック'},
      {direction:'sale', item:'minecraft:bone_meal', count:16, price:18, limit:4, label:'農業資材'}
    ]
  },
  fishing: {
    name:'PDZ 水産物資所',
    offers:[
      {direction:'purchase', item:'minecraft:cod', count:8, price:10, limit:12, label:'タラ納入'},
      {direction:'purchase', item:'minecraft:salmon', count:8, price:12, limit:12, label:'サケ納入'},
      {direction:'purchase', item:'minecraft:string', count:16, price:10, limit:8, label:'繊維資材納入'},
      {direction:'sale', item:'minecraft:cooked_cod', count:4, price:12, limit:8, label:'魚保存食'},
      {direction:'sale', item:'minecraft:fishing_rod', count:1, price:30, limit:2, label:'漁具補給'},
      {direction:'sale', item:'minecraft:lantern', count:2, price:18, limit:4, label:'沿岸照明'}
    ]
  },
  mining: {
    name:'PDZ 鉱業物資所',
    offers:[
      {direction:'purchase', item:'minecraft:coal', count:16, price:12, limit:12, label:'石炭納入'},
      {direction:'purchase', item:'minecraft:raw_copper', count:16, price:16, limit:10, label:'銅鉱石納入'},
      {direction:'purchase', item:'minecraft:raw_iron', count:8, price:24, limit:8, label:'鉄鉱石納入'},
      {direction:'sale', item:'minecraft:torch', count:32, price:12, limit:8, label:'坑道照明'},
      {direction:'sale', item:'minecraft:iron_pickaxe', count:1, price:80, limit:2, label:'採掘工具'},
      {direction:'sale', item:'minecraft:cooked_porkchop', count:4, price:18, limit:6, label:'作業食'}
    ]
  },
  base: {
    name:'PDZ 拠点総合補給所',
    offers:[
      {direction:'purchase', item:'minecraft:wheat', count:16, price:8, limit:12, label:'小麦納入'},
      {direction:'purchase', item:'minecraft:cod', count:8, price:10, limit:12, label:'タラ納入'},
      {direction:'purchase', item:'minecraft:string', count:16, price:10, limit:8, label:'繊維資材納入'},
      {direction:'purchase', item:'minecraft:coal', count:16, price:12, limit:12, label:'石炭納入'},
      {direction:'purchase', item:'minecraft:raw_copper', count:16, price:16, limit:10, label:'銅鉱石納入'},
      {direction:'purchase', item:'minecraft:raw_iron', count:8, price:24, limit:8, label:'鉄鉱石納入'},
      {direction:'sale', item:'minecraft:bread', count:8, price:12, limit:8, label:'主食パック'},
      {direction:'sale', item:'minecraft:cooked_beef', count:4, price:16, limit:6, label:'保存食パック'},
      {direction:'sale', item:'minecraft:torch', count:32, price:12, limit:8, label:'照明資材'},
      {direction:'sale', item:'minecraft:lantern', count:2, price:18, limit:4, label:'拠点照明'},
      {direction:'sale', item:'minecraft:fishing_rod', count:1, price:30, limit:2, label:'漁具補給'},
      {direction:'sale', item:'minecraft:iron_pickaxe', count:1, price:80, limit:2, label:'採掘工具'}
    ]
  }
}

function pdzVillageNativeStack(id, count) {
  let item = PDZ_VILLAGE_FORGE_REGISTRIES.ITEMS.getValue(new PDZ_VILLAGE_RESOURCE_LOCATION(String(id)))
  if (!item) return PDZ_VILLAGE_ITEM_STACK.EMPTY
  return new PDZ_VILLAGE_ITEM_STACK(item, Math.max(1, Math.floor(Number(count) || 1)))
}

function pdzVillageBiomeId(level, pos) {
  try {
    let key = level.getBiome(pos).unwrapKey()
    if (key && key.isPresent()) return String(key.get().location())
  } catch (ignored) {}
  return ''
}

function pdzVillageMarketPreset(level, siteId, bell) {
  let pos = new PDZ_VILLAGE_BLOCKPOS(bell.x, bell.y, bell.z)
  let hint = (String(siteId || '') + ' ' + pdzVillageBiomeId(level, pos)).toLowerCase()
  if (/(ocean|coast|beach|river|swamp|mangrove|fishing|harbor|port)/.test(hint)) return 'fishing'
  if (/(mountain|hill|peak|taiga|snow|alpine|mining|quarry|badlands)/.test(hint)) return 'mining'
  if (/(plains|savanna|desert|meadow|farm)/.test(hint)) return 'agriculture'
  let stable = Math.abs((Number(bell.x) * 31 + Number(bell.z) * 17) % 3)
  return stable === 0 ? 'agriculture' : stable === 1 ? 'fishing' : 'mining'
}

function pdzVillageIsVillageStructure(siteId) {
  siteId = String(siteId || '')
  if (siteId.indexOf('minecraft:village_') === 0) return true
  if (siteId.indexOf('ctov:') === 0 && siteId.indexOf('/village_') >= 0) return true
  if (siteId.indexOf('towns_and_towers:village_') === 0) return true
  return siteId.indexOf('towns_and_towers:exclusives/village_') === 0 &&
    siteId.indexOf('wandering_trader_camp') < 0 && siteId.indexOf('piglin') < 0
}

function pdzVillageReadServices(server) {
  let raw = server.persistentData.getString(PDZ_VILLAGE_SERVICES_REGISTRY)
  if (!raw) return {}
  try { return JSON.parse(raw) }
  catch (err) {
    console.error('[PDZ VILLAGE] Invalid service registry: ' + err)
    return {}
  }
}

function pdzVillageWriteServices(server, registry) {
  server.persistentData.putString(PDZ_VILLAGE_SERVICES_REGISTRY, JSON.stringify(registry))
}

function pdzVillageStructureKey(player, siteId, start) {
  let box = start.getBoundingBox()
  return String(player.level.dimension) + '|village|' + siteId + '|' +
    Number(box.minX()) + '|' + Number(box.minY()) + '|' + Number(box.minZ())
}

function pdzVillageAir(level, x, y, z) {
  let id = String(level.getBlock(x, y, z).id)
  return id === 'minecraft:air' || id === 'minecraft:cave_air' ||
    id === 'minecraft:void_air' || id === 'minecraft:grass' ||
    id === 'minecraft:tall_grass' || id === 'minecraft:fern' ||
    id === 'minecraft:large_fern' || id === 'minecraft:snow' ||
    id.indexOf('minecraft:dandelion') === 0 || id.indexOf('minecraft:poppy') === 0
}

function pdzVillageBadFloor(id) {
  id = String(id)
  return id === 'minecraft:air' || id === 'minecraft:cave_air' ||
    id === 'minecraft:void_air' || id.indexOf('water') >= 0 ||
    id.indexOf('lava') >= 0 || id.indexOf('leaves') >= 0 ||
    id.indexOf('fence') >= 0 || id.indexOf('_wall') >= 0 ||
    id.indexOf('pane') >= 0 || id.indexOf('bars') >= 0
}

function pdzVillageFindMeeting(level, start, hint) {
  let box = start.getBoundingBox()
  let minX = Number(box.minX()), minZ = Number(box.minZ())
  let maxX = Number(box.maxX()), maxZ = Number(box.maxZ())
  let cx = Math.floor((minX + maxX) / 2), cz = Math.floor((minZ + maxZ) / 2)
  let cy = Math.floor((Number(box.minY()) + Number(box.maxY())) / 2)
  let radius = Math.max(48, Math.min(160,
    Math.ceil(Math.max(maxX - minX, maxZ - minZ) / 2) + 24))
  try {
    let found = level.getPoiManager().findClosest(
      holder => holder.is(PDZ_VILLAGE_POI_TYPES.MEETING),
      new PDZ_VILLAGE_BLOCKPOS(cx, cy, cz), radius,
      PDZ_VILLAGE_POI_OCCUPANCY.ANY)
    if (found && found.isPresent()) {
      let pos = found.get(), x = Number(pos.getX()), y = Number(pos.getY()), z = Number(pos.getZ())
      // Do not borrow a neighbouring village's bell when two structures happen
      // to generate close together, or force its still-unloaded chunk.
      if (x >= minX - 16 && x <= maxX + 16 && z >= minZ - 16 && z <= maxZ + 16 &&
          level.hasChunkAt(pos))
        return {x:x, y:y, z:z}
    }
  } catch (err) {
    console.warn('[PDZ VILLAGE] Meeting POI lookup failed; using loaded-surface fallback: ' + err)
  }

  // Compatibility fallback for village mods that do not register a meeting
  // POI correctly. The cap keeps malformed giant structure boxes harmless.
  let fallbackX = hint && Number.isFinite(Number(hint.x)) ? Math.floor(Number(hint.x)) : cx
  let fallbackZ = hint && Number.isFinite(Number(hint.z)) ? Math.floor(Number(hint.z)) : cz
  let scanMinX = Math.max(minX, fallbackX - 48), scanMaxX = Math.min(maxX, fallbackX + 48)
  let scanMinZ = Math.max(minZ, fallbackZ - 48), scanMaxZ = Math.min(maxZ, fallbackZ + 48)
  for (let x = scanMinX; x <= scanMaxX; x++) for (let z = scanMinZ; z <= scanMaxZ; z++) {
    let probe = new PDZ_VILLAGE_BLOCKPOS(x, 64, z)
    if (!level.hasChunkAt(probe)) continue
    let surface = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, x, z))
    for (let y = surface + 2; y >= surface - 5; y--)
      if (String(level.getBlock(x, y, z).id) === 'minecraft:bell') return {x:x, y:y, z:z}
  }
  return null
}

function pdzVillageFindServiceSpot(level, bell) {
  let directions = [
    {dx:0, dz:-1, ax:1, az:0, facing:'south'},
    {dx:1, dz:0, ax:0, az:1, facing:'west'},
    {dx:0, dz:1, ax:1, az:0, facing:'north'},
    {dx:-1, dz:0, ax:0, az:1, facing:'east'}
  ]
  for (let radius = 3; radius <= 9; radius++) for (let d = 0; d < directions.length; d++) {
    let dir = directions[d]
    for (let lateral = -4; lateral <= 3; lateral++) {
      let bx = bell.x + dir.dx * radius + dir.ax * lateral
      let bz = bell.z + dir.dz * radius + dir.az * lateral
      let ax = bx + dir.ax, az = bz + dir.az
      if (!level.hasChunkAt(new PDZ_VILLAGE_BLOCKPOS(bx, bell.y, bz)) ||
          !level.hasChunkAt(new PDZ_VILLAGE_BLOCKPOS(ax, bell.y, az))) continue
      let by = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, bx, bz))
      let ay = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, ax, az))
      if (by !== ay || Math.abs(by - bell.y) > 3) continue
      if (!pdzVillageAir(level, bx, by, bz) || !pdzVillageAir(level, bx, by + 1, bz)) continue
      if (!pdzVillageAir(level, ax, ay, az) || !pdzVillageAir(level, ax, ay + 1, az)) continue
      if (pdzVillageBadFloor(level.getBlock(bx, by - 1, bz).id) ||
          pdzVillageBadFloor(level.getBlock(ax, ay - 1, az).id)) continue
      return {boardX:bx, atmX:ax, y:by, boardZ:bz, atmZ:az, facing:dir.facing}
    }
  }
  return null
}

function pdzVillagePlaceServices(player, spot) {
  let server = player.server, level = player.level
  let atmBottom = 'lightmanscurrency:atm[bottom=true,facing=' + spot.facing + ']'
  let atmTop = 'lightmanscurrency:atm[bottom=false,facing=' + spot.facing + ']'
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + spot.y + ' ' + spot.atmZ + ' ' + atmBottom)
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + (spot.y + 1) + ' ' + spot.atmZ + ' ' + atmTop)
  let atmOk = String(level.getBlock(spot.atmX, spot.y, spot.atmZ).id) === 'lightmanscurrency:atm' &&
    String(level.getBlock(spot.atmX, spot.y + 1, spot.atmZ).id) === 'lightmanscurrency:atm'
  if (!atmOk) {
    // Some tall-block implementations validate the other half immediately.
    // A reverse-order retry covers both update orders.
    server.runCommandSilent('setblock ' + spot.atmX + ' ' + (spot.y + 1) + ' ' + spot.atmZ + ' ' + atmTop)
    server.runCommandSilent('setblock ' + spot.atmX + ' ' + spot.y + ' ' + spot.atmZ + ' ' + atmBottom)
    atmOk = String(level.getBlock(spot.atmX, spot.y, spot.atmZ).id) === 'lightmanscurrency:atm' &&
      String(level.getBlock(spot.atmX, spot.y + 1, spot.atmZ).id) === 'lightmanscurrency:atm'
  }
  if (!atmOk) return false
  server.runCommandSilent('setblock ' + spot.boardX + ' ' + spot.y + ' ' + spot.boardZ + ' bountiful:bountyboard')
  if (String(level.getBlock(spot.boardX, spot.y, spot.boardZ).id) === 'bountiful:bountyboard') return true
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + spot.y + ' ' + spot.atmZ + ' minecraft:air')
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + (spot.y + 1) + ' ' + spot.atmZ + ' minecraft:air')
  return false
}

function pdzVillageFindMarketSpot(level, bell) {
  let directions = [
    {dx:0, dz:-1, ax:1, az:0, facing:'south'},
    {dx:1, dz:0, ax:0, az:1, facing:'west'},
    {dx:0, dz:1, ax:1, az:0, facing:'north'},
    {dx:-1, dz:0, ax:0, az:1, facing:'east'}
  ]
  for (let radius = 3; radius <= 11; radius++) for (let d = 0; d < directions.length; d++) {
    let dir = directions[d]
    for (let lateral = -5; lateral <= 5; lateral++) {
      let x = bell.x + dir.dx * radius + dir.ax * lateral
      let z = bell.z + dir.dz * radius + dir.az * lateral
      if (!level.hasChunkAt(new PDZ_VILLAGE_BLOCKPOS(x, bell.y, z))) continue
      let y = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, x, z))
      if (Math.abs(y - bell.y) > 3) continue
      if (!pdzVillageAir(level, x, y, z) || !pdzVillageAir(level, x, y + 1, z)) continue
      if (pdzVillageBadFloor(level.getBlock(x, y - 1, z).id)) continue
      return {x:x, y:y, z:z, facing:dir.facing}
    }
  }
  return null
}

function pdzVillageConfigureMarket(player, spot, presetId, publicService) {
  try {
    let level = player.level
    let pos = new PDZ_VILLAGE_BLOCKPOS(spot.x, spot.y, spot.z)
    let blockEntity = level.getBlockEntity(pos)
    if (!blockEntity) return false
    let trader = blockEntity.getTraderData()
    if (!trader) {
      blockEntity.initialize(player, PDZ_VILLAGE_ITEM_STACK.EMPTY)
      trader = blockEntity.getTraderData()
    }
    if (!trader) return false

    let preset = PDZ_VILLAGE_MARKETS[presetId]
    trader.setCreative(true)
    trader.setStoreCreativeMoney(false)
    trader.setIgnoreAllTaxes(true)
    trader.setCustomName(preset.name)
    // The public service is server-owned. Clearing the discoverer's temporary
    // placement ownership prevents ordinary players from editing admin stock.
    if (publicService !== false) trader.getOwner().SetOwner(null)

    for (let i = 0; i < preset.offers.length; i++) {
      let offer = preset.offers[i]
      let trade = trader.getTrade(i)
      if (!trade) return false
      trade.setItem(PDZ_VILLAGE_ITEM_STACK.EMPTY, 0)
      trade.setItem(PDZ_VILLAGE_ITEM_STACK.EMPTY, 1)
      trade.setItem(PDZ_VILLAGE_ITEM_STACK.EMPTY, 2)
      trade.setItem(PDZ_VILLAGE_ITEM_STACK.EMPTY, 3)
      trade.getRules().clear()
      trade.setTradeDirection(offer.direction === 'purchase' ?
        PDZ_VILLAGE_TRADE_DIRECTION.PURCHASE : PDZ_VILLAGE_TRADE_DIRECTION.SALE)
      trade.setItem(pdzVillageNativeStack(offer.item, offer.count), 0)
      trade.setEnforceNBT(0, false)
      trade.setCustomName(0, offer.label)
      trade.setCost(dzCreditValue(offer.price))

      let limit = PDZ_VILLAGE_PLAYER_TRADE_LIMIT.TYPE.createNew()
      limit.setLimit(offer.limit)
      limit.setTimeLimit(PDZ_VILLAGE_MARKET_RESET_MS)
      limit.setActive(true)
      trade.getRules().add(limit)
    }
    trader.markTradesDirty()
    trader.markTradeRulesDirty()
    blockEntity.markDirty()
    console.info('[PDZ VILLAGE] Configured ' + presetId + ' market at ' +
      spot.x + ',' + spot.y + ',' + spot.z)
    return true
  } catch (err) {
    console.error('[PDZ VILLAGE] Market configuration failed at ' +
      spot.x + ',' + spot.y + ',' + spot.z + ': ' + err)
    return false
  }
}

BlockEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  if (String(event.block.id) !== 'lightmanscurrency:vending_machine_large') return
  let held = event.item
  if (!held || held.empty || !held.nbt || Number(held.nbt.PDZMarketSetupCard || 0) !== 1) return
  if (String(player.username).toLowerCase() !== 'natsumamire' && !player.hasPermissions(2)) {
    player.tell(Text.of('この設定カードはサーバー管理者専用です。').red())
    event.cancel()
    return
  }

  let x = Number(event.block.x), y = Number(event.block.y), z = Number(event.block.z), targetY = y
  let configured = pdzVillageConfigureMarket(player, {x:x, y:y, z:z}, 'base', false)
  if (!configured) {
    targetY = y - 1
    configured = pdzVillageConfigureMarket(player, {x:x, y:targetY, z:z}, 'base', false)
  }

  let registered = false
  if (configured && global.pdzRegisterManagedVending)
    registered = global.pdzRegisterManagedVending(player.server, String(player.level.dimension), x, targetY, z, 'base', 'admin-card')

  if (configured && registered) {
    player.tell(Text.of('大型自販機を「PDZ 拠点総合補給所」に設定し、自動更新へ登録しました。').green())
    player.tell(Text.of('固定必需品＋ランダム販売・買取枠を2時間ごとに更新します。').gray())
    console.info('[PDZ MARKET] Base market configured and registered by ' + player.username + ' at ' + x + ',' + targetY + ',' + z)
  } else if (configured) {
    player.tell(Text.of('固定設定は完了しましたが、自動更新登録に失敗しました。サーバー更新世代を確認してください。').red())
  } else {
    player.tell(Text.of('自販機の設定に失敗しました。下段ブロックを右クリックしてください。').red())
  }
  event.cancel()
})

function pdzVillagePlaceMarket(player, spot, presetId) {
  let server = player.server, level = player.level
  let bottom = 'lightmanscurrency:vending_machine[bottom=true,facing=' + spot.facing + ']'
  let top = 'lightmanscurrency:vending_machine[bottom=false,facing=' + spot.facing + ']'
  server.runCommandSilent('setblock ' + spot.x + ' ' + spot.y + ' ' + spot.z + ' ' + bottom)
  server.runCommandSilent('setblock ' + spot.x + ' ' + (spot.y + 1) + ' ' + spot.z + ' ' + top)
  let ok = String(level.getBlock(spot.x, spot.y, spot.z).id) === 'lightmanscurrency:vending_machine' &&
    String(level.getBlock(spot.x, spot.y + 1, spot.z).id) === 'lightmanscurrency:vending_machine'
  if (!ok) {
    server.runCommandSilent('setblock ' + spot.x + ' ' + (spot.y + 1) + ' ' + spot.z + ' ' + top)
    server.runCommandSilent('setblock ' + spot.x + ' ' + spot.y + ' ' + spot.z + ' ' + bottom)
    ok = String(level.getBlock(spot.x, spot.y, spot.z).id) === 'lightmanscurrency:vending_machine' &&
      String(level.getBlock(spot.x, spot.y + 1, spot.z).id) === 'lightmanscurrency:vending_machine'
  }
  if (!ok || !pdzVillageConfigureMarket(player, spot, presetId)) {
    server.runCommandSilent('setblock ' + spot.x + ' ' + spot.y + ' ' + spot.z + ' minecraft:air')
    server.runCommandSilent('setblock ' + spot.x + ' ' + (spot.y + 1) + ' ' + spot.z + ' minecraft:air')
    return false
  }
  return true
}

function pdzVillageEnsureServices(player, siteId, start, hint) {
  if (!pdzVillageIsVillageStructure(siteId) || !start || !start.isValid()) return false
  let key = pdzVillageStructureKey(player, siteId, start)
  let registry = pdzVillageReadServices(player.server)
  let current = registry[key]
  if (current && current.placed && Number(current.marketVersion || 0) >= PDZ_VILLAGE_MARKET_VERSION) return true

  // Existing worlds already have ATM + board entries. Add only the missing
  // market machine instead of duplicating or moving their public services.
  if (current && current.placed) {
    let oldBell = current.bell || pdzVillageFindMeeting(player.level, start, hint)
    if (!oldBell) return true
    let oldMarketSpot = pdzVillageFindMarketSpot(player.level, oldBell)
    if (!oldMarketSpot) return true
    let oldPreset = pdzVillageMarketPreset(player.level, siteId, oldBell)
    if (!pdzVillagePlaceMarket(player, oldMarketSpot, oldPreset)) return true
    current.marketVersion = PDZ_VILLAGE_MARKET_VERSION
    current.marketPreset = oldPreset
    current.market = {x:oldMarketSpot.x,y:oldMarketSpot.y,z:oldMarketSpot.z}
    current.marketPlacedAt = Date.now()
    registry[key] = current
    pdzVillageWriteServices(player.server, registry)
    return true
  }
  // Claim before placement so two players discovering one village on the same
  // server tick cannot create duplicate terminals.
  registry[key] = {placed:false, claimedAt:Date.now(), structure:String(siteId)}
  pdzVillageWriteServices(player.server, registry)
  let bell = pdzVillageFindMeeting(player.level, start, hint)
  let spot = bell ? pdzVillageFindServiceSpot(player.level, bell) : null
  if (!spot || !pdzVillagePlaceServices(player, spot)) {
    delete registry[key]
    pdzVillageWriteServices(player.server, registry)
    return false
  }
  let installed = {
    placed:true, structure:String(siteId), placedAt:Date.now(),
    bell:{x:bell.x,y:bell.y,z:bell.z},
    board:{x:spot.boardX,y:spot.y,z:spot.boardZ},
    atm:{x:spot.atmX,y:spot.y,z:spot.atmZ}
  }
  let marketSpot = pdzVillageFindMarketSpot(player.level, bell)
  if (marketSpot) {
    let preset = pdzVillageMarketPreset(player.level, siteId, bell)
    if (pdzVillagePlaceMarket(player, marketSpot, preset)) {
      installed.marketVersion = PDZ_VILLAGE_MARKET_VERSION
      installed.marketPreset = preset
      installed.market = {x:marketSpot.x,y:marketSpot.y,z:marketSpot.z}
      installed.marketPlacedAt = Date.now()
    }
  }
  registry[key] = installed
  pdzVillageWriteServices(player.server, registry)
  console.info('[PDZ VILLAGE] Installed Bountiful Board + ATM' +
    (installed.market ? ' + ' + installed.marketPreset + ' market' : '') + ' at ' +
    spot.boardX + ',' + spot.y + ',' + spot.boardZ + ' for ' + siteId)
  return true
}
