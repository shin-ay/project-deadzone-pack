tellraw @s [{"text":"[PDZ SETTLEMENT TEST] ","color":"gold","bold":true},{"text":"村Jigsaw方式の避難集落を生成します。","color":"aqua"}]
tellraw @s [{"text":"小規模・前哨避難所: ","color":"yellow"},{"text":"/function project_deadzone:settlement_test/load_small","color":"green","clickEvent":{"action":"suggest_command","value":"/function project_deadzone:settlement_test/load_small"}}]
tellraw @s [{"text":"中規模・交易集落: ","color":"yellow"},{"text":"/function project_deadzone:settlement_test/load_medium","color":"green","clickEvent":{"action":"suggest_command","value":"/function project_deadzone:settlement_test/load_medium"}}]
tellraw @s [{"text":"大規模・HAVEN居住区: ","color":"yellow"},{"text":"/function project_deadzone:settlement_test/load_large","color":"green","clickEvent":{"action":"suggest_command","value":"/function project_deadzone:settlement_test/load_large"}}]
tellraw @s {"text":"平坦で既存施設から120ブロック以上離れた場所で実行してください。各集落は道路・区画をJigsaw生成し、外周を防壁で囲みます。","color":"gray"}
