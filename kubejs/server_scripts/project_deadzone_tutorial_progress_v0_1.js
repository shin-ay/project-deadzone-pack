// PROJECT DEADZONE first-join tutorial progress v0.1
// Informational quests follow real onboarding state instead of check buttons.

const DZ_TUTORIAL_QUESTS = {
  joined: "766FE33E74D2F108",
  job: "7F38ED70B0F58477",
  camp: "22F49EBF5BDC1FC1",
  preparation: "583CB8089686659D"
}

function dzTutorialComplete(player, key) {
  // v2 retries saves that recorded completion while the old quest IDs no
  // longer existed after the FTB chapter reorganization.
  let flag = "dz_tutorial_complete_v2_" + key
  if (player.persistentData.getBoolean(flag)) return
  let result = player.server.runCommandSilent("ftbquests change_progress " + player.username +
    " complete " + DZ_TUTORIAL_QUESTS[key])
  if (result > 0) player.persistentData.putBoolean(flag, true)
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
