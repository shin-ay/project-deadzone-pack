tellraw @s {"text":"[PROJECT DEADZONE] キャンプ職員チェック","color":"gold","bold":true}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,distance=..32] run tellraw @s {"text":"  OK  ミナト / JOB案内","color":"green"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,distance=..32] run tellraw @s {"text":"  NG  ミナト / JOB案内","color":"red"}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,distance=..32] run tellraw @s {"text":"  OK  レイ / 無線","color":"green"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,distance=..32] run tellraw @s {"text":"  NG  レイ / 無線","color":"red"}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,distance=..32] run tellraw @s {"text":"  OK  ハンク / Buddy","color":"green"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,distance=..32] run tellraw @s {"text":"  NG  ハンク / Buddy","color":"red"}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,distance=..32] run tellraw @s {"text":"  OK  マヤ / 食料","color":"green"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,distance=..32] run tellraw @s {"text":"  NG  マヤ / 食料","color":"red"}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,distance=..32] run tellraw @s {"text":"  OK  シオリ / 医療","color":"green"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,distance=..32] run tellraw @s {"text":"  NG  シオリ / 医療","color":"red"}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,distance=..32] run tellraw @s {"text":"  OK  ゴロー / 工具・部品","color":"green"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,distance=..32] run tellraw @s {"text":"  NG  ゴロー / 工具・部品","color":"red"}
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_clothing,distance=..32] run tellraw @s {"text":"  OK  ユイ / 衣料品（専用管理）","color":"aqua"}
execute unless entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_clothing,distance=..32] run tellraw @s {"text":"  --  ユイ / 衣料品は専用コマンドで配置","color":"gray"}
