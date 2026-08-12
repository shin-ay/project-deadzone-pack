// PROJECT DEADZONE Field Decontamination Unit v0.1
// Clears Infectious/APN exposure and Mekanism environmental radiation in a
// 16 block radius. Registered units are processed once every five seconds.

const DZ_DECON_BLOCK = "kubejs:field_decontamination_unit"
const DZ_DECON_KEY = "pdz_decontamination_units_v1"
const DZ_DECON_RADIUS = 16
const DZ_DECON_INTERVAL = 100

const DZ_RAD_MANAGER = Java.loadClass("mekanism.api.radiation.IRadiationManager").INSTANCE
const DZ_CHUNK_3D = Java.loadClass("mekanism.api.Chunk3D")

function dzDeconRead(server) {
  let raw = String(server.persistentData.getString(DZ_DECON_KEY) || "")
  if (!raw) return []
  try {
    let value = JSON.parse(raw)
    return Array.isArray(value) ? value : []
  } catch (ignored) {
    return []
  }
}

function dzDeconWrite(server, units) {
  server.persistentData.putString(DZ_DECON_KEY, JSON.stringify(units))
}

function dzDeconDimension(level) {
  return String(level.dimension)
}

function dzDeconSame(unit, level, block) {
  return String(unit.dimension) === dzDeconDimension(level) &&
    Number(unit.x) === block.x && Number(unit.y) === block.y && Number(unit.z) === block.z
}

function dzDeconCleanMekanism(level, x, z) {
  if (!DZ_RAD_MANAGER.isRadiationEnabled()) return
  let cx = Math.floor(Number(x) / 16)
  let cz = Math.floor(Number(z) / 16)
  // Radius 16 reaches at most the centre chunk and its immediate neighbours.
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      DZ_RAD_MANAGER.removeRadiationSources(new DZ_CHUNK_3D(level.dimension, cx + dx, cz + dz))
    }
  }
}

function dzDeconPulse(server, level, unit) {
  let x = Number(unit.x), y = Number(unit.y), z = Number(unit.z)
  server.runCommandSilent("execute in " + unit.dimension + " positioned " + (x + 0.5) + " " + (y + 0.5) + " " + (z + 0.5) + " run effect clear @e[distance=.." + DZ_DECON_RADIUS + "] infectious:radiation")
  server.runCommandSilent("execute in " + unit.dimension + " positioned " + (x + 0.5) + " " + (y + 0.5) + " " + (z + 0.5) + " run effect clear @e[distance=.." + DZ_DECON_RADIUS + "] apocalypsenow:radiationsickness")
  server.runCommandSilent("execute in " + unit.dimension + " positioned " + (x + 0.5) + " " + (y + 1.2) + " " + (z + 0.5) + " run particle minecraft:happy_villager ~ ~ ~ 1.4 0.7 1.4 0.03 12 force")
  dzDeconCleanMekanism(level, x, z)
}

BlockEvents.placed(event => {
  if (String(event.block.id) !== DZ_DECON_BLOCK || event.level.clientSide) return
  let units = dzDeconRead(event.server)
  let placed = {dimension: dzDeconDimension(event.level), x: event.block.x, y: event.block.y, z: event.block.z}
  if (!units.some(unit => dzDeconSame(unit, event.level, event.block))) {
    units.push(placed)
    dzDeconWrite(event.server, units)
  }
  event.player.tell(Text.of("[DECON] 除染フィールド起動：半径16ブロック").aqua())
  dzDeconPulse(event.server, event.level, placed)
})

BlockEvents.broken(event => {
  if (String(event.block.id) !== DZ_DECON_BLOCK || event.level.clientSide) return
  let units = dzDeconRead(event.server).filter(unit => !dzDeconSame(unit, event.level, event.block))
  dzDeconWrite(event.server, units)
  if (event.player) event.player.tell(Text.of("[DECON] 除染フィールド停止").gray())
})

ServerEvents.tick(event => {
  let server = event.server
  if (server.tickCount % DZ_DECON_INTERVAL !== 0) return
  let units = dzDeconRead(server)
  let valid = []
  units.forEach(unit => {
    let level = server.getLevel(unit.dimension)
    if (!level) return
    let block = level.getBlock(Number(unit.x), Number(unit.y), Number(unit.z))
    if (String(block.id) !== DZ_DECON_BLOCK) return
    valid.push(unit)
    dzDeconPulse(server, level, unit)
  })
  if (valid.length !== units.length) dzDeconWrite(server, valid)
})

ServerEvents.recipes(event => {
  event.shaped(DZ_DECON_BLOCK, ["CFC", "SBS", "CEC"], {
    C: "mekanism:basic_control_circuit",
    F: "minecraft:iron_bars",
    S: "mekanism:ingot_steel",
    B: "mekanism:steel_casing",
    E: "mekanism:energy_tablet"
  })
})

console.info("[PROJECT DEADZONE] Field Decontamination Unit loaded (radius 16, pulse 5s)")
