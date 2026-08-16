// PROJECT DEADZONE - Butchery / grave compatibility
// Butchery corpses stay enabled for mobs. Player corpses are removed so the
// grave mod remains the single owner of player inventory and death recovery.

PlayerEvents.death(event => {
  const p = event.player
  const server = event.server
  const x = Math.floor(p.x)
  const y = Math.floor(p.y)
  const z = Math.floor(p.z)

  // Butchery places its decorative corpse during/just after the death event.
  // Run twice to cover both event orderings without touching mob corpses.
  ;[5, 20].forEach(delay => server.scheduleInTicks(delay, () => {
    server.runCommandSilent(`fill ${x - 2} ${y - 2} ${z - 2} ${x + 2} ${y + 2} ${z + 2} air replace butchery:playercorpse`)
    server.runCommandSilent(`fill ${x - 2} ${y - 2} ${z - 2} ${x + 2} ${y + 2} ${z + 2} air replace butchery:drainedplayercorpse`)
  }))
})

// Butchering is part of the Survivalist hunting loop.  Animal kills already
// grant hunting XP in the Career script; finishing a corpse adds a smaller
// processing reward so hunting has a full kill -> harvest progression.
BlockEvents.broken(event => {
  const id = String(event.block.id)
  if (!id.startsWith('butchery:') || id.indexOf('corpse') < 0 || id.indexOf('playercorpse') >= 0) return
  const p = event.player
  if (!p || !p.isPlayer || !p.isPlayer()) return
  if (typeof pdzCareerAddXp === 'function') pdzCareerAddXp(p, 2, 'hunting', false)
})
