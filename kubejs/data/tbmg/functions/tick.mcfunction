# Preserve TBMG's bile-bucket exchange without serializing each player's full NBT three times per tick.
execute as @a store result score @s tbmg_bile_count run clear @s spore:bucket_of_bile 0
execute as @a[scores={tbmg_bile_count=1..}] run give @s spore:crusted_bile
execute as @a[scores={tbmg_bile_count=1..}] run give @s minecraft:bucket
execute as @a[scores={tbmg_bile_count=1..}] run clear @s spore:bucket_of_bile 1
