// PROJECT DEADZONE repair system v0.2
// Only Damage is mutated. TaCZ attachment/magazine and custom equipment NBT
// remain on the original ItemStack.

const DZ_REPAIR_STEEL="immersiveengineering:component_steel"

function dzRepairQualified(player) {
  return Boolean(global.pdzHasQualification && global.pdzHasQualification(player,"maintenance"))
}

function dzRepairFieldRatio(player) {
  return dzRepairQualified(player) ? 0.40 : 0.25
}

function dzRepairTargetValid(stack) {
  if (!stack || stack.isEmpty() || !stack.isDamageableItem()) return false
  try {
    let root=stack.nbt
    if (root && root.Unbreakable) return false
  } catch (ignored) {}
  return Number(stack.damageValue)>0
}

function dzRepairCosts(player,stack) {
  let ratio=Number(stack.damageValue)/Math.max(1,Number(stack.maxDamage))
  let money=Math.max(1,Math.ceil(ratio*8))
  let steel=Math.max(1,Math.ceil(ratio*2))
  let qualified=dzRepairQualified(player)
  if (qualified) {
    money=Math.max(1,Math.ceil(money*0.75))
    steel=Math.max(1,Math.ceil(steel*0.75))
  }
  return {money:money,steel:steel,ratio:ratio,qualified:qualified}
}

function dzRepairCount(player,item) {
  return Number(player.runCommandSilent("clear @s "+item+" 0"))
}

function dzRepairDescribeBonus(player) {
  if (dzRepairQualified(player)) return "整備資格: 通貨-25% / 素材-25% / 野戦修理40%"
  return "未資格: 野戦修理25% / 完全修理は利用不可"
}

function dzRepairTellQuote(player,stack) {
  if (!dzRepairTargetValid(stack)) {
    player.tell(Text.of("損傷した装備をメインハンドに持ってください。").yellow())
    return false
  }
  let c=dzRepairCosts(player,stack)
  player.tell(Text.of("=== 工業整備・完全修理 ===").gold())
  player.tell(Text.of(String(stack.hoverName.string)+" / 損傷 "+Number(stack.damageValue)+" / "+Number(stack.maxDamage)).white())
  player.tell(Text.of("必要: Credit x"+c.money+" / Steel Component x"+c.steel).aqua())
  player.tell(Text.of(dzRepairDescribeBonus(player)).green())
  return true
}

ItemEvents.rightClicked("kubejs:field_repair_kit", event => {
  let player=event.player
  if (!player || player.level.clientSide) return
  let target=player.offHandItem
  if (!dzRepairTargetValid(target)) {
    player.tell(Text.of("損傷した装備をオフハンドに持ってください。").yellow())
    return
  }
  let before=Number(target.damageValue)
  let ratio=dzRepairFieldRatio(player)
  let amount=Math.max(1,Math.floor(Number(target.maxDamage)*ratio))
  let repaired=Math.min(before,amount)
  target.damageValue=Math.max(0,before-amount)
  event.item.shrink(1)
  player.getInventory().setChanged()
  player.tell(Text.of("野戦修理完了: 耐久 +"+repaired+" ("+Math.round(ratio*100)+"%)").green())
  player.tell(Text.of("装備の付属データを維持しました。").gray())
  player.runCommandSilent("playsound minecraft:block.anvil.use player @s ~ ~ ~ 0.45 1.25")
})

ServerEvents.recipes(event => {
  event.shapeless("kubejs:field_repair_kit", [
    DZ_REPAIR_STEEL,
    "immersiveengineering:hemp_fabric",
    "immersiveengineering:wirecoil_copper"
  ]).id("project_deadzone:field_repair_kit")
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzonerepair")

  root.then(Commands.literal("quote").executes(ctx => {
    let p=ctx.source.player
    return dzRepairTellQuote(p,p.mainHandItem) ? 1 : 0
  }))

  // Easy NPC can call this command as the interacting player. It presents the
  // current quote and a click-to-confirm repair action.
  root.then(Commands.literal("service").executes(ctx => {
    let p=ctx.source.player
    if (!dzRepairTellQuote(p,p.mainHandItem)) return 0
    p.runCommandSilent('tellraw @s {"text":"[ 完全修理を依頼する ]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/deadzonerepair full"},"hoverEvent":{"action":"show_text","contents":{"text":"通貨と素材を消費して完全修理します","color":"yellow"}}}')
    return 1
  }))

  root.then(Commands.literal("full").executes(ctx => {
    let p=ctx.source.player, stack=p.mainHandItem
    if (!dzRepairQualified(p)) {
      p.tell(Text.of("完全修理には整備資格が必要です。").red())
      return 0
    }
    if (!dzRepairTargetValid(stack)) {
      p.tell(Text.of("損傷した装備をメインハンドに持ってください。").yellow())
      return 0
    }
    let c=dzRepairCosts(p,stack)
    let moneyCount=global.pdzCreditBalance(p)
    let steelCount=dzRepairCount(p,DZ_REPAIR_STEEL)
    if (moneyCount<c.money || steelCount<c.steel) {
      p.tell(Text.of("完全修理には Credit x"+c.money+" / Steel Component x"+c.steel+" が必要です。").red())
      p.tell(Text.of("所持: Credit x"+moneyCount+" / Steel Component x"+steelCount).gray())
      return 0
    }
    let repaired=Number(stack.damageValue)
    if (!global.pdzCreditTake(p,c.money)) return 0
    p.runCommandSilent("clear @s "+DZ_REPAIR_STEEL+" "+c.steel)
    stack.damageValue=0
    p.getInventory().setChanged()
    p.tell(Text.of("工業整備完了: 耐久 +"+repaired).green())
    p.tell(Text.of("装備の付属データを維持しました。").aqua())
    p.runCommandSilent("playsound minecraft:block.anvil.use player @s ~ ~ ~ 0.7 0.9")
    return 1
  }))

  root.then(Commands.literal("give_test").requires(s=>s.hasPermission(2)).executes(ctx => {
    ctx.source.player.give(Item.of("kubejs:field_repair_kit",4))
    ctx.source.player.tell(Text.of("野戦修理キットを4個支給しました。").green())
    return 1
  }))

  // Cheap emergency supply sold by the industrial/parts NPC. Easy NPC may
  // execute this as the interacting player without granting operator rights.
  root.then(Commands.literal("buy_kit").executes(ctx => {
    let p=ctx.source.player
    let price=2
    let money=global.pdzCreditBalance(p)
    if(money<price){p.tell(Text.of("修理キットは Credit x"+price+" です。所持 x"+money).red());return 0}
    if (!global.pdzCreditTake(p,price)) return 0
    p.give(Item.of("kubejs:field_repair_kit",1))
    p.tell(Text.of("工具・工業部品担当から携帯修理キットを購入しました。").green())
    return 1
  }))

  root.then(Commands.literal("damage_test").requires(s=>s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player,stack=p.mainHandItem
    if (!stack || stack.isEmpty() || !stack.isDamageableItem()) {
      p.tell(Text.of("耐久値を持つ装備をメインハンドに持ってください。").yellow())
      return 0
    }
    stack.damageValue=Math.max(1,Math.floor(Number(stack.maxDamage)*0.60))
    p.getInventory().setChanged()
    p.tell(Text.of("修理テスト用に耐久を60%損傷させました。").gold())
    return 1
  }))

  event.register(root)
})
