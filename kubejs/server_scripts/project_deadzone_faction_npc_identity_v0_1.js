// PROJECT DEADZONE - faction NPC identity and legacy down-state cleanup.
// Only players use PlayerRevive. NPCs now follow their normal death path.

const PDZ_FACTION_LABELS = [
  ["dz_survivor", "SURVIVOR"],
  ["dz_civildef", "CDF"],
  ["dz_raider", "RAIDER"],
  ["dz_remnant", "REMNANT"],
  ["dz_aegis", "AEGIS"],
  ["dz_warden", "WARDEN"]
]

function pdzFactionLabel(entity) {
  if (!entity || !entity.tags) return ""
  for (let i=0;i<PDZ_FACTION_LABELS.length;i++) {
    if (entity.tags.contains(PDZ_FACTION_LABELS[i][0])) return PDZ_FACTION_LABELS[i][1]
  }
  return ""
}

function pdzFactionRole(entity) {
  if (entity.tags.contains("dz_faction_medic")) return "Medic"
  if (entity.tags.contains("dz_basecamp_guard") || entity.tags.contains("dz_survivor_guard")) return "Guard"
  let id=String(entity.type)
  if (id.indexOf("scout")>=0) return "Scout"
  if (id.indexOf("sniper")>=0) return "Sniper"
  if (id.indexOf("heavy")>=0 || id.indexOf("pmc")>=0) return "Heavy"
  if (id.indexOf("mecha")>=0) return "Drone"
  return "Operative"
}

function pdzNameFactionNpc(entity) {
  let faction=pdzFactionLabel(entity)
  if (!faction || !entity.tags.contains("dz_npc")) return
  if (entity.tags.contains("dz_named") || entity.tags.contains("dz_story_boss") ||
      entity.tags.contains("dz_wilderness_trader") || entity.tags.contains("dz_story_npc") ||
      entity.tags.contains("dz_basecamp_staff")) return
  let name="["+faction+"] "+pdzFactionRole(entity)
  entity.runCommandSilent("data merge entity @s {CustomName:'{\"text\":\""+name+"\",\"color\":\"gold\"}',CustomNameVisible:1b}")
}

EntityEvents.spawned(event => {
  let entity=event.entity
  if (!entity || !entity.tags || !entity.tags.contains("dz_npc")) return
  entity.server.scheduleInTicks(2,()=>pdzNameFactionNpc(entity))
})

ServerEvents.tick(event => {
  if (event.server.tickCount % 20 !== 0) return
  let checked={}
  event.server.players.forEach(player => {
    player.level.entities.forEach(entity => {
      if (!entity.tags || (!entity.tags.contains("dz_npc") && !entity.tags.contains("dz_buddy"))) return
      let uuid=String(entity.uuid)
      if (checked[uuid]) return
      checked[uuid]=true
      if (entity.tags.contains("dz_npc_downed") || entity.tags.contains("dz_buddy_downed")) {
        entity.tags.remove("dz_npc_downed")
        entity.tags.remove("dz_buddy_downed")
        entity.tags.remove("dz_npc_revive_in_progress")
        entity.tags.remove("dz_npc_bleedout_armed")
        entity.mergeNbt({Invulnerable:0,NoAI:0})
        entity.runCommandSilent("effect clear @s minecraft:glowing")
        // Retired callbacks used to cancel lethal damage and park every NPC at
        // one health. Never heal that state back to two: finish the pending
        // death so hostile faction mobs cannot become permanently immortal.
        if (Number(entity.health) <= 1.01) {
          entity.runCommandSilent("kill @s")
          return
        }
      }
      if (event.server.tickCount % 100 === 0) pdzNameFactionNpc(entity)
    })
  })
})
