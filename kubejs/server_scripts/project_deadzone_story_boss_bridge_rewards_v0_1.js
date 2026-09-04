// PROJECT DEADZONE Story Boss Bridge Rewards v0.2 (local candidate)
// The first three mandatory bosses give every nearby participant a one-time
// bridge cache that is immediately useful in the newly opened technology tier.

const PDZ_BRIDGE_REWARDS = [
  {
    tag:'dz_story_boss_gasstation', key:'gasstation_s1', title:'S1 AR・SG技術キャッシュ',
    gun:'tacz:m4a1', mode:'AUTO', ammo:'tacz:556x45', rounds:90,
    items:[['immersiveengineering:ingot_steel',8],['create:precision_mechanism',2],['apocalypsenow:bandage',4]]
  },
  {
    tag:'dz_story_boss_policestation', key:'policestation_s2', title:'S2 精密火器キャッシュ',
    gun:'tacz:m700', mode:'SEMI', ammo:'tacz:30_06', rounds:48,
    items:[['immersiveengineering:ingot_steel',12],['immersiveengineering:component_steel',4],['apocalypsenow:medicalkit',1]]
  },
  {
    tag:'dz_story_boss_radio_tower', key:'radio_s3', title:'S3 統合戦闘キャッシュ',
    gun:'tacz:rpg7', mode:'SEMI', ammo:'tacz:rpg_rocket', rounds:8,
    items:[['superbwarfare:common_blueprint_data_chip',2],['superbwarfare:rare_blueprint_data_chip',1],['immersiveengineering:ingot_steel',16],['apocalypsenow:medicalkit',2]]
  }
]

function dzBridgeRewardSpec(entity) {
  for (let i = 0; i < PDZ_BRIDGE_REWARDS.length; i++) {
    if (entity.tags.contains(PDZ_BRIDGE_REWARDS[i].tag)) return PDZ_BRIDGE_REWARDS[i]
  }
  return null
}

function dzBridgeParticipant(player, boss) {
  if (String(player.level.dimension) !== String(boss.level.dimension)) return false
  let dx = player.x - boss.x, dy = player.y - boss.y, dz = player.z - boss.z
  return dx * dx + dy * dy + dz * dz <= 16384
}

function dzGiveBridgeReward(player, spec) {
  let flag = 'dz_story_bridge_reward_' + spec.key
  if (player.persistentData.getBoolean(flag)) return false

  let gun = Item.of('tacz:modern_kinetic_gun',
    `{GunFireMode:"${spec.mode}",GunId:"${spec.gun}",HasBulletInBarrel:1b}`)
  let ammo = Item.of('tacz:ammo', spec.rounds, `{AmmoId:"${spec.ammo}"}`)
  if (!gun.isEmpty()) player.give(gun)
  if (!ammo.isEmpty()) player.give(ammo)
  spec.items.forEach(entry => {
    let stack = Item.of(entry[0], entry[1])
    if (!stack.isEmpty()) player.give(stack)
  })

  player.persistentData.putBoolean(flag, true)
  player.tell(Text.of('[BOSS REWARD] ' + spec.title).gold().bold())
  player.tell(Text.of(spec.gun + ' / ' + spec.ammo + ' x' + spec.rounds + ' / 次段階の基礎資材').gray())
  return true
}

EntityEvents.death(event => {
  let boss = event.entity
  if (!boss || boss.level.clientSide || !boss.tags) return
  let spec = dzBridgeRewardSpec(boss)
  if (!spec) return
  event.server.players.forEach(player => {
    if (dzBridgeParticipant(player, boss)) dzGiveBridgeReward(player, spec)
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonebridgereward').requires(source => source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of('=== Boss Bridge Reward ===').gold())
    PDZ_BRIDGE_REWARDS.forEach(spec => {
      let received = player.persistentData.getBoolean('dz_story_bridge_reward_' + spec.key)
      player.tell(Text.of((received ? '✓ ' : '－ ') + spec.title).color(received ? 'green' : 'gray'))
    })
    return 1
  }))
  event.register(root)
})
