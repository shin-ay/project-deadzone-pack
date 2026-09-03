# Adds service buttons to Minato and Hank without replacing their random dialog texts.

# Minato: class/career guidance. Promotions are validated by the server.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonecareer status",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_status",Name:"クラスと進捗を確認する"},{Actions:[{Cmd:"/deadzonecareer paths",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_paths",Name:"昇格できるJOBを確認する"},{Actions:[{Cmd:"/ftbquests open_book",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_quests",Name:"キャリア章を開く"}]

# Hank: Buddy status and expensive emergency weapon/ammo reserve.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonebuddycontrol status",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_status",Name:"Buddyの状況を確認する"},{Actions:[{Cmd:"/deadzonebuddycontrol follow",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_follow",Name:"同行を再開する"},{Actions:[{Cmd:"/deadzonebuddycontrol hold",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_hold",Name:"現在地で待機させる"},{Actions:[{Cmd:"/deadzonebuddycontrol recall",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_recall",Name:"近くへ呼び戻す"},{Actions:[{ExecAsUser:1b,PermLevel:0,Type:"OPEN_TRADING_SCREEN"}],Label:"emergency_armory",Name:"緊急装備の在庫を見る"}]
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.DialogDataSet[0].Buttons append value {Actions:[{Cmd:"/deadzonebuddycontrol roles",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_roles",Name:"Buddyの役割を設定する"}
execute at @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] positioned ~-2 ~-1 ~ run setblock ~ ~ ~ simpleenemymod:recruit_table

# Weapons are deliberately limited to T0 recovery gear. Better guns remain exploration rewards.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] Offers set value {Inventory:{},Recipes:{Recipes:[{buy:{Count:32b,id:"lightmanscurrency:coin_copper"},buyB:{},demand:0,maxUses:1,priceMultiplier:0.0f,rewardExp:0b,sell:{Count:1b,id:"tacz:modern_kinetic_gun",tag:{GunFireMode:"SEMI",GunId:"tacz:glock_17",HasBulletInBarrel:1b}},specialPrice:0,uses:0,xp:0},{buy:{Count:48b,id:"lightmanscurrency:coin_copper"},buyB:{},demand:0,maxUses:1,priceMultiplier:0.0f,rewardExp:0b,sell:{Count:1b,id:"tacz:modern_kinetic_gun",tag:{GunFireMode:"SEMI",GunId:"tacz:m870",HasBulletInBarrel:1b}},specialPrice:0,uses:0,xp:0},{buy:{Count:8b,id:"lightmanscurrency:coin_copper"},buyB:{},demand:0,maxUses:4,priceMultiplier:0.0f,rewardExp:0b,sell:{Count:30b,id:"tacz:ammo",tag:{AmmoId:"tacz:9mm"}},specialPrice:0,uses:0,xp:0},{buy:{Count:8b,id:"lightmanscurrency:coin_copper"},buyB:{},demand:0,maxUses:4,priceMultiplier:0.0f,rewardExp:0b,sell:{Count:24b,id:"tacz:ammo",tag:{AmmoId:"tacz:45acp"}},specialPrice:0,uses:0,xp:0},{buy:{Count:10b,id:"lightmanscurrency:coin_copper"},buyB:{},demand:0,maxUses:3,priceMultiplier:0.0f,rewardExp:0b,sell:{Count:16b,id:"tacz:ammo",tag:{AmmoId:"tacz:12g"}},specialPrice:0,uses:0,xp:0}]}}
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] TradingData set value {TradingDataSet:{LastReset:0L,MaxUses:4,ResetsEveryMin:120,RewardedXP:0,Type:"BASIC"}}
tag @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter] remove dz_armory_rotated

# Goro / parts trader: industrial repair desk. The command runs as the player,
# so JOB discounts and the player's own materials are applied safely.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,limit=1] DialogData.DialogDataSet[0].Buttons append value {Actions:[{Cmd:"/deadzonerepair service",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"equipment_repair",Name:"装備の完全修理を依頼する"}

# Rei: accept the first real expedition from the radio desk.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonestory briefing",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"chapter1_briefing",Name:"最初の探索任務を受ける"}]

tellraw @a[distance=..64] {"text":"[PROJECT DEADZONE] JOB管理とBuddy緊急装備サービスを更新しました","color":"gold"}
