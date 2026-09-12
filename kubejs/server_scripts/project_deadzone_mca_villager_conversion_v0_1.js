// PROJECT DEADZONE MCA villager conversion safety net v0.1
// MCA owns villager conversion. This bridge only asks MCA's built-in converter
// to retry when a vanilla villager survives after joining the world.

const DZ_MCA_CONVERSION_DELAY_TICKS = 100

function dzMcaConvertAt(server, dimension, x, y, z, radius, source) {
  let r = Math.max(2, Math.floor(radius || 2))
  let command = 'execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
    ' as @e[type=minecraft:villager,distance=..' + r + ',sort=nearest,limit=1] at @s run ' +
    'mca-admin convertVanillaVillagers ' + r
  let result = server.runCommandSilent(command)
  if (result > 0) console.info('[PROJECT DEADZONE][MCA] requested vanilla villager conversion at ' +
    dimension + ' ' + x + ',' + y + ',' + z + ' source=' + source)
  return result
}

EntityEvents.spawned('minecraft:villager', event => {
  if (!event.entity || event.entity.level.clientSide) return
  let server = event.server
  let dimension = String(event.entity.level.dimension)
  let x = Math.floor(event.entity.x)
  let y = Math.floor(event.entity.y)
  let z = Math.floor(event.entity.z)

  // MCA normally intercepts before this event. Reaching this listener means a
  // modded spawn path escaped the normal conversion queue; wait five seconds
  // so we do not race MCA, then call MCA's own profession/trade-preserving path.
  server.scheduleInTicks(DZ_MCA_CONVERSION_DELAY_TICKS, callback => {
    dzMcaConvertAt(server, dimension, x, y, z, 2, 'spawn-fallback')
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  event.register(Commands.literal('deadzonevillagers')
    .then(Commands.literal('convert_nearby')
      .requires(source => source.hasPermission(2))
      .executes(ctx => {
        let player = ctx.source.player
        if (!player) return 0
        let result = player.server.runCommandSilent('execute as ' + player.username +
          ' at @s run mca-admin convertVanillaVillagers 192')
        player.tell(Text.of('半径192mのバニラ村人をMCA標準変換キューへ送りました。').green())
        return result > 0 ? 1 : 0
      })))
})
