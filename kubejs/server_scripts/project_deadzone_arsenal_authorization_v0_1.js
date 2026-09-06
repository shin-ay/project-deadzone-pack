// PROJECT DEADZONE Arsenal Progression Status v0.6
//
// Weapon Research & Blueprints is the sole owner of gun crafting/research
// progression. Once a gun exists in a player's hands it must always be usable,
// regardless of story tier or acquisition route. PDZ never cancels gun use or
// changes gun damage here.
//
// This file keeps only catalog/status helpers for UI and diagnostics.

const PDZ_ARSENAL_IGUN = Java.loadClass('com.tacz.guns.api.item.IGun')
const PDZ_ARSENAL_ASSETS = Java.loadClass('com.tacz.guns.resource.CommonAssetsManager')

function dzArsenalStoryTier(player) {
  try {
    if (global.pdzStoryUnlockTier) return Math.max(0, Number(global.pdzStoryUnlockTier(player.server)) || 0)
  } catch (ignored) {}
  for (let i = 5; i >= 0; i--) if (player.stages.has('deadzone_tier_' + i)) return i
  return Math.max(0, player.server.persistentData.getInt('deadzone_story_unlock_tier'))
}

function dzArsenalProfile(stack) {
  let profile = {gun:false, id:'unknown:unknown', namespace:'unknown', type:'unknown'}
  try {
    let gun = PDZ_ARSENAL_IGUN.getIGunOrNull(stack)
    if (!gun) return profile
    profile.gun = true
    profile.id = String(gun.getGunId(stack)).toLowerCase()
    profile.namespace = profile.id.indexOf(':') > 0 ? profile.id.split(':')[0] : 'unknown'
    let index = PDZ_ARSENAL_ASSETS.get().getGunIndex(gun.getGunId(stack))
    if (index) profile.type = String(index.getType() || 'unknown').toLowerCase().replace(/[ -]/g, '_')
  } catch (ignored) {}
  return profile
}

function dzArsenalRequiredTier(profile) {
  if (!profile.gun) return 0
  let tier = global.pdzArsenalTierById ? global.pdzArsenalTierById[profile.id] : undefined
  if (tier !== undefined && tier !== null) return Math.max(0, Math.min(3, Number(tier) || 0))

  // Unknown entries stay in the highest research class for presentation and
  // crafting progression only. This value never blocks an existing gun.
  return 3
}

function dzArsenalIsVerifiedLoot(stack) {
  try {
    if (!stack || stack.isEmpty() || !stack.nbt) return false
    let provenance = stack.nbt.getCompound('taczweaponblueprints:weapon_provenance')
    return provenance && provenance.getInt('format') === 1 &&
      String(provenance.getString('origin')) === 'loot_generated' &&
      String(provenance.getString('source_id')).indexOf(':') > 0
  } catch (ignored) {}
  return false
}

function dzArsenalTierLabel(tier) {
  if (tier <= 0) return 'S0 拳銃・SMG'
  if (tier === 1) return 'S1 AR・SG / Gas Station'
  if (tier === 2) return 'S2 SR・支援火器 / Police Station'
  return 'S3 試験兵器 / Radio Tower'
}

global.pdzArsenalProfile = dzArsenalProfile
global.pdzArsenalRequiredTier = dzArsenalRequiredTier
global.pdzArsenalIsVerifiedLoot = dzArsenalIsVerifiedLoot

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonearsenal')
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let profile = dzArsenalProfile(player.mainHandItem)
    let required = dzArsenalRequiredTier(profile)
    player.tell(Text.of('Story S' + dzArsenalStoryTier(player) + ' / ' + profile.id + ' / ' + profile.type).aqua())
    if (!profile.gun) {
      player.tell(Text.of('TaCZ銃をメインハンドに持ってください。').gray())
      return 0
    }
    if (dzArsenalIsVerifiedLoot(player.mainHandItem)) {
      player.tell(Text.of('取得区分: Weapon Research生成ルート品').green())
    } else {
      player.tell(Text.of('研究・作成区分: ' + dzArsenalTierLabel(required)).gray())
    }
    player.tell(Text.of('射撃: 常時許可（ストーリー段階・取得経路による制限なし）').green())
    return 1
  }))
  event.register(root)
})
