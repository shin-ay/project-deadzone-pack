// PROJECT DEADZONE vanilla XP / enchanting policy v0.2
// Vanilla and modded enchanting remain available. Gun growth is owned by the
// gun itself, attachments, regional acquisition and Weapon Research.

function pdzXpTalentLevel(player) {
  try { return Math.max(0,Math.floor(Number(player.xpLevel))) } catch (ignored) {}
  try { return Math.max(0,Math.floor(Number(player.experienceLevel))) } catch (ignored) {}
  return 0
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonexp')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of('XP Level: '+pdzXpTalentLevel(p)+' / 自動Talent変換: 無効').aqua())
    p.tell(Text.of('通常XPはエンチャントなどへ自由に使用できます。銃の成長とは分離されています。').gray())
    return 1
  }))
  root.then(Commands.literal('sync').executes(ctx=>{
    ctx.source.player.tell(Text.of('通常XPからTalent SPへの変換は停止済みです。').yellow())
    return 1
  }))
  root.then(Commands.literal('test_add_5_levels').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player
    p.server.runCommandSilent('experience add '+p.username+' 5 levels')
    p.tell(Text.of('エンチャント動作確認用にXP Levelを5追加しました。').aqua())
    return 1
  }))
  event.register(root)
})
