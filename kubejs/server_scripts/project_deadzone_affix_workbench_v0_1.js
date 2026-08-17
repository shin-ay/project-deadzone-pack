// Legacy PDZ Affix workbench.
// New equipment is managed exclusively by Mine & Slash.  Salvage remains
// available only to dispose of old PDZAffix test items during migration.
const PDZ_LEGACY_AFFIX_FORGE_ENABLED=false
const PDZ_AFFIX_SCRAP={common:'kubejs:affix_scrap_common',uncommon:'kubejs:affix_scrap_uncommon',rare:'kubejs:affix_scrap_rare',epic:'kubejs:affix_scrap_epic',legendary:'kubejs:affix_scrap_legendary'}
const PDZ_AFFIX_COST={common:2,uncommon:3,rare:4,epic:5,legendary:6}
function pdzAffixCount(p,id){return p.runCommandSilent('clear @s '+id+' 0')}
function pdzAffixForgeMenu(p){
  p.tell(Text.of('\u2550\u2550\u2550 旧PDZ AFFIX 移行窓口 \u2550\u2550\u2550').gold())
  p.tell(Text.of('新規装備のAffix・解体・再抽選はMine & Slashへ統一されました。').gray())
  p.tell(Text.of('[ 旧装備を解体 / LEGACY DISMANTLE ]').red().clickRunCommand('/deadzoneaffixforge salvage').hover(Text.of('PDZAffixが残る旧テスト装備のみ解体します')))
}

BlockEvents.rightClicked('kubejs:affix_workbench', event => {
  let p=event.player
  if(!p || p.level.clientSide) return
  pdzAffixForgeMenu(p)
  p.runCommandSilent('playsound minecraft:block.smithing_table.use player @s ~ ~ ~ 0.7 0.9')
  event.server.runCommandSilent('particle minecraft:electric_spark '+event.block.x+' '+(event.block.y+1)+' '+event.block.z+' 0.35 0.2 0.35 0.02 10 force '+p.username)
  event.cancel()
})
// Vanilla enchanting coexists with Affixes. The enchanting table is no longer
// intercepted; Affix crafting remains available through its dedicated UI/menu.
ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event;let root=Commands.literal('deadzoneaffixforge')
  root.then(Commands.literal('menu').executes(ctx=>{pdzAffixForgeMenu(ctx.source.player);return 1}))
  root.then(Commands.literal('salvage').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem,d=dz2Data(s)
    if(!d){p.tell(Text.of('Hold equipment with an Affix.').red());return 0}
    let q=d.getString('quality'),id=PDZ_AFFIX_SCRAP[q]||PDZ_AFFIX_SCRAP.common
    let amount={common:1,uncommon:2,rare:3,epic:5,legendary:8}[q]||1
    s.count--;p.give(Item.of(id,amount));p.tell(Text.of('Dismantled '+q+': material x'+amount).gold());return 1
  }))
  root.then(Commands.literal('reroll').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem,d=dz2Data(s)
    if(!PDZ_LEGACY_AFFIX_FORGE_ENABLED){p.tell(Text.of('旧PDZ Affixの再抽選は停止しました。Mine & Slash設備を使用してください。').yellow());return 0}
    if(!d){p.tell(Text.of('Hold equipment with an Affix.').red());return 0}
    let q=d.getString('quality'),id=PDZ_AFFIX_SCRAP[q],cost=PDZ_AFFIX_COST[q]||2
    if(pdzAffixCount(p,id)<cost){p.tell(Text.of('Required: '+id+' x'+cost).red());return 0}
    p.runCommandSilent('clear @s '+id+' '+cost);let r=dz2Root(s,true);if(r)r.remove('PDZAffix')
    dz2Roll(s,p,q,false);dz2Announce(p,s,dz2Data(s));return 1
  }))
  root.then(Commands.literal('imbue').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem,id=PDZ_AFFIX_SCRAP.rare
    if(!PDZ_LEGACY_AFFIX_FORGE_ENABLED){p.tell(Text.of('旧PDZ Affixの新規付与は停止しました。Mine & Slash設備を使用してください。').yellow());return 0}
    if(!dz2Category(s)){p.tell(Text.of('Hold supported equipment.').red());return 0}
    if(dz2Data(s)){p.tell(Text.of('This equipment already has an Affix.').yellow());return 0}
    if(pdzAffixCount(p,id)<3){p.tell(Text.of('Rare Affix Core x3 required.').red());return 0}
    p.runCommandSilent('clear @s '+id+' 3');dz2Roll(s,p,'rare',false);dz2Announce(p,s,dz2Data(s));return 1
  }))
  event.register(root)
})
ServerEvents.recipes(event=>{
  event.shaped('kubejs:affix_workbench',[
    'CRC',
    'PSP',
    'IBI'
  ],{
    C:'kubejs:affix_scrap_common',
    R:'kubejs:affix_scrap_rare',
    P:'#forge:plates/iron',
    S:'minecraft:smithing_table',
    I:'#forge:ingots/iron',
    B:'minecraft:blast_furnace'
  }).id('project_deadzone:affix_workbench')
})
