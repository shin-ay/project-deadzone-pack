// PROJECT DEADZONE Lost Cities floating-water cleanup v0.1
//
// Lost Cities treats vanilla water as empty while it lowers terrain for a
// city chunk.  A natural lake or spring can therefore be left behind with no
// block beneath it.  Clean only that unsupported vertical water run at the
// end of city generation; normal oceans, rivers, sewers, and tanks keep their
// supported water.  This is generation-only and adds no recurring tick scan.

const PDZ_LC_WATER_BLOCK_POS = Java.loadClass('net.minecraft.core.BlockPos$MutableBlockPos')
const PDZ_LC_WATER_BLOCKS = Java.loadClass('net.minecraft.world.level.block.Blocks')

const PDZ_LC_WATER_MIN_Y = 72
const PDZ_LC_WATER_MAX_Y = 128

ForgeEvents.onEvent('mcjty.lostcities.api.LostCityEvent$PostGenCityChunkEvent', event => {
  let chunk = event.getChunkAccess()
  if (!chunk) return

  let minY = Math.max(PDZ_LC_WATER_MIN_Y, chunk.getMinBuildHeight())
  let maxY = Math.min(PDZ_LC_WATER_MAX_Y, chunk.getMaxBuildHeight() - 1)
  if (minY > maxY) return

  let baseX = event.getChunkX() << 4
  let baseZ = event.getChunkZ() << 4
  let pos = new PDZ_LC_WATER_BLOCK_POS()
  let below = new PDZ_LC_WATER_BLOCK_POS()
  let air = PDZ_LC_WATER_BLOCKS.AIR.defaultBlockState()

  for (let localX = 0; localX < 16; localX++) {
    for (let localZ = 0; localZ < 16; localZ++) {
      let x = baseX + localX
      let z = baseZ + localZ

      for (let y = minY; y <= maxY; y++) {
        pos.set(x, y, z)
        if (!chunk.getBlockState(pos).is(PDZ_LC_WATER_BLOCKS.WATER)) continue

        below.set(x, y - 1, z)
        if (!chunk.getBlockState(below).isAir()) continue

        // Remove the unsupported block and every directly connected water
        // block above it.  Supported water in the same column is untouched.
        while (y <= maxY) {
          pos.set(x, y, z)
          if (!chunk.getBlockState(pos).is(PDZ_LC_WATER_BLOCKS.WATER)) break
          chunk.setBlockState(pos, air, false)
          y++
        }
      }
    }
  }
})
