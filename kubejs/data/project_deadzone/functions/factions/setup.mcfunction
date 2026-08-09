scoreboard objectives add dz_faction dummy
scoreboard objectives add dz_control dummy
team add dz_survivors
team modify dz_survivors color green
team modify dz_survivors friendlyFire false
team modify dz_survivors seeFriendlyInvisibles true
team add dz_civildef
team modify dz_civildef color blue
team modify dz_civildef friendlyFire false
team modify dz_civildef seeFriendlyInvisibles true
team add dz_raiders
team modify dz_raiders color red
team modify dz_raiders friendlyFire false
team modify dz_raiders seeFriendlyInvisibles true
team add dz_remnant
team modify dz_remnant color dark_red
team modify dz_remnant friendlyFire false
team modify dz_remnant seeFriendlyInvisibles true
scoreboard players set #survivors dz_faction 0
scoreboard players set #civildef dz_faction 0
scoreboard players set #raiders dz_faction 0
scoreboard players set #remnant dz_faction 0
tellraw @a {"text":"[DEADZONE] NPC勢力基盤を初期化しました","color":"dark_aqua"}
