// PROJECT DEADZONE authoritative faction relation registry v0.1
// Existing mods own their entities and AI. PDZ only resolves a common faction
// identity and answers whether two factions may deliberately target each other.

const PDZ_REL_ALLY = 'ALLY'
const PDZ_REL_FRIENDLY = 'FRIENDLY'
const PDZ_REL_NEUTRAL = 'NEUTRAL'
const PDZ_REL_HOSTILE = 'HOSTILE'

const PDZ_REL_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const PDZ_REL_REGISTRIES = Java.loadClass('net.minecraft.core.registries.Registries')
const PDZ_REL_TAG_KEY = Java.loadClass('net.minecraft.tags.TagKey')
const PDZ_REL_RL = Java.loadClass('net.minecraft.resources.ResourceLocation')

function pdzRelEntityTag(id) {
  return PDZ_REL_TAG_KEY.create(PDZ_REL_REGISTRIES.ENTITY_TYPE, new PDZ_REL_RL(id))
}

const PDZ_REL_ENTITY_TAGS = {
  infectious: pdzRelEntityTag('infectious:undead'),
  apocalypse: pdzRelEntityTag('apocalypsenow:walkers'),
  spore: pdzRelEntityTag('spore:fungus_entities')
}
const PDZ_REL_TYPE_CACHE = {}

// Rows are intentionally directional. FRIENDLY/ALLY blocks deliberate attacks;
// NEUTRAL permits retaliation after being harmed but never pre-emptive targeting.
const PDZ_RELATION_MATRIX = {
  survivor:   {survivor:'ALLY', cdf:'ALLY', pmc:'FRIENDLY', independent:'FRIENDLY', remnant:'HOSTILE', raider:'HOSTILE', aegis:'HOSTILE', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  cdf:        {survivor:'ALLY', cdf:'ALLY', pmc:'FRIENDLY', independent:'FRIENDLY', remnant:'HOSTILE', raider:'HOSTILE', aegis:'HOSTILE', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  pmc:        {survivor:'FRIENDLY', cdf:'FRIENDLY', pmc:'ALLY', independent:'FRIENDLY', remnant:'HOSTILE', raider:'HOSTILE', aegis:'HOSTILE', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  independent:{survivor:'FRIENDLY', cdf:'FRIENDLY', pmc:'FRIENDLY', independent:'ALLY', remnant:'NEUTRAL', raider:'HOSTILE', aegis:'NEUTRAL', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  remnant:    {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'NEUTRAL', remnant:'ALLY', raider:'HOSTILE', aegis:'NEUTRAL', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  raider:     {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'HOSTILE', remnant:'HOSTILE', raider:'ALLY', aegis:'HOSTILE', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'FRIENDLY'},
  aegis:      {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'NEUTRAL', remnant:'NEUTRAL', raider:'HOSTILE', aegis:'ALLY', warden:'HOSTILE', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  warden:     {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'HOSTILE', remnant:'HOSTILE', raider:'HOSTILE', aegis:'HOSTILE', warden:'ALLY', infected:'HOSTILE', spore:'HOSTILE', hostile:'HOSTILE'},
  infected:   {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'HOSTILE', remnant:'HOSTILE', raider:'HOSTILE', aegis:'HOSTILE', warden:'HOSTILE', infected:'ALLY', spore:'HOSTILE', hostile:'NEUTRAL'},
  spore:      {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'HOSTILE', remnant:'HOSTILE', raider:'HOSTILE', aegis:'HOSTILE', warden:'HOSTILE', infected:'HOSTILE', spore:'ALLY', hostile:'NEUTRAL'},
  hostile:    {survivor:'HOSTILE', cdf:'HOSTILE', pmc:'HOSTILE', independent:'HOSTILE', remnant:'HOSTILE', raider:'FRIENDLY', aegis:'HOSTILE', warden:'HOSTILE', infected:'NEUTRAL', spore:'NEUTRAL', hostile:'ALLY'}
}

function pdzNormalizeFaction(faction) {
  let value = String(faction || 'unknown').toLowerCase()
  if (value === 'civildef' || value === 'civil_defense' || value === 'us') return 'cdf'
  if (value === 'ru') return 'remnant'
  if (value === 'ash_jackals') return 'raider'
  if (value === 'helix') return 'aegis'
  if (value === 'regular_infected') return 'infected'
  if (value === 'spore_faction') return 'spore'
  return value
}

function pdzFactionRelation(attackerFaction, targetFaction) {
  let attacker = pdzNormalizeFaction(attackerFaction)
  let target = pdzNormalizeFaction(targetFaction)
  if (attacker === target && attacker !== 'unknown') return PDZ_REL_ALLY
  let row = PDZ_RELATION_MATRIX[attacker]
  return row && row[target] ? row[target] : PDZ_REL_NEUTRAL
}

function pdzRelHasTag(entity, tag) {
  return !!entity && !!entity.tags && entity.tags.contains(tag)
}

function pdzRelTypeInTag(id, tag) {
  try {
    let type = PDZ_REL_FORGE_REGISTRIES.ENTITY_TYPES.getValue(new PDZ_REL_RL(id))
    let tags = PDZ_REL_FORGE_REGISTRIES.ENTITY_TYPES.tags()
    return !!type && !!tags && tags.getTag(tag).contains(type)
  } catch (ignored) { return false }
}

function pdzRelMineColoniesRaiderId(id) {
  if (id.indexOf('minecolonies:') !== 0) return false
  return id.indexOf('barbarian') >= 0 || id.indexOf('pirate') >= 0 ||
    id.indexOf('mummy') >= 0 || id.indexOf('pharao') >= 0 ||
    id.indexOf('amazon') >= 0 || id.indexOf('shieldmaiden') >= 0 ||
    id.indexOf('norsemen') >= 0 || id.indexOf('drownedpirate') >= 0
}

function pdzFactionOfEntity(entity) {
  if (!entity) return 'unknown'
  let id = String(entity.type)

  // Per-instance ownership always beats the base Entity Type. This allows an
  // Infectious model to represent a WARDEN drone and RU/PMC models to be reused.
  if (pdzRelHasTag(entity, 'dz_force_spore') || pdzRelHasTag(entity, 'dz_spore')) return 'spore'
  if (pdzRelHasTag(entity, 'dz_force_infected')) return 'infected'
  if (pdzRelHasTag(entity, 'dz_force_warden') || pdzRelHasTag(entity, 'dz_warden')) return 'warden'
  if (pdzRelHasTag(entity, 'dz_force_aegis') || pdzRelHasTag(entity, 'dz_force_helix') || pdzRelHasTag(entity, 'dz_aegis')) return 'aegis'
  if (pdzRelHasTag(entity, 'dz_force_remnant') || pdzRelHasTag(entity, 'dz_remnant')) return 'remnant'
  if (pdzRelHasTag(entity, 'dz_force_raider') || pdzRelHasTag(entity, 'dz_force_ash_jackals') || pdzRelHasTag(entity, 'dz_raider')) return 'raider'
  if (pdzRelHasTag(entity, 'dz_force_pmc') || pdzRelHasTag(entity, 'dz_pmc')) return 'pmc'
  if (pdzRelHasTag(entity, 'dz_force_independent') || pdzRelHasTag(entity, 'dz_wilderness_trader')) return 'independent'
  if (pdzRelHasTag(entity, 'dz_force_civil_defense') || pdzRelHasTag(entity, 'dz_force_civildef') ||
      pdzRelHasTag(entity, 'dz_civildef') || pdzRelHasTag(entity, 'dz_faction_civil_defense')) return 'cdf'
  if (pdzRelHasTag(entity, 'dz_force_survivor') || pdzRelHasTag(entity, 'dz_survivor') ||
      pdzRelHasTag(entity, 'dz_buddy') || pdzRelHasTag(entity, 'dz_story_npc')) return 'survivor'

  if (Object.prototype.hasOwnProperty.call(PDZ_REL_TYPE_CACHE, id)) {
    if (PDZ_REL_TYPE_CACHE[id] !== 'unknown') return PDZ_REL_TYPE_CACHE[id]
    if (pdzRelHasTag(entity, 'dz_hostile') || pdzRelHasTag(entity, 'dz_enemy')) return 'hostile'
    return 'unknown'
  }

  let resolved = 'unknown'

  if (id === 'minecraft:player') resolved = 'survivor'
  else if (id === 'simpleenemymod:usunit') resolved = 'cdf'
  else if (id === 'simpleenemymod:ruunit') resolved = 'remnant'
  else if (id === 'simpleenemymod:pmcunit') resolved = 'pmc'
  else if (id.indexOf('tacz_bandits:') === 0 || pdzRelMineColoniesRaiderId(id)) resolved = 'raider'
  else if (pdzRelTypeInTag(id, PDZ_REL_ENTITY_TAGS.spore)) resolved = 'spore'
  else if (pdzRelTypeInTag(id, PDZ_REL_ENTITY_TAGS.infectious) ||
      pdzRelTypeInTag(id, PDZ_REL_ENTITY_TAGS.apocalypse) ||
      id === 'minecraft:zombie' || id === 'minecraft:zombie_villager' ||
      id === 'minecraft:husk' || id === 'minecraft:drowned' ||
      id.indexOf('mutantszombies:') === 0) resolved = 'infected'

  else if (id === 'minecraft:villager' || id === 'minecraft:wandering_trader' || id === 'minecraft:iron_golem' ||
      id.indexOf('mca:') === 0 || id.indexOf('minecolonies:citizen') === 0 ||
      id.indexOf('recruits:') === 0 || id.indexOf('village_recruits:') === 0 ||
      id.indexOf('workers:') === 0 || id.indexOf('easy_npc:') === 0) resolved = 'independent'
  PDZ_REL_TYPE_CACHE[id] = resolved
  if (resolved !== 'unknown') return resolved
  if (pdzRelHasTag(entity, 'dz_hostile') || pdzRelHasTag(entity, 'dz_enemy')) return 'hostile'
  return resolved
}

function pdzEntityRelation(attacker, target) {
  return pdzFactionRelation(pdzFactionOfEntity(attacker), pdzFactionOfEntity(target))
}

function pdzRelationBlocksDamage(attacker, target) {
  let relation = pdzEntityRelation(attacker, target)
  return relation === PDZ_REL_ALLY || relation === PDZ_REL_FRIENDLY
}

function pdzRelationAllowsTarget(attacker, target) {
  return pdzEntityRelation(attacker, target) === PDZ_REL_HOSTILE
}

function pdzRelationSelfTest(source) {
  let checks = [
    ['survivor', 'cdf', 'ALLY'],
    ['survivor', 'independent', 'FRIENDLY'],
    ['remnant', 'aegis', 'NEUTRAL'],
    ['infected', 'spore', 'HOSTILE'],
    ['warden', 'survivor', 'HOSTILE']
  ]
  let failures = []
  checks.forEach(check => {
    let actual = pdzFactionRelation(check[0], check[1])
    if (actual !== check[2]) failures.push(check[0] + '>' + check[1] + '=' + actual + ' expected=' + check[2])
  })
  let result = failures.length ? 'FAIL ' + failures.join('; ') : 'PASS checks=' + checks.length
  console.info('[PDZ FACTION RELATIONS TEST] ' + result)
  try { if (source.player) source.player.tell(Text.of('[FACTION RELATIONS] ' + result).gold()) } catch (ignored) {}
  return failures.length ? 0 : checks.length
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  event.register(Commands.literal('deadzonefactionrelations')
    .requires(source => source.hasPermission(2))
    .then(Commands.literal('selftest').executes(context => pdzRelationSelfTest(context.source))))
})

console.info('[PROJECT DEADZONE] authoritative faction relations v0.1 loaded')
