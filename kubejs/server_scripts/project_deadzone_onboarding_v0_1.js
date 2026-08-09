// PROJECT DEADZONE Multiplayer Onboarding v0.1
// Failsafe and diagnostics around Class Selection -> JOB -> Starter Kit.

const DZ_READY_SKILLS = [
  "Survival", "Scavenging", "Melee", "Medical", "Firearms",
  "Fitness", "Reload", "Mechanics", "Engineering", "Armor"
]

function dzReadyReport(player) {
  let data = player.persistentData
  let chosen = data.getBoolean("dz_job_chosen")
  let starter = data.getBoolean("dz_starter_received")
  let tier = data.getInt("deadzone_world_tier")

  player.tell(Text.of("=== PROJECT DEADZONE READY CHECK ===").gold())
  if (chosen) {
    player.tell(Text.of("JOB: " + data.getString("dz_job_name")).green())
  } else {
    player.tell(Text.of("JOB: 未選択").red())
  }
  if (starter) {
    player.tell(Text.of("Starter Kit: 受領済み").green())
  } else {
    player.tell(Text.of("Starter Kit: 未受領").red())
  }
  player.tell(Text.of("World Tier: T" + tier).aqua())

  let initialized = []
  let missing = []
  DZ_READY_SKILLS.forEach(skill => {
    if (data.contains("dz_skill_" + skill)) {
      initialized.push(skill + ":" + data.getInt("dz_skill_" + skill))
    } else {
      missing.push(skill)
    }
  })
  player.tell(Text.of(
    "Initial Skills: " + (initialized.length ? initialized.join(", ") : "なし")).gray())
  if (chosen && missing.length) {
    player.tell(Text.of("未初期化カテゴリ: " + missing.join(", ")).yellow())
  }

  if (!chosen) {
    player.tell(
      Text.of("[ JOB選択メニューを再表示 ]")
        .green()
        .clickRunCommand("/deadzonejob menu")
        .hover(Text.of("クリックしてJOB選択を再開")))
  } else {
    player.tell(Text.of("基本プレイヤーデータはマルチテスト可能です。").green())
  }
}

PlayerEvents.loggedIn(event => {
  let player = event.player
  player.server.scheduleInTicks(80, callback => {
    if (!player || !player.alive) return
    if (!player.persistentData.getBoolean("dz_job_chosen")) {
      player.tell(Text.of("[PROJECT DEADZONE] JOB選択が完了していません。").yellow())
      player.tell(
        Text.of("[ 選択画面が閉じた場合はこちらをクリック ]")
          .green()
          .clickRunCommand("/deadzonejob menu")
          .hover(Text.of("JOB選択を再開")))
    }
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneready")

  root.then(Commands.literal("status").executes(ctx => {
    dzReadyReport(ctx.source.player)
    return 1
  }))

  root.then(Commands.literal("resync_skills").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    player.runCommandSilent("deadzonejob skills_grant_test")
    player.tell(Text.of("[PROJECT DEADZONE] JOB初期スキルを再同期しました。").aqua())
    return 1
  }))

  event.register(root)
})
