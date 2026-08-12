// Enchanting table replacement: dismantle, imbue and reroll Affixes.
const PDZ_AFFIX_SCRAP={common:'kubejs:affix_scrap_common',uncommon:'kubejs:affix_scrap_uncommon',rare:'kubejs:affix_scrap_rare',epic:'kubejs:affix_scrap_epic',legendary:'kubejs:affix_scrap_legendary'}
const PDZ_AFFIX_COST={common:2,uncommon:3,rare:4,epic:5,legendary:6}
function pdzAffixCount(p,id){return p.runCommandSilent('clear @s '+id+' 0')}
function pdzAffixForgeMenu(p){
  p.tell(Text.of('\u2550\u2550\u2550 AFFIX WORKBENCH \u2550\u2550\u2550').gold())
  p.tell(Text.of('\u30e1\u30a4\u30f3\u30cf\u30f3\u30c9\u306b\u5bfe\u8c61\u88c5\u5099\u3092\u6301\u3063\u3066\u64cd\u4f5c\u3057\u307e\u3059\u3002').gray())
  p.tell(Text.of('[ \u89e3\u4f53 / DISMANTLE ]').red().clickRunCommand('/deadzoneaffixforge salvage').hover(Text.of('\u88c5\u5099\u3092\u7834\u68c4\u3057\u3001\u30ec\u30a2\u5ea6\u306b\u5fdc\u3058\u305fAffix\u7d20\u6750\u3092\u56de\u53ce')))
  p.tell(Text.of('[ \u518d\u62bd\u9078 / REROLL ]').aqua().clickRunCommand('/deadzoneaffixforge reroll').hover(Text.of('\u540c\u3058\u30ec\u30a2\u5ea6\u306e\u307e\u307e\u52b9\u679c\u3092\u518d\u62bd\u9078')))
  p.tell(Text.of('[ \u4ed8\u4e0e / IMBUE ]').green().clickRunCommand('/deadzoneaffixforge imbue').hover(Text.of('Affix\u306e\u306a\u3044\u88c5\u5099\u306bRare Affix\u3092\u4ed8\u4e0e')))
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
