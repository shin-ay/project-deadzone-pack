// PROJECT DEADZONE regional mentors v0.1
// Realm RPG Quests owns NPC dialogue, quest generation, journal and rewards.
// PDZ only remembers which existing mentor the player met and converts the
// mod's official advancement milestones into existing JOB action XP.

const PDZ_MENTORS = {
  "realmrpg_quests:angler": {
    id:"angler", label:"釣り人", source:"fishing", discoveryQuest:"6D53010000000102"
  },
  "realmrpg_quests:cook": {
    id:"cook", label:"料理人", source:"cooking", discoveryQuest:"6D53010000000103"
  },
  "realmrpg_quests:monster_hunter": {
    id:"hunter", label:"モンスターハンター", source:"hunting", discoveryQuest:"6D53010000000104"
  }
}

const PDZ_MENTOR_QUESTS = {
  intro:"6D53010000000101",
  first:"6D53010000000105",
  ten:"6D53010000000106",
  hundred:"6D53010000000107",
  network:"6D53010000000108"
}

const PDZ_MENTOR_MILESTONES = [
  {advancement:"realmrpg_quests:complete_quest", key:"first", xp:25, label:"地域依頼 1件"},
  {advancement:"realmrpg_quests:complete_10_quests", key:"ten", xp:120, label:"地域依頼 10件"},
  {advancement:"realmrpg_quests:complete_100_quests", key:"hundred", xp:600, label:"地域依頼 100件"}
]

function pdzMentorComplete(player, questId) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + questId)
}

function pdzMentorHasAdvancement(player, advancement) {
  try {
    return player.server.runCommandSilent("execute as " + player.username + " if entity @s[advancements={" + advancement + "=true}]") > 0
  } catch (ignored) { return false }
}

function pdzMentorDiscoveryCount(player) {
  let count=0
  Object.keys(PDZ_MENTORS).forEach(type=>{
    if(player.persistentData.getBoolean("dz_regional_mentor_"+PDZ_MENTORS[type].id))count++
  })
  return count
}

function pdzMentorSource(player) {
  let source=String(player.persistentData.getString("dz_regional_mentor_source"))
  return ["fishing","cooking","hunting"].indexOf(source)>=0 ? source : "survival"
}

function pdzMentorSyncMilestones(player, notify) {
  PDZ_MENTOR_MILESTONES.forEach(milestone=>{
    let flag="dz_regional_mentor_milestone_"+milestone.key
    if(player.persistentData.getBoolean(flag)||!pdzMentorHasAdvancement(player,milestone.advancement))return
    player.persistentData.putBoolean(flag,true)
    pdzMentorComplete(player,PDZ_MENTOR_QUESTS[milestone.key])
    let source=pdzMentorSource(player), gained=0
    if(typeof global.pdzCareerAddXp==="function")gained=global.pdzCareerAddXp(player,milestone.xp,source,false)
    if(notify){
      player.tell(Text.of("[地域Mentor] "+milestone.label+"を確認。Realm RPG Questsの実績をJOB活動へ記録しました。 ").green())
      if(gained>0)player.tell(Text.of("JOB Action XP +"+gained+" ("+source+")").aqua())
    }
  })
  if(pdzMentorDiscoveryCount(player)>=3 && pdzMentorHasAdvancement(player,"realmrpg_quests:complete_10_quests")){
    let key="dz_regional_mentor_network_complete"
    if(!player.persistentData.getBoolean(key)){
      player.persistentData.putBoolean(key,true)
      pdzMentorComplete(player,PDZ_MENTOR_QUESTS.network)
      if(notify)player.tell(Text.of("[地域Mentor網] 3職種との接点と10件の地域依頼を確認しました。").gold())
    }
  }
}

ItemEvents.entityInteracted(event=>{
  let player=event.player,target=event.target
  if(!player||player.level.clientSide||!target)return
  let mentor=PDZ_MENTORS[String(target.type)]
  if(!mentor)return
  player.persistentData.putString("dz_regional_mentor_source",mentor.source)
  player.persistentData.putString("dz_regional_mentor_id",mentor.id)
  let key="dz_regional_mentor_"+mentor.id
  if(!player.persistentData.getBoolean(key)){
    player.persistentData.putBoolean(key,true)
    pdzMentorComplete(player,PDZ_MENTOR_QUESTS.intro)
    pdzMentorComplete(player,mentor.discoveryQuest)
    player.tell(Text.of("[地域Mentor] "+mentor.label+"と接触。依頼内容と報酬はRealm RPG Questsが管理します。").gold())
    player.tell(Text.of("このMentorの依頼実績は "+mentor.source+" 系JOB活動として記録されます。").gray())
  }
  pdzMentorSyncMilestones(player,true)
})

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(100,()=>pdzMentorSyncMilestones(event.player,false)))
PlayerEvents.tick(event=>{
  if(event.player.age%200===0)pdzMentorSyncMilestones(event.player,true)
})

function pdzMentorStatus(player) {
  player.tell(Text.of("=== 地域JOB Mentor ===").gold())
  Object.keys(PDZ_MENTORS).forEach(type=>{
    let mentor=PDZ_MENTORS[type],found=player.persistentData.getBoolean("dz_regional_mentor_"+mentor.id)
    player.tell(Text.of((found?"[確認済] ":"[未確認] ")+mentor.label+" / "+mentor.source)[found?"green":"gray"]())
  })
  PDZ_MENTOR_MILESTONES.forEach(m=>{
    let done=pdzMentorHasAdvancement(player,m.advancement)
    player.tell(Text.of((done?"[達成] ":"[未達成] ")+m.label)[done?"aqua":"gray"]())
  })
  player.tell(Text.of("最後に相談したMentor: "+(player.persistentData.getString("dz_regional_mentor_id")||"-")).yellow())
  return 1
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal("deadzonementor")
  root.executes(ctx=>pdzMentorStatus(ctx.source.player))
  root.then(Commands.literal("status").executes(ctx=>pdzMentorStatus(ctx.source.player)))
  root.then(Commands.literal("guide").executes(ctx=>{
    let p=ctx.source.player
    p.tell(Text.of("釣り人: realmrpg_quests:anglers / 料理人: realmrpg_quests:cooks / ハンター: realmrpg_quests:monster_hunters").aqua())
    p.tell(Text.of("/locate structure はOP向け。通常プレイでは各地の小屋を探索し、本人へ右クリックして依頼を受けます。").gray())
    return 1
  }))
  root.then(Commands.literal("sync").executes(ctx=>{pdzMentorSyncMilestones(ctx.source.player,true);return 1}))
  event.register(root)
})

console.info("[PROJECT DEADZONE][Regional Mentors] v0.1 Realm RPG advancement bridge loaded")
