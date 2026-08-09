# Run while standing at the exact block where players should respawn.
gamerule spawnRadius 0
setworldspawn ~ ~ ~
spawnpoint @a ~ ~ ~
tellraw @a {"text":"[PROJECT DEADZONE] 全プレイヤーのリスポーン地点をBase Campへ設定しました","color":"green","bold":true}
