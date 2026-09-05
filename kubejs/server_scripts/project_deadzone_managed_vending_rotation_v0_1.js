// PROJECT DEADZONE managed Lightman's Currency markets v0.1
// Only machines explicitly registered here are ever rewritten. The registry is
// coordinate-based and checked only while its chunk is already loaded.

const DZ_VM_REGISTRY_KEY = 'dz_managed_vending_registry_v1'
const DZ_VM_VILLAGE_REGISTRY_KEY = 'dz_village_services_registry_v1'
const DZ_VM_INTERVAL = 2 * 60 * 60 * 1000
const DZ_VM_FAILURE_COOLDOWN = 30 * 60 * 1000
const DZ_VM_CONFIG_VERSION = 2
const DZ_VM_BLOCKPOS = Java.loadClass('net.minecraft.core.BlockPos')
const DZ_VM_ITEM_STACK = Java.loadClass('net.minecraft.world.item.ItemStack')
const DZ_VM_RESOURCE_LOCATION = Java.loadClass('net.minecraft.resources.ResourceLocation')
const DZ_VM_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const DZ_VM_TRADE_DIRECTION = Java.loadClass('io.github.lightman314.lightmanscurrency.api.traders.trade.TradeDirection')
const DZ_VM_PLAYER_LIMIT = Java.loadClass('io.github.lightman314.lightmanscurrency.common.traders.rules.types.PlayerTradeLimit')

const DZ_VM_MARKETS = {
  base:{name:'PDZ Base Supply Market',fixed:[
    {d:'sale',i:'survival_instinct:gallon_of_water',n:1,p:2,l:24},{d:'sale',i:'survival_instinct:bean_can',n:2,p:2,l:24},
    {d:'sale',i:'apocalypsenow:bandage',n:2,p:3,l:16},{d:'sale',i:'kubejs:field_repair_kit',n:1,p:4,l:12}],
    sale:[{d:'sale',i:'minecraft:bread',n:6,p:3,l:12},{d:'sale',i:'minecraft:cooked_beef',n:4,p:5,l:8},{d:'sale',i:'minecraft:torch',n:32,p:4,l:8},{d:'sale',i:'tacz:ammo',n:20,p:8,l:6,a:'tacz:9mm'},{d:'sale',i:'minecraft:iron_ingot',n:4,p:6,l:6}],
    buy:[{d:'purchase',i:'minecraft:rotten_flesh',n:48,p:1,l:4},{d:'purchase',i:'minecraft:iron_ingot',n:8,p:3,l:4},{d:'purchase',i:'minecraft:copper_ingot',n:12,p:2,l:4},{d:'purchase',i:'minecraft:leather',n:16,p:2,l:4},{d:'purchase',i:'minecraft:coal',n:24,p:2,l:4}],sc:4,bc:4},
  agriculture:{name:'PDZ Agricultural Exchange',fixed:[{d:'sale',i:'minecraft:bread',n:8,p:12,l:8},{d:'purchase',i:'minecraft:wheat',n:16,p:8,l:12}],
    sale:[{d:'sale',i:'minecraft:cooked_beef',n:4,p:16,l:6},{d:'sale',i:'minecraft:bone_meal',n:16,p:18,l:4},{d:'sale',i:'minecraft:carrot',n:12,p:10,l:8},{d:'sale',i:'minecraft:baked_potato',n:12,p:10,l:8}],
    buy:[{d:'purchase',i:'minecraft:carrot',n:16,p:8,l:12},{d:'purchase',i:'minecraft:beef',n:8,p:12,l:8},{d:'purchase',i:'minecraft:potato',n:16,p:8,l:12},{d:'purchase',i:'minecraft:leather',n:12,p:10,l:8}],sc:2,bc:2},
  fishing:{name:'PDZ Fishery Exchange',fixed:[{d:'sale',i:'minecraft:cooked_cod',n:4,p:12,l:8},{d:'purchase',i:'minecraft:cod',n:8,p:10,l:12}],
    sale:[{d:'sale',i:'minecraft:fishing_rod',n:1,p:30,l:2},{d:'sale',i:'minecraft:lantern',n:2,p:18,l:4},{d:'sale',i:'minecraft:cooked_salmon',n:4,p:14,l:8},{d:'sale',i:'minecraft:string',n:12,p:10,l:6}],
    buy:[{d:'purchase',i:'minecraft:salmon',n:8,p:12,l:12},{d:'purchase',i:'minecraft:string',n:16,p:10,l:8},{d:'purchase',i:'minecraft:pufferfish',n:4,p:10,l:6},{d:'purchase',i:'minecraft:ink_sac',n:12,p:10,l:6}],sc:2,bc:2},
  mining:{name:'PDZ Mining Exchange',fixed:[{d:'sale',i:'minecraft:torch',n:32,p:12,l:8},{d:'purchase',i:'minecraft:coal',n:16,p:12,l:12}],
    sale:[{d:'sale',i:'minecraft:iron_pickaxe',n:1,p:80,l:2},{d:'sale',i:'minecraft:cooked_porkchop',n:4,p:18,l:6},{d:'sale',i:'minecraft:ladder',n:24,p:12,l:6},{d:'sale',i:'minecraft:iron_ingot',n:4,p:24,l:5}],
    buy:[{d:'purchase',i:'minecraft:raw_copper',n:16,p:16,l:10},{d:'purchase',i:'minecraft:raw_iron',n:8,p:24,l:8},{d:'purchase',i:'minecraft:raw_gold',n:4,p:24,l:6},{d:'purchase',i:'minecraft:redstone',n:24,p:16,l:8}],sc:2,bc:2}
}

function dzVmRead(server){let raw=server.persistentData.getString(DZ_VM_REGISTRY_KEY);if(!raw)return {};try{return JSON.parse(raw)}catch(e){console.error('[PDZ Market] invalid registry: '+e);return {}}}
function dzVmWrite(server,r){server.persistentData.putString(DZ_VM_REGISTRY_KEY,JSON.stringify(r))}
function dzVmKey(dim,x,y,z){return String(dim)+'|'+Math.floor(x)+'|'+Math.floor(y)+'|'+Math.floor(z)}
function dzVmNativeStack(id,count,ammoId){let item=DZ_VM_FORGE_REGISTRIES.ITEMS.getValue(new DZ_VM_RESOURCE_LOCATION(String(id)));if(!item)return DZ_VM_ITEM_STACK.EMPTY;let stack=new DZ_VM_ITEM_STACK(item,Math.max(1,Math.floor(count)));if(ammoId)stack.getOrCreateTag().putString('AmmoId',String(ammoId));return stack}
function dzVmShuffle(a){let r=a.slice();for(let i=r.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1)),t=r[i];r[i]=r[j];r[j]=t}return r}
function dzVmPick(entry,name,pool,count){let picked=[];for(let n=0;n<8;n++){picked=dzVmShuffle(pool).slice(0,count);let s=picked.map(v=>v.i).sort().join('|');if(s!==String(entry[name]||'')||pool.length<=count){entry[name]=s;break}}return picked}
function dzVmLevel(server,dim){try{return server.getLevel(dim)}catch(e){return null}}
function dzVmQuarantine(entry,now,reason){entry.failUntil=now+DZ_VM_FAILURE_COOLDOWN;entry.failCount=Number(entry.failCount||0)+1;if(!entry.lastFailLog||now-Number(entry.lastFailLog)>DZ_VM_FAILURE_COOLDOWN){entry.lastFailLog=now;console.error('[PDZ Market] rotation quarantined for 30 minutes at '+entry.dim+' '+entry.x+','+entry.y+','+entry.z+': '+reason)}return false}
function dzVmConfigure(server,entry,force){
  let now=Date.now();if(!force&&Number(entry.failUntil||0)>now)return null
  let level=dzVmLevel(server,entry.dim);if(!level)return false
  let pos=new DZ_VM_BLOCKPOS(entry.x,entry.y,entry.z);if(!level.hasChunkAt(pos))return false
  let block=level.getBlock(entry.x,entry.y,entry.z);if(String(block.id)!=='lightmanscurrency:vending_machine'&&String(block.id)!=='lightmanscurrency:vending_machine_large')return dzVmQuarantine(entry,now,'registered block is missing')
  if(!force&&Number(entry.version||0)>=DZ_VM_CONFIG_VERSION&&Number(entry.next||0)>Date.now())return true
  try{
    let be=level.getBlockEntity(pos),trader=be?be.getTraderData():null;if(!trader)return dzVmQuarantine(entry,now,'trader data is unavailable')
    let market=DZ_VM_MARKETS[entry.market]||DZ_VM_MARKETS.base
    let offers=market.fixed.concat(dzVmPick(entry,'lastSale',market.sale,market.sc),dzVmPick(entry,'lastBuy',market.buy,market.bc))
    for(let i=0;i<12;i++){
      let trade=trader.getTrade(i);if(!trade)break
      if(i>=offers.length){trade.setItem(DZ_VM_ITEM_STACK.EMPTY,0);trade.setItem(DZ_VM_ITEM_STACK.EMPTY,1);trade.setItem(DZ_VM_ITEM_STACK.EMPTY,2);trade.setItem(DZ_VM_ITEM_STACK.EMPTY,3);trade.getRules().clear();continue}
      let o=offers[i];for(let s=0;s<4;s++)trade.setItem(DZ_VM_ITEM_STACK.EMPTY,s)
      trade.getRules().clear();trade.setTradeDirection(o.d==='purchase'?DZ_VM_TRADE_DIRECTION.PURCHASE:DZ_VM_TRADE_DIRECTION.SALE)
      trade.setItem(dzVmNativeStack(o.i,o.n,o.a),0);trade.setEnforceNBT(0,false);trade.setCustomName(0,o.i);trade.setCost(dzCreditValue(o.p))
      let limit=DZ_VM_PLAYER_LIMIT.TYPE.createNew();limit.setLimit(o.l);limit.setTimeLimit(86400000);limit.setActive(true);trade.getRules().add(limit)
    }
    // Owner, creative-money, tax and other trader-level settings are deliberately untouched.
    trader.setCustomName(market.name);trader.markTradesDirty();trader.markTradeRulesDirty();be.markDirty()
    entry.next=Date.now()+DZ_VM_INTERVAL;entry.version=DZ_VM_CONFIG_VERSION
    delete entry.failUntil;delete entry.failCount;delete entry.lastFailLog
    console.info('[PDZ Market] rotated '+entry.market+' at '+entry.dim+' '+entry.x+','+entry.y+','+entry.z)
    return true
  }catch(e){
    return dzVmQuarantine(entry,now,e)
  }
}
function dzVmImportVillages(server,r){
  let raw=server.persistentData.getString(DZ_VM_VILLAGE_REGISTRY_KEY);if(!raw)return false
  let villages;try{villages=JSON.parse(raw)}catch(e){return false};let changed=false
  Object.keys(villages).forEach(k=>{let v=villages[k];if(!v||!v.market)return;let dim=String(k).split('|village|')[0];let key=dzVmKey(dim,v.market.x,v.market.y,v.market.z);if(!r[key]){r[key]={dim:dim,x:v.market.x,y:v.market.y,z:v.market.z,market:v.marketPreset||'agriculture',source:'village',next:0};changed=true}})
  return changed
}
// Shared entry point for the older setup-card handler. That handler may cancel
// the click event before this file's listener runs, so registration must not
// depend on listener order.
global.pdzRegisterManagedVending=function(server,dim,x,y,z,market,source){
  let r=dzVmRead(server),key=dzVmKey(dim,x,y,z)
  let entry={dim:String(dim),x:Math.floor(x),y:Math.floor(y),z:Math.floor(z),market:String(market||'base'),source:String(source||'admin-card'),next:0}
  r[key]=entry
  let ok=dzVmConfigure(server,entry,true)
  dzVmWrite(server,r)
  return ok===true
}
function dzVmServicePlayer(player){
  let server=player.server,r=dzVmRead(server),changed=dzVmImportVillages(server,r),dim=String(player.level.dimension)
  Object.keys(r).forEach(k=>{let e=r[k];if(e.dim!==dim)return;if(Math.abs((e.x>>4)-(Math.floor(player.x)>>4))>8||Math.abs((e.z>>4)-(Math.floor(player.z)>>4))>8)return;let result=dzVmConfigure(server,e,false);if(result!==null)changed=true})
  if(changed)dzVmWrite(server,r)
}
PlayerEvents.tick(event=>{if(!event.player.level.clientSide&&event.player.age%40===17)dzVmServicePlayer(event.player)})
BlockEvents.rightClicked(event=>{
  let id=String(event.block.id);if(id!=='lightmanscurrency:vending_machine'&&id!=='lightmanscurrency:vending_machine_large')return
  let player=event.player,server=player.server,r=dzVmRead(server),dim=String(player.level.dimension),key=dzVmKey(dim,event.block.x,event.block.y,event.block.z),entry=r[key]
  // Setup-card registration is owned by village_services so it can resolve the
  // lower half of large machines before this generic use listener runs.
  if(entry){let result=dzVmConfigure(server,entry,false);if(result!==null)dzVmWrite(server,r)}
})
