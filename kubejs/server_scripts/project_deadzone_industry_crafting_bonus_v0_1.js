// PROJECT DEADZONE industrial crafting bonuses v0.1
// Recipes are universal. Careers and former recipe talents improve efficiency.

const DZICB_MODS = [
  'create:', 'createaddition:', 'createdieselgenerators:', 'tfmg:',
  'immersiveengineering:', 'mekanism:', 'mekanismgenerators:',
  'buildinggadgets2:', 'blocky_bikes:', 'vehicle:', 'immersive_aircraft:'
]
const DZICB_COMPONENT_WORDS = [
  'sheet','plate','gear','cogwheel','shaft','rod','wire','coil','tube','casing',
  'alloy','mechanism','circuit','component','part','frame','propeller','engine',
  'wheel','tire','seat','canvas','fabric','ingot','dust'
]

function dzicbIndustrial(stack) {
  if (!stack || stack.empty) return false
  let id=String(stack.id)
  return DZICB_MODS.some(prefix=>id.indexOf(prefix)===0)
}
function dzicbComponent(stack) {
  let id=String(stack.id)
  return dzicbIndustrial(stack) && DZICB_COMPONENT_WORDS.some(word=>id.indexOf(word)>=0)
}
function dzicbCareer(player) {
  return [String(player.persistentData.getString('dz_career_t2')), String(player.persistentData.getString('dz_career_t3'))]
}
function dzicbBonusChance(player,stack) {
  let careers=dzicbCareer(player), chance=0
  if (careers.indexOf('automation')>=0 || careers.indexOf('ground_tech')>=0 || careers.indexOf('gunsmith')>=0) chance+=0.06
  if (careers.indexOf('systems_engineer')>=0 || careers.indexOf('convoy_master')>=0 || careers.indexOf('weapon_engineer')>=0) chance+=0.06
  if (careers.indexOf('industrial_architect')>=0 || careers.indexOf('armor_mechanic')>=0 || careers.indexOf('ordnance_specialist')>=0 || careers.indexOf('crew_chief')>=0) chance+=0.05
  ;['industry_1','industry_2','industry_3','fortification_1','fortification_2','fortification_3',
    'weapons_1','weapons_2','weapons_3','vehicle_1','vehicle_2','vehicle_3'].forEach(id=>{
      if(player.tags.contains('pdz_talent_node_talent_recipe_'+id))chance+=0.02
  })
  if (!dzicbComponent(stack)) chance*=0.35
  return Math.min(0.22,chance)
}

ItemEvents.crafted(event=>{
  let player=event.player, stack=event.item
  if (!player || player.level.clientSide || !dzicbIndustrial(stack)) return
  let chance=dzicbBonusChance(player,stack)
  if (chance<=0 || Math.random()>=chance) return
  let bonus=dzicbComponent(stack) ? Item.of(stack.id,1) : Item.of('create:andesite_alloy',1)
  player.give(bonus)
  player.tell(Text.of('[工業ボーナス] 追加生産: '+String(bonus.hoverName.string)+' x1').aqua())
  player.runCommandSilent('playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 0.25 1.45')
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneindustrybonus')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player, stack=p.mainHandItem
    p.tell(Text.of('工業追加生産率: '+Math.round(dzicbBonusChance(p,stack)*1000)/10+'%').aqua())
    p.tell(Text.of(dzicbIndustrial(stack)?'対象MOD / '+(dzicbComponent(stack)?'部品判定':'完成品判定'):'対象外アイテム').gray())
    return 1
  }))
  event.register(root)
})
