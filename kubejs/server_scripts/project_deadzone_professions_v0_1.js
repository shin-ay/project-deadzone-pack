// PROJECT DEADZONE profession framework v0.1
// Advanced professions are not mutually exclusive. A player may hold up to
// three profession roots across all base jobs.

const DZ_PROFESSION_CAP = 3
const DZ_PROFESSION_ROOTS = [
  {category: "survival", skill: "angler_bait_keeper", tag: "dz_profession_angler"},
  {category: "survival", skill: "cook_field_kitchen", tag: "dz_profession_cook"}
]

// Retired by the unified progression contract. JOB owns role identity and the
// main Talent tree owns build choices; a third profession-slot layer is hidden.
const DZ_LEGACY_PROFESSIONS_ENABLED = false

function dzProfessionCount(player) {
  let count = 0
  DZ_PROFESSION_ROOTS.forEach(entry => {
    if (player.tags.contains(entry.tag)) count++
  })
  return count
}

function dzSyncProfessionSlots(player) {
  let count = dzProfessionCount(player)
  DZ_PROFESSION_ROOTS.forEach(entry => {
    let owned = player.tags.contains(entry.tag)
    if (owned || count < DZ_PROFESSION_CAP) {
      PufferfishSkills.allowSkillUnlock(player, entry.category, entry.skill)
    } else {
      PufferfishSkills.disallowSkillUnlock(player, entry.category, entry.skill)
    }
  })
  player.persistentData.putInt("dz_profession_slots_used", count)
  return count
}

if (DZ_LEGACY_PROFESSIONS_ENABLED) PlayerEvents.loggedIn(event => {
  event.player.server.scheduleInTicks(30, callback => {
    if (event.player && event.player.alive) dzSyncProfessionSlots(event.player)
  })
})

if (DZ_LEGACY_PROFESSIONS_ENABLED) PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 100 !== 0) return
  let current = dzProfessionCount(player)
  if (player.persistentData.getInt("dz_profession_slots_used") !== current) {
    dzSyncProfessionSlots(player)
  }
})

if (DZ_LEGACY_PROFESSIONS_ENABLED) ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneprofession")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let names = []
    DZ_PROFESSION_ROOTS.forEach(entry => {
      if (player.tags.contains(entry.tag)) names.push(entry.tag.replace("dz_profession_", ""))
    })
    player.tell(Text.of(
      "Profession slots: " + names.length + "/" + DZ_PROFESSION_CAP
      + " [" + names.join(", ") + "]"
    ).gold())
    return 1
  }))

  root.then(Commands.literal("grant_test")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      player.server.runCommandSilent(
        "puffish_skills points set " + player.username + " survival 20"
      )
      dzSyncProfessionSlots(player)
      player.tell(Text.of("Survival test points set to 20. Open the tree with K.").aqua())
      return 1
    }))

  root.then(Commands.literal("sync")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let count = dzSyncProfessionSlots(ctx.source.player)
      ctx.source.player.tell(Text.of("Profession slots synchronized: " + count + "/3").green())
      return 1
    }))

  event.register(root)
})
