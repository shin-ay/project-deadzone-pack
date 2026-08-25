tellraw @s [{"text":"[PDZ CITY BUILD] ","color":"gold","bold":true},{"text":"都市生成テスト","color":"aqua"}]
tellraw @s [{"text":"V4 日本型・地上整合性・Create鉄道版: ","color":"yellow"},{"text":"/function project_deadzone:city_test/load_japan_v4","color":"green","underlined":true,"clickEvent":{"action":"suggest_command","value":"/function project_deadzone:city_test/load_japan_v4"}}]
tellraw @s {"text":"現在位置を駅前中心として、局所造成、道路階層、歩道、入口導線、Create線路、建物の順に生成します。","color":"gray"}
tellraw @s [{"text":"V3 中心核・造成地盤・道路階層版: ","color":"yellow"},{"text":"/function project_deadzone:city_test/load_great_lakes_v3","color":"green","underlined":true,"clickEvent":{"action":"suggest_command","value":"/function project_deadzone:city_test/load_great_lakes_v3"}}]
tellraw @s {"text":"現在位置を都市中心にして、224x224の地盤、幹線道路、街区、建物の順に生成します。水上でも試験可能です。","color":"gray"}
tellraw @s [{"text":"旧V2 比較用: ","color":"dark_gray"},{"text":"/function project_deadzone:city_test/load_great_lakes_v2","color":"gray","clickEvent":{"action":"suggest_command","value":"/function project_deadzone:city_test/load_great_lakes_v2"}}]
