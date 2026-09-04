// PROJECT DEADZONE village-rescue prologue v0.1 (local prototype)
// A rescued player obtains a damaged receiver from a villager, activates it,
// then follows the recovered Survivor Camp coordinates.

const DZ_RESCUE_RADIO_NBT = '{PDZRescueRadio:1b,display:{Name:\'{"text":"損傷したフィールド無線機","color":"gold","italic":false}\',Lore:[\'{"text":"村人が救助時に回収した携帯受信機","color":"gray","italic":false}\',\'{"text":"右クリック：残存周波数を走査","color":"aqua","italic":false}\']}}'

function dzIsRescueVillager(entity) {
  if (!entity) return false
  let id=String(entity.type)
  return id==="minecraft:villager" || id.indexOf("mca:")===0 ||
    id.indexOf("villager")>=0
}

function dzGiveRescueRadio(player) {
  if (!player || player.persistentData.getBoolean("dz_story_rescue_radio_received")) return false
  player.give(Item.of("minecraft:recovery_compass",DZ_RESCUE_RADIO_NBT))
  player.persistentData.putBoolean("dz_story_rescue_radio_received",true)
  player.tell(Text.of("[村の住民] 倒れていた君のそばに落ちていた。何かの通信機らしい。").yellow())
  player.tell(Text.of("『損傷したフィールド無線機』を右クリックして周波数を走査しよう。").aqua())
  return true
}

function dzRevealSurvivorCamp(player) {
  if (player.persistentData.getBoolean("dz_story_camp_signal_received")) return false
  let world=player.server.persistentData
  if (world.getInt("dz_auto_basecamp_state")!==2) {
    player.tell(Text.of("ノイズしか聞こえない。通信拠点の信号がまだ安定していない。").red())
    return false
  }
  let x=world.getInt("dz_auto_basecamp_origin_x")+13
  let y=world.getInt("dz_auto_basecamp_origin_y")+2
  let z=world.getInt("dz_auto_basecamp_origin_z")+20
  let dx=player.x-x, dz=player.z-z
  let distance=Math.round(Math.sqrt(dx*dx+dz*dz))
  player.persistentData.putBoolean("dz_story_camp_signal_received",true)
  player.persistentData.putInt("dz_story_camp_signal_x",x)
  player.persistentData.putInt("dz_story_camp_signal_y",y)
  player.persistentData.putInt("dz_story_camp_signal_z",z)
  player.server.runCommandSilent(
    "ftbquests change_progress "+player.username+" complete 1920AEAAF4D75E94")
  try { if (global.pdzSyncRecipeStages) global.pdzSyncRecipeStages(player) } catch (ignored) {}
  player.runCommandSilent("playsound minecraft:block.note_block.bit player @s ~ ~ ~ 1 1.25")
  player.runCommandSilent("title @s times 10 80 20")
  player.runCommandSilent('title @s subtitle {"text":"SURVIVOR CAMP / 約'+distance+'m","color":"gray"}')
  player.runCommandSilent('title @s title {"text":"通信を受信","color":"gold","bold":true}')
  player.tell(Text.of("[周波数 107.3] 生存者へ。こちらSurvivor Camp。応答可能なら合流せよ。").gold())
  player.tell(Text.of("推定座標 X "+x+" / Z "+z+"（現在地から約 "+distance+"m）").aqua())
  return true
}

ItemEvents.entityInteracted(event => {
  let player=event.player
  if (!player || player.level.clientSide || !dzIsRescueVillager(event.target)) return
  if (!player.persistentData.getBoolean("dz_onboarding_awake") ||
      !player.persistentData.getBoolean("dz_job_chosen")) return
  dzGiveRescueRadio(player)
})

ItemEvents.rightClicked("minecraft:recovery_compass",event => {
  let player=event.player
  if (!player || player.level.clientSide || !event.item.nbt ||
      !event.item.nbt.getBoolean("PDZRescueRadio")) return
  event.cancel()
  dzRevealSurvivorCamp(player)
})

PlayerEvents.loggedIn(event => {
  let player=event.player
  if (!player.persistentData.getBoolean("dz_story_camp_signal_received")) return
  let data=player.persistentData
  player.tell(Text.of("[受信済み] Survivor Camp: X "+data.getInt("dz_story_camp_signal_x")+
    " / Z "+data.getInt("dz_story_camp_signal_z")).aqua())
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  event.register(Commands.literal("deadzoneprologue")
    .then(Commands.literal("status").executes(ctx => {
      let p=ctx.source.player,d=p.persistentData
      p.tell(Text.of("=== VILLAGE RESCUE PROLOGUE ===").gold())
      p.tell(Text.of("Awake: "+d.getBoolean("dz_onboarding_awake")).gray())
      p.tell(Text.of("Radio: "+d.getBoolean("dz_story_rescue_radio_received")).gray())
      p.tell(Text.of("Signal: "+d.getBoolean("dz_story_camp_signal_received")).gray())
      p.tell(Text.of("Camp visited: "+d.getBoolean("dz_story_auto_briefing")).gray())
      return 1
    }))
    .then(Commands.literal("radio_recover").executes(ctx => dzGiveRescueRadio(ctx.source.player)?1:0)))
})
