# Reapply only the service-dialog UI. Safe to run after camp regeneration or NPC replacement.

# Minato / JOB coordinator
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonecareer status",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_status",Name:"クラスと進捗を確認する"},{Actions:[{Cmd:"/deadzonecareer paths",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_paths",Name:"昇格できるJOBを確認する"},{Actions:[{Cmd:"/ftbquests open_book",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_quests",Name:"キャリア章を開く"}]

# Hank / Buddy recruiter
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonebuddycontrol status",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_status",Name:"Buddyの状況を確認する"},{Actions:[{Cmd:"/deadzonebuddycontrol follow",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_follow",Name:"同行を再開する"},{Actions:[{Cmd:"/deadzonebuddycontrol hold",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_hold",Name:"現在地で待機させる"},{Actions:[{Cmd:"/deadzonebuddycontrol recall",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_recall",Name:"近くへ呼び戻す"},{Actions:[{Cmd:"/deadzonebuddycontrol roles",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"buddy_roles",Name:"Buddyの役割を設定する"},{Actions:[{ExecAsUser:1b,PermLevel:0,Type:"OPEN_TRADING_SCREEN"}],Label:"emergency_armory",Name:"緊急装備の在庫を見る"}]

# Rei / radio operator
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.Type set value "CUSTOM"
data modify entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,limit=1] DialogData.DialogDataSet[0].Buttons set value [{Actions:[{Cmd:"/deadzonestory briefing",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"chapter1_briefing",Name:"最初の探索任務を受ける"}]
