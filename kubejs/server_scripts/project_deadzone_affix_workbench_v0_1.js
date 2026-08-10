// Enchanting table replacement: dismantle, imbue and reroll Affixes.
const PDZ_AFFIX_SCRAP={common:'kubejs:affix_scrap_common',uncommon:'kubejs:affix_scrap_uncommon',rare:'kubejs:affix_scrap_rare',epic:'kubejs:affix_scrap_epic',legendary:'kubejs:affix_scrap_legendary'}
const PDZ_AFFIX_COST={common:2,uncommon:3,rare:4,epic:5,legendary:6}
function pdzAffixCount(p,id){return p.runCommandSilent('clear @s '+id+' 0')}
function pdzAffixForgeMenu(p){
  p.tell(Text.of('=== AFFIX WORKBENCH ===').gold())
  p.tell(Text.of('[Dismantle held equipment]').red().clickRunCommand('/deadzoneaffixforge salvage'))
  p.tell(Text.of('[Reroll same rarity]').aqua().clickRunCommand('/deadzoneaffixforge reroll'))
  p.tell(Text.of('[Imbue unaffixed equipment]').green().clickRunCommand('/deadzoneaffixforge imbue'))
}
// The required client mod opens the dedicated screen. Keep the command menu
// as an emergency fallback without printing it on every table interaction.
BlockEvents.rightClicked('minecraft:enchanting_table',event=>{if(event.level.clientSide)return;event.cancel()})
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
    if(!d){p.tell(Text.of('Hold equipment with an Affix.').red());return 0}
    let q=d.getString('quality'),id=PDZ_AFFIX_SCRAP[q],cost=PDZ_AFFIX_COST[q]||2
    if(pdzAffixCount(p,id)<cost){p.tell(Text.of('Required: '+id+' x'+cost).red());return 0}
    p.runCommandSilent('clear @s '+id+' '+cost);let r=dz2Root(s,true);if(r)r.remove('PDZAffix')
    dz2Roll(s,p,q,false);dz2Announce(p,s,dz2Data(s));return 1
  }))
  root.then(Commands.literal('imbue').executes(ctx=>{
    let p=ctx.source.player,s=p.mainHandItem,id=PDZ_AFFIX_SCRAP.rare
    if(!dz2Category(s)){p.tell(Text.of('Hold supported equipment.').red());return 0}
    if(dz2Data(s)){p.tell(Text.of('This equipment already has an Affix.').yellow());return 0}
    if(pdzAffixCount(p,id)<3){p.tell(Text.of('Rare Affix Core x3 required.').red());return 0}
    p.runCommandSilent('clear @s '+id+' 3');dz2Roll(s,p,'rare',false);dz2Announce(p,s,dz2Data(s));return 1
  }))
  event.register(root)
})
ServerEvents.recipes(event=>event.shaped('minecraft:enchanting_table',[' D ','OBO','OOO'],{D:'minecraft:diamond',O:'minecraft:obsidian',B:'minecraft:book'}))
