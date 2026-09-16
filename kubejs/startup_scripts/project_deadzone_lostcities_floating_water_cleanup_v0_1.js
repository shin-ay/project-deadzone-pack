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
  let neighbor = new PDZ_LC_WATER_BLOCK_POS()
  let air = PDZ_LC_WATER_BLOCKS.AIR.defaultBlockState()
  let visited = {}

  function key(localX, y, localZ) { return localX + '|' + y + '|' + localZ }
  function isWater(localX, y, localZ) {
    if (localX < 0 || localX > 15 || localZ < 0 || localZ > 15 || y < minY || y > maxY) return false
    pos.set(baseX + localX, y, baseZ + localZ)
    return chunk.getBlockState(pos).is(PDZ_LC_WATER_BLOCKS.WATER)
  }

  for (let localX = 0; localX < 16; localX++) {
    for (let localZ = 0; localZ < 16; localZ++) {
      for (let y = minY; y <= maxY; y++) {
        let startKey = key(localX, y, localZ)
        if (visited[startKey] || !isWater(localX, y, localZ)) continue

        // Lost Cities can leave a supported source layer beside newly carved
        // city air. It is not initially unsupported, but becomes a waterfall
        // after fluid ticks. Classify the whole in-chunk component before
        // removing it so that its remaining sources cannot regenerate the fall.
        let queue = [[localX, y, localZ]]
        let component = []
        let exposed = false
        visited[startKey] = true
        for (let q = 0; q < queue.length; q++) {
          let current = queue[q]
          let cx = current[0], cy = current[1], cz = current[2]
          component.push(current)

          neighbor.set(baseX + cx, cy - 1, baseZ + cz)
          if (chunk.getBlockState(neighbor).isAir()) exposed = true
          let horizontal = [[1,0],[-1,0],[0,1],[0,-1]]
          for (let h = 0; h < horizontal.length; h++) {
            let nx = cx + horizontal[h][0], nz = cz + horizontal[h][1]
            if (nx < 0 || nx > 15 || nz < 0 || nz > 15) continue
            neighbor.set(baseX + nx, cy, baseZ + nz)
            if (chunk.getBlockState(neighbor).isAir()) exposed = true
          }

          let adjacent = [[cx+1,cy,cz],[cx-1,cy,cz],[cx,cy,cz+1],[cx,cy,cz-1],[cx,cy+1,cz],[cx,cy-1,cz]]
          for (let a = 0; a < adjacent.length; a++) {
            let next = adjacent[a]
            let nextKey = key(next[0], next[1], next[2])
            if (visited[nextKey] || !isWater(next[0], next[1], next[2])) continue
            visited[nextKey] = true
            queue.push(next)
          }
        }

        // Tiny open fountains are allowed. Natural remnants large enough to
        // form a lag-producing sheet are removed together with their sources.
        if (exposed && component.length >= 8) {
          for (let c = 0; c < component.length; c++) {
            let water = component[c]
            pos.set(baseX + water[0], water[1], baseZ + water[2])
            chunk.setBlockState(pos, air, false)
          }
        }
      }
    }
  }
})
