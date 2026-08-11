// PROJECT DEADZONE Field Medical Kit v0.3
// The kit supplies First Aid dressings. Limb selection and healing are owned
// by First Aid, so generic healing can no longer erase locational damage.
const DZ_FIELD_KIT = "kubejs:field_medical_kit"
const DZ_FIRSTAID_DRESSING = "firstaid:bandage"
const DZ_FIELD_KIT_COOLDOWN_MS = 8000

function dzFieldKitCureInfection(target) {
  let effects = ["apocalypsenow:infection", "apocalypsenow:posinfectioneffect", "infectious:infection"]
  let cured = false
  effects.forEach(id => {
    if (target.hasEffect(id)) { target.removeEffect(id); cured = true }
  })
  return cured
}

function dzConsumeFieldKitCharge(player, stack) {
  let nextDamage = stack.damageValue + 1
  if (nextDamage >= stack.maxDamage) {
    stack.count--
    player.tell(Text.of("フィールド医療キットを使い切りました。").red())
  } else {
    stack.damageValue = nextDamage
    player.tell(Text.of("応急処置用品を取り出しました。残り " + (stack.maxDamage - nextDamage) + " 回").green())
  }
}

function dzFieldKitRemaining(player) {
  let now = Date.now()
  let last = player.persistentData.getLong("dz_field_medical_kit_last_ms")
  return { now: now, remaining: DZ_FIELD_KIT_COOLDOWN_MS - (now - last) }
}

function dzIssueDressing(healer, target, stack) {
  let cooldown = dzFieldKitRemaining(healer)
  if (cooldown.remaining > 0) {
    healer.tell(Text.of("再使用まで " + Math.ceil(cooldown.remaining / 1000) + " 秒").gray())
    return false
  }
  healer.persistentData.putLong("dz_field_medical_kit_last_ms", cooldown.now)
  target.give(DZ_FIRSTAID_DRESSING)
  target.tell(Text.of("First Aid画面で負傷部位を選び、包帯を使用してください。").aqua())
  healer.runCommandSilent("playsound minecraft:item.armor.equip_leather player @s ~ ~ ~ 0.65 1.15")
  dzConsumeFieldKitCharge(healer, stack)
  return true
}

ItemEvents.rightClicked(DZ_FIELD_KIT, event => {
  let player = event.player
  if (player.level.clientSide) return
  event.cancel()
  let infected = dzFieldKitCureInfection(player)
  if (dzIssueDressing(player, player, event.item) && infected) {
    player.tell(Text.of("感染症の治療も完了しました。").green())
  }
})

ItemEvents.entityInteracted(event => {
  let healer = event.player
  let target = event.target
  if (!healer || healer.level.clientSide || !target) return
  if (String(event.item.id) !== DZ_FIELD_KIT || String(target.type) !== "minecraft:player") return
  event.cancel()
  if (String(healer.persistentData.getString("dz_job_id")) !== "medic") {
    healer.tell(Text.of("他人への処置にはMedicの専門知識が必要です。").red())
    return
  }
  if (String(target.uuid) === String(healer.uuid)) return
  let infected = dzFieldKitCureInfection(target)
  if (!dzIssueDressing(healer, target, event.item)) return
  if (infected) healer.tell(Text.of(target.username + " の感染症も治療しました。").green())
  healer.tell(Text.of(target.username + " に応急処置用品を渡しました。").aqua())
})

ServerEvents.recipes(event => {
  event.shaped(DZ_FIELD_KIT, ["BMB", "LCL", "BMB"], {
    B: "apocalypsenow:bandage",
    M: "apocalypsenow:morphine",
    L: "minecraft:leather",
    C: "apocalypsenow:medicalkit"
  }).id("project_deadzone:field_medical_kit")
})
