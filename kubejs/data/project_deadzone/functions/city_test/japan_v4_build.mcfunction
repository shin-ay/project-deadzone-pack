tellraw @a [{"text":"[PDZ CITY V4] ","color":"gold","bold":true},{"text":"日本型・地上整合性パイロットを生成します。","color":"aqua"}]
forceload add ~-112 ~-112 ~111 ~111
function project_deadzone:city_test/japan_v4_prepare
function project_deadzone:city_test/japan_v4_roads
function project_deadzone:city_test/japan_v4_create_rail
function project_deadzone:city_test/japan_v4_buildings
function project_deadzone:city_test/japan_v4_details
forceload remove ~-112 ~-112 ~111 ~111
tellraw @a [{"text":"[PDZ CITY V4] ","color":"green","bold":true},{"text":"生成完了。道路・入口・敷地・Create鉄道を地上視点で確認してください。","color":"white"}]
