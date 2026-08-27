# Reapply only the service-dialog UI. Safe to run after camp regeneration or NPC replacement.

# Maya / personal supply service (the normal trading button is preserved).
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonecampui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"camp_control",Name:"Camp Controlを開く"},{Actions:[{ExecAsUser:1b,PermLevel:0,Type:"OPEN_TRADING_SCREEN"}],Label:"open_trade",Name:"物資を確認する"},{Actions:[{Cmd:"/deadzonepeopleui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"personal_service",Name:"信頼と遠征配給をGUIで見る"},{Actions:[{Cmd:"/deadzonepeople service_maya",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"claim_service",Name:"遠征配給を受け取る"}]

# Shiori / personal medical service.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{ExecAsUser:1b,PermLevel:0,Type:"OPEN_TRADING_SCREEN"}],Label:"open_trade",Name:"医療物資を見る"},{Actions:[{Cmd:"/deadzonepeopleui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"personal_service",Name:"信頼と個人サービスをGUIで見る"},{Actions:[{Cmd:"/deadzonehealthui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"medical_diagnosis",Name:"負傷・感染治療ガイドを開く"},{Actions:[{Cmd:"/deadzonepeople service_shiori",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"claim_service",Name:"診療と医療配給を受ける"}]

# Goro / personal maintenance service.
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{ExecAsUser:1b,PermLevel:0,Type:"OPEN_TRADING_SCREEN"}],Label:"open_trade",Name:"工具と部品を見る"},{Actions:[{Cmd:"/deadzonepeopleui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"personal_service",Name:"信頼と整備箱をGUIで見る"},{Actions:[{Cmd:"/deadzonedefenseui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"defense_control",Name:"防衛・復旧ガイドを開く"},{Actions:[{Cmd:"/deadzonepeople service_goro",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"claim_service",Name:"整備箱を受け取る"}]

# Minato / JOB coordinator
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonecareerui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_status",Name:"クラス・JOB進行をGUIで見る"},{Actions:[{Cmd:"/deadzonecareerui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_paths",Name:"昇格ルートをGUIで見る"}]

# Hank / Buddy recruiter
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonebuddyui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_status",Name:"Buddyガイドを開く"},{Actions:[{Cmd:"/deadzonebuddycontrol follow",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_follow",Name:"同行を再開する"},{Actions:[{Cmd:"/deadzonebuddycontrol hold",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_hold",Name:"現在地で待機させる"},{Actions:[{Cmd:"/deadzonebuddycontrol recall",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_recall",Name:"近くへ呼び戻す"},{Actions:[{ExecAsUser:1b,PermLevel:0,Type:"OPEN_TRADING_SCREEN"}],Label:"emergency_armory",Name:"緊急装備の在庫を見る"}]

# Rei / radio operator
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzoneradio",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"world_status",Name:"定時情勢報告を開く"},{Actions:[{Cmd:"/deadzonestoryui",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"story_status",Name:"現在のメイン任務を開く"}]
