// PROJECT DEADZONE military Curios runtime v0.2
const PDZ_CURIOS_API=Java.loadClass("top.theillusivec4.curios.api.CuriosApi")
const PDZ_BUILTIN_REG=Java.loadClass("net.minecraft.core.registries.BuiltInRegistries")
const PDZ_RL=Java.loadClass("net.minecraft.resources.ResourceLocation")

function pdzCurioEquipped(player,id) {
  try {
    let handler=PDZ_CURIOS_API.getCuriosInventory(player).resolve().orElse(null)
    if (!handler) return false
    let item=PDZ_BUILTIN_REG.ITEM.get(new PDZ_RL(id))
    return handler.isEquipped(item)
  } catch (ignored) { return false }
}

PlayerEvents.tick(event => {
  let p=event.player
  if (p.level.clientSide || p.age%20!==11) return
  if (pdzCurioEquipped(p,"kubejs:military_radio")) {
    p.persistentData.putBoolean("pdz_curio_radio",true)
  } else p.persistentData.remove("pdz_curio_radio")
  if (pdzCurioEquipped(p,"kubejs:ammunition_pouch")) {
    p.persistentData.putBoolean("pdz_curio_ammo",true)
  } else p.persistentData.remove("pdz_curio_ammo")

  if (pdzCurioEquipped(p,"kubejs:medical_pouch") && p.health<=p.maxHealth*0.25) {
    let now=p.age, ready=p.persistentData.getInt("pdz_med_pouch_ready")
    if (now>=ready) {
      p.potionEffects.add("minecraft:regeneration",100,1,true,true)
      p.persistentData.putInt("pdz_med_pouch_ready",now+1200)
      p.tell(Text.of("緊急医療ポーチ作動：次回使用まで60秒").red())
      p.runCommandSilent("playsound minecraft:item.armor.equip_leather player @s ~ ~ ~ 0.7 1.2")
    }
  }
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  event.register(Commands.literal("deadzonecurios")
    .then(Commands.literal("give_test").requires(s=>s.hasPermission(2)).executes(ctx => {
      let p=ctx.source.player
      p.give(Item.of("kubejs:military_radio"))
      p.give(Item.of("kubejs:medical_pouch"))
      p.give(Item.of("kubejs:ammunition_pouch"))
      p.tell(Text.of("軍用Curios試作品を支給しました。").green())
      return 1
    }))
    .then(Commands.literal("status").executes(ctx => {
      let p=ctx.source.player
      p.tell(Text.of("Radio="+pdzCurioEquipped(p,"kubejs:military_radio")+" Medical="+pdzCurioEquipped(p,"kubejs:medical_pouch")+" Ammo="+pdzCurioEquipped(p,"kubejs:ammunition_pouch")).aqua())
      return 1
    })))
})
