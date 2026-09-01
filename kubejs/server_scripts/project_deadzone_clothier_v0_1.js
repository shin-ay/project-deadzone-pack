// PROJECT DEADZONE camp clothier v0.1
const DZ_CLOTHIER_TAG = "dz_basecamp_trader_clothing"
const DZ_CLOTHIER_NEXT = "dz_clothier_next_rotation"
const DZ_CLOTHIER_INTERVAL = 120 * 60 * 1000
// Fixed position of the clothing stall inside deadzone_survivor_camp_edit.
// The camp contains other yellow blocks, so a nearest-marker search is ambiguous.
const DZ_CLOTHIER_OFFSET = {x:25, y:2, z:6}
const DZ_CLOTHIER_ITEMS = [
  {id:"apocalypsenow:baseball_cap_red_helmet", price:4},
  {id:"apocalypsenow:cowboy_hat_helmet", price:6},
  {id:"apocalypsenow:high_visibility_jacket_chestplate", price:7},
  {id:"apocalypsenow:nurse_chestplate", price:8},
  {id:"apocalypsenow:nurse_leggings", price:6},
  {id:"apocalypsenow:nurse_boots", price:5},
  {id:"apocalypsenow:rusty_chestplate", price:6},
  {id:"apocalypsenow:rusty_leggings", price:5},
  {id:"apocalypsenow:rusty_boots", price:4},
  {id:"apocalypsenow:anarchy_chestplate", price:8}
]

function dzClothierShuffle(values) {
  let result = values.slice()
  for (let i = result.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    let temp = result[i]; result[i] = result[j]; result[j] = temp
  }
  return result
}

function dzClothierSelector() {
  return "@e[type=easy_npc:humanoid,tag=" + DZ_CLOTHIER_TAG + ",limit=1]"
}

function dzClothierRotate(server, announce) {
  if (server.runCommandSilent("execute if entity " + dzClothierSelector()) <= 0) return false
  let selected = dzClothierShuffle(DZ_CLOTHIER_ITEMS).slice(0, 4)
  let offers = selected.map(spec =>
    '{buy:{Count:' + spec.price + 'b,id:"lightmanscurrency:coin_copper"},buyB:{},' +
    'demand:0,maxUses:2,priceMultiplier:0.0f,rewardExp:0b,' +
    'sell:{Count:1b,id:"' + spec.id + '"},specialPrice:0,uses:0,xp:0}'
  )
  let nbt = '{Offers:{Inventory:{},Recipes:{Recipes:[' + offers.join(",") +
    ']}},TradingData:{TradingDataSet:{LastReset:0L,MaxUses:2,' +
    'ResetsEveryMin:120,RewardedXP:0,Type:"BASIC"}}}'
  if (server.runCommandSilent("data merge entity " + dzClothierSelector() + " " + nbt) <= 0) return false
  server.persistentData.putLong(DZ_CLOTHIER_NEXT, Date.now() + DZ_CLOTHIER_INTERVAL)
  console.info("[PROJECT DEADZONE][Clothier] stock rotated: " +
    selected.map(value => value.id).join(", "))
  if (announce) server.runCommandSilent(
    'tellraw @a {"text":"衣料品店の在庫が更新されました。","color":"yellow"}')
  return true
}

function dzFindYellowMarker(player) {
  let level = player.level
  let cx = Math.floor(player.x), cy = Math.floor(player.y), cz = Math.floor(player.z)
  let best = null, bestDistance = 999999
  for (let y = cy - 12; y <= cy + 20; y++) {
    for (let x = cx - 36; x <= cx + 36; x++) {
      for (let z = cz - 36; z <= cz + 36; z++) {
        if (String(level.getBlock(x, y, z).id) !== "minecraft:yellow_concrete") continue
        let distance = Math.abs(x - cx) + Math.abs(y - cy) + Math.abs(z - cz)
        if (distance < bestDistance) { bestDistance = distance; best = {x:x, y:y, z:z} }
      }
    }
  }
  return best
}

function dzInstallClothier(player, silent, allowLegacyMarkerScan) {
  let server = player.server
  let anchor = "@e[type=minecraft:marker,tag=dz_basecamp_clothier_anchor,limit=1]"
  let campData = server.persistentData
  let marker = null
  // Once the camp is installed, its saved origin is the only authoritative
  // location. Never scan around an arbitrary online player during auto-repair.
  if (campData.getInt("dz_auto_basecamp_state") === 2) {
    let ax = campData.getInt("dz_auto_basecamp_origin_x") + DZ_CLOTHIER_OFFSET.x + 0.5
    let ay = campData.getInt("dz_auto_basecamp_origin_y") + DZ_CLOTHIER_OFFSET.y
    let az = campData.getInt("dz_auto_basecamp_origin_z") + DZ_CLOTHIER_OFFSET.z + 0.5
    if (server.runCommandSilent("execute if entity " + anchor) > 0) {
      server.runCommandSilent("tp " + anchor + " " + ax + " " + ay + " " + az)
    } else {
      server.runCommandSilent('execute in minecraft:overworld run summon minecraft:marker ' + ax + ' ' + ay + ' ' + az +
        ' {Tags:["dz_basecamp_clothier_anchor"]}')
    }
  } else if (allowLegacyMarkerScan) {
    marker = dzFindYellowMarker(player)
    if (marker) {
      server.runCommandSilent("kill " + anchor)
      player.runCommandSilent("summon minecraft:marker " + (marker.x+0.5) + " " + marker.y + " " + (marker.z+0.5) +
        ' {Tags:["dz_basecamp_clothier_anchor"]}')
      server.runCommandSilent("setblock " + marker.x + " " + marker.y + " " + marker.z + " air")
    }
  }
  let hasAnchor = server.runCommandSilent("execute if entity " + anchor) > 0
  if (!hasAnchor && !marker) {
    if (!silent) player.tell(Text.of("黄色コンクリートの配置マーカーが見つかりません。").red())
    return 0
  }
  server.runCommandSilent("kill @e[type=easy_npc:humanoid,tag=" + DZ_CLOTHIER_TAG + "]")
  if (!hasAnchor) server.runCommandSilent("setblock " + marker.x + " " + marker.y + " " + marker.z + " air")
  let execution = hasAnchor
    ? "execute at " + anchor
    : "execute positioned " + (marker.x + 0.5) + " " + marker.y + " " + (marker.z + 0.5)
  let pos = hasAnchor ? "camp clothier anchor" : ((marker.x + 0.5) + " " + marker.y + " " + (marker.z + 0.5))
  // Preset import needs operator permission.  Running it through the joining
  // player silently fails for normal multiplayer users, leaving Yui absent.
  let imported = server.runCommandSilent(execution +
    " run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_yui_clothing.npc.nbt ~ ~ ~")
  // Some Easy NPC builds discard custom entity tags during preset import.
  // Recover only the NPC spawned directly on the anchor and explicitly
  // exclude Goro, who stands one block west of it.
  server.runCommandSilent(execution +
    " run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_trader_parts," +
    "tag=!" + DZ_CLOTHIER_TAG + ",distance=..0.8,sort=nearest,limit=1] add " + DZ_CLOTHIER_TAG)
  // Keep the two adjacent shops deterministic even if a preset has a small
  // saved position offset.
  server.runCommandSilent(execution + " run tp " + dzClothierSelector() + " ~ ~ ~")
  let tagged = server.runCommandSilent(execution +
    " run execute if entity @e[type=easy_npc:humanoid,tag=" + DZ_CLOTHIER_TAG +
    ",distance=..1.5,limit=1]")
  if (imported <= 0 || tagged <= 0) {
    console.error("[PROJECT DEADZONE][Clothier] install failed at " + pos +
      " (import=" + imported + ", tag=" + tagged + ")")
    if (!silent) player.tell(Text.of("衣料品担当の配置に失敗しました。ログを確認してください。").red())
    return 0
  }
  let selector = dzClothierSelector()
  // Older Yui presets accidentally carried the food-trader tag.  Keep shop
  // roles exclusive even when an old preset is imported.
  server.runCommandSilent("tag " + selector + " remove dz_basecamp_trader_food")
  server.runCommandSilent(
    'data merge entity ' + selector +
    ' {CustomName:\'{"text":"ユイ｜衣料品担当","color":"yellow"}\',' +
    'CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b,NoAI:1b,Tags:["' + DZ_CLOTHIER_TAG + '","dz_basecamp_staff"],' +
    'ActionData:{ActionEventSet:{ON_INTERACTION:[{Type:"OPEN_DEFAULT_DIALOG"}]},ActionPermissionLevel:0},' +
    'DialogData:{DialogDataSet:[{Buttons:[{Actions:[{ExecAsUser:1b,PermLevel:0,' +
    'Type:"OPEN_TRADING_SCREEN"}],Label:"open_trade",Name:"入荷した衣料品を見る"}],' +
    'Label:"default",Name:"衣料品と装備調整",Texts:[' +
    '{Text:"防具だけが装備じゃないよ。目立つ服、暖かい服、動きやすい服も生存率を変える。"},' +
    '{Text:"入荷は毎回違うから、必要な物を見つけたら次まで残っているとは限らないよ。"},' +
    '{Text:"サイズ？　今は直せる範囲で合わせるしかないね。贅沢は言わないで。"},' +
    '{Text:"血や泥で傷んだ服は早めに替えて。感染対策としても大事だから。"},' +
    '{Text:"見た目を選ぶ余裕があるなら、それは拠点が少し安全になった証拠だよ。"}]}],' +
    'Type:"CUSTOM"}}')
  server.runCommandSilent("team join dz_survivors " + selector)
  dzClothierRotate(server, false)
  if (!silent) player.tell(Text.of("黄色マーカーへ衣料品担当ユイを配置しました。").green())
  return 1
}

let dzClothierTicks = 0
ServerEvents.tick(event => {
  if (++dzClothierTicks < 1200) return
  dzClothierTicks = 0
  let next = Number(event.server.persistentData.getLong(DZ_CLOTHIER_NEXT))
  if (next > 0 && Date.now() >= next) dzClothierRotate(event.server, true)
  // Repair old/current worlds where camp activation consumed the marker before
  // the clothier command could find it.
  // The anchor is the authoritative proof that an activated camp is loaded.
  // Do not depend on dz_auto_basecamp_state: older/copied worlds can have the
  // building and anchor while that server-persistent flag is missing.
  let clothierAnchor = "@e[type=minecraft:marker,tag=dz_basecamp_clothier_anchor,limit=1]"
  // Migrate camps generated with the obsolete clothing anchor at +26,+2,+24.
  // The rebuilt clothing shop marker is +25,+2,+6. Keeping this authoritative
  // also repairs copied multiplayer worlds without requiring a new camp.
  let campData = event.server.persistentData
  if (campData.getInt("dz_auto_basecamp_state") === 2 &&
      event.server.runCommandSilent("execute if entity " + clothierAnchor) > 0) {
    let ax = campData.getInt("dz_auto_basecamp_origin_x") + DZ_CLOTHIER_OFFSET.x + 0.5
    let ay = campData.getInt("dz_auto_basecamp_origin_y") + DZ_CLOTHIER_OFFSET.y
    let az = campData.getInt("dz_auto_basecamp_origin_z") + DZ_CLOTHIER_OFFSET.z + 0.5
    event.server.runCommandSilent("tp " + clothierAnchor + " " + ax + " " + ay + " " + az)
  }
  if (event.server.runCommandSilent("execute if entity " + clothierAnchor) > 0 &&
      event.server.runCommandSilent("execute if entity " + dzClothierSelector()) <= 0) {
    let players = event.server.players
    if (players && players.length > 0) dzInstallClothier(players[0], true, false)
  }
  // Repair already-generated camps too. The clothier anchor is at structure
  // origin +26,+2,+24, so these bounds cover the original 32x20x32 structure.
  if (!event.server.persistentData.getBoolean("dz_camp_controls_repaired_v1") &&
      event.server.runCommandSilent("execute if entity " + clothierAnchor) > 0) {
    event.server.runCommandSilent("execute at " + clothierAnchor + " run fill ~-26 ~-2 ~-24 ~5 ~17 ~7 minecraft:stone_button replace securitycraft:reinforced_stone_button")
    event.server.runCommandSilent("execute at " + clothierAnchor + " run fill ~-26 ~-2 ~-24 ~5 ~17 ~7 minecraft:stone_pressure_plate replace securitycraft:reinforced_stone_pressure_plate")
    event.server.runCommandSilent("execute at " + clothierAnchor + " run fill ~-26 ~-2 ~-24 ~5 ~17 ~7 minecraft:stone_pressure_plate replace securitycraft:reinforced_pressure_plate")
    event.server.persistentData.putBoolean("dz_camp_controls_repaired_v1", true)
  }
  // Repair movement or stale-position drift without recreating trade stock.
  if (event.server.runCommandSilent("execute if entity @e[type=minecraft:marker,tag=dz_basecamp_clothier_anchor,limit=1] if entity " + dzClothierSelector()) > 0) {
    let nearbyClothier = "@e[type=easy_npc:humanoid,tag=" + DZ_CLOTHIER_TAG + ",distance=..1.5,limit=1]"
    event.server.runCommandSilent("execute at @e[type=minecraft:marker,tag=dz_basecamp_clothier_anchor,limit=1] unless entity " +
      nearbyClothier + " run tp " + dzClothierSelector() + " ~ ~ ~")
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneclothier").requires(source => source.hasPermission(2))
  root.then(Commands.literal("install").executes(ctx => dzInstallClothier(ctx.source.player, false, true)))
  root.then(Commands.literal("install_silent").executes(ctx => dzInstallClothier(ctx.source.player, true, true)))
  root.then(Commands.literal("anchor_here").executes(ctx => {
    let player=ctx.source.player, server=ctx.source.server
    let x=Math.floor(player.x)+0.5, y=Math.floor(player.y), z=Math.floor(player.z)+0.5
    server.runCommandSilent("kill @e[type=minecraft:marker,tag=dz_basecamp_clothier_anchor]")
    player.runCommandSilent("summon minecraft:marker " + x + " " + y + " " + z +
      ' {Tags:["dz_basecamp_clothier_anchor"]}')
    return dzInstallClothier(player,false,false)
  }))
  root.then(Commands.literal("rotate").executes(ctx => dzClothierRotate(ctx.source.server, true) ? 1 : 0))
  event.register(root)
})
