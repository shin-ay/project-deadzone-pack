// PROJECT DEADZONE - restore Easy NPC service buttons after camp/NPC regeneration.
PlayerEvents.loggedIn(event => {
  event.player.server.scheduleInTicks(100, callback => {
    event.player.server.runCommandSilent('execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,limit=1] run function project_deadzone:basecamp/repair_staff_service_ui')
  })
})
