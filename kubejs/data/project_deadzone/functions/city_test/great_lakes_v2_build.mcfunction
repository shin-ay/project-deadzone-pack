tellraw @s [{"text":"[PDZ CITY v2] ","color":"gold","bold":true},{"text":"道路を先行施工し、街区単位で建物を配置します。","color":"yellow"}]
forceload add ~-8 ~-8 ~231 ~231
function project_deadzone:city_test/great_lakes_v2_roads
function project_deadzone:city_test/great_lakes_v2_buildings
function project_deadzone:city_test/great_lakes_v2_details
forceload remove ~-8 ~-8 ~231 ~231
tellraw @s [{"text":"[PDZ CITY v2] ","color":"gold","bold":true},{"text":"224×224の都市街区プロトタイプを生成しました。","color":"green"}]
tellraw @s {"text":"APN apartment / house（灰色の反復建物）は配置プールから除外済みです。","color":"gray"}
