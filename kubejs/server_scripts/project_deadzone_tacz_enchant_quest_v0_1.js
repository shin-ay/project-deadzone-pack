// PROJECT DEADZONE - TaCZ enchantment quest bridge v0.1
// Read-only bridge: TaCZ Enchantments Overhaul remains the source of truth.

const PDZ_TAE_QUEST = '7D2A10E1C4A80140'
const PDZ_TAE_DONE = 'dz_tacz_enchant_quest_done'
const PDZ_TAE_HELPER = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')
const PDZ_TAE_REGISTRIES = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')

function pdzTaeIsGun(stack){
  if(!stack||stack.isEmpty())return false
  if(String(stack.id)==='tacz:modern_kinetic_gun')return true
  try{return stack.hasTag('mmorpg:kinetic_gun')}catch(ignored){}
  return false
}

function pdzTaeHasGunEnchant(stack){
  if(!pdzTaeIsGun(stack))return false
  try{
    let enchants=PDZ_TAE_HELPER.getEnchantments(stack)
    let it=enchants.keySet().iterator()
    while(it.hasNext()){
      let id=PDZ_TAE_REGISTRIES.ENCHANTMENT.getKey(it.next())
      if(id&&String(id).indexOf('tacz_eo:')===0)return true
    }
  }catch(err){
    // Keep the quest non-invasive if another mod temporarily exposes an
    // incomplete stack during inventory synchronization.
  }
  return false
}

function pdzTaeCheck(player){
  if(!player||player.level.clientSide||player.persistentData.getBoolean(PDZ_TAE_DONE))return
  let inv=player.getInventory()
  for(let slot=0;slot<inv.getContainerSize();slot++){
    if(!pdzTaeHasGunEnchant(inv.getItem(slot)))continue
    player.server.runCommandSilent('ftbquests change_progress '+player.username+' complete '+PDZ_TAE_QUEST)
    player.persistentData.putBoolean(PDZ_TAE_DONE,true)
    player.tell(Text.of('[装備強化] TaCZ銃専用エンチャントを確認しました。').green())
    return
  }
}

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(80,()=>pdzTaeCheck(event.player)))
PlayerEvents.tick(event=>{if(event.player.age%40===17)pdzTaeCheck(event.player)})

console.info('[PROJECT DEADZONE][TaCZ Enchant Quest] v0.1 native enchantment bridge loaded')
