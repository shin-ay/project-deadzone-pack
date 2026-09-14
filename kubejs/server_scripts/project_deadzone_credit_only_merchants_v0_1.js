// PROJECT DEADZONE Credit-only economy gate v0.2
// Vanilla/mod Merchant entities hard-code emerald ItemCost. Easy NPC and the
// registered Lightman's markets are excluded because their offers are Credit.
// Lightman's Currency can also convert newly generated wandering-trader offers
// to Credit coins. Allow those traders only after verifying that no offer still
// requests vanilla emeralds, so pre-update traders remain safely blocked.
const DZ_CREDIT_MERCHANT = Java.loadClass('net.minecraft.world.item.trading.Merchant')

function dzMerchantRequestsEmerald(merchant){
  try{
    let offers=merchant.getOffers()
    for(let i=0;i<offers.size();i++){
      let offer=offers.get(i)
      let first=offer.getBaseCostA()
      let second=offer.getCostB()
      if((first&&!first.isEmpty()&&String(first.id)==='minecraft:emerald')||
         (second&&!second.isEmpty()&&String(second.id)==='minecraft:emerald'))return true
    }
    return false
  }catch(error){
    return true
  }
}

ItemEvents.entityInteracted(event=>{
  let target=event.target;if(!target)return
  let type=String(target.type),looksLikeMerchant=/(villager|trader|merchant|noble)/.test(type)
  if(!(target instanceof DZ_CREDIT_MERCHANT)&&!looksLikeMerchant)return
  if(type==='easy_npc:humanoid')return
  if(type==='minecraft:wandering_trader'&&target instanceof DZ_CREDIT_MERCHANT&&
     !dzMerchantRequestsEmerald(target))return
  event.cancel()
  let player=event.player,now=Date.now()
  if(player&&now-Number(player.persistentData.getLong('dz_credit_merchant_notice'))>3000){
    player.persistentData.putLong('dz_credit_merchant_notice',now)
    player.tell(Text.of('PDZではエメラルド決済の商人は利用できません。Credit市場をご利用ください。').red())
  }
})
