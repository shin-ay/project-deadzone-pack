// PROJECT DEADZONE Credit-only economy gate v0.1
// Vanilla/mod Merchant entities hard-code emerald ItemCost. Easy NPC and the
// registered Lightman's markets are excluded because their offers are Credit.
const DZ_CREDIT_MERCHANT = Java.loadClass('net.minecraft.world.item.trading.Merchant')
ItemEvents.entityInteracted(event=>{
  let target=event.target;if(!target)return
  let type=String(target.type),looksLikeMerchant=/(villager|trader|merchant|noble)/.test(type)
  if(!(target instanceof DZ_CREDIT_MERCHANT)&&!looksLikeMerchant)return
  if(type==='easy_npc:humanoid')return
  event.setCanceled(true)
  let player=event.player,now=Date.now()
  if(player&&now-Number(player.persistentData.getLong('dz_credit_merchant_notice'))>3000){
    player.persistentData.putLong('dz_credit_merchant_notice',now)
    player.tell(Text.of('PDZではエメラルド決済の商人は利用できません。Credit市場をご利用ください。').red())
  }
})
