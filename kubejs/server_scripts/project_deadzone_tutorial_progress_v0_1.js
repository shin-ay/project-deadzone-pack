// PROJECT DEADZONE first-join tutorial progress v0.1
// Informational quests follow real onboarding state instead of check buttons.

const DZ_TUTORIAL_QUESTS = {
  joined: "D202608200000010",
  job: "D202608200000020",
  camp: "D202608200000030",
  preparation: "D202608200000040"
}

function dzTutorialComplete(player, key) {
  let flag = "dz_tutorial_complete_" + key
  if (player.persistentData.getBoolean(flag)) return
  player.server.runCommandSilent("ftbquests change_progress " + player.username +
    " complete " + DZ_TUTORIAL_QUESTS[key])
  player.persistentData.putBoolean(flag, true)
}

PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(40, callback => dzTutorialComplete(event.player, "joined"))
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0) return
  if (player.persistentData.getBoolean("dz_job_chosen")) dzTutorialComplete(player, "job")
  if (player.server.runCommandSilent("execute as " + player.username +
      " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..96,limit=1]") > 0)
    dzTutorialComplete(player, "camp")
  if (player.persistentData.getBoolean("dz_story_preparation_latched") ||
      player.persistentData.getBoolean("dz_story_auto_preparation"))
    dzTutorialComplete(player, "preparation")
})

