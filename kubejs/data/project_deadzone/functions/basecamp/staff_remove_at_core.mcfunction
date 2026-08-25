# Internal function. Execution position must be the base core anchor.
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_trader_clothing,distance=..32]
# Remove role-tagged leftovers from older builds even if they lost the shared tag.
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,distance=..32]
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,distance=..32]
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,distance=..32]
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,distance=..32]
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,distance=..32]
kill @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,distance=..32]
