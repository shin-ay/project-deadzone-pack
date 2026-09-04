// PROJECT DEADZONE Arsenal Authorization v0.2 (local candidate)
// TaCZ uses its own gun-smith recipe type, which RecipeStages 8 cannot gate.
// Enforce the same large story milestones at the point a weapon is used.

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
  let id = profile.id, type = profile.type
  let family = (type + ' ' + id).toLowerCase()

  // Story authorization is owned by the weapon family, not by the add-on
  // pack it came from. A simple SMG must stay usable at S0 even when a pack
  // also contains late-game weapons.
  if (/(launcher|rocket|grenade_launcher|cannon|railgun|plasma|chemical|energy_weapon)/.test(family)) return 3
  if (/(sniper|marksman|dmr|anti_materiel|anti-material|machine_gun|heavy_machine|\blmg\b|\bhmg\b|minigun)/.test(family)) return 2
  if (/(shotgun|assault|battle_rifle|automatic_rifle|\brifle\b)/.test(family)) return 1
  if (/(smg|submachine|machine_pistol|pistol|handgun|revolver|glock|m1911|cz75|mp5|mp7|uzi|vector|p90|ump|pp19)/.test(family)) return 0

  // Unknown or genuinely experimental weapons fail safely into S3. The
  // diagnostic command prints both ID and type so new packs can be classified.
  return 3
}

function dzArsenalTierLabel(tier) {
  if (tier <= 0) return 'S0 拳銃・SMG'
  if (tier === 1) return 'S1 AR・SG / Gas Station'
  if (tier === 2) return 'S2 SR・支援火器 / Police Station'
  return 'S3 試験兵器 / Radio Tower'
}

function dzArsenalDeny(player, profile, required) {
  let now = player.age, last = player.persistentData.getInt('dz_arsenal_deny_notice_tick')
  if (last > 0 && now >= last && now - last < 40) return
  player.persistentData.putInt('dz_arsenal_deny_notice_tick', now)
  player.tell(Text.of('未承認火器: ' + profile.id).red())
  player.tell(Text.of('必要: ' + dzArsenalTierLabel(required) + ' / 現在 S' + dzArsenalStoryTier(player)).gray())
}

ItemEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  let profile = dzArsenalProfile(event.item)
  if (!profile.gun) return
  let required = dzArsenalRequiredTier(profile)
  if (dzArsenalStoryTier(player) >= required) return
  event.cancel()
  dzArsenalDeny(player, profile, required)
})

// Packet-driven/automatic fire can bypass a normal item-use callback. This
// second guard makes the authorization authoritative; it does not alter valid
// weapon damage and it never touches gun NBT or magazines.
TimelessGunEvents.entityHurtByGunPre(event => {
  let player = event.getAttacker()
  if (!player || !player.isPlayer() || player.level.clientSide) return
  let profile = dzArsenalProfile(player.mainHandItem)
  let required = dzArsenalRequiredTier(profile)
  if (!profile.gun || dzArsenalStoryTier(player) >= required) return
  event.setBaseAmount(0)
  dzArsenalDeny(player, profile, required)
})

global.pdzArsenalProfile = dzArsenalProfile
global.pdzArsenalRequiredTier = dzArsenalRequiredTier

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonearsenal')
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let profile = dzArsenalProfile(player.mainHandItem)
    let required = dzArsenalRequiredTier(profile)
    player.tell(Text.of('Story S' + dzArsenalStoryTier(player) + ' / ' + profile.id + ' / ' + profile.type).aqua())
    player.tell(Text.of('承認段階: ' + dzArsenalTierLabel(required))
      .color(dzArsenalStoryTier(player) >= required ? 'green' : 'red'))
    return 1
  }))
  event.register(root)
})
