// PROJECT DEADZONE faction/entity registry audit v0.1
// Diagnostic only: no faction, target, spawn, or combat state is modified.

const PDZ_FRA_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const PDZ_FRA_REGISTRIES = Java.loadClass('net.minecraft.core.registries.Registries')
const PDZ_FRA_TAG_KEY = Java.loadClass('net.minecraft.tags.TagKey')
const PDZ_FRA_RL = Java.loadClass('net.minecraft.resources.ResourceLocation')

function pdzFraTag(id) {
  return PDZ_FRA_TAG_KEY.create(PDZ_FRA_REGISTRIES.ENTITY_TYPE, new PDZ_FRA_RL(id))
}

const PDZ_FRA_TAGS = {
  infectiousUndead: pdzFraTag('infectious:undead'),
  apocalypseWalkers: pdzFraTag('apocalypsenow:walkers'),
  sporeFungus: pdzFraTag('spore:fungus_entities')
}

function pdzFraInTag(type, tag) {
  // Forge owns the live datapack tag binding. EntityType's built-in holder can
  // remain unbound when queried through ForgeRegistries on a dedicated server,
  // which made every otherwise valid tag membership appear false.
  try {
    let tags = PDZ_FRA_FORGE_REGISTRIES.ENTITY_TYPES.tags()
    if (tags) return tags.getTag(tag).contains(type)
  } catch (ignored) {}
  try { return type.builtInRegistryHolder().is(tag) } catch (ignored) { return false }
}

function pdzFraCurrentInfected(id) {
  id = String(id)
  return id.indexOf('infectious:') === 0 || id.indexOf('apocalypse_zombies:') === 0 ||
    id.indexOf('zombie') >= 0 || id === 'minecraft:husk' || id === 'minecraft:drowned'
}

function pdzFraRegistryRows() {
  let rows = []
  PDZ_FRA_FORGE_REGISTRIES.ENTITY_TYPES.getKeys().forEach(key => {
    let id = String(key), type = PDZ_FRA_FORGE_REGISTRIES.ENTITY_TYPES.getValue(key)
    rows.push({
      id: id,
      category: type ? String(type.getCategory()) : 'unknown',
      currentInfected: pdzFraCurrentInfected(id),
      infectiousUndead: !!type && pdzFraInTag(type, PDZ_FRA_TAGS.infectiousUndead),
      apocalypseWalker: !!type && pdzFraInTag(type, PDZ_FRA_TAGS.apocalypseWalkers),
      sporeFungus: !!type && pdzFraInTag(type, PDZ_FRA_TAGS.sporeFungus)
    })
  })
  rows.sort((a, b) => a.id.localeCompare(b.id))
  return rows
}

function pdzFraTell(source, message, color) {
  let player = null
  try { player = source.player } catch (ignored) {}
  if (player) player.tell(Text.of(message)[color || 'white']())
  else console.info('[PDZ FACTION AUDIT RESULT] ' + message)
}

function pdzFraRegistryAudit(source) {
  let rows = pdzFraRegistryRows()
  let current = rows.filter(row => row.currentInfected).length
  let infectious = rows.filter(row => row.infectiousUndead).length
  let apocalypse = rows.filter(row => row.apocalypseWalker).length
  let spore = rows.filter(row => row.sporeFungus).length
  console.info('[PDZ FACTION AUDIT REGISTRY] ' + JSON.stringify(rows))
  pdzFraTell(source, 'Entity Type総数: ' + rows.length, 'gold')
  pdzFraTell(source, '現行感染判定: ' + current + ' / #infectious:undead: ' + infectious +
    ' / #apocalypsenow:walkers: ' + apocalypse + ' / #spore:fungus_entities: ' + spore, 'aqua')
  pdzFraTell(source, '完全なID一覧を logs/kubejs/server.log へ1行で出力しました。', 'gray')
  return rows.length
}

function pdzFraLoadedAudit(source) {
  let server = source.server
  let dimensions = {}, counts = {}, suspicious = []
  server.players.forEach(online => {
    let dim = String(online.level.dimension)
    if (dimensions[dim]) return
    dimensions[dim] = true
    online.level.entities.forEach(entity => {
      let id = String(entity.type)
      counts[id] = Number(counts[id] || 0) + 1
      let target = null
      try { target = entity.target } catch (ignored) {}
      if (!target) return
      let dx = Number(target.x) - Number(entity.x)
      let dy = Number(target.y) - Number(entity.y)
      let dz = Number(target.z) - Number(entity.z)
      let distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      let lineOfSight = true
      try { lineOfSight = !!entity.hasLineOfSight(target) } catch (ignored) {}
      if (!lineOfSight || Math.abs(dy) > 16 || distance > 64) {
        suspicious.push({source: id, target: String(target.type), distance: Math.round(distance * 10) / 10,
          vertical: Math.round(Math.abs(dy) * 10) / 10, lineOfSight: lineOfSight,
          x: Math.floor(entity.x), y: Math.floor(entity.y), z: Math.floor(entity.z)})
      }
    })
  })
  console.info('[PDZ FACTION AUDIT LOADED] ' + JSON.stringify({counts: counts, suspiciousTargets: suspicious}))
  pdzFraTell(source, '読込中Entity種: ' + Object.keys(counts).length +
    ' / 遮蔽・高低差・距離の要確認target: ' + suspicious.length, 'gold')
  pdzFraTell(source, '詳細を logs/kubejs/server.log へ出力しました。', 'gray')
  return suspicious.length
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonefactionaudit').requires(source => source.hasPermission(2))
  root.then(Commands.literal('registry').executes(context => pdzFraRegistryAudit(context.source)))
  root.then(Commands.literal('loaded_targets').executes(context => pdzFraLoadedAudit(context.source)))
  event.register(root)
})

console.info('[PROJECT DEADZONE] faction registry audit v0.1 loaded (diagnostic only)')
