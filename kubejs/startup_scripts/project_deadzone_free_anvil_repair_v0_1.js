// PROJECT DEADZONE temporary free anvil repair v0.1
// Vanilla refuses an anvil output whose displayed cost is zero. Keep a
// one-level transaction, then refund that level after the operation so the
// player's net XP cost is zero while repair materials are still consumed.
// Players at level zero receive a temporary one-level loan while the anvil is
// open; the loan is either consumed by the repair or reclaimed on close.

const PDZ_ANVIL_XP_LOAN = 'pdz_anvil_xp_loan_v1'
const PDZ_ANVIL_REGISTRIES = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const PDZ_ANVIL_BLOCKS = [
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil'
]

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerInteractEvent$RightClickBlock', event => {
  const player = event.entity
  if (!player || player.level.clientSide) return

  let blockId = ''
  try {
    blockId = String(PDZ_ANVIL_REGISTRIES.BLOCK.getKey(event.level.getBlockState(event.pos).block))
  } catch (ignored) {}
  if (PDZ_ANVIL_BLOCKS.indexOf(blockId) < 0) return
  if (player.xpLevel > 0 || player.persistentData.getBoolean(PDZ_ANVIL_XP_LOAN)) return

  player.giveExperienceLevels(1)
  player.persistentData.putBoolean(PDZ_ANVIL_XP_LOAN, true)
})

ForgeEvents.onEvent('net.minecraftforge.event.AnvilUpdateEvent', event => {
  if (event.canceled) return
  event.setCost(1)
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.AnvilRepairEvent', event => {
  const player = event.entity
  if (!player || player.level.clientSide) return

  if (player.persistentData.getBoolean(PDZ_ANVIL_XP_LOAN)) {
    player.persistentData.putBoolean(PDZ_ANVIL_XP_LOAN, false)
    return
  }

  player.server.scheduleInTicks(1, () => {
    if (!player || !player.isAlive()) return
    player.giveExperienceLevels(1)
  })
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerContainerEvent$Close', event => {
  const player = event.entity
  if (!player || player.level.clientSide) return
  if (!player.persistentData.getBoolean(PDZ_ANVIL_XP_LOAN)) return

  player.persistentData.putBoolean(PDZ_ANVIL_XP_LOAN, false)
  if (player.xpLevel > 0) player.giveExperienceLevels(-1)
})
