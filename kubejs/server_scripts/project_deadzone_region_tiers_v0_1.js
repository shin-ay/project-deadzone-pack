// PROJECT DEADZONE regional difficulty rings v0.1
// Region Tier is geographical. World Tier remains story/recipe progression.

const DZ_REGION_RADII = [192, 700, 1500, 3000]
const DZ_SUBURB_LAYOUT = [
  // ChaosZ native 2x3-chunk suburb: houses, gardens, fences and street clutter.
  // Converted to one deterministic vanilla template so it can be used outside
  // Lost Cities without producing the old four-identical-box preview.
  [-48,-24,"project_deadzone:deadzone_chaosz_t0_suburb_combo","none"],
  [18,-48,"project_deadzone:deadzone_apn_market_edit","counterclockwise_90"],
  // The clinic template uses its saved origin as the entrance corner. A 180
  // degree rotation moves most of it into chunks behind that origin and made
  // placement return 0 near the edge of the loaded area.
  [18,16,"project_deadzone:deadzone_apn_clinic_edit","none"],
  // Small, low-risk scavenging points around the residential district.
  // These are explicitly placed by the T0 controller instead of relying on
  // Apocalypse Now's global standalone world generation.
  [-72,-60,"apocalypsenow:destroyed_survivor_camp","none"],
  [62,-5,"apocalypsenow:post","clockwise_90"],
  [-76,46,"apocalypsenow:ruins1","none"]
]

function dzSuburbSurface(player, x, z) {
  try {
    let y = dzCampSurfaceY(player, x, z)
    return Number.isFinite(y) ? Math.floor(y) : Math.floor(player.y)
  } catch (ignored) { return Math.floor(player.y) }
}

function dzSuburbSetSurface(player, x, z, block) {
  let y = dzSuburbSurface(player, x, z)
  player.runCommandSilent("setblock " + x + " " + (y - 1) + " " + z + " " + block)
  return y
}

function dzSuburbRoad(player, cx, cz) {
  // A weathered crossroad plus short driveways. It follows the terrain instead
  // of flattening a huge square, so the district still belongs to the biome.
  for (let d = -81; d <= 81; d += 3) {
    let xY = dzSuburbSurface(player, cx + d, cz)
    let zY = dzSuburbSurface(player, cx, cz + d)
    let roadX = Math.random() < 0.13 ? "minecraft:gravel" : "minecraft:gray_concrete"
    let roadZ = Math.random() < 0.13 ? "minecraft:gravel" : "minecraft:gray_concrete"
    player.runCommandSilent("fill " + (cx + d) + " " + (xY - 1) + " " + (cz - 2) + " " +
      (cx + d + 2) + " " + (xY - 1) + " " + (cz + 2) + " " + roadX)
    player.runCommandSilent("fill " + (cx - 2) + " " + (zY - 1) + " " + (cz + d) + " " +
      (cx + 2) + " " + (zY - 1) + " " + (cz + d + 2) + " " + roadZ)
    player.runCommandSilent("fill " + (cx + d) + " " + (xY - 1) + " " + (cz - 3) + " " +
      (cx + d + 2) + " " + (xY - 1) + " " + (cz - 3) + " minecraft:andesite")
    player.runCommandSilent("fill " + (cx + d) + " " + (xY - 1) + " " + (cz + 3) + " " +
      (cx + d + 2) + " " + (xY - 1) + " " + (cz + 3) + " minecraft:andesite")
    player.runCommandSilent("fill " + (cx - 3) + " " + (zY - 1) + " " + (cz + d) + " " +
      (cx - 3) + " " + (zY - 1) + " " + (cz + d + 2) + " minecraft:andesite")
    player.runCommandSilent("fill " + (cx + 3) + " " + (zY - 1) + " " + (cz + d) + " " +
      (cx + 3) + " " + (zY - 1) + " " + (cz + d + 2) + " minecraft:andesite")
  }
  // Broken center line, street lamps, trees and roadside litter.
  for (let d = -72; d <= 72; d += 12) {
    let y = dzSuburbSurface(player, cx + d, cz)
    player.runCommandSilent("setblock " + (cx + d) + " " + (y - 1) + " " + cz + " minecraft:yellow_concrete")
    let side = ((d / 12) % 2 === 0) ? 7 : -7
    let ly = dzSuburbSurface(player, cx + d, cz + side)
    player.runCommandSilent("setblock " + (cx + d) + " " + ly + " " + (cz + side) + " minecraft:oak_fence")
    player.runCommandSilent("setblock " + (cx + d) + " " + (ly + 1) + " " + (cz + side) + " minecraft:lantern")
  }
  ;[[-72,-10],[-36,11],[34,-11],[70,10],[-11,-72],[11,-34],[-10,38],[10,72]].forEach(p => {
    let y = dzSuburbSurface(player, cx + p[0], cz + p[1])
    player.runCommandSilent("execute positioned " + (cx + p[0]) + " " + y + " " +
      (cz + p[1]) + " run place feature minecraft:oak")
  })
  ;[[-29,-8],[23,9],[-8,28],[9,-41],[64,8],[-52,-9]].forEach(p => {
    let y = dzSuburbSurface(player, cx + p[0], cz + p[1])
    let junk = Math.random() < 0.5 ? "minecraft:cobweb" : "minecraft:dead_bush"
    player.runCommandSilent("setblock " + (cx + p[0]) + " " + y + " " + (cz + p[1]) + " " + junk)
  })
}

function dzSuburbPlace(player, cx, cz) {
  let placed = 0
  dzSuburbRoad(player, cx, cz)
  DZ_SUBURB_LAYOUT.forEach(plan => {
    let x = cx + plan[0], z = cz + plan[1]
    let y = Math.floor(player.y) - 1
    try {
      let surface = dzCampSurfaceY(player, x, z)
      if (Number.isFinite(surface)) y = surface
    } catch (ignored) {}
    let result = player.runCommandSilent("execute in minecraft:overworld positioned " +
      x + " " + y + " " + z + " run place template " + plan[2] + " ~ ~ ~ " + plan[3] + " none")
    placed += result
    console.info("[PROJECT DEADZONE][Region] suburb template " + plan[2] +
      " result=" + result + " at " + x + "," + y + "," + z)
  })
  if (placed > 0) {
    let data = player.server.persistentData
    data.putInt("dz_t0_suburb_center_x", cx)
    data.putInt("dz_t0_suburb_center_z", cz)
    data.putBoolean("dz_t0_suburb_generated", true)
    player.runCommandSilent("summon minecraft:marker " + cx + " " +
      Math.floor(player.y) + " " + cz + " {Tags:[\"dz_t0_suburb_anchor\"]}")
  }
  return placed
}

function dzSuburbAutoCenter(server) {
  let camp = dzRegionCampCenter(server)
  if (!camp) return null
  // Keep the district outside the 192 m camp safety ring but well inside T0.
  // East is deterministic so every player receives the same route and quests.
  return {x: camp.x + 352, z: camp.z}
}

function dzRegionCampCenter(server) {
  let data = server.persistentData
  if (data.getInt("dz_auto_basecamp_state") !== 2) return null
  return {
    x: data.getInt("dz_auto_basecamp_origin_x") + 16,
    z: data.getInt("dz_auto_basecamp_origin_z") + 16
  }
}

function dzRegionTierAt(server, x, z) {
  let camp = dzRegionCampCenter(server)
  if (!camp) return Math.max(0, Math.min(4,
    server.persistentData.getInt("deadzone_world_tier")))
  let dx = x - camp.x, dz = z - camp.z
  let distance = Math.sqrt(dx * dx + dz * dz)
  if (distance <= DZ_REGION_RADII[0]) return 0 // camp safe zone
  if (distance <= DZ_REGION_RADII[1]) return 0 // starter suburb
  if (distance <= DZ_REGION_RADII[2]) return 1 // regional town
  if (distance <= DZ_REGION_RADII[3]) return 2 // dense city
  return 3 // high-risk expedition area
}

function dzRegionName(tier, distance) {
  if (distance <= DZ_REGION_RADII[0]) return "キャンプ安全圏"
  return ["T0 郊外住宅地", "T1 地方都市", "T2 都市部", "T3 危険地域"][tier] || "危険地域"
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 100 !== 0) return
  let camp = dzRegionCampCenter(player.server)
  if (!camp) return
  let dx = player.x - camp.x, dz = player.z - camp.z
  let distance = Math.floor(Math.sqrt(dx * dx + dz * dz))
  let tier = dzRegionTierAt(player.server, player.x, player.z)
  let previous = player.persistentData.getInt("dz_region_tier")
  let initialized = player.persistentData.getBoolean("dz_region_initialized")
  player.persistentData.putInt("dz_region_tier", tier)
  player.persistentData.putInt("dz_region_distance", distance)
  player.persistentData.putBoolean("dz_region_initialized", true)
  if (initialized && previous !== tier) {
    player.tell(Text.of("[AREA] " + dzRegionName(tier, distance) +
      " / キャンプから " + distance + "m").gold())
  }
})

// Generate the starter suburb once, after the camp and the first player exist.
// A delay avoids competing with the camp bootstrap during the arrival sequence.
PlayerEvents.tick(event => {
  let player = event.player
  // Disabled: forced structures could generate over water and bypass the
  // normal residential loot pipeline. Keep only the manual admin preview.
  if (true) return
  if (player.level.clientSide || player.age % 100 !== 0) return
  let data = player.server.persistentData
  if (data.getBoolean("dz_t0_suburb_generated")) return
  if (data.getBoolean("dz_t0_suburb_attempted")) return
  if (data.getInt("dz_auto_basecamp_state") !== 2) return
  let center = dzSuburbAutoCenter(player.server)
  if (!center) return
  // Do not generate the district 352 blocks away while those chunks are still
  // unloaded. Lost Cities/LC2H may already have a large generation backlog;
  // `place template` simply returns 0 in that situation. Generate when a
  // player actually approaches the district instead.
  let approachX = player.x - center.x, approachZ = player.z - center.z
  if (approachX * approachX + approachZ * approachZ > 112 * 112) return
  let ready = data.getInt("dz_t0_suburb_ready_checks") + 1
  data.putInt("dz_t0_suburb_ready_checks", ready)
  if (ready < 4) return
  // One automatic attempt per server session/state. A broken template must not
  // retry every five seconds and flood logs while repeatedly modifying terrain.
  data.putBoolean("dz_t0_suburb_attempted", true)
  let placed = dzSuburbPlace(player, center.x, center.z)
  if (placed > 0) {
    player.tell(Text.of("[AREA] T0郊外の住宅区画を発見しました（キャンプ東 約350m）").gold())
    console.info("[PROJECT DEADZONE][Region] automatic T0 suburb placed " +
      placed + "/" + DZ_SUBURB_LAYOUT.length + " at " + center.x + "," + center.z)
  } else {
    console.error("[PROJECT DEADZONE][Region] automatic T0 suburb placement failed")
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonezone")
  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let camp = dzRegionCampCenter(player.server)
    if (!camp) {
      player.tell(Text.of("キャンプ座標が未登録です。").red())
      return 0
    }
    let dx = player.x - camp.x, dz = player.z - camp.z
    let distance = Math.floor(Math.sqrt(dx * dx + dz * dz))
    let tier = dzRegionTierAt(player.server, player.x, player.z)
    player.tell(Text.of(dzRegionName(tier, distance) + " / " + distance + "m").gold())
    player.tell(Text.of("World Tier T" + player.server.persistentData.getInt("deadzone_world_tier") +
      " / Region Tier T" + tier).gray())
    return 1
  }))

  root.then(Commands.literal("suburb_preview")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      player.tell(Text.of("=== T0郊外生成プレビュー ===").gold())
      player.tell(Text.of("現在地を区画中央として、住宅区画・市場・診療所・小規模探索地点3か所を配置します。").yellow())
      player.tell(Text.of("地形を上書きするため、開発用ワールドでのみ実行してください。").red())
      player.tell(Text.of("[ この位置へ生成する ]").green()
        .clickRunCommand("/deadzonezone suburb_generate_confirm")
        .hover(Text.of("管理者用：Apocalypse Now建物を配置")))
      return 1
    }))

  root.then(Commands.literal("suburb_generate_confirm")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      let cx = Math.floor(player.x), cz = Math.floor(player.z)
      let placed = dzSuburbPlace(player, cx, cz)
      player.server.persistentData.putInt("dz_t0_suburb_center_x", cx)
      player.server.persistentData.putInt("dz_t0_suburb_center_z", cz)
      player.server.persistentData.putBoolean("dz_t0_suburb_preview_generated", placed > 0)
      player.tell(Text.of("T0郊外プレビュー配置結果: " + placed + "/" + DZ_SUBURB_LAYOUT.length).gold())
      return placed > 0 ? 1 : 0
    }))
  event.register(root)
})
