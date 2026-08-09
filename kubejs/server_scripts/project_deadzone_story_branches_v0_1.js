// PROJECT DEADZONE story branches v0.1
// Records optional T0-T3 discoveries without blocking the main campaign.

const DZ_BRANCH_LINES = {
  first_core:["レイ","これで周辺の巡回は減る。でも、向こうも黙ってはいないよ。"],
  raider_two:["ハンク","二つ目の拠点まで潰したか。奴らの補給線はもうボロボロだ。"],
  remnant_core:["ユイ","この端末……避難計画じゃない。誰かを観察していた記録です。"],
  elite_hunter:["マヤ","普通の兵じゃなかったね。装備に部隊章がある、追えば何か見つかるかも。"]
}

function dzBranchSay(player,key) {
  let line=DZ_BRANCH_LINES[key]
  if (!line || player.persistentData.getBoolean("dz_branch_said_"+key)) return
  player.persistentData.putBoolean("dz_branch_said_"+key,true)
  player.tell(Text.of("["+line[0]+"] ").aqua().append(Text.of(line[1]).white()))
  player.runCommandSilent("playsound minecraft:block.note_block.chime player @s ~ ~ ~ 0.45 1.1")
}

PlayerEvents.tick(event => {
  let p=event.player
  if (p.level.clientSide || p.age%100!==31) return
  if (p.persistentData.getBoolean("dz_story_branch_first_core")) dzBranchSay(p,"first_core")
  if (p.server.persistentData.getInt("dz_stronghold_raider_captured")>=2) {
    p.addTag("dz_story_branch_raider_supply_broken"); dzBranchSay(p,"raider_two")
  }
  if (p.server.persistentData.getInt("dz_stronghold_remnant_captured")>=1) {
    p.addTag("dz_story_branch_protocol_trace"); dzBranchSay(p,"remnant_core")
  }
  if (p.persistentData.getInt("dz_named_kills")>=3) {
    p.addTag("dz_story_branch_elite_hunter"); dzBranchSay(p,"elite_hunter")
  }
})

EntityEvents.death(event => {
  let e=event.entity, killer=event.source?event.source.actual:null
  if (!killer || !killer.isPlayer || !killer.isPlayer()) return
  if (e.tags && (e.tags.contains("dz_elite") || e.tags.contains("dz_sideboss")))
    killer.persistentData.putInt("dz_named_kills",killer.persistentData.getInt("dz_named_kills")+1)
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzonestorybranch")
  root.then(Commands.literal("status").executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of("=== OPTIONAL STORY ===").gold())
    ;[["最初の敵拠点を制圧","dz_story_branch_first_core",true],["Raider補給線を破壊","dz_story_branch_raider_supply_broken",false],["Protocolの痕跡","dz_story_branch_protocol_trace",false],["ネームドハンター","dz_story_branch_elite_hunter",false]].forEach(x=>{
      let done=x[2]?p.persistentData.getBoolean(x[1]):p.tags.contains(x[1])
      p.tell((done?Text.of("✓ "+x[0]).green():Text.of("・ "+x[0]).gray()))
    })
    return 1
  }))
  event.register(root)
})
