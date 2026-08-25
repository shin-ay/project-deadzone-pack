// PROJECT DEADZONE story branches v1.0
// Optional faction verdicts and field records. All FTB custom tasks are completed
// by world/player state; none of these quests use manual checkmarks.

const DZ_BRANCH_QUESTS_V1 = {
  root:"314139C241ED9B9A",
  cdfIntro:"04B31ACB73EBB1E0", cdfEvidence:"55580C9689F99E71", cdfVerdict:"00C598D1293477BD",
  raiderIntro:"6A5DFB55EE777C94", raiderEvidence:"525CA3DD639DD322", raiderVerdict:"2E384287AB7F7405",
  remnantIntro:"25C5A00C63290F1A", remnantEvidence:"5C9041BB9F5E9A37", remnantVerdict:"62DD8B9D2A0737AF",
  aegisIntro:"32344A274C75F55A", aegisEvidence:"303FD0B5ECF224A4", aegisVerdict:"124545F161893D5B",
  wardenIntro:"3D4D2D59D15C7E9C", wardenEvidence:"7505254186296EBC", wardenVerdict:"66A3889869794C1D",
  finale:"1387257022A0E62C"
}

const DZ_FIELD_QUESTS_V1 = {
  gas:"178EC15EC6B0445A", gun:"0E0AB0CB658E9281", police:"7E0F5CCAD61CDBFD",
  fire:"0996C1964E2C3851", hospital:"5A92EF15FA9EBD5E", factory:"4815DFB89EE75934",
  relay:"06B5F5B7229F7687", radio:"1F88FCE58EB8B18B", military:"33682171A1BB0AF4",
  reactor:"35BE4945FDF5FD50", argus:"1BE007B79FDAEB4B", choir:"31CA39E7151ACCF5"
}

const DZ_BRANCH_LINES = {
  first_core:["レイ","これで周辺の巡回は減る。でも、向こうも黙ってはいないよ。"],
  raider_two:["ハンク","二つ目の拠点まで潰したか。奴らの補給線はもうボロボロだ。"],
  remnant_core:["ユイ","この端末……避難計画じゃない。誰かを観察していた記録です。"],
  elite_hunter:["マヤ","普通の兵じゃなかったね。装備に部隊章がある、追えば何か見つかるかも。"],
  all_verdicts:["レイ","正解はなかった。でも、私たちが選んだ結果から逃げることもできない。ここからが再建だよ。"]
}

const DZ_BRANCH_CHOICES_V1 = {
  cdf_order:{group:"cdf", label:"CDFの統一指揮を支持", color:"blue"},
  cdf_coalition:{group:"cdf", label:"イネスの現場連合を支持", color:"aqua"},
  raider_break:{group:"raider", label:"Jackals物流網を解体", color:"red"},
  raider_truce:{group:"raider", label:"ルーク派と限定停戦", color:"gold"},
  remnant_defect:{group:"remnant", label:"ナディアの離反を支援", color:"green"},
  remnant_decommission:{group:"remnant", label:"軍用司令網を廃棄", color:"gray"},
  aegis_release:{group:"aegis", label:"治療データを公開", color:"green"},
  aegis_burn:{group:"aegis", label:"兵器化可能な記録を焼却", color:"dark_red"}
}

function dzBranchSay(player,key) {
  let line=DZ_BRANCH_LINES[key]
  if (!line || player.persistentData.getBoolean("dz_branch_said_"+key)) return
  player.persistentData.putBoolean("dz_branch_said_"+key,true)
  player.tell(Text.of("["+line[0]+"] ").aqua().append(Text.of(line[1]).white()))
  player.runCommandSilent("playsound minecraft:block.note_block.chime player @s ~ ~ ~ 0.45 1.1")
}

function dzBranchComplete(player,key,questId) {
  // v2 replays milestones that previously targeted the retired A/B-series
  // placeholder quest IDs.
  let flag="dz_branch_quest_v2_"+key
  if (player.persistentData.getBoolean(flag)) return true
  let result=player.server.runCommandSilent("ftbquests change_progress "+player.username+" complete "+questId)
  if (result>0) {
    player.persistentData.putBoolean(flag,true)
    console.info("[DEADZONE STORY] Branch quest "+key+" completed for "+player.username)
    return true
  }
  return false
}

function dzBranchMainDone(player,key) {
  return player.persistentData.getBoolean("dz_story_auto_v3_"+key)
}

function dzBranchBossDone(server,key) {
  return server.persistentData.getBoolean("dz_story_boss_complete_"+key)
}

function dzBranchOutcome(player,group) {
  return player.persistentData.getString("dz_branch_choice_"+group)
}

function dzBranchAllVerdicts(player) {
  return dzBranchOutcome(player,"cdf")!=="" && dzBranchOutcome(player,"raider")!==""
    && dzBranchOutcome(player,"remnant")!=="" && dzBranchOutcome(player,"aegis")!==""
    && player.server.persistentData.getString("dz_story_argus_outcome")!==""
}

function dzBranchPrompt(player,group,force) {
  if (dzBranchOutcome(player,group)!=="") return false
  if (!player.persistentData.getBoolean("dz_branch_quest_v2_"+group+"_evidence")) return false
  let shown="dz_branch_commandless_prompt_v1_"+group
  if (!force && player.persistentData.getBoolean(shown)) return false
  player.persistentData.putBoolean(shown,true)
  let headings={cdf:"CDFの進路",raider:"Jackalsへの回答",remnant:"Remnantの未来",aegis:"AEGISデータの扱い"}
  player.tell(Text.of("=== "+headings[group]+" ===").gold())
  Object.keys(DZ_BRANCH_CHOICES_V1).forEach(key=>{
    let data=DZ_BRANCH_CHOICES_V1[key]
    if(data.group!==group)return
    player.tell(Text.of("[ "+data.label+" ]")[data.color]()
      .clickRunCommand("/deadzonestorybranch choose "+key)
      .hover(Text.of("この判断は確定後に変更できません")))
  })
  player.tell(Text.of("選択肢をクリックしてください。文字入力は不要です。").gray())
  return true
}

PlayerEvents.tick(event => {
  let p=event.player, s=p.server
  if (p.level.clientSide || p.age%100!==31) return

  if (p.persistentData.getBoolean("dz_story_branch_first_core")) dzBranchSay(p,"first_core")
  if (s.persistentData.getInt("dz_stronghold_raider_captured")>=2) {
    p.addTag("dz_story_branch_raider_supply_broken"); dzBranchSay(p,"raider_two")
  }
  if (s.persistentData.getInt("dz_stronghold_remnant_captured")>=1) {
    p.addTag("dz_story_branch_protocol_trace"); dzBranchSay(p,"remnant_core")
  }
  if (p.persistentData.getInt("dz_named_kills")>=3) {
    p.addTag("dz_story_branch_elite_hunter"); dzBranchSay(p,"elite_hunter")
  }

  // Faction storylines
  if (dzBranchBossDone(s,"policestation")) {
    dzBranchComplete(p,"root",DZ_BRANCH_QUESTS_V1.root)
    dzBranchComplete(p,"cdf_intro",DZ_BRANCH_QUESTS_V1.cdfIntro)
  }
  if (dzBranchBossDone(s,"policestation") && dzBranchBossDone(s,"firestation"))
    dzBranchComplete(p,"cdf_evidence",DZ_BRANCH_QUESTS_V1.cdfEvidence)
  if (dzBranchOutcome(p,"cdf")!=="") dzBranchComplete(p,"cdf_verdict",DZ_BRANCH_QUESTS_V1.cdfVerdict)

  if (s.persistentData.getInt("dz_stronghold_raider_captured")>=2)
    dzBranchComplete(p,"raider_intro",DZ_BRANCH_QUESTS_V1.raiderIntro)
  if (s.persistentData.getInt("dz_stronghold_raider_captured")>=2 && p.persistentData.getInt("dz_named_kills")>=3)
    dzBranchComplete(p,"raider_evidence",DZ_BRANCH_QUESTS_V1.raiderEvidence)
  if (dzBranchOutcome(p,"raider")!=="") dzBranchComplete(p,"raider_verdict",DZ_BRANCH_QUESTS_V1.raiderVerdict)

  if (s.persistentData.getInt("dz_stronghold_remnant_captured")>=1)
    dzBranchComplete(p,"remnant_intro",DZ_BRANCH_QUESTS_V1.remnantIntro)
  if (s.persistentData.getInt("dz_stronghold_remnant_captured")>=1 && dzBranchMainDone(p,"t2_relay_arrival"))
    dzBranchComplete(p,"remnant_evidence",DZ_BRANCH_QUESTS_V1.remnantEvidence)
  if (dzBranchOutcome(p,"remnant")!=="") dzBranchComplete(p,"remnant_verdict",DZ_BRANCH_QUESTS_V1.remnantVerdict)

  if (dzBranchMainDone(p,"t2_aegis_record"))
    dzBranchComplete(p,"aegis_intro",DZ_BRANCH_QUESTS_V1.aegisIntro)
  if (dzBranchBossDone(s,"reactor_saint"))
    dzBranchComplete(p,"aegis_evidence",DZ_BRANCH_QUESTS_V1.aegisEvidence)
  if (dzBranchOutcome(p,"aegis")!=="") dzBranchComplete(p,"aegis_verdict",DZ_BRANCH_QUESTS_V1.aegisVerdict)

  if (p.persistentData.getInt("dz_story_warden_core_count")>=3)
    dzBranchComplete(p,"warden_intro",DZ_BRANCH_QUESTS_V1.wardenIntro)
  if (dzBranchBossDone(s,"argus_fragment") && dzBranchBossDone(s,"choir_vessel"))
    dzBranchComplete(p,"warden_evidence",DZ_BRANCH_QUESTS_V1.wardenEvidence)
  if (s.persistentData.getString("dz_story_argus_outcome")!=="")
    dzBranchComplete(p,"warden_verdict",DZ_BRANCH_QUESTS_V1.wardenVerdict)
  if (dzBranchAllVerdicts(p)) {
    if (dzBranchComplete(p,"finale",DZ_BRANCH_QUESTS_V1.finale)) dzBranchSay(p,"all_verdicts")
  }

  ;["cdf","raider","remnant","aegis"].forEach(group=>dzBranchPrompt(p,group,false))

  // Environmental records: the lore card completes when its real facility/boss milestone is met.
  if (dzBranchBossDone(s,"gasstation")) dzBranchComplete(p,"field_gas",DZ_FIELD_QUESTS_V1.gas)
  if (dzBranchBossDone(s,"gunshop")) dzBranchComplete(p,"field_gun",DZ_FIELD_QUESTS_V1.gun)
  if (dzBranchBossDone(s,"policestation")) dzBranchComplete(p,"field_police",DZ_FIELD_QUESTS_V1.police)
  if (dzBranchBossDone(s,"firestation")) dzBranchComplete(p,"field_fire",DZ_FIELD_QUESTS_V1.fire)
  if (dzBranchBossDone(s,"hospital")) dzBranchComplete(p,"field_hospital",DZ_FIELD_QUESTS_V1.hospital)
  if (dzBranchMainDone(p,"t2_relay_arrival")) dzBranchComplete(p,"field_factory",DZ_FIELD_QUESTS_V1.factory)
  if (dzBranchMainDone(p,"t2_relay_capture")) dzBranchComplete(p,"field_relay",DZ_FIELD_QUESTS_V1.relay)
  if (dzBranchBossDone(s,"radio_tower")) dzBranchComplete(p,"field_radio",DZ_FIELD_QUESTS_V1.radio)
  if (dzBranchMainDone(p,"t3_military")) dzBranchComplete(p,"field_military",DZ_FIELD_QUESTS_V1.military)
  if (dzBranchBossDone(s,"reactor_saint")) dzBranchComplete(p,"field_reactor",DZ_FIELD_QUESTS_V1.reactor)
  if (dzBranchBossDone(s,"argus_fragment")) dzBranchComplete(p,"field_argus",DZ_FIELD_QUESTS_V1.argus)
  if (dzBranchBossDone(s,"choir_vessel")) dzBranchComplete(p,"field_choir",DZ_FIELD_QUESTS_V1.choir)
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
    p.tell(Text.of("=== OPTIONAL STORY / FACTION VERDICTS ===").gold())
    ;[["CDF","cdf"],["Raiders","raider"],["Remnant","remnant"],["AEGIS","aegis"]].forEach(x=>{
      let value=dzBranchOutcome(p,x[1])
      p.tell(value?Text.of("✓ "+x[0]+": "+value).green():Text.of("・"+x[0]+": 未決定").gray())
    })
    let argus=p.server.persistentData.getString("dz_story_argus_outcome")
    p.tell(argus?Text.of("✓ WARDEN: "+argus).green():Text.of("・WARDEN: 未決定").gray())
    ;["cdf","raider","remnant","aegis"].forEach(group=>dzBranchPrompt(p,group,true))
    return 1
  }))
  let choose=Commands.literal("choose").executes(ctx=>{
    ctx.source.player.tell(Text.of("Base Coreの『勢力判断』を開き、表示された選択肢をクリックしてください。").yellow())
    return 0
  })
  Object.keys(DZ_BRANCH_CHOICES_V1).forEach(key=>{
    choose.then(Commands.literal(key).executes(ctx=>{
      let p=ctx.source.player, data=DZ_BRANCH_CHOICES_V1[key], old=dzBranchOutcome(p,data.group)
      if (!p.persistentData.getBoolean("dz_branch_quest_v2_"+data.group+"_evidence")) {
        p.tell(Text.of("判断に必要な証拠がまだ揃っていません。勢力クエストを進めてください。").red())
        return 0
      }
      if (old!=="") {
        p.tell(Text.of("この勢力への回答は既に確定しています: "+old).red())
        return 0
      }
      p.persistentData.putString("dz_branch_choice_"+data.group,key)
      p.addTag("dz_branch_choice_"+key)
      p.tell(Text.of("[勢力判断] ").gold().append(Text.of(data.label)[data.color]()))
      p.runCommandSilent("playsound minecraft:block.beacon.activate player @s ~ ~ ~ 0.7 1.0")
      if(global.pdzStoryChoiceEffect)global.pdzStoryChoiceEffect(p,key)
      return 1
    }))
  })
  root.then(choose)
  event.register(root)
})
