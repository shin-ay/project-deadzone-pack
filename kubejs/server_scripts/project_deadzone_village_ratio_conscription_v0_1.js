// PROJECT DEADZONE proportional village conscription bridge v0.1
// Village Recruits owns conversion and faction assignment. PDZ only decides
// when an already-existing adult villager may enter military employment.
// This bridge never creates or removes population.

const PDZ_VRC_TARGET_SOLDIER_FRACTION = 0.25
const PDZ_VRC_MIN_CIVILIANS = 4
const PDZ_VRC_RADIUS = 48
const PDZ_VRC_INTERVAL = 1200

const PDZ_VRC_FACTIONS = Java.loadClass('com.example.villagerecruits.faction.VillageFactionManager')
const PDZ_VRC_CLAIMS = Java.loadClass('com.example.villagerecruits.claim.VillageClaimIntegration')
const PDZ_VRC_CONVERTER = Java.loadClass('com.example.villagerecruits.util.VillagerToRecruit')

function pdzVrcIsRecruit(entity) {
  let id = String(entity.type)
  return id.indexOf('recruits:') === 0 || id.indexOf('village_recruits:') === 0
}

function pdzVrcLoadedPopulation(level, center) {
  let villagers = []
  let recruits = 0
  level.entities.forEach(entity => {
    if (!entity || !entity.alive) return
    let dx = entity.x - center.x, dz = entity.z - center.z
    if (dx * dx + dz * dz > PDZ_VRC_RADIUS * PDZ_VRC_RADIUS) return
    let id = String(entity.type)
    if (id === 'minecraft:villager') {
      try { if (!entity.isBaby()) villagers.push(entity) } catch (ignored) {}
    } else if (pdzVrcIsRecruit(entity)) recruits++
  })
  return {villagers:villagers, recruits:recruits}
}

function pdzVrcProcessLevel(level) {
  PDZ_VRC_FACTIONS.getAllFactions().forEach(faction => {
    if (!faction || !faction.id || !PDZ_VRC_FACTIONS.isAiVillageFaction(faction.id)) return
    let centers = PDZ_VRC_CLAIMS.getCentersForFaction(level, faction.id)
    if (!centers) return
    centers.forEach(center => {
      if (!level.isLoaded(center)) return
      let pop = pdzVrcLoadedPopulation(level, center)
      let total = pop.villagers.length + pop.recruits
      if (total <= 0 || pop.villagers.length <= PDZ_VRC_MIN_CIVILIANS) return
      let target = Math.floor(total * PDZ_VRC_TARGET_SOLDIER_FRACTION)
      if (target <= pop.recruits) return
      // One conversion per center and pass lets settlements adjust gradually.
      PDZ_VRC_CONVERTER.convert(level, pop.villagers[0])
    })
  })
}

ServerEvents.tick(event => {
  if (event.server.tickCount % PDZ_VRC_INTERVAL !== 0) return
  event.server.allLevels.forEach(level => pdzVrcProcessLevel(level))
})

console.info('[PROJECT DEADZONE] proportional village conscription bridge v0.1 loaded')
