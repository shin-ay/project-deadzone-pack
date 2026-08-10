// PROJECT DEADZONE enchantment retirement and equipment-mastery XP reservation v0.1
// Talent SP comes from JOB levels and action proficiency, not vanilla XP.

const PDZ_XPT_HIGHWATER = 'pdz_talent_xp_highwater_level_v1'
const PDZ_XPT_INITIALIZED = 'pdz_talent_xp_initialized_v1'
const PDZ_XPT_BLOCKED_STATIONS = [
  'minecraft:grindstone'
]

function pdzXpTalentLevel(player) {
  try { return Math.max(0,Math.floor(Number(player.xpLevel))) } catch (ignored) {}
  try { return Math.max(0,Math.floor(Number(player.experienceLevel))) } catch (ignored) {}
  return 0
}

function pdzXpTalentSync(player,announce) {
  let d=player.persistentData
  let current=pdzXpTalentLevel(player)
  let high=d.getInt(PDZ_XPT_HIGHWATER)
  if (!d.getBoolean(PDZ_XPT_INITIALIZED)) { d.putBoolean(PDZ_XPT_INITIALIZED,true); high=0 }
  if (current<=high) return 0
  let gained=Math.min(256,current-high)
  player.server.runCommandSilent('skilltree points add '+player.username+' '+gained)
  d.putInt(PDZ_XPT_HIGHWATER,high+gained)
  if (announce) {
    player.tell(Text.of('[Talent] XP Level '+(high+gained)+' 到達 / Talent SP +'+gained).gold())
    player.tell(Text.of('Talent SPは通常経験値のみから獲得します。JOB・行動XPは昇格用です。').gray())
  }
  return gained
}

PlayerEvents.tick(event=>{
  let p=event.player
  if (p.level.clientSide || p.age%20!==7) return
  // Items outside the Affix categories (books, fishing rods and unusual mod
  // equipment) must not retain a second vanilla enhancement system.
  let inv=p.getInventory(), stripped=false
  for (let slot=0;slot<inv.getContainerSize();slot++) {
    let stack=inv.getItem(slot)
    if (!stack || stack.empty) continue
    try {
      let root=typeof stack.getTag==='function'?stack.getTag():stack.nbt
      if (!root) continue
      if (root.contains('Enchantments') || root.contains('StoredEnchantments')) {
        root.remove('Enchantments');root.remove('StoredEnchantments');root.remove('RepairCost');stripped=true
      }
    } catch (ignored) {}
  }
  if (stripped) {
    inv.setChanged()
    p.tell(Text.of('[Affix] 旧エンチャントをPROJECT DEADZONE Affixへ移行しました。').yellow())
  }
})

BlockEvents.rightClicked(event=>{
  if (event.player.level.clientSide || PDZ_XPT_BLOCKED_STATIONS.indexOf(String(event.block.id))<0) return
  event.cancel()
  event.player.tell(Text.of('[PROJECT DEADZONE] エンチャントはAffixへ統合されています。').yellow())
  event.player.tell(Text.of('XPはTalent成長に使用し、修理は携帯修理または工業担当NPCを利用します。').gray())
})

ServerEvents.recipes(event=>PDZ_XPT_BLOCKED_STATIONS.forEach(id=>event.remove({output:id})))

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonexp')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of('XP Level: '+pdzXpTalentLevel(p)+' / Talent SP変換: 無効').aqua())
    p.tell(Text.of('通常XPは装備熟練度システム用に予約されています。').gray())
    return 1
  }))
  root.then(Commands.literal('sync').executes(ctx=>{
    ctx.source.player.tell(Text.of('通常XPからTalent SPへの変換は停止済みです。').yellow())
    return 1
  }))
  root.then(Commands.literal('test_add_5_levels').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player
    p.server.runCommandSilent('experience add '+p.username+' 5 levels')
    p.tell(Text.of('装備熟練度テスト用にXP Levelを5追加しました。').aqua())
    return 1
  }))
  event.register(root)
})
