// PROJECT DEADZONE - geographic risk / reward bridge v0.1
// Area Tier and the defeated enemy's own M&S level tier contribute separately.
// A strong enemy in a safe area is worthwhile; fighting that same enemy deep in
// the exclusion zone is better. Native M&S loot and existing elite/boss drops
// remain authoritative, while this layer adds a restrained expedition bonus.

const PDZ_RR_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')

const PDZ_RR_LEVEL_MAX = [8, 18, 30, 42, 55, 70]
const PDZ_RR_AREA_XP = [0, 1, 2, 4, 6, 9]
const PDZ_RR_ENEMY_XP = [0, 1, 2, 3, 5, 8]

const PDZ_RR_HOSTILE_NAMESPACES = [
  'spore', 'infnexus', 'infectious', 'apocalypse_zombies', 'mutantszombies',
  'tacz_bandits', 'tacz_hostiles'
]
const PDZ_RR_HOSTILES = [
  'minecraft:zombie', 'minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager',
  'minecraft:skeleton', 'minecraft:stray', 'minecraft:creeper', 'minecraft:spider',
  'minecraft:cave_spider', 'minecraft:enderman', 'minecraft:witch', 'minecraft:phantom',
  'minecraft:slime', 'minecraft:silverfish', 'minecraft:pillager', 'minecraft:vindicator',
  'minecraft:evoker', 'minecraft:ravager', 'simpleenemymod:ruunit', 'simpleenemymod:pmcunit'
]

// Each higher pool is intentionally self-contained. Rolls never cascade through
// every lower tier, which prevents high-tier enemies from vomiting filler loot.
const PDZ_RR_POOLS = [
  [],
  [
    {w:28, id:'apocalypsenow:coins', min:2, max:5},
    {w:24, id:'apocalypsenow:bandage', min:1, max:2},
    {w:24, id:'minecraft:iron_ingot', min:1, max:3},
    {w:24, id:'tacz:ammo', min:6, max:10, nbt:'{AmmoId:"tacz:9mm"}'}
  ],
  [
    {w:18, id:'apocalypsenow:money', min:1, max:1},
    {w:20, id:'apocalypsenow:pain_killers', min:1, max:1},
    {w:22, id:'immersiveengineering:ingot_steel', min:1, max:2},
    {w:20, id:'minecraft:redstone', min:3, max:6},
    {w:20, id:'tacz:ammo', min:10, max:16, nbt:'{AmmoId:"tacz:45acp"}'}
  ],
  [
    {w:22, id:'apocalypsenow:money', min:1, max:2},
    {w:18, id:'apocalypsenow:pain_killers', min:1, max:2},
    {w:20, id:'immersiveengineering:component_iron', min:1, max:2},
    {w:18, id:'minecraft:gold_ingot', min:2, max:4},
    {w:10, id:'minecraft:emerald', min:1, max:2},
    {w:12, id:'tacz:ammo', min:16, max:24, nbt:'{AmmoId:"tacz:12g"}'}
  ],
  [
    {w:28, id:'apocalypsenow:money', min:2, max:3},
    {w:20, id:'minecraft:diamond', min:1, max:1},
    {w:20, id:'minecraft:golden_apple', min:1, max:1},
    {w:12, id:'minecraft:netherite_scrap', min:1, max:1},
    {w:20, id:'tacz:ammo', min:20, max:30, nbt:'{AmmoId:"tacz:12g"}'}
  ],
  [
    {w:30, id:'apocalypsenow:money', min:3, max:5},
    {w:22, id:'minecraft:diamond', min:1, max:2},
    {w:20, id:'minecraft:netherite_scrap', min:1, max:1},
    {w:14, id:'minecraft:echo_shard', min:1, max:2},
    {w:4, id:'minecraft:enchanted_golden_apple', min:1, max:1},
    {w:10, id:'tacz:ammo', min:28, max:40, nbt:'{AmmoId:"tacz:12g"}'}
  ]
]

function pdzRrClampTier(value) {
  return Math.max(0, Math.min(5, Math.floor(Number(value) || 0)))
}

function pdzRrIsRewardTarget(entity) {
  if (!entity || entity.level.clientSide || !entity.type) return false
  try {
    if (entity.tags.contains('dz_buddy') || entity.tags.contains('dz_survivor') ||
        entity.tags.contains('dz_usunit_friendly') || entity.tags.contains('dz_npc_downed') ||
        entity.tags.contains('dz_no_rewards')) return false
    if (entity.getOwnerUUID() != null) return false
  } catch (ignored) {}
  let id = String(entity.type)
  let namespace = id.split(':')[0]
  return PDZ_RR_HOSTILE_NAMESPACES.indexOf(namespace) >= 0 || PDZ_RR_HOSTILES.indexOf(id) >= 0 ||
    entity.tags.contains('dz_elite') || entity.tags.contains('dz_boss') || entity.tags.contains('dz_named_boss')
}

function pdzRrAreaTier(entity) {
  try {
    if (global.pdzWorldTierAt)
      return pdzRrClampTier(global.pdzWorldTierAt(entity.server, entity.x, entity.z))
  } catch (ignored) {}
  return 0
}

function pdzRrTierFromLevel(level) {
  let value = Math.max(1, Number(level) || 1)
  for (let i = 0; i < PDZ_RR_LEVEL_MAX.length; i++) if (value <= PDZ_RR_LEVEL_MAX[i]) return i
  return 5
}

function pdzRrEnemyTier(entity) {
  try { return pdzRrTierFromLevel(PDZ_RR_MNS_ENTITY_DATA.get(entity).getLevel()) }
  catch (ignored) {}
  for (let tier = 5; tier >= 0; tier--) {
    try { if (entity.tags.contains('dz_cte2_region_' + tier)) return tier }
    catch (ignored) {}
  }
  return 0
}

function pdzRrKiller(event) {
  let source = event.source
  let killer = source ? source.actual : null
  if (killer && killer.isPlayer && killer.isPlayer()) return killer
  return null
}

function pdzRrAwardXp(player, areaTier, enemyTier, elite) {
  let bonus = PDZ_RR_AREA_XP[areaTier] + PDZ_RR_ENEMY_XP[enemyTier] + (elite ? 2 : 0)
  if (bonus <= 0) return 0
  if (global.pdzUnifiedProgressionAward)
    return global.pdzUnifiedProgressionAward(player, elite ? 'elite' : 'combat', bonus, true)
  return 0
}

function pdzRrCount(entry) {
  let min = Math.max(1, Math.floor(entry.min || 1))
  let max = Math.max(min, Math.floor(entry.max || min))
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pdzRrRollEntry(tier) {
  let pool = PDZ_RR_POOLS[pdzRrClampTier(tier)] || []
  if (pool.length <= 0) return null
  let total = pool.reduce((sum, entry) => sum + Math.max(0, Number(entry.w) || 0), 0)
  let roll = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    roll -= Math.max(0, Number(pool[i].w) || 0)
    if (roll <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

function pdzRrDrop(entity, tier) {
  let entry = pdzRrRollEntry(tier)
  if (!entry) return false
  let count = pdzRrCount(entry)
  let stack = entry.nbt ? Item.of(entry.id, count, entry.nbt) : Item.of(entry.id, count)
  if (!stack) return false
  entity.block.popItem(stack)
  return true
}

function pdzRrAwardDrops(entity, areaTier, enemyTier) {
  let score = areaTier + enemyTier
  if (score <= 0) return 0
  let rewardTier = Math.max(areaTier, enemyTier)
  let rolls = 0

  // Both axes matter: T1+T1 = 18%, T3+T3 = 54%, T5+T5 = guaranteed.
  let firstChance = Math.min(1, areaTier * 0.08 + enemyTier * 0.10)
  if (score >= 8 || Math.random() < firstChance) rolls++
  // Deep, appropriately-levelled fights gain a second material roll.
  let secondChance = Math.max(0, Math.min(1, (score - 4) * 0.18))
  if (Math.random() < secondChance) rolls++
  // Only the T5-area/T5-enemy combination can reach the jackpot third roll.
  if (score >= 10 && Math.random() < 0.25) rolls++

  let dropped = 0
  for (let i = 0; i < rolls; i++) if (pdzRrDrop(entity, rewardTier)) dropped++
  return dropped
}

EntityEvents.death(event => {
  let entity = event.entity
  let killer = pdzRrKiller(event)
  if (!killer || !pdzRrIsRewardTarget(entity)) return

  let areaTier = pdzRrAreaTier(entity)
  let enemyTier = pdzRrEnemyTier(entity)
  let elite = false
  try { elite = entity.tags.contains('dz_elite') || entity.tags.contains('dz_boss') || entity.tags.contains('dz_named_boss') }
  catch (ignored) {}

  let xp = pdzRrAwardXp(killer, areaTier, enemyTier, elite)
  let drops = pdzRrAwardDrops(entity, areaTier, enemyTier)
  if ((xp > 0 || drops > 0) && killer.persistentData.getBoolean('dz_risk_reward_monitor')) {
    killer.tell(Text.of('[遠征報酬] Area T' + areaTier + ' / Enemy T' + enemyTier +
      ' / Bonus XP +' + xp + ' / Drop ' + drops).gold())
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonereward')
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let area = 0
    try { if (global.pdzWorldTierAt) area = pdzRrClampTier(global.pdzWorldTierAt(player.server, player.x, player.z)) }
    catch (ignored) {}
    player.tell(Text.of('現在地 Area T' + area + ' / Area XP bonus +' + PDZ_RR_AREA_XP[area]).gold())
    player.tell(Text.of('Enemy T0–T5 bonus: +0 / +1 / +2 / +3 / +5 / +8 XP').aqua())
    player.tell(Text.of('追加DropはArea Tier＋Enemy Tierで抽選。両方T5なら2枠保証＋25%で3枠目。').gray())
    return 1
  }))
  root.then(Commands.literal('monitor').requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    let next = !player.persistentData.getBoolean('dz_risk_reward_monitor')
    player.persistentData.putBoolean('dz_risk_reward_monitor', next)
    player.tell(Text.of('遠征報酬モニター: ' + (next ? 'ON' : 'OFF')).color(next ? 'green' : 'gray'))
    return 1
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE][Risk Reward] v0.1 loaded: Area Tier + Enemy Tier rewards.')
