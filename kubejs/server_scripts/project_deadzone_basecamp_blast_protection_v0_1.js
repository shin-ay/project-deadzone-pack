// PROJECT DEADZONE base-camp blast protection v0.2
// Keep allied defensive fire useful without letting missiles and vehicle guns
// excavate the permanent base. Entity damage, knockback, sound and particles
// are preserved; only affected blocks inside the camp structure are removed
// from the explosion result.

const DZ_BASE_BLAST_RADIUS = 100
const DZ_BASE_BLAST_MIN_Y = -48
const DZ_BASE_BLAST_MAX_Y = 128
const DZ_BASE_BLAST_CORES_KEY = "dz_registered_base_cores_v1"

function dzInitialBaseBlastCenter(server) {
  if (!server) return null
  let data = server.persistentData
  if (data.getInt("dz_auto_basecamp_layout_version") <= 0) return null
  return {
    x: data.getInt("dz_auto_basecamp_origin_x") + 16,
    y: data.getInt("dz_auto_basecamp_origin_y"),
    z: data.getInt("dz_auto_basecamp_origin_z") + 16
  }
}

function dzBaseBlastLoadCores(server) {
  try {
    let parsed = JSON.parse(String(server.persistentData.getString(DZ_BASE_BLAST_CORES_KEY) || "[]"))
    return Array.isArray(parsed) ? parsed : []
  } catch (ignored) {
    return []
  }
}

function dzBaseBlastSaveCores(server, cores) {
  server.persistentData.putString(DZ_BASE_BLAST_CORES_KEY, JSON.stringify(cores))
}

function dzBaseBlastCoreKey(core) {
  return String(core.dimension) + "|" + Number(core.x) + "|" + Number(core.y) + "|" + Number(core.z)
}

function dzBaseBlastCenters(server, dimension) {
  let result = []
  let initial = dzInitialBaseBlastCenter(server)
  if (initial && dimension === "minecraft:overworld") result.push(initial)
  dzBaseBlastLoadCores(server).forEach(core => {
    if (String(core.dimension) === dimension) result.push(core)
  })
  return result
}

function dzBaseBlastProtected(center, block) {
  let dx = Number(block.x) - center.x
  let dy = Number(block.y) - center.y
  let dz = Number(block.z) - center.z
  return dy >= DZ_BASE_BLAST_MIN_Y && dy <= DZ_BASE_BLAST_MAX_Y &&
    dx * dx + dz * dz <= DZ_BASE_BLAST_RADIUS * DZ_BASE_BLAST_RADIUS
}

LevelEvents.afterExplosion(event => {
  let server = event.server
  let centers = dzBaseBlastCenters(server, String(event.level.dimension))
  if (centers.length <= 0) return

  // Copy first: removeAffectedBlock mutates the Forge explosion block list.
  let affected = []
  event.affectedBlocks.forEach(block => affected.push(block))
  affected.forEach(block => {
    let protectedByCore = centers.some(center => dzBaseBlastProtected(center, block))
    if (protectedByCore) event.removeAffectedBlock(block)
  })
})

BlockEvents.placed("kubejs:deadzone_base_core", event => {
  if (event.level.clientSide) return
  let core = {
    dimension: String(event.level.dimension),
    x: Number(event.block.x),
    y: Number(event.block.y),
    z: Number(event.block.z)
  }
  let cores = dzBaseBlastLoadCores(event.server)
  let key = dzBaseBlastCoreKey(core)
  if (!cores.some(existing => dzBaseBlastCoreKey(existing) === key)) {
    cores.push(core)
    dzBaseBlastSaveCores(event.server, cores)
  }
  if (event.player) event.player.tell(Text.of("[拠点防護] Base Coreを中心に半径100ブロックの爆発地形保護を登録しました。").green())
})

BlockEvents.broken("kubejs:deadzone_base_core", event => {
  if (event.level.clientSide) return
  let removed = {
    dimension: String(event.level.dimension),
    x: Number(event.block.x),
    y: Number(event.block.y),
    z: Number(event.block.z)
  }
  let key = dzBaseBlastCoreKey(removed)
  let cores = dzBaseBlastLoadCores(event.server)
  let remaining = cores.filter(core => dzBaseBlastCoreKey(core) !== key)
  if (remaining.length !== cores.length) {
    dzBaseBlastSaveCores(event.server, remaining)
    if (event.player) event.player.tell(Text.of("[拠点防護] このBase Coreの爆発地形保護を解除しました。").yellow())
  }
})

console.info("[PDZ BASE] blast protection v0.2 loaded (registered Base Cores, blocks only, radius 100)")
