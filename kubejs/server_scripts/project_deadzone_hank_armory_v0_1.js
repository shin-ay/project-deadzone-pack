// PROJECT DEADZONE Hank emergency armory v0.1
// Rotates a small, expensive recovery stock instead of restocking a fixed list.

const DZ_ARMORY_NEXT_ROTATION = "dz_hank_armory_next_rotation"
const DZ_ARMORY_INTERVAL_MS = 120 * 60 * 1000
const DZ_ARMORY_NPC = "@e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1]"

const DZ_ARMORY_WEAPONS = [
  {gun:"tacz:glock_17", ammo:"tacz:9mm", mode:"SEMI", price:32},
  {gun:"tacz:m1911", ammo:"tacz:45acp", mode:"SEMI", price:30},
  {gun:"tacz:cz75", ammo:"tacz:9mm", mode:"SEMI", price:30},
  {gun:"tacz:uzi", ammo:"tacz:9mm", mode:"AUTO", price:44},
  {gun:"tacz:m870", ammo:"tacz:12g", mode:"SEMI", price:48},
  {gun:"tacz:db_long", ammo:"tacz:12g", mode:"SEMI", price:36}
]

const DZ_ARMORY_AMMO = {
  "tacz:9mm": {count:30, price:8, maxUses:4},
  "tacz:45acp": {count:24, price:8, maxUses:4},
  "tacz:12g": {count:16, price:10, maxUses:3}
}

let dzArmoryTickCounter = 0

function dzArmoryShuffle(values) {
  let result = values.slice()
  for (let i = result.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    let temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

function dzArmoryWeaponOffer(spec) {
  return '{buy:{Count:' + spec.price + 'b,id:"lightmanscurrency:coin_copper"},buyB:{},' +
    'demand:0,maxUses:1,priceMultiplier:0.0f,rewardExp:0b,' +
    'sell:{Count:1b,id:"tacz:modern_kinetic_gun",tag:{GunFireMode:"' +
    spec.mode + '",GunId:"' + spec.gun + '",HasBulletInBarrel:1b}},' +
    'specialPrice:0,uses:0,xp:0}'
}

function dzArmoryAmmoOffer(ammoId) {
  let spec = DZ_ARMORY_AMMO[ammoId]
  return '{buy:{Count:' + spec.price + 'b,id:"lightmanscurrency:coin_copper"},buyB:{},' +
    'demand:0,maxUses:' + spec.maxUses + ',priceMultiplier:0.0f,rewardExp:0b,' +
    'sell:{Count:' + spec.count + 'b,id:"tacz:ammo",tag:{AmmoId:"' + ammoId + '"}},' +
    'specialPrice:0,uses:0,xp:0}'
}

function dzArmoryNpcExists(server) {
  return server.runCommandSilent("execute if entity " + DZ_ARMORY_NPC) > 0
}

function dzArmoryNpcNeedsStock(server) {
  return server.runCommandSilent(
    "execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter," +
    "tag=!dz_armory_rotated,limit=1]"
  ) > 0
}

function dzArmoryRotate(server, announce) {
  if (!dzArmoryNpcExists(server)) return false

  let weapons = dzArmoryShuffle(DZ_ARMORY_WEAPONS).slice(0, 2)
  let compatibleAmmo = []
  weapons.forEach(weapon => {
    if (!compatibleAmmo.includes(weapon.ammo)) compatibleAmmo.push(weapon.ammo)
  })

  // Always stock ammo for both selected weapons, then fill the second slot
  // randomly when both weapons share one caliber.
  let remainingAmmo = dzArmoryShuffle(
    Object.keys(DZ_ARMORY_AMMO).filter(id => !compatibleAmmo.includes(id))
  )
  while (compatibleAmmo.length < 2 && remainingAmmo.length > 0) {
    compatibleAmmo.push(remainingAmmo.shift())
  }

  let offers = []
  weapons.forEach(weapon => offers.push(dzArmoryWeaponOffer(weapon)))
  compatibleAmmo.forEach(ammo => offers.push(dzArmoryAmmoOffer(ammo)))

  let nbt = '{Offers:{Inventory:{},Recipes:{Recipes:[' + offers.join(",") +
    ']}},TradingData:{TradingDataSet:{LastReset:0L,MaxUses:4,' +
    'ResetsEveryMin:120,RewardedXP:0,Type:"BASIC"}}}'

  let result = server.runCommandSilent("data merge entity " + DZ_ARMORY_NPC + " " + nbt)
  if (result <= 0) return false

  server.runCommandSilent("tag " + DZ_ARMORY_NPC + " add dz_armory_rotated")
  server.persistentData.putLong(
    DZ_ARMORY_NEXT_ROTATION,
    Date.now() + DZ_ARMORY_INTERVAL_MS
  )

  console.info(
    "[PROJECT DEADZONE][Hank Armory] stock rotated: " +
    weapons.map(value => value.gun).join(", ") + " / " + compatibleAmmo.join(", ")
  )
  if (announce) {
    server.runCommandSilent(
      'tellraw @a [{"text":"[PROJECT DEADZONE] ","color":"gold"},' +
      '{"text":"ハンクの緊急装備在庫が更新されました。","color":"yellow"}]'
    )
  }
  return true
}

ServerEvents.tick(event => {
  dzArmoryTickCounter++
  if (dzArmoryTickCounter < 1200) return
  dzArmoryTickCounter = 0

  let server = event.server
  if (!dzArmoryNpcExists(server)) return

  let nextRotation = Number(server.persistentData.getLong(DZ_ARMORY_NEXT_ROTATION))
  if (dzArmoryNpcNeedsStock(server) || nextRotation <= 0 || Date.now() >= nextRotation) {
    dzArmoryRotate(server, nextRotation > 0)
  }
})

PlayerEvents.loggedIn(event => {
  let server = event.player.server
  server.scheduleInTicks(100, callback => {
    if (!dzArmoryNpcExists(server)) return
    let nextRotation = Number(server.persistentData.getLong(DZ_ARMORY_NEXT_ROTATION))
    if (dzArmoryNpcNeedsStock(server) || nextRotation <= 0 || Date.now() >= nextRotation) {
      dzArmoryRotate(server, false)
    }
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonearmory")

  root.then(Commands.literal("status").executes(ctx => {
    let server = ctx.source.server
    let next = Number(server.persistentData.getLong(DZ_ARMORY_NEXT_ROTATION))
    let minutes = next <= 0 ? 0 : Math.max(0, Math.ceil((next - Date.now()) / 60000))
    ctx.source.player.tell(Text.of(
      "Hank Armory: 次の入荷まで約" + minutes + "分"
    ).gold())
    return 1
  }))

  root.then(Commands.literal("rotate")
    .requires(source => source.hasPermission(2))
    .executes(ctx => dzArmoryRotate(ctx.source.server, true) ? 1 : 0))

  event.register(root)
})
