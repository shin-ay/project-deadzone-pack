// PROJECT DEADZONE equipment requirement tooltip v0.2
// Dynamic tooltip keeps all third-party mod equipment consistent with native
// Mine and Slash gear without rewriting the mod's own tooltip implementation.

const PDZ_REQ_TOOLTIP_NAMES={strength:'\u5f37\u976d',dexterity:'\u6280\u91cf',intelligence:'\u89e3\u6790'}

ItemEvents.tooltip(event=>{
  event.addAdvanced(Ingredient.all,(stack,advanced,text)=>{
    let root=null
    try{root=stack.nbt}catch(ignored){}
    if(!root||!root.contains('PDZMnsRequiredLevel'))return
    let level=root.getInt('PDZMnsRequiredLevel')
    let stat=root.contains('PDZMnsRequiredStat')?String(root.getString('PDZMnsRequiredStat')):''
    let amount=root.contains('PDZMnsRequiredStatAmount')?root.getInt('PDZMnsRequiredStatAmount'):0
    text.add(1,Text.of('M&S Lv '+level+' \u5fc5\u8981').yellow())
    if(stat&&amount>0)text.add(2,Text.of('\u6700\u4f4e '+(PDZ_REQ_TOOLTIP_NAMES[stat]||stat)+': '+amount).green())
  })
})
