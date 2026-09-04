// PROJECT DEADZONE Story Boss Bridge Rewards v0.3 (local candidate)
// The first three mandatory bosses give every nearby participant a one-time
// bridge cache that is immediately useful in the newly opened technology tier.

const PDZ_BRIDGE_BP_CAPABILITIES = Java.loadClass('com.gamergaming.taczweaponblueprints.init.ModCapabilities')
const PDZ_BRIDGE_BP_CATALOG = Java.loadClass('com.gamergaming.taczweaponblueprints.resource.BlueprintDataManager')
const PDZ_BRIDGE_BP_MUTATION = Java.loadClass('com.gamergaming.taczweaponblueprints.capabilities.BlueprintLearningMutation$Request')
const PDZ_BRIDGE_BP_NETWORK = Java.loadClass('com.gamergaming.taczweaponblueprints.network.NetworkHandler')

const PDZ_STORY_RESEARCH_GATEWAYS = [
  {tier:0, blueprint:'tacz:glock_17', points:0, label:'S0 生存用火器'},
  {tier:1, blueprint:'tacz:m4a1', points:20, label:'S1 現場火器'},
  {tier:2, blueprint:'tacz:m700', points:32, label:'S2 精密・支援火器'},
  {tier:3, blueprint:'tacz:rpg7', points:48, label:'S3 統合・試験兵器'}
]

const PDZ_BRIDGE_REWARDS = [
  {
    tag:'dz_story_boss_gasstation', key:'gasstation_s1', title:'S1 AR・SG技術キャッシュ',
    gun:'tacz:m4a1', mode:'AUTO', ammo:'tacz:556x45', rounds:90, researchTier:1,
    items:[['immersiveengineering:ingot_steel',8],['create:precision_mechanism',2],['apocalypsenow:bandage',4]]
  },
  {
    tag:'dz_story_boss_policestation', key:'policestation_s2', title:'S2 精密火器キャッシュ',
    gun:'tacz:m700', mode:'SEMI', ammo:'tacz:30_06', rounds:48, researchTier:2,
    items:[['immersiveengineering:ingot_steel',12],['immersiveengineering:component_steel',4],['apocalypsenow:medicalkit',1]]
  },
  {
    tag:'dz_story_boss_radio_tower', key:'radio_s3', title:'S3 統合戦闘キャッシュ',
    gun:'tacz:rpg7', mode:'SEMI', ammo:'tacz:rpg_rocket', rounds:8, researchTier:3,
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

function dzBridgeStoryTier(player) {
  try {
    if (global.pdzStoryUnlockTier) return Math.max(0, Number(global.pdzStoryUnlockTier(player.server)) || 0)
  } catch (ignored) {}
  return Math.max(0, player.server.persistentData.getInt('deadzone_story_unlock_tier'))
}

function dzBridgeLearnResearchGateway(player, gateway, notify) {
  let flag = 'dz_story_research_gateway_s' + gateway.tier + '_v1'
  let data = null
  try {
    data = player.getCapability(PDZ_BRIDGE_BP_CAPABILITIES.PLAYER_RECIPE_DATA).resolve().orElse(null)
  } catch (error) {
    console.error('[DEADZONE RESEARCH] Capability lookup failed for ' + player.username + ': ' + error)
    return false
  }
  if (!data) return false

  // The periodic catch-up pass is also a repair path for restored player data.
  // Once both the PDZ marker and the Weapon Research capability agree, there is
  // nothing to mutate or send to the client again.
  if (player.persistentData.getBoolean(flag) && data.hasBlueprint(gateway.blueprint)) return true

  let changed = false
  try {
    let blueprintData = PDZ_BRIDGE_BP_CATALOG.SERVER.getBlueprintData(gateway.blueprint)
    if (!blueprintData || !blueprintData.getRecipeId()) {
      console.error('[DEADZONE RESEARCH] Missing gateway in live catalog: ' + gateway.blueprint)
      return false
    }
    let result = data.applyBlueprintLearning(PDZ_BRIDGE_BP_MUTATION.commit(
      gateway.blueprint, String(blueprintData.getRecipeId())))
    changed = result.committed() || String(result.status()) === 'ALREADY_LEARNED'
    if (!changed) {
      console.error('[DEADZONE RESEARCH] Gateway learn rejected for ' + player.username +
        ': ' + gateway.blueprint + ' / ' + result.status())
      return false
    }
    if (!player.persistentData.getBoolean(flag)) {
      if (gateway.points > 0) data.addResearchPoints(gateway.points, 1000000)
      player.persistentData.putBoolean(flag, true)
      if (notify) {
        player.tell(Text.of('[兵器研究解禁] ' + gateway.label).gold().bold())
        player.tell(Text.of(gateway.blueprint + ' を基点に同段階の銃を研究できます。研究ポイント +' + gateway.points).gray())
      }
    }
    PDZ_BRIDGE_BP_NETWORK.syncAllPlayerData(player)
    return true
  } catch (error) {
    console.error('[DEADZONE RESEARCH] Gateway sync failed for ' + player.username +
      ': ' + gateway.blueprint + ' / ' + error)
    return false
  }
}

function dzSyncStoryResearchGateways(player, notify) {
  let tier = dzBridgeStoryTier(player)
  PDZ_STORY_RESEARCH_GATEWAYS.forEach(gateway => {
    if (tier >= gateway.tier) dzBridgeLearnResearchGateway(player, gateway, notify !== false)
  })
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
  if (spec.researchTier !== undefined) {
    dzBridgeLearnResearchGateway(player, PDZ_STORY_RESEARCH_GATEWAYS[spec.researchTier], true)
  }
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

// Story authorization is server-wide. Players who were offline for a boss kill
// receive the same research gateway when they next join, without duplicating
// the physical boss cache.
PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(40, () => dzSyncStoryResearchGateways(event.player, true))
})

PlayerEvents.respawned(event => dzSyncStoryResearchGateways(event.player, false))

PlayerEvents.tick(event => {
  if (!event.player.level.clientSide && event.player.age % 1200 === 0)
    dzSyncStoryResearchGateways(event.player, false)
})

global.pdzSyncStoryResearchGateways = dzSyncStoryResearchGateways

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
    player.tell(Text.of('=== Story Arsenal Research ===').gold())
    let storyTier = dzBridgeStoryTier(player)
    PDZ_STORY_RESEARCH_GATEWAYS.forEach(gateway => {
      let unlocked = storyTier >= gateway.tier &&
        player.persistentData.getBoolean('dz_story_research_gateway_s' + gateway.tier + '_v1')
      player.tell(Text.of((unlocked ? '✓ ' : '－ ') + gateway.label + ' / ' + gateway.blueprint)
        .color(unlocked ? 'green' : 'gray'))
    })
    return 1
  }))
  root.then(Commands.literal('sync_research').executes(ctx => {
    dzSyncStoryResearchGateways(ctx.source.player, true)
    return 1
  }))
  event.register(root)
})
