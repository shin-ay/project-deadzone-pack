// PROJECT DEADZONE common camp shop rotation v0.4
// Shops rotate both stock and category-specific buyback offers every two hours.
const DZ_SHOP_INTERVAL = 120 * 60 * 1000
const DZ_SHOP_RETRY_LOG_INTERVAL = 10 * 60 * 1000
const DZ_SHOPS = [
  {key:"food",tag:"dz_basecamp_trader_food",
    fixed:[{id:"survival_instinct:bean_can",count:2,price:1,uses:24},{id:"survival_instinct:gallon_of_water",count:1,price:1,uses:24}],
    pool:[{id:"minecraft:bread",count:3,price:1,uses:16},{id:"minecraft:apple",count:4,price:1,uses:12},{id:"minecraft:baked_potato",count:4,price:1,uses:12},{id:"minecraft:cooked_beef",count:3,price:2,uses:10},{id:"minecraft:honey_bottle",count:2,price:2,uses:8}],
    buyback:[
      {id:"minecraft:wheat_seeds",count:64,money:1,uses:2,tier:0},{id:"minecraft:beetroot_seeds",count:64,money:1,uses:2,tier:0},
      {id:"minecraft:rotten_flesh",count:48,money:1,uses:3,tier:0},{id:"minecraft:wheat",count:32,money:1,uses:3,tier:0},
      {id:"minecraft:potato",count:32,money:1,uses:3,tier:0},{id:"minecraft:carrot",count:32,money:1,uses:3,tier:0},
      {id:"minecraft:apple",count:16,money:1,uses:4,tier:1},{id:"minecraft:cooked_beef",count:8,money:1,uses:4,tier:1},
      {id:"minecraft:honey_bottle",count:6,money:1,uses:4,tier:2}]},
  {key:"medical",tag:"dz_basecamp_trader_medical",
    fixed:[{id:"apocalypsenow:bandage",count:2,price:1,uses:24},{id:"apocalypsenow:bandage",count:2,price:2,uses:16}],
    pool:[{id:"apocalypsenow:pain_killers",count:1,price:3,uses:8},{id:"apocalypsenow:morphine",count:1,price:5,uses:4},{id:"apocalypsenow:adrenaline_syringe",count:1,price:7,uses:3},{id:"apocalypsenow:medicalkit",count:1,price:12,uses:1}],
    buyback:[
      {id:"minecraft:spider_eye",count:24,money:1,uses:3,tier:0},{id:"minecraft:glass_bottle",count:32,money:1,uses:2,tier:0},
      {id:"minecraft:string",count:32,money:1,uses:3,tier:0},{id:"minecraft:paper",count:48,money:1,uses:2,tier:0},
      {id:"apocalypsenow:bandage",count:8,money:1,uses:4,tier:1},{id:"apocalypsenow:bandage",count:4,money:1,uses:4,tier:1},
      {id:"apocalypsenow:pain_killers",count:2,money:1,uses:3,tier:2},{id:"apocalypsenow:morphine",count:1,money:2,uses:2,tier:3}]},
  {key:"parts",tag:"dz_basecamp_trader_parts",
    fixed:[{id:"immersiveengineering:hemp_fiber",count:3,price:1,uses:20},{id:"survival_instinct:rope",count:2,price:2,uses:12}],
    pool:[{id:"minecraft:iron_ingot",count:3,price:2,uses:12},{id:"minecraft:copper_ingot",count:4,price:2,uses:12},{id:"immersiveengineering:hammer",count:1,price:8,uses:2},{id:"immersiveengineering:wirecutter",count:1,price:8,uses:2},{id:"create:wrench",count:1,price:10,uses:1},{id:"mts:mtsofficialpack.blowtorch",count:1,price:12,uses:1}],
    buyback:[
      {id:"minecraft:string",count:32,money:1,uses:3,tier:0},{id:"minecraft:leather",count:16,money:1,uses:3,tier:0},
      {id:"minecraft:iron_nugget",count:48,money:1,uses:3,tier:0},{id:"minecraft:charcoal",count:32,money:1,uses:2,tier:0},
      {id:"minecraft:copper_ingot",count:12,money:1,uses:4,tier:1},{id:"minecraft:iron_ingot",count:8,money:1,uses:4,tier:1},
      {id:"minecraft:gold_ingot",count:4,money:1,uses:3,tier:2},{id:"minecraft:diamond",count:2,money:3,uses:2,tier:3}]}
]

function dzShopShuffle(values) {
  let result=values.slice()
  for(let i=result.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));let t=result[i];result[i]=result[j];result[j]=t}
  return result
}
function dzShopOffer(s){return '{buy:{Count:'+s.price+'b,id:"apocalypsenow:money"},buyB:{},demand:0,maxUses:'+s.uses+',priceMultiplier:0.0f,rewardExp:0b,sell:{Count:'+s.count+'b,id:"'+s.id+'"},specialPrice:0,uses:0,xp:0}'}
function dzShopBuybackOffer(s){return '{buy:{Count:'+s.count+'b,id:"'+s.id+'"},buyB:{},demand:0,maxUses:'+s.uses+',priceMultiplier:0.0f,rewardExp:0b,sell:{Count:'+s.money+'b,id:"apocalypsenow:money"},specialPrice:0,uses:0,xp:0}'}
function dzRotateOneShop(server,shop){
  let selector="@e[type=easy_npc:humanoid,tag="+shop.tag+",limit=1]"
  if(server.runCommandSilent("execute if entity "+selector)<=0)return false
  let stock=shop.fixed.concat(dzShopShuffle(shop.pool).slice(0,2))
  let tier=Math.max(0,server.persistentData.getInt("deadzone_world_tier"))
  let eligibleBuyback=(shop.buyback||[]).filter(v=>tier>=v.tier)
  // Four rotating entries give multiplayer groups more outlets without making
  // any single renewable resource a permanent money farm.
  let buyback=dzShopShuffle(eligibleBuyback).slice(0,4)
  let recipes=stock.map(dzShopOffer).concat(buyback.map(dzShopBuybackOffer))
  let nbt='{Offers:{Inventory:{},Recipes:{Recipes:['+recipes.join(",")+']}},TradingData:{TradingDataSet:{LastReset:0L,MaxUses:24,ResetsEveryMin:120,RewardedXP:0,Type:"BASIC"}}}'
  if(server.runCommandSilent("data merge entity "+selector+" "+nbt)<=0)return false
  console.info("[PROJECT DEADZONE][Camp Shop] "+shop.key+" T"+tier+" stock="+stock.map(v=>v.id).join(", ")+" buyback="+buyback.map(v=>v.id).join(", "))
  return true
}
function dzRotateCampShops(server,announce){
  let changed=0
  DZ_SHOPS.forEach(shop=>{if(dzRotateOneShop(server,shop))changed++})
  if(changed>0){
    server.persistentData.putLong("dz_camp_shops_next_rotation",Date.now()+DZ_SHOP_INTERVAL)
    server.persistentData.putLong("dz_camp_shops_next_missing_log",0)
    console.info("[PROJECT DEADZONE][Camp Shop] rotation complete: "+changed+"/"+DZ_SHOPS.length+" shops (sale and buyback offers reset)")
    if(announce)server.runCommandSilent('tellraw @a {"text":"キャンプ各店の販売品・買取品が更新されました。","color":"yellow"}')
  }else{
    // Camp NPCs are not ticked while their chunks are unloaded. Keep the
    // rotation overdue so it is applied on the first minute after they load,
    // but throttle the diagnostic message to avoid log spam.
    let now=Date.now()
    let nextLog=Number(server.persistentData.getLong("dz_camp_shops_next_missing_log"))
    if(nextLog<=0||now>=nextLog){
      console.warn("[PROJECT DEADZONE][Camp Shop] rotation pending: camp trader NPCs are not loaded")
      server.persistentData.putLong("dz_camp_shops_next_missing_log",now+DZ_SHOP_RETRY_LOG_INTERVAL)
    }
  }
  return changed
}
function dzShopStatus(server,player){
  let next=Number(server.persistentData.getLong("dz_camp_shops_next_rotation"))
  let minutes=next<=0?0:Math.max(0,Math.ceil((next-Date.now())/60000))
  let loaded=[]
  DZ_SHOPS.forEach(shop=>{
    if(server.runCommandSilent("execute if entity @e[type=easy_npc:humanoid,tag="+shop.tag+",limit=1]")>0)loaded.push(shop.key)
  })
  player.tell(Text.of("Camp Shops: 次の販売・買取更新まで約"+minutes+"分 / 読込済み "+loaded.length+"/"+DZ_SHOPS.length+" ["+loaded.join(", ")+"]").gold())
  return 1
}
let dzShopTicks=0
ServerEvents.tick(event=>{
  if(++dzShopTicks<1200)return
  dzShopTicks=0
  let next=Number(event.server.persistentData.getLong("dz_camp_shops_next_rotation"))
  if(next<=0||Date.now()>=next)dzRotateCampShops(event.server,next>0)
})
PlayerEvents.loggedIn(event=>event.player.server.scheduleInTicks(120,callback=>{
  let server=event.player.server
  let next=Number(server.persistentData.getLong("dz_camp_shops_next_rotation"))
  if(next<=0||Date.now()>=next)dzRotateCampShops(server,false)
}))
ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal("deadzoneshops")
  root.then(Commands.literal("status").executes(ctx=>dzShopStatus(ctx.source.server,ctx.source.player)))
  root.then(Commands.literal("rotate").requires(source=>source.hasPermission(2)).executes(ctx=>dzRotateCampShops(ctx.source.server,true)))
  root.then(Commands.literal("reset").requires(source=>source.hasPermission(2)).executes(ctx=>dzRotateCampShops(ctx.source.server,true)))
  event.register(root)
})
