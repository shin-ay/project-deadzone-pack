// PROJECT DEADZONE Field Medical Kit v0.2
// Self treatment plus Medic-only treatment of another player.
const DZ_FIELD_KIT = "kubejs:field_medical_kit"
const DZ_FIELD_KIT_COOLDOWN_MS = 8000

function dzConsumeFieldKitCharge(player, stack) {
  let nextDamage = stack.damageValue + 1
  if (nextDamage >= stack.maxDamage) {
    stack.count--
    player.tell(Text.of("フィールド医療キットを使い切りました。").red())
  } else {
    stack.damageValue = nextDamage
    player.tell(Text.of("応急処置を実施しました。残り " + (stack.maxDamage - nextDamage) + " 回").green())
  }
}

function dzFieldKitRemaining(player) {
  let now = Date.now()
  let last = player.persistentData.getLong("dz_field_medical_kit_last_ms")
  return { now: now, remaining: DZ_FIELD_KIT_COOLDOWN_MS - (now - last) }
}

ItemEvents.rightClicked(DZ_FIELD_KIT, event => {
  let player = event.player
  if (player.level.clientSide) return

  let cooldown = dzFieldKitRemaining(player)
  if (cooldown.remaining > 0) {
    player.tell(Text.of("再使用まで " + Math.ceil(cooldown.remaining / 1000) + " 秒").gray())
    event.cancel()
    return
  }
  if (player.health >= player.maxHealth) {
    player.tell(Text.of("治療が必要な負傷はありません。").gray())
    event.cancel()
    return
  }

  player.persistentData.putLong("dz_field_medical_kit_last_ms", cooldown.now)
  player.heal(4)
  player.runCommandSilent("effect give @s minecraft:regeneration 5 1 true")
  player.runCommandSilent("playsound minecraft:item.honey_bottle.drink player @s ~ ~ ~ 0.65 1.15")
  dzConsumeFieldKitCharge(player, event.item)
  event.cancel()
})

ItemEvents.entityInteracted(event => {
  let healer = event.player
  let target = event.target
  if (!healer || healer.level.clientSide || !target) return
  if (String(event.item.id) !== DZ_FIELD_KIT) return
  if (String(target.type) !== "minecraft:player") return

  event.cancel()
  if (String(healer.persistentData.getString("dz_job_id")) !== "medic") {
    healer.tell(Text.of("他者への処置にはMedicの専門知識が必要です。").red())
    return
  }
  if (String(target.uuid) === String(healer.uuid)) return

  let cooldown = dzFieldKitRemaining(healer)
  if (cooldown.remaining > 0) {
    healer.tell(Text.of("再使用まで " + Math.ceil(cooldown.remaining / 1000) + " 秒").gray())
    return
  }
  if (target.health >= target.maxHealth) {
    healer.tell(Text.of(target.username + " に治療が必要な負傷はありません。").gray())
    return
  }

  healer.persistentData.putLong("dz_field_medical_kit_last_ms", cooldown.now)
  target.heal(6)
  target.runCommandSilent("effect give @s minecraft:regeneration 5 1 true")
  target.runCommandSilent("playsound minecraft:item.honey_bottle.drink player @s ~ ~ ~ 0.65 1.15")
  healer.runCommandSilent("playsound minecraft:block.beacon.activate player @s ~ ~ ~ 0.35 1.6")
  dzConsumeFieldKitCharge(healer, event.item)
  healer.tell(Text.of(target.username + " を治療しました（6 HP＋再生）。").aqua())
  target.tell(Text.of(healer.username + " から応急処置を受けました。").green())
})

ServerEvents.recipes(event => {
  event.shaped(DZ_FIELD_KIT, [
    "BMB",
    "LCL",
    "BMB"
  ], {
    B: "apocalypsenow:bandage",
    M: "apocalypsenow:morphine",
    L: "minecraft:leather",
    C: "apocalypsenow:medicalkit"
  }).id("project_deadzone:field_medical_kit")
})
