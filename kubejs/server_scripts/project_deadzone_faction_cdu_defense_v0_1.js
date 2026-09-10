// PROJECT DEADZONE faction C.D.U. defense bridge v0.1
// Spore owns infection growth and cleansing. PDZ only deploys the existing
// spore:cdu at loaded, physically occupied human sites. No chunks are forced.

const PDZ_CDU_BLOCK = 'spore:cdu'
const PDZ_CDU_INITIAL_FUEL = 12000
const PDZ_CDU_HUMAN_FACTIONS = {
  survivor:true, civildef:true, cdf:true, independent:true, pmc:true,
  raider:true, remnant:true, aegis:true
}

function pdzCduAir(block) {
  let id = String(block.id)
  return id === 'minecraft:air' || id === 'minecraft:cave_air' || id === 'minecraft:void_air'
}

function pdzCduBadFloor(block) {
  let id = String(block.id)
  return pdzCduAir(block) || id.indexOf('water') >= 0 || id.indexOf('lava') >= 0 ||
    id.indexOf('leaves') >= 0 || id.indexOf('fence') >= 0 ||
    id.indexOf('_wall') >= 0 || id.indexOf('pane') >= 0
}

function pdzCduFaction(marker) {
  if (marker.tags.contains('dz_basecamp_core_anchor')) return 'survivor'
  if (marker.tags.contains('dz_stronghold_remnant')) return 'remnant'
  if (marker.tags.contains('dz_stronghold_raider')) return 'raider'
  let faction = marker.persistentData.getString('dz_wild_faction')
  return String(faction || '')
}

function pdzCduRecorded(marker) {
  if (!marker.persistentData.getBoolean('dz_faction_cdu_installed')) return null
  let x = marker.persistentData.getInt('dz_faction_cdu_x')
  let y = marker.persistentData.getInt('dz_faction_cdu_y')
  let z = marker.persistentData.getInt('dz_faction_cdu_z')
  if (String(marker.level.getBlock(x, y, z).id) !== PDZ_CDU_BLOCK) return null
  return {x:x, y:y, z:z}
}

function pdzCduFindExisting(marker) {
  let recorded = pdzCduRecorded(marker)
  if (recorded) return recorded
  let cx = Math.floor(marker.x), cy = Math.floor(marker.y), cz = Math.floor(marker.z)
  for (let radius = 0; radius <= 16; radius += 2) {
    for (let dx = -radius; dx <= radius; dx += 2) for (let dz = -radius; dz <= radius; dz += 2) {
      if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue
      for (let y = cy - 4; y <= cy + 4; y++) {
        if (String(marker.level.getBlock(cx + dx, y, cz + dz).id) === PDZ_CDU_BLOCK)
          return {x:cx + dx, y:y, z:cz + dz}
      }
    }
  }
  return null
}

function pdzCduFindPlacement(marker) {
  let cx = Math.floor(marker.x), cy = Math.floor(marker.y), cz = Math.floor(marker.z)
  for (let radius = 6; radius <= 14; radius += 2) {
    for (let dx = -radius; dx <= radius; dx += 2) for (let dz = -radius; dz <= radius; dz += 2) {
      if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue
      for (let y = cy + 3; y >= cy - 4; y--) {
        if (!pdzCduAir(marker.level.getBlock(cx + dx, y, cz + dz))) continue
        if (!pdzCduAir(marker.level.getBlock(cx + dx, y + 1, cz + dz))) continue
        if (pdzCduBadFloor(marker.level.getBlock(cx + dx, y - 1, cz + dz))) continue
        return {x:cx + dx, y:y, z:cz + dz}
      }
    }
  }
  return null
}

function pdzCduBind(marker, pos) {
  marker.persistentData.putBoolean('dz_faction_cdu_installed', true)
  marker.persistentData.putInt('dz_faction_cdu_x', pos.x)
  marker.persistentData.putInt('dz_faction_cdu_y', pos.y)
  marker.persistentData.putInt('dz_faction_cdu_z', pos.z)
}

function pdzEnsureFactionCdu(marker) {
  if (!marker || !marker.alive || !marker.tags) return false
  let faction = pdzCduFaction(marker)
  if (!PDZ_CDU_HUMAN_FACTIONS[faction]) return false
  // A destroyed or exhausted installation is a real gameplay failure. Do not
  // create or refill it repeatedly; only the initial site deployment is free.
  if (marker.persistentData.getBoolean('dz_faction_cdu_installed'))
    return pdzCduRecorded(marker) !== null
  let pos = pdzCduFindExisting(marker)
  let created = false
  if (!pos) {
    pos = pdzCduFindPlacement(marker)
    if (!pos) return false
    marker.server.runCommandSilent('execute in ' + String(marker.level.dimension) +
      ' run setblock ' + pos.x + ' ' + pos.y + ' ' + pos.z + ' spore:cdu[facing=north,lit=false]')
    if (String(marker.level.getBlock(pos.x, pos.y, pos.z).id) !== PDZ_CDU_BLOCK) return false
    created = true
  }
  marker.server.runCommandSilent('execute in ' + String(marker.level.dimension) +
    ' run data merge block ' + pos.x + ' ' + pos.y + ' ' + pos.z + ' {fuel:' + PDZ_CDU_INITIAL_FUEL + '}')
  pdzCduBind(marker, pos)
  console.info('[PROJECT DEADZONE][C.D.U.] ' + (created ? 'deployed' : 'adopted') +
    ' faction=' + faction + ' at ' + pos.x + ',' + pos.y + ',' + pos.z)
  return true
}

global.pdzEnsureFactionCdu = pdzEnsureFactionCdu

let PDZ_CDU_TICKS = 0
ServerEvents.tick(event => {
  PDZ_CDU_TICKS++
  if (PDZ_CDU_TICKS % 200 !== 0 || event.server.players.length <= 0) return
  let handled = {}
  event.server.players.forEach(player => {
    player.level.entities.forEach(marker => {
      if (!marker.tags) return
      let eligible = marker.tags.contains('dz_basecamp_core_anchor') ||
        marker.tags.contains('dz_stronghold_core') ||
        (marker.tags.contains('dz_wilderness_site') && marker.persistentData.getBoolean('dz_garrison_active'))
      if (!eligible) return
      let key = String(marker.uuid)
      if (handled[key]) return
      handled[key] = true
      let dx = marker.x - player.x, dz = marker.z - player.z
      if (dx * dx + dz * dz > 144 * 144) return
      pdzEnsureFactionCdu(marker)
    })
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  event.register(Commands.literal('deadzonecdu').requires(source => source.hasPermission(2))
    .then(Commands.literal('install_near').executes(ctx => {
      let player = ctx.source.player, best = null, distance = 160 * 160
      player.level.entities.forEach(marker => {
        if (!marker.tags || !(marker.tags.contains('dz_basecamp_core_anchor') ||
            marker.tags.contains('dz_stronghold_core') || marker.tags.contains('dz_wilderness_site'))) return
        let dx = marker.x - player.x, dy = marker.y - player.y, dz = marker.z - player.z
        let d = dx * dx + dy * dy + dz * dz
        if (d < distance) { distance = d; best = marker }
      })
      if (!best) { player.tell(Text.of('[C.D.U.] 160m以内に拠点マーカーがありません。').red()); return 0 }
      let ok = pdzEnsureFactionCdu(best)
      if (ok) player.tell(Text.of('[C.D.U.] 拠点除染設備を確認しました。').green())
      else player.tell(Text.of('[C.D.U.] 人間勢力拠点または安全な設置床を確認できません。').red())
      return ok ? 1 : 0
    })))
})

console.info('[PROJECT DEADZONE] Human faction C.D.U. defense bridge v0.1 loaded')
