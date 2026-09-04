// PROJECT DEADZONE - nearby Village Recruits center inspector v0.5
// Automatically adopts loaded vanilla/modded villages while retaining manual
// scan/apply commands for diagnostics and recovery.

const PDZ_VR_FACTION_MANAGER = Java.loadClass('com.example.villagerecruits.faction.VillageFactionManager')
const PDZ_VR_INTEGER_ARGUMENT = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')
const PDZ_VR_BLOCK_POS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_VR_BUILTIN_REGISTRIES = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const PDZ_VR_HEIGHTMAP_TYPES = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')

const PDZ_VR_MIN_MCA = 6
const PDZ_VR_MIN_VANILLA = 4
const PDZ_VR_MIN_RECRUITS = 3
const PDZ_VR_AUTO_RADIUS = 192
const PDZ_VR_AUTO_INTERVAL = 600

function pdzVrEntityTypeId(entity) {
  // KubeJS exposes the stable namespaced id directly. Looking the wrapped
  // EntityType up again through BuiltInRegistries returns an incompatible
  // wrapper in this Forge/Rhino build and made every resident look unknown.
  return String(entity.type)
}

function pdzVrFindBell(level, group) {
  let cx = Math.floor(group.x), cz = Math.floor(group.z)
  let best = null, bestSq = 999999
  for (let x = cx - 48; x <= cx + 48; x++) for (let z = cz - 48; z <= cz + 48; z++) {
    let probe = new PDZ_VR_BLOCK_POS(x, 64, z)
    if (!level.hasChunkAt(probe)) continue
    let surface = Number(level.getHeight(PDZ_VR_HEIGHTMAP_TYPES.MOTION_BLOCKING_NO_LEAVES, x, z))
    for (let y = surface + 3; y >= surface - 7; y--) {
      if (String(level.getBlock(x, y, z).id) !== 'minecraft:bell') continue
      let dx = x - cx, dz = z - cz, distanceSq = dx * dx + dz * dz
      if (distanceSq < bestSq) { bestSq = distanceSq; best = {x:x, y:y, z:z} }
    }
  }
  return best
}

function pdzVrRecountAtBell(level, bell, factionId) {
  let counts = { count:0, vanillaCount:0, mcaCount:0, recruitCount:0, foreignRecruitCount:0 }
  level.entities.forEach(entity => {
    if (!entity.isAlive()) return
    let dx = entity.x - bell.x, dy = entity.y - bell.y, dz = entity.z - bell.z
    if (dx * dx + dz * dz > 64 * 64 || Math.abs(dy) > 32) return
    let id = pdzVrEntityTypeId(entity)
    if (id === 'minecraft:villager') { counts.count++; counts.vanillaCount++; return }
    if (id === 'mca:male_villager' || id === 'mca:female_villager') {
      counts.count++; counts.mcaCount++; return
    }
    if (id !== 'recruits:recruit' && id !== 'recruits:recruit_shieldman') return
    if (factionId == null) { counts.recruitCount++; return }
    try {
      let owner = String(PDZ_VR_FACTION_MANAGER.getFactionOfRecruit(level, entity))
      if (owner === factionId) counts.recruitCount++
      else counts.foreignRecruitCount++
    } catch (ignored) { counts.foreignRecruitCount++ }
  })
  return counts
}

function pdzVrCenterRows(level, origin, radius) {
  let pdzVrRadiusSq = radius * radius
  let pdzVrRows = []

  PDZ_VR_FACTION_MANAGER.getAllFactions().forEach(faction => {
    let factionCenters = PDZ_VR_FACTION_MANAGER.getAllCentersOfFaction(faction)
    let recruitCount = faction.recruits == null ? 0 : faction.recruits.size()

    factionCenters.forEach(center => {
      let dx = center.getX() + 0.5 - origin.x
      let dz = center.getZ() + 0.5 - origin.z
      let distanceSq = dx * dx + dz * dz
      if (distanceSq > pdzVrRadiusSq) return

      let ledgerPopulation = 0
      let pendingRecruits = 0
      try { ledgerPopulation = faction.getLedgerPop(center) } catch (ignored) {}
      try { pendingRecruits = faction.getPendingRecruits(center) } catch (ignored) {}

      pdzVrRows.push({
        id: String(faction.id),
        name: faction.specialName == null || String(faction.specialName).length === 0
          ? String(faction.id)
          : String(faction.specialName),
        x: center.getX(),
        y: center.getY(),
        z: center.getZ(),
        distance: Math.floor(Math.sqrt(distanceSq)),
        recruits: recruitCount,
        population: ledgerPopulation,
        pending: pendingRecruits,
        loaded: level.isLoaded(center)
      })
    })
  })

  pdzVrRows.sort((a, b) => a.distance - b.distance)
  return pdzVrRows
}

function pdzVrListNearby(ctx, radius) {
  let source = ctx.source
  let player = source.player
  if (player == null) {
    source.sendFailure(Text.red('/vrnearby はゲーム内のプレイヤーから実行してください。'))
    return 0
  }

  try {
    let nearbyCenters = pdzVrCenterRows(source.level, player, radius)
    source.sendSuccess(Text.aqua('[VR周辺村] 半径 ' + radius + 'm / 登録拠点 ' + nearbyCenters.length + '件'), false)
    source.sendSuccess(Text.gray('※ Village Recruitsに登録済みの勢力拠点のみ。一般・MOD村構造物は含みません。'), false)

    if (nearbyCenters.length === 0) {
      source.sendSuccess(Text.yellow('周辺に登録済み拠点はありません。塔だけ存在し、勢力化前の可能性もあります。'), false)
      return 1
    }

    let centerLimit = Math.min(nearbyCenters.length, 50)
    for (let i = 0; i < centerLimit; i++) {
      let centerRow = nearbyCenters[i]
      let loadLabel = centerRow.loaded ? '読込中' : '未読込'
      let pendingLabel = centerRow.pending > 0 ? ' / 待機Recruit:' + centerRow.pending : ''
      source.sendSuccess(Text.of(
        (i + 1) + '. ' + centerRow.name +
        '  [' + centerRow.x + ', ' + centerRow.y + ', ' + centerRow.z + ']' +
        '  距離:' + centerRow.distance + 'm' +
        ' / Recruit:' + centerRow.recruits +
        ' / 人口台帳:' + centerRow.population + pendingLabel +
        ' / ' + loadLabel
      ).color(centerRow.loaded ? 'green' : 'gray'), false)
    }

    if (nearbyCenters.length > centerLimit) {
      source.sendSuccess(Text.yellow('残り ' + (nearbyCenters.length - centerLimit) + '件は省略。半径を狭めて再実行してください。'), false)
    }
    return nearbyCenters.length
  } catch (error) {
    source.sendFailure(Text.red('[VR周辺村] 取得失敗: ' + error))
    console.error('[PDZ VR Nearby] ' + error)
    return 0
  }
}

function pdzVrCandidateRows(level, origin, radius, server) {
  let villagers = []
  let nearbyRecruits = []
  let candidateRadiusSq = radius * radius
  level.entities.forEach(entity => {
    let residentType = pdzVrEntityTypeId(entity)
    let isVanillaVillager = residentType === 'minecraft:villager'
    let isMcaVillager = residentType === 'mca:male_villager' || residentType === 'mca:female_villager'
    let isRecruit = residentType === 'recruits:recruit' || residentType === 'recruits:recruit_shieldman'
    if ((!isVanillaVillager && !isMcaVillager && !isRecruit) || !entity.isAlive()) return
    let entityDx = entity.x - origin.x
    let entityDz = entity.z - origin.z
    if (entityDx * entityDx + entityDz * entityDz <= candidateRadiusSq) {
      if (isRecruit) nearbyRecruits.push(entity)
      else villagers.push({ entity:entity, kind:isVanillaVillager ? 'vanilla' : 'mca' })
    }
  })

  // Group nearby loaded villagers into settlements. This intentionally avoids
  // loading chunks and works for vanilla and modded village structures alike.
  let candidateGroups = []
  villagers.forEach(resident => {
    let villager = resident.entity
    let best = null
    let bestSq = 96 * 96
    candidateGroups.forEach(group => {
      let groupDx = villager.x - group.x
      let groupDz = villager.z - group.z
      let groupDistanceSq = groupDx * groupDx + groupDz * groupDz
      if (groupDistanceSq < bestSq) {
        bestSq = groupDistanceSq
        best = group
      }
    })
    if (best == null) {
      candidateGroups.push({
        x:villager.x, y:villager.y, z:villager.z,
        count:resident.kind === 'recruit' ? 0 : 1,
        vanillaCount:resident.kind === 'vanilla' ? 1 : 0,
        mcaCount:resident.kind === 'mca' ? 1 : 0,
        recruitCount:resident.kind === 'recruit' ? 1 : 0
      })
    } else {
      let oldTotal = best.count + Number(best.recruitCount || 0)
      best.x = (best.x * oldTotal + villager.x) / (oldTotal + 1)
      best.y = (best.y * oldTotal + villager.y) / (oldTotal + 1)
      best.z = (best.z * oldTotal + villager.z) / (oldTotal + 1)
      if (resident.kind === 'vanilla') { best.count++; best.vanillaCount++ }
      else if (resident.kind === 'mca') { best.count++; best.mcaCount++ }
      else best.recruitCount++
    }
  })

  // PDZ already records verified vanilla/CTOV/Towns and Towers structures.
  // Use that ledger as an authoritative fallback for villages with no living
  // villagers, which otherwise cannot be discovered through entity scanning.
  if (server != null) {
    try {
      let rawSites = server.persistentData.getString('dz_activity_outpost_ledger_v1')
      let sites = rawSites ? JSON.parse(rawSites) : []
      sites.forEach(site => {
        if (!site || site.structureVerified !== true || String(site.dimension) !== String(level.dimension)) return
        let structureId = String(site.structureId || '').toLowerCase()
        let villageStructure = structureId.indexOf('minecraft:village_') === 0 ||
          ((structureId.indexOf('ctov:') === 0 || structureId.indexOf('towns_and_towers:') === 0) &&
            structureId.indexOf('village') >= 0)
        if (!villageStructure) return
        let sx = Number(site.x), sy = Number(site.y), sz = Number(site.z)
        let siteDx = sx - origin.x, siteDz = sz - origin.z
        if (siteDx * siteDx + siteDz * siteDz > candidateRadiusSq) return
        let existing = null
        candidateGroups.forEach(group => {
          let mergeDx = sx - group.x, mergeDz = sz - group.z
          if (mergeDx * mergeDx + mergeDz * mergeDz <= 160 * 160) existing = group
        })
        if (existing != null) {
          existing.structureId = structureId
          existing.siteId = String(site.id || '')
        } else {
          candidateGroups.push({
            x:sx, y:sy, z:sz, count:0, vanillaCount:0, mcaCount:0, recruitCount:0,
            structureId:structureId, siteId:String(site.id || '')
          })
        }
      })
    } catch (ledgerError) {
      console.error('[PDZ VR Candidates] verified village ledger read failed: ' + ledgerError)
    }
  }


  // Recruits can patrol away from home. Never let one roaming soldier become
  // a village candidate by itself; only attach it to an existing settlement.
  nearbyRecruits.forEach(recruit => {
    let nearest = null
    let nearestSq = 160 * 160
    candidateGroups.forEach(group => {
      let recruitDx = recruit.x - group.x, recruitDz = recruit.z - group.z
      let recruitDistanceSq = recruitDx * recruitDx + recruitDz * recruitDz
      if (recruitDistanceSq < nearestSq) { nearestSq = recruitDistanceSq; nearest = group }
    })
    if (nearest != null) nearest.recruitCount++
  })

  let registeredCenters = pdzVrCenterRows(level, origin, radius + 192)
  candidateGroups.forEach(group => {
    group.bell = pdzVrFindBell(level, group)
    if (group.bell != null) {
      group.x = group.bell.x
      group.y = group.bell.y
      group.z = group.bell.z
    }
    group.distance = Math.floor(Math.sqrt(
      (group.x - origin.x) * (group.x - origin.x) +
      (group.z - origin.z) * (group.z - origin.z)
    ))
    group.registered = null
    let nearestSq = 160 * 160
    registeredCenters.forEach(center => {
      let centerDx = group.x - center.x
      let centerDz = group.z - center.z
      let centerDistanceSq = centerDx * centerDx + centerDz * centerDz
      if (centerDistanceSq < nearestSq) {
        nearestSq = centerDistanceSq
        group.registered = center
      }
    })
    if (group.bell != null) {
      let exactCounts = pdzVrRecountAtBell(level, group.bell,
        group.registered == null ? null : group.registered.id)
      group.count = exactCounts.count
      group.vanillaCount = exactCounts.vanillaCount
      group.mcaCount = exactCounts.mcaCount
      group.recruitCount = exactCounts.recruitCount
      group.foreignRecruitCount = exactCounts.foreignRecruitCount
    }
  })
  candidateGroups.sort((a, b) => a.distance - b.distance)
  return candidateGroups
}

function pdzVrListCandidates(ctx, radius) {
  let source = ctx.source
  let player = source.player
  if (player == null) {
    source.sendFailure(Text.red('/vrnearby candidates はゲーム内から実行してください。'))
    return 0
  }
  try {
    console.info('[PDZ VR Candidates] scan started by ' + player.name.string + ' radius=' + radius)
    let nearbyGroups = pdzVrCandidateRows(source.level, player, radius, source.server)
    console.info('[PDZ VR Candidates] scan completed: groups=' + nearbyGroups.length)
    source.sendSuccess(Text.aqua('[VR村候補] 半径 ' + radius + 'm / 読込中の集落 ' + nearbyGroups.length + '件'), false)
    source.sendSuccess(Text.gray('※ 読込済みの村人を96m以内で集落化。未読込チャンクや無人の村は対象外です。'), false)
    if (nearbyGroups.length === 0) {
      source.sendSuccess(Text.yellow('周辺の読み込まれた範囲に村人集落は見つかりません。'), false)
      return 1
    }
    let groupLimit = Math.min(nearbyGroups.length, 50)
    for (let j = 0; j < groupLimit; j++) {
      let group = nearbyGroups[j]
      let x = Math.floor(group.x)
      let y = Math.floor(group.y)
      let z = Math.floor(group.z)
      let status = group.registered == null
        ? '未登録候補'
        : '登録済み:' + group.registered.name
      let originLabel = group.structureId ? ' / 構造:' + group.structureId : ''
      let bellLabel = group.bell ? ' / 鐘:[' + group.bell.x + ', ' + group.bell.y + ', ' + group.bell.z + ']' : ' / 鐘なし'
      let residentLabel = ' / 村人:' + group.count +
        '(通常:' + Number(group.vanillaCount || 0) + ', MCA:' + Number(group.mcaCount || 0) + ')' +
        ' / Recruit:' + Number(group.recruitCount || 0) +
        (Number(group.foreignRecruitCount || 0) > 0 ? '(他勢力・巡回:' + group.foreignRecruitCount + ')' : '')
      source.sendSuccess(Text.of(
        (j + 1) + '. [' + x + ', ' + y + ', ' + z + ']' +
        ' 距離:' + group.distance + 'm' + residentLabel + bellLabel + originLabel + ' / ' + status
      ).color(group.registered == null ? 'yellow' : 'green'), false)
    }
    if (nearbyGroups.length > groupLimit) {
      source.sendSuccess(Text.yellow('残り ' + (nearbyGroups.length - groupLimit) + '件は省略。半径を狭めてください。'), false)
    }
    return nearbyGroups.length
  } catch (error) {
    source.sendFailure(Text.red('[VR村候補] 取得失敗: ' + error))
    console.error('[PDZ VR Candidates] ' + error)
    return 0
  }
}

function pdzVrPlaceRecruitTable(server, level, group) {
  if (group.bell == null) return null
  let tx = group.bell.x, ty = group.bell.y - 1, tz = group.bell.z
  let placed = server.runCommandSilent(
    'setblock ' + tx + ' ' + ty + ' ' + tz + ' recruits:recruit_block replace'
  )
  if (placed <= 0 && String(level.getBlock(tx, ty, tz).id) !== 'recruits:recruit_block') return null
  return new PDZ_VR_BLOCK_POS(tx, ty, tz)
}

function pdzVrSuppressStandaloneRoads(faction, tablePos) {
  if (faction == null || tablePos == null) return
  faction.center = tablePos
  faction.rootBed = tablePos
  faction.centerLocked = true
  // Adopted vanilla/modded villages already have streets. Treat the founding
  // cross as complete so Village Recruits never terraforms a second network.
  faction.roadsGenerated = true
}

function pdzVrSpawnPoint(level, group, index) {
  let offsets = [
    [4, 4], [-4, 4], [4, -4], [-4, -4], [7, 0], [-7, 0], [0, 7], [0, -7],
    [9, 5], [-9, 5], [9, -5], [-9, -5], [5, 9], [-5, 9], [5, -9], [-5, -9]
  ]
  let offset = offsets[index % offsets.length]
  let x = Math.floor(group.x) + offset[0]
  let z = Math.floor(group.z) + offset[1]
  let y = Math.floor(group.y)
  try { y = level.getHeight(PDZ_VR_HEIGHTMAP_TYPES.MOTION_BLOCKING_NO_LEAVES, x, z) }
  catch (ignored) {}
  return { x:x + 0.5, y:y, z:z + 0.5 }
}

function pdzVrSummonSeed(server, level, group, entityId, tag, index) {
  let pos = pdzVrSpawnPoint(level, group, index)
  return server.runCommandSilent(
    'summon ' + entityId + ' ' + pos.x + ' ' + pos.y + ' ' + pos.z +
    ' {PersistenceRequired:1b,Tags:["' + tag + '"]}'
  ) > 0
}

function pdzVrBootstrapPopulation(source, group, factionId) {
  let addMca = Math.max(0, PDZ_VR_MIN_MCA - Number(group.mcaCount || 0))
  let addVanilla = Math.max(0, PDZ_VR_MIN_VANILLA - Number(group.vanillaCount || 0))
  let addRecruits = Math.max(0, PDZ_VR_MIN_RECRUITS - Number(group.recruitCount || 0))
  let spawnedMca = 0, spawnedVanilla = 0, spawnedRecruits = 0, spawnIndex = 0

  for (let i = 0; i < addMca; i++) {
    let mcaType = i % 2 === 0 ? 'mca:female_villager' : 'mca:male_villager'
    if (pdzVrSummonSeed(source.server, source.level, group, mcaType, 'pdz_vr_seed_mca', spawnIndex++)) spawnedMca++
  }
  for (let j = 0; j < addVanilla; j++) {
    if (pdzVrSummonSeed(source.server, source.level, group, 'minecraft:villager', 'pdz_vr_seed_villager', spawnIndex++)) spawnedVanilla++
  }
  for (let k = 0; k < addRecruits; k++) {
    let recruitType = k === 2 ? 'recruits:recruit_shieldman' : 'recruits:recruit'
    let recruitTag = 'pdz_vr_seed_recruit_' + Math.abs(Math.floor(group.x)) + '_' + Math.abs(Math.floor(group.z))
    if (pdzVrSummonSeed(source.server, source.level, group, recruitType, recruitTag, spawnIndex++)) spawnedRecruits++
    source.level.entities.forEach(entity => {
      if (!entity.isAlive() || !entity.getTags().contains(recruitTag)) return
      PDZ_VR_FACTION_MANAGER.ensureEnrolled(source.level, factionId, entity.uuid)
      entity.removeTag(recruitTag)
      entity.addTag('pdz_vr_seed_recruit')
    })
  }
  return { mca:spawnedMca, vanilla:spawnedVanilla, recruits:spawnedRecruits }
}

function pdzVrAdoptNearby(ctx, radius, automatic) {
  let source = ctx.source
  let player = source.player
  if (player == null) {
    source.sendFailure(Text.red('/vradopt apply はゲーム内から実行してください。'))
    return 0
  }

  try {
    if (!automatic) console.info('[PDZ VR Adopt] apply started by ' + player.name.string + ' radius=' + radius)
    let adoptionGroups = pdzVrCandidateRows(source.level, player, radius, source.server)
    let adopted = 0
    let populated = 0
    let skipped = 0
    let failed = 0
    for (let n = 0; n < adoptionGroups.length; n++) {
      let adoptionGroup = adoptionGroups[n]
      // Background discovery only handles genuinely new settlements. Manual
      // apply remains the explicit repair/population command for known ones.
      if (automatic && adoptionGroup.registered != null) continue
      // Safety cap prevents a mistaken huge radius from modifying dozens of
      // settlements in one tick. Re-run the command after moving if needed.
      if (adopted + populated >= 16) break

      let tablePos = null
      let factionId = null
      if (adoptionGroup.registered != null) {
        factionId = adoptionGroup.registered.id
        tablePos = new PDZ_VR_BLOCK_POS(adoptionGroup.registered.x, adoptionGroup.registered.y, adoptionGroup.registered.z)
      } else {
        tablePos = pdzVrPlaceRecruitTable(source.server, source.level, adoptionGroup)
        if (tablePos == null) {
          failed++
          if (!automatic) source.sendFailure(Text.red('[VR登録] 鐘が見つからないため地形を変更せずスキップ: [' +
            Math.floor(adoptionGroup.x) + ', ' + Math.floor(adoptionGroup.y) + ', ' + Math.floor(adoptionGroup.z) + ']'))
          continue
        }
        factionId = 'village_' + tablePos.getX() + '_' + tablePos.getY() + '_' + tablePos.getZ()
      }
      try {
        // Existing modded villages already have streets. Suppress the addon's
        // one-time standalone road cross, which otherwise cuts the terrain.
        let preparedFaction = PDZ_VR_FACTION_MANAGER.getOrCreate(factionId)
        if (adoptionGroup.registered == null) {
          pdzVrSuppressStandaloneRoads(preparedFaction, tablePos)
        }
        PDZ_VR_FACTION_MANAGER.ensureFactionExists(source.level, factionId, tablePos)
        let createdFaction = PDZ_VR_FACTION_MANAGER.getFaction(factionId)
        if (createdFaction == null) {
          failed++
          continue
        }
        // ensureFactionExists may normalize a newly-created faction. Reassert
        // the no-road adoption contract after registration as well.
        if (adoptionGroup.registered == null) {
          pdzVrSuppressStandaloneRoads(createdFaction, tablePos)
        }
        // Delegate naming to Village Recruits itself. Factions adopted through
        // this bridge used to retain their coordinate id as the visible name.
        if (createdFaction.specialName == null || String(createdFaction.specialName).length === 0 ||
            String(createdFaction.specialName) === factionId) {
          createdFaction.specialName = PDZ_VR_FACTION_MANAGER.generatedNameFor(factionId)
        }
        PDZ_VR_FACTION_MANAGER.healMissingNames(source.level)
        let additions = pdzVrBootstrapPopulation(source, adoptionGroup, factionId)
        if (adoptionGroup.registered == null) adopted++
        else populated++
        if (!automatic) source.sendSuccess(Text.green(
          '[VR村整備] ' + String(createdFaction.specialName) + ' (' + factionId + ') [' + tablePos.getX() + ', ' + tablePos.getY() + ', ' + tablePos.getZ() + ']' +
          ' / MCA +' + additions.mca + ' / 通常 +' + additions.vanilla + ' / Recruit +' + additions.recruits
        ), false)
      } catch (adoptError) {
        failed++
        console.error('[PDZ VR Adopt] ' + factionId + ': ' + adoptError)
      }
    }

    if (!automatic) {
      source.sendSuccess(Text.aqua(
        '[VR登録完了] 新規勢力:' + adopted + ' / 既存勢力整備:' + populated + ' / 失敗:' + failed +
        (adopted + populated >= 16 ? ' / 安全上限16件で停止' : '')
      ), false)
      source.sendSuccess(Text.gray('最低人口: MCA ' + PDZ_VR_MIN_MCA + ' / 通常 ' + PDZ_VR_MIN_VANILLA + ' / Recruit ' + PDZ_VR_MIN_RECRUITS + '。再実行時は不足分だけ補充します。'), false)
    }
    if (!automatic || adopted > 0 || failed > 0) console.info(
      '[PDZ VR Adopt] ' + (automatic ? 'automatic ' : '') + 'apply completed: candidates=' + adoptionGroups.length +
      ' adopted=' + adopted + ' populated=' + populated + ' failed=' + failed)
    return adopted + populated > 0 ? adopted + populated : 1
  } catch (error) {
    source.sendFailure(Text.red('[VR登録] 処理失敗: ' + error))
    console.error('[PDZ VR Adopt] ' + error)
    return 0
  }
}

PlayerEvents.tick(event => {
  let player = event.player
  if (!player || !player.alive || String(player.level.dimension).indexOf('minecraft:overworld') < 0) return
  let ticks = player.persistentData.getInt('pdz_vr_auto_adopt_ticks') + 1
  if (ticks < PDZ_VR_AUTO_INTERVAL) {
    player.persistentData.putInt('pdz_vr_auto_adopt_ticks', ticks)
    return
  }
  player.persistentData.putInt('pdz_vr_auto_adopt_ticks', 0)
  pdzVrAdoptNearby({source:{
    player:player,
    level:player.level,
    server:player.server,
    sendFailure:message => console.error('[PDZ VR Auto Adopt] ' + message),
    sendSuccess:(message, broadcast) => {}
  }}, PDZ_VR_AUTO_RADIUS, true)
})

ServerEvents.commandRegistry(event => {
  let Commands = event.commands
  let root = Commands.literal('vrnearby')
    .executes(ctx => pdzVrListNearby(ctx, 1600))
    .then(Commands.literal('candidates')
      .executes(ctx => pdzVrListCandidates(ctx, 1600))
      .then(Commands.argument('radius', PDZ_VR_INTEGER_ARGUMENT.integer(64, 10000))
        .executes(ctx => pdzVrListCandidates(ctx, PDZ_VR_INTEGER_ARGUMENT.getInteger(ctx, 'radius')))))
    .then(Commands.argument('radius', PDZ_VR_INTEGER_ARGUMENT.integer(64, 10000))
      .executes(ctx => pdzVrListNearby(ctx, PDZ_VR_INTEGER_ARGUMENT.getInteger(ctx, 'radius'))))

  event.register(root)

  let adoptRoot = Commands.literal('vradopt')
    .requires(source => source.hasPermission(2))
    .then(Commands.literal('scan')
      .executes(ctx => pdzVrListCandidates(ctx, 1600))
      .then(Commands.argument('radius', PDZ_VR_INTEGER_ARGUMENT.integer(64, 10000))
        .executes(ctx => pdzVrListCandidates(ctx, PDZ_VR_INTEGER_ARGUMENT.getInteger(ctx, 'radius')))))
    .then(Commands.literal('apply')
      .executes(ctx => pdzVrAdoptNearby(ctx, 1600))
      .then(Commands.argument('radius', PDZ_VR_INTEGER_ARGUMENT.integer(64, 10000))
        .executes(ctx => pdzVrAdoptNearby(ctx, PDZ_VR_INTEGER_ARGUMENT.getInteger(ctx, 'radius')))))
  event.register(adoptRoot)
})
