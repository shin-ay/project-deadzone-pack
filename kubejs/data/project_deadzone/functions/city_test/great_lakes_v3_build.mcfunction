tellraw @a [{"text":"[PDZ CITY v3] ","color":"gold","bold":true},{"text":"中心都市の造成を開始します。","color":"aqua"}]
forceload add ~-112 ~-112 ~111 ~111
function project_deadzone:city_test/great_lakes_v3_ground
function project_deadzone:city_test/great_lakes_v3_roads
function project_deadzone:city_test/great_lakes_v3_center
function project_deadzone:city_test/great_lakes_v3_buildings
function project_deadzone:city_test/great_lakes_v3_details
forceload remove ~-112 ~-112 ~111 ~111
tellraw @a [{"text":"[PDZ CITY v3] ","color":"green","bold":true},{"text":"造成完了。現在位置が都市中心です。","color":"white"}]
