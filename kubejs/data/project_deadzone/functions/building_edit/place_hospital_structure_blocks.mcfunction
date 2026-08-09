# ストラクチャーブロックの相対位置上限は各軸±48のため、外周への36個常設は使用しない。
function project_deadzone:building_edit/clear_hospital_structure_blocks
tellraw @s [{"text":"外周常設方式は座標上限により廃止しました。","color":"yellow"},{"text":" [36区画を自動保存]","color":"aqua","underlined":true,"clickEvent":{"action":"run_command","value":"/function project_deadzone:building_edit/save_hospital_all"}}]
