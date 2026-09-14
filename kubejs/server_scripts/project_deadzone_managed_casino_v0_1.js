// PROJECT DEADZONE managed casino v0.2
//
// Lightman's Currency already supplies the slot machine and its item-prize
// implementation. PDZ only owns one explicit admin preset. Player-owned slot
// machines are never scanned or rewritten.

const DZ_CASINO_BLOCK_POS = Java.loadClass('net.minecraft.core.BlockPos')
const DZ_CASINO_ITEM_STACK = Java.loadClass('net.minecraft.world.item.ItemStack')
const DZ_CASINO_RESOURCE_LOCATION = Java.loadClass('net.minecraft.resources.ResourceLocation')
const DZ_CASINO_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')

const DZ_CASINO_CARD_NBT = 'PDZCasinoSetupCard'
const DZ_CASINO_PRESETS = {
  daily: {
    name:'PDZ サバイバルスロット',
    price:2,
    prizes:[
      {items:[{item:'lightmanscurrency:coin_copper', count:1}], odds:25.0, label:'1 Credit'},
      {items:[{item:'lightmanscurrency:coin_copper', count:2}], odds:15.0, label:'2 Credit'},
      {items:[{item:'lightmanscurrency:coin_copper', count:4}], odds:5.0, label:'4 Credit'},
      {items:[{item:'minecraft:bread', count:4}], odds:12.0, label:'携帯食'},
      {items:[{item:'survival_instinct:gallon_of_water', count:1}], odds:10.0, label:'飲料水'},
      {items:[{item:'minecraft:torch', count:16}], odds:8.0, label:'松明セット'},
      {items:[{item:'apocalypsenow:bandage', count:2}], odds:5.0, label:'包帯セット'},
      {items:[{item:'survival_instinct:rope', count:2}], odds:3.0, label:'ロープ'},
      {items:[{item:'kubejs:field_repair_kit', count:1}], odds:1.0, label:'野戦修理キット'}
    ]
  },
  high: {
    name:'PDZ ハイローラースロット',
    price:20,
    prizes:[
      {items:[{item:'lightmanscurrency:coin_copper', count:5}], odds:15.0, label:'5 Credit'},
      {items:[{item:'lightmanscurrency:coin_copper', count:15}], odds:10.0, label:'15 Credit'},
      {items:[{item:'lightmanscurrency:coin_copper', count:40}], odds:3.0, label:'40 Credit'},
      {items:[{item:'minecraft:iron_ingot', count:8}], odds:12.0, label:'鉄インゴット x8'},
      {items:[{item:'immersiveengineering:ingot_steel', count:4}], odds:7.0, label:'鋼鉄インゴット x4'},
      {items:[{item:'minecraft:copper_ingot', count:16}], odds:8.0, label:'銅インゴット x16'},
      {items:[{item:'tacz:ammo', count:48, tag:{AmmoId:'tacz:9mm'}}], odds:8.0, label:'9mm弾 x48'},
      {items:[{item:'tacz:ammo', count:40, tag:{AmmoId:'tacz:556x45'}}], odds:6.0, label:'5.56mm弾 x40'},
      {items:[{item:'tacz:ammo', count:24, tag:{AmmoId:'tacz:12g'}}], odds:3.0, label:'12ゲージ弾 x24'},
      {items:[{item:'kubejs:field_repair_kit', count:2}], odds:4.0, label:'野戦修理キット x2'},
      {items:[{item:'minecraft:diamond', count:2}], odds:2.0, label:'ダイヤモンド x2'},
      {items:[
        {item:'tacz:modern_kinetic_gun', count:1, tag:{GunFireMode:'AUTO', GunId:'tacz:m4a1', HasBulletInBarrel:true}},
        {item:'tacz:ammo', count:60, tag:{AmmoId:'tacz:556x45'}}
      ], odds:0.5, label:'特賞 M4A1＋5.56mm弾'},
      {items:[{item:'apocalypsenow:juggernaut_chestplate', count:1}], odds:0.3, label:'特賞 ジャガーノート装甲'},
      {items:[
        {item:'apocalypsenow:juggernaut_helmet', count:1},
        {item:'apocalypsenow:juggernaut_chestplate', count:1},
        {item:'apocalypsenow:juggernaut_leggings', count:1},
        {item:'apocalypsenow:juggernaut_boots', count:1}
      ], odds:0.1, label:'大特賞 ジャガーノート一式'}
    ]
  }
}

function dzCasinoNativeStack(spec) {
  let item = DZ_CASINO_FORGE_REGISTRIES.ITEMS.getValue(new DZ_CASINO_RESOURCE_LOCATION(String(spec.item)))
  if (!item) return DZ_CASINO_ITEM_STACK.EMPTY
  let stack = new DZ_CASINO_ITEM_STACK(item, Math.max(1, Math.floor(Number(spec.count) || 1)))
  if (spec.tag) {
    let tag = stack.getOrCreateTag()
    Object.keys(spec.tag).forEach(key => {
      let value = spec.tag[key]
      if (typeof value === 'boolean') tag.putBoolean(key, value)
      else if (typeof value === 'number') tag.putInt(key, Math.floor(value))
      else tag.putString(key, String(value))
    })
  }
  return stack
}

function dzCasinoIsAdmin(player) {
  return String(player.username).toLowerCase() === 'natsumamire' || player.hasPermissions(2)
}

function dzCasinoCard(presetKey) {
  if (presetKey === 'daily') return Item.of('minecraft:paper', '{PDZCasinoSetupCard:1b,PDZCasinoPreset:"daily",display:{Name:\'{"text":"PDZ Survival Slot Setup Card","color":"aqua","italic":false}\',Lore:[\'{"text":"スニーク右クリックで低額実用品スロットへ設定","color":"gray","italic":false}\',\'{"text":"掛け金 2 Credit / 当選率 84%","color":"dark_gray","italic":false}\']}}')
  return Item.of('minecraft:paper', '{PDZCasinoSetupCard:1b,PDZCasinoPreset:"high",display:{Name:\'{"text":"PDZ High Roller Slot Setup Card","color":"light_purple","italic":false}\',Lore:[\'{"text":"スニーク右クリックで高額装備スロットへ設定","color":"gray","italic":false}\',\'{"text":"掛け金 20 Credit / 当選率 78.9%","color":"dark_gray","italic":false}\']}}')
}

function dzCasinoConfigure(player, block, presetKey) {
  try {
    let preset = DZ_CASINO_PRESETS[presetKey]
    if (!preset) throw new Error('unknown preset ' + presetKey)
    let level = player.level
    let pos = new DZ_CASINO_BLOCK_POS(block.x, block.y, block.z)
    let be = level.getBlockEntity(pos)
    if (!be) return false
    let trader = be.getTraderData()
    if (!trader) {
      be.initialize(player, DZ_CASINO_ITEM_STACK.EMPTY)
      trader = be.getTraderData()
    }
    if (!trader) return false

    let old = trader.getAllEntries()
    for (let i = old.size() - 1; i >= 0; i--) trader.removeEntry(i)

    for (let i = 0; i < preset.prizes.length; i++) {
      let prize = preset.prizes[i]
      trader.addEntry()
      let entries = trader.getAllEntries()
      let entry = entries.get(entries.size() - 1)
      for (let n = 0; n < prize.items.length; n++) {
        let spec = prize.items[n]
        let stack = dzCasinoNativeStack(spec)
        if (stack.isEmpty()) throw new Error('missing prize item ' + spec.item)
        entry.TryAddItem(stack)
      }
      entry.setOdds(prize.odds)
    }

    trader.setPrice(dzCreditValue(preset.price))
    trader.setCreative(true)
    trader.setStoreCreativeMoney(false)
    trader.setIgnoreAllTaxes(true)
    trader.setCustomName(preset.name)
    trader.markEntriesDirty()
    trader.markPriceDirty()
    trader.markTradesDirty()
    be.markDirty()
    console.info('[PDZ CASINO] Configured managed slot at ' + String(level.dimension) +
      ' ' + block.x + ',' + block.y + ',' + block.z +
      ' preset=' + presetKey + ' price=' + preset.price + ' winOdds=' + trader.getTotalOdds())
    return true
  } catch (error) {
    console.error('[PDZ CASINO] Configuration failed: ' + error)
    return false
  }
}

BlockEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide || String(event.block.id) !== 'lightmanscurrency:slot_machine') return
  let held = event.item
  if (!held || held.empty || !held.nbt || Number(held.nbt[DZ_CASINO_CARD_NBT] || 0) !== 1) return
  let presetKey = String(held.nbt.PDZCasinoPreset || 'high')
  let preset = DZ_CASINO_PRESETS[presetKey]
  if (!dzCasinoIsAdmin(player)) {
    player.tell(Text.of('この設定カードはサーバー管理者専用です。').red())
    event.cancel()
    return
  }
  if (!player.isCrouching()) {
    player.tell(Text.of('スニークしながらスロットを右クリックしてください。').yellow())
    event.cancel()
    return
  }
  if (preset && dzCasinoConfigure(player, event.block, presetKey)) {
    let winOdds = preset.prizes.reduce((sum, prize) => sum + prize.odds, 0)
    player.tell(Text.of(preset.name + 'を設定しました。').green())
    player.tell(Text.of('掛け金 ' + preset.price + ' Credit / 当選率 ' + winOdds + '% / 未当選 ' + (100 - winOdds) + '%').gray())
  } else {
    player.tell(Text.of('スロット設定に失敗しました。サーバーログを確認してください。').red())
  }
  event.cancel()
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonecasino').requires(source => source.hasPermission(2))
  root.then(Commands.literal('setup_card').executes(ctx => {
    ctx.source.player.give(dzCasinoCard('daily'))
    ctx.source.player.give(dzCasinoCard('high'))
    ctx.source.player.tell(Text.of('低額・高額のCasino Setup Cardを1枚ずつ支給しました。').lightPurple())
    return 1
  }))
  root.then(Commands.literal('odds').executes(ctx => {
    let player = ctx.source.player
    Object.keys(DZ_CASINO_PRESETS).forEach(key => {
      let preset = DZ_CASINO_PRESETS[key]
      let winOdds = preset.prizes.reduce((sum, prize) => sum + prize.odds, 0)
      player.tell(Text.of('=== ' + preset.name + ' ===').lightPurple())
      player.tell(Text.of('掛け金: ' + preset.price + ' Credit / 当選率: ' + winOdds + '% / 未当選: ' + (100 - winOdds) + '%').gray())
      preset.prizes.forEach(prize => player.tell(Text.of(prize.odds + '%  ' + prize.label).aqua()))
    })
    return 1
  }))
  event.register(root)
})
