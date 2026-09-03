// PROJECT DEADZONE sniper overwatch v0.1
//
// TaCZ NPC riflemen only open fire at very short range.  Dedicated overwatch
// instead uses TaCZ Hostiles' ranged combat AI (64 block acquisition / 48
// block fire envelope) and forces a bolt-action AWP loadout.  Callers own the
// encounter cadence; this file only creates one bounded sniper at a time.

const PDZ_SNIPER_ENTITY = 'tacz_hostiles:soldier'
const PDZ_SNIPER_GUN = 'tacz:ai_awp'
const PDZ_SNIPER_MIN_SPAWN = 48
const PDZ_SNIPER_MAX_SPAWN = 64

function pdzSniperSafeTag(value) {
  return String(value || '').replace(/[^A-Za-z0-9_+.-]/g, '_').substring(0, 96)
}

function pdzSpawnOverwatchSniper(server, request) {
  if (!server || !request) return 0
  let dimension = String(request.dimension || 'minecraft:overworld')
  let x = Math.floor(Number(request.x || 0))
  let y = Math.floor(Number(request.y || 64))
  let z = Math.floor(Number(request.z || 0))
  let groupTag = pdzSniperSafeTag(request.groupTag || 'dz_sniper_group')
  let waveTag = pdzSniperSafeTag(request.waveTag || groupTag)
  let uniqueTag = 'dz_sniper_' + Math.floor(Math.random() * 1000000000)
  let at = 'execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z + ' run '
  let tags = '["dz_overwatch_sniper","dz_npc","dz_raider","dz_hostile","' + groupTag + '","' + waveTag + '","' + uniqueTag + '"]'
  let summon = at + 'summon ' + PDZ_SNIPER_ENTITY + ' ~ ~ ~ {PersistenceRequired:1b,CustomName:\'{"text":"RAIDER SNIPER","color":"dark_red","bold":true}\',CustomNameVisible:0b,Tags:' + tags + '}'
  if (server.runCommandSilent(summon) <= 0) return 0

  // Apply after summon so the entity's own finalisation cannot replace it.
  let selector = '@e[type=' + PDZ_SNIPER_ENTITY + ',tag=' + uniqueTag + ',limit=1,sort=nearest]'
  let gun = 'tacz:modern_kinetic_gun{GunId:"' + PDZ_SNIPER_GUN + '",GunFireMode:"SEMI",GunCurrentAmmoCount:5,HasBulletInBarrel:1b,MaxDummyAmmo:5,DummyAmmo:5}'
  server.runCommandSilent(at + 'item replace entity ' + selector + ' weapon.mainhand with ' + gun)
  server.runCommandSilent(at + 'attribute ' + selector + ' minecraft:generic.follow_range base set 64')
  server.runCommandSilent(at + 'team join dz_raiders ' + selector)
  server.runCommandSilent(at + 'spreadplayers ' + x + ' ' + z + ' ' + PDZ_SNIPER_MIN_SPAWN + ' ' + PDZ_SNIPER_MAX_SPAWN + ' false ' + selector)
  console.info('[PROJECT DEADZONE][Sniper] deployed ' + uniqueTag + ' at 48-64m around ' + x + ',' + z)
  return 1
}

global.pdzSpawnOverwatchSniper = pdzSpawnOverwatchSniper

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonesniper').requires(source => source.hasPermission(2))
  root.then(Commands.literal('test').executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let result = pdzSpawnOverwatchSniper(ctx.source.server, {
      dimension: String(player.level.dimension),
      x: player.x,
      y: player.y,
      z: player.z,
      groupTag: 'dz_sniper_admin_test',
      waveTag: 'dz_sniper_admin_test'
    })
    if (result) {
      player.tell(Text.of('[SNIPER TEST] 48～64m圏へ狙撃兵を展開しました。遮蔽物を確保してください。').red())
      player.runCommandSilent('playsound minecraft:block.note_block.bell master @s ~ ~ ~ 0.7 0.55')
    }
    return result
  }))
  root.then(Commands.literal('clear').executes(ctx => {
    let result = ctx.source.server.runCommandSilent('kill @e[tag=dz_sniper_admin_test]')
    if (ctx.source.player) ctx.source.player.tell(Text.of('[SNIPER TEST] テスト個体を削除しました。').yellow())
    return result
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Sniper overwatch v0.1 loaded')
