summon simpleenemymod:ruunit ~ ~ ~ {Tags:["dz_npc","dz_remnant","dz_hostile","dz_unassigned"],CustomName:'{"text":"Remnant Soldier","color":"dark_red"}',PersistenceRequired:1b}
team join dz_remnant @e[tag=dz_unassigned,tag=dz_remnant,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_remnant,distance=..4,sort=nearest,limit=1] remove dz_unassigned
