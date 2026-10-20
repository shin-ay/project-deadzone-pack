// PROJECT DEADZONE UNU bike part recovery v0.1
//
// MTS serializes installed parts into part_N compounds when a vehicle is
// picked up.  On affected UNU motorcycles the controller seat can survive in
// the recovered item while the complete drive set (wheels/skids + engine) is
// absent.  Because spawnedDefaultParts remains true, MTS will not recreate
// those defaults on the next placement.
//
// Repair only that exact impossible/bug signature.  A bike with one part
// intentionally removed is left untouched, which avoids free-part duplication.

const PDZ_UNU_BIKE_DEFAULTS = [
  {
    key: 'unucivil_vehicle_unu_barista_',
    seat: 2,
    drive: [0, 1, 3],
    parts: {
      0: 'unuparts_part_unu_wheel_scooter',
      1: 'unuparts_part_unu_wheel_scooter',
      3: 'unuparts_part_unu_engine_i1m'
    }
  },
  {
    key: 'unucivil_vehicle_unu_husky_',
    seat: 3,
    drive: [0, 1, 2, 4],
    parts: {
      0: 'unuparts_part_unu_tread_small',
      1: 'unuparts_part_unu_skid_tiny',
      2: 'unuparts_part_unu_skid_tiny',
      4: 'unuparts_part_unu_engine_i1m'
    }
  }
]

function pdzUnuTagHas(root, key) {
  try { return root.contains(key) }
  catch (ignored) { return root[key] !== undefined && root[key] !== null }
}

function pdzUnuPartTag(systemName) {
  return {
    packID: 'unuparts',
    systemName: systemName,
    subName: '',
    spawnedDefaultParts: 1,
    part_active: 1.0,
    variablescount: 1,
    variables0: 'part_active'
  }
}

function pdzUnuBikeDefinition(stack) {
  if (!stack || stack.isEmpty()) return null
  let id = String(stack.id).toLowerCase()
  if (id.indexOf('mts:unucivil.') !== 0) return null
  for (let i = 0; i < PDZ_UNU_BIKE_DEFAULTS.length; i++) {
    if (id.indexOf(PDZ_UNU_BIKE_DEFAULTS[i].key) >= 0) return PDZ_UNU_BIKE_DEFAULTS[i]
  }
  return null
}

function pdzRepairUnuBikeStack(stack, player) {
  let def = pdzUnuBikeDefinition(stack)
  if (!def || !stack.nbt) return false
  let root = stack.nbt

  // New, never-placed items have no NBT and are handled by MTS defaults.
  // Recovered affected items retain both this flag and the controller seat.
  if (!root.spawnedDefaultParts || !pdzUnuTagHas(root, 'part_' + def.seat)) return false
  for (let i = 0; i < def.drive.length; i++) {
    if (pdzUnuTagHas(root, 'part_' + def.drive[i])) return false
  }

  Object.keys(def.parts).forEach(slot => {
    root['part_' + slot] = pdzUnuPartTag(def.parts[slot])
  })
  root.PDZUnuBikePartRecovery = 1
  stack.nbt = root
  console.warn('[PROJECT DEADZONE][UNU BIKE] Restored missing drive set for ' +
    String(stack.id) + (player ? ' owner=' + player.username : ''))
  return true
}

// Runs before MTS handles placement, so a damaged recovered stack is repaired
// even when it was obtained before this compatibility script existed.
ItemEvents.rightClicked(event => {
  if (!event.player || event.player.level.clientSide) return
  if (pdzRepairUnuBikeStack(event.item, event.player)) {
    event.player.tell(Text.of('UNUバイクの消失したタイヤ／駆動部品を復旧しました。').aqua())
  }
})

// MTS pickup drops the vehicle as an item entity.  Once collected, normalize
// the stack promptly instead of waiting until the player tries to place it.
PlayerEvents.tick(event => {
  let player = event.player
  if (!player || player.level.clientSide || player.age % 20 !== 11) return
  let inv = player.getInventory()
  for (let slot = 0; slot < inv.getContainerSize(); slot++) {
    pdzRepairUnuBikeStack(inv.getItem(slot), player)
  }
})

