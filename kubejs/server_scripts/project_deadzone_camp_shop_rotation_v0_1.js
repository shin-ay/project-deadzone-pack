// PROJECT DEADZONE common camp shop rotation v0.5
// Shops rotate both stock and category-specific buyback offers every two hours.
const DZ_SHOP_INTERVAL = 120 * 60 * 1000
const DZ_SHOP_RETRY_LOG_INTERVAL = 10 * 60 * 1000
const DZ_SHOPS = [
  {key:"food",tag:"dz_basecamp_trader_food",
    fixed:[{id:"survival_instinct:bean_can",count:2,price:1,uses:24},{id:"survival_instinct:gallon_of_water",count:1,price:1,uses:24}],
    pool:[
      {id:"minecraft:bread",count:3,price:1,uses:16},{id:"minecraft:apple",count:4,price:1,uses:12},{id:"minecraft:baked_potato",count:4,price:1,uses:12},
      {id:"minecraft:cooked_beef",count:3,price:2,uses:10},{id:"minecraft:honey_bottle",count:2,price:2,uses:8},
      {id:"farmersdelight:cabbage_seeds",count:3,price:1,uses:12,rep:1},{id:"farmersdelight:tomato_seeds",count:3,price:1,uses:12,rep:1},
      {id:"farmersdelight:vegetable_soup",count:2,price:2,uses:10,rep:2},{id:"aquaculture:fish_fillet_cooked",count:4,price:2,uses:10,rep:2},
      {id:"farmersdelight:beef_stew",count:2,price:3,uses:8,rep:3},{id:"aquaculturedelight:fish_and_chips",count:2,price:3,uses:8,rep:3},
      {id:"minecolonies:potato_soup",count:2,price:3,uses:10,community:1},{id:"minecolonies:veggie_soup",count:2,price:3,uses:10,community:1},
      {id:"minecolonies:fish_n_chips",count:2,price:4,uses:8,community:2},{id:"minecolonies:stew_trencher",count:2,price:5,uses:6,community:3}
    ],
    buyback:[
      {id:"minecraft:cod",count:8,money:1,uses:8,tier:0},{id:"minecraft:salmon",count:6,money:1,uses:8,tier:0},
      {id:"minecraft:tropical_fish",count:4,money:1,uses:5,tier:0},{id:"minecraft:pufferfish",count:3,money:1,uses:4,tier:1},
      {id:"minecraft:wheat_seeds",count:64,money:1,uses:2,tier:0},{id:"minecraft:beetroot_seeds",count:64,money:1,uses:2,tier:0},
      {id:"minecraft:rotten_flesh",count:48,money:1,uses:3,tier:0},{id:"minecraft:wheat",count:32,money:1,uses:3,tier:0},
      {id:"minecraft:potato",count:32,money:1,uses:3,tier:0},{id:"minecraft:carrot",count:32,money:1,uses:3,tier:0},
      {id:"minecraft:apple",count:16,money:1,uses:4,tier:1},{id:"minecraft:cooked_beef",count:8,money:1,uses:4,tier:1},
      {id:"minecraft:honey_bottle",count:6,money:1,uses:4,tier:2},
      {id:"farmersdelight:cabbage",count:16,money:1,uses:5,tier:0,rep:1},{id:"farmersdelight:tomato",count:16,money:1,uses:5,tier:0,rep:1},
      {id:"aquaculture:fish_fillet_raw",count:12,money:1,uses:6,tier:0,rep:1},
      {id:"farmersdelight:vegetable_soup",count:4,money:2,uses:5,tier:0,rep:2},
      {id:"aquaculturedelight:fish_and_chips",count:4,money:3,uses:4,tier:1,rep:3}]},
  {key:"medical",tag:"dz_basecamp_trader_medical",
    fixed:[{id:"apocalypsenow:bandage",count:2,price:1,uses:24},{id:"apocalypsenow:bandage",count:2,price:2,uses:16}],
    pool:[
      {id:"apocalypsenow:pain_killers",count:1,price:3,uses:8,camp:1},{id:"apocalypsenow:morphine",count:1,price:5,uses:4,camp:2},
      {id:"apocalypsenow:adrenaline_syringe",count:1,price:7,uses:3,camp:2},{id:"apocalypsenow:medicalkit",count:1,price:12,uses:1,camp:3},
      {id:"kubejs:field_medical_kit",count:1,price:8,uses:4,camp:2,community:2},{id:"minecraft:golden_apple",count:1,price:15,uses:2,camp:3,community:3}
    ],
    buyback:[
      {id:"minecraft:spider_eye",count:24,money:1,uses:3,tier:0},{id:"minecraft:glass_bottle",count:32,money:1,uses:2,tier:0},
      {id:"minecraft:string",count:32,money:1,uses:3,tier:0},{id:"minecraft:paper",count:48,money:1,uses:2,tier:0},
      {id:"apocalypsenow:bandage",count:8,money:1,uses:4,tier:1},{id:"apocalypsenow:bandage",count:4,money:1,uses:4,tier:1},
      {id:"apocalypsenow:pain_killers",count:2,money:1,uses:3,tier:2},{id:"apocalypsenow:morphine",count:1,money:2,uses:2,tier:3}]},
  {key:"parts",tag:"dz_basecamp_trader_parts",
    fixed:[
      {id:"immersiveengineering:hemp_fiber",count:3,price:1,uses:20},
      {id:"survival_instinct:rope",count:2,price:2,uses:12},
      // Always available. Players should never be locked out of the mastery
      // loop just because the random tool stock omitted a repair option.
      {id:"kubejs:field_repair_kit",count:1,price:2,uses:24}
    ],
    pool:[
      {id:"minecraft:iron_ingot",count:3,price:2,uses:12,camp:1},{id:"minecraft:copper_ingot",count:4,price:2,uses:12,camp:1},
      {id:"immersiveengineering:hammer",count:1,price:8,uses:2,camp:2},{id:"immersiveengineering:wirecutter",count:1,price:8,uses:2,camp:2},
      {id:"create:wrench",count:1,price:10,uses:1,camp:2},{id:"mts:mtsofficialpack.blowtorch",count:1,price:12,uses:1,camp:3},
      {id:"createaddition:connector",count:2,price:4,uses:8,camp:1,community:1},{id:"createaddition:capacitor",count:1,price:8,uses:4,camp:2,community:2},
      {id:"tfmg:circuit_board",count:1,price:12,uses:2,camp:3,community:3}
    ],
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
function dzShopLifeReputation(server){return Math.max(0,server.persistentData.getInt("dz_life_supply_reputation"))}
function dzShopLifeRank(server){let r=dzShopLifeReputation(server);return r>=50?3:r>=25?2:r>=10?1:0}
function dzShopCampLevel(server){return Math.max(0,Math.min(3,server.persistentData.getInt("dz_camp_development_level")))}
function dzShopCommunitySectorRank(value){return value>=50?3:value>=25?2:value>=10?1:0}
function dzShopCommunityRank(server){
  let supply=dzShopCommunitySectorRank(Math.max(0,server.persistentData.getInt("dz_life_supply_reputation")))
  let security=dzShopCommunitySectorRank(Math.max(0,server.persistentData.getInt("dz_camp_security_reputation")))
  let restoration=dzShopCommunitySectorRank(Math.max(0,server.persistentData.getInt("dz_camp_restoration_reputation")))
  return Math.min(dzShopCampLevel(server),supply,security,restoration)
}
function dzShopStoryFactor(server,shopKey){
  // Story verdicts are personal, while Easy NPC offers are shared.  Use the
  // average verdict of the currently-online team when a rotation is built.
  let players=server.players
  if(!players.length){let f=1.0-dzShopCampLevel(server)*0.05-dzShopCommunityRank(server)*0.03;if(shopKey==="food")f-=dzShopLifeRank(server)*0.08;return Math.max(0.55,f)}
  let total=0
  players.forEach(p=>{
    let factor=1.0
    let cdf=p.persistentData.getString("dz_branch_choice_cdf")
    let raider=p.persistentData.getString("dz_branch_choice_raider")
    let remnant=p.persistentData.getString("dz_branch_choice_remnant")
    let aegis=p.persistentData.getString("dz_branch_choice_aegis")
    if(shopKey==="food"&&cdf==="cdf_coalition")factor-=0.10
    if(shopKey==="food"&&raider==="raider_truce")factor-=0.10
    if(shopKey==="medical"&&aegis==="aegis_release")factor-=0.20
    if(shopKey==="medical"&&aegis==="aegis_burn")factor+=0.10
    if(shopKey==="parts"&&remnant==="remnant_defect")factor-=0.15
    if(shopKey==="parts"&&remnant==="remnant_decommission")factor+=0.10
    if(cdf==="cdf_order"&&(shopKey==="parts"||shopKey==="medical"))factor-=0.05
    total+=Math.max(0.55,Math.min(1.45,factor))
  })
  let factor=total/players.length
  if(shopKey==="food")factor-=dzShopLifeRank(server)*0.08
  factor-=dzShopCampLevel(server)*0.05
  factor-=dzShopCommunityRank(server)*0.03
  return Math.max(0.55,Math.min(1.45,factor))
}
function dzShopOffer(s,factor){let price=Math.max(1,Math.round(s.price*factor));return '{buy:{Count:'+price+'b,id:"apocalypsenow:money"},buyB:{},demand:0,maxUses:'+s.uses+',priceMultiplier:0.0f,rewardExp:0b,sell:{Count:'+s.count+'b,id:"'+s.id+'"},specialPrice:0,uses:0,xp:0}'}
function dzShopBuybackOffer(s,factor){let money=Math.max(1,Math.round(s.money/Math.max(0.55,factor)));return '{buy:{Count:'+s.count+'b,id:"'+s.id+'"},buyB:{},demand:0,maxUses:'+s.uses+',priceMultiplier:0.0f,rewardExp:0b,sell:{Count:'+money+'b,id:"apocalypsenow:money"},specialPrice:0,uses:0,xp:0}'}
function dzRotateOneShop(server,shop){
  let selector="@e[type=easy_npc:humanoid,tag="+shop.tag+",limit=1]"
  if(server.runCommandSilent("execute if entity "+selector)<=0)return false
  let lifeRank=dzShopLifeRank(server)
  let campLevel=dzShopCampLevel(server)
  let communityRank=dzShopCommunityRank(server)
  let stockPool=shop.pool.filter(v=>(v.rep||0)<=lifeRank&&(v.camp||0)<=campLevel&&(v.community||0)<=communityRank)
  let stockCount=2+((shop.key==="food"&&lifeRank>=2)?1:0)+(campLevel>=2?1:0)+(communityRank>=1?1:0)+(communityRank>=3?1:0)
  let stock=shop.fixed.concat(dzShopShuffle(stockPool).slice(0,stockCount))
  let storyUnlock=Math.max(0,server.persistentData.getInt("deadzone_world_tier"))
  let eligibleBuyback=(shop.buyback||[]).filter(v=>storyUnlock>=v.tier&&(v.rep||0)<=lifeRank)
  // Four rotating entries give multiplayer groups more outlets without making
  // any single renewable resource a permanent money farm.
  let buyback=dzShopShuffle(eligibleBuyback).slice(0,4+(campLevel>=2?1:0)+(communityRank>=2?1:0))
  let storyFactor=dzShopStoryFactor(server,shop.key)
  let recipes=stock.map(s=>dzShopOffer(s,storyFactor)).concat(buyback.map(s=>dzShopBuybackOffer(s,storyFactor)))
  let nbt='{Offers:{Inventory:{},Recipes:{Recipes:['+recipes.join(",")+']}},TradingData:{TradingDataSet:{LastReset:0L,MaxUses:24,ResetsEveryMin:120,RewardedXP:0,Type:"BASIC"}}}'
  if(server.runCommandSilent("data merge entity "+selector+" "+nbt)<=0)return false
  console.info("[PROJECT DEADZONE][Camp Shop] "+shop.key+" Story S"+storyUnlock+" lifeRank="+lifeRank+" campLevel="+campLevel+" communityRank="+communityRank+" storyFactor="+storyFactor.toFixed(2)+" stock="+stock.map(v=>v.id).join(", ")+" buyback="+buyback.map(v=>v.id).join(", "))
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
  player.tell(Text.of("Camp Shops: 次の販売・買取更新まで約"+minutes+"分 / 読込済み "+loaded.length+"/"+DZ_SHOPS.length+" ["+loaded.join(", ")+"] / 生活評判 "+dzShopLifeReputation(server)+" Rank "+dzShopLifeRank(server)+" / Camp Lv"+dzShopCampLevel(server)+" / 総合Rank "+dzShopCommunityRank(server)).gold())
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
