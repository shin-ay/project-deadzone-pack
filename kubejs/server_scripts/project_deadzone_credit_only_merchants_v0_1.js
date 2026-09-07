// PROJECT DEADZONE Credit-only economy gate v0.1
// Vanilla/mod Merchant entities hard-code emerald ItemCost. Easy NPC and the
// registered Lightman's markets are excluded because their offers are Credit.
const DZ_CREDIT_MERCHANT = Java.loadClass('net.minecraft.world.item.trading.Merchant')
ItemEvents.entityInteracted(event=>{
  let target=event.target;if(!target)return
  let type=String(target.type),looksLikeMerchant=/(villager|trader|merchant|noble)/.test(type)
  // Recruits uses a fixed ItemStack currency. Materialize one stack of the
  // configured 10-Credit denomination from any mix of wallet coins, allowing
  // its native hiring UI to charge normally and leave the remainder intact.
  if(type.indexOf('recruits:')===0){
    try { if(global.pdzCreditPrepareRecruitPayment) global.pdzCreditPrepareRecruitPayment(event.player) }
    catch(error){console.error('[PROJECT DEADZONE][Credit] recruit auto-change failed: '+error)}
    return
  }
  if(!(target instanceof DZ_CREDIT_MERCHANT)&&!looksLikeMerchant)return
  if(type==='easy_npc:humanoid')return
  event.cancel()
  let player=event.player,now=Date.now()
  if(player&&now-Number(player.persistentData.getLong('dz_credit_merchant_notice'))>3000){
    player.persistentData.putLong('dz_credit_merchant_notice',now)
    player.tell(Text.of('PDZではエメラルド決済の商人は利用できません。Credit市場をご利用ください。').red())
  }
})
