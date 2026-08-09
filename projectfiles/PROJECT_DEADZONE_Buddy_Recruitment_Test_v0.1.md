# ソロ用バディ・リクルート試験 v0.1

追加MODなし。導入済み`Simple Enemy Mod`のRecruit Tableを使用する。

## 拠点への設置

Survivor拠点で受付にしたいブロック位置へ立ち、次を実行する。

`/function project_deadzone:factions/recruitment/place_table`

正式実装時は建物Editorで`simpleenemymod:recruit_table`をSurvivor拠点へ直接設置してよい。

## 雇用

1. 鉄インゴット12個をメインハンドに持つ
2. Recruit Tableを右クリック
3. プレイヤー所有のPMCバディが生成される

テスト素材:

`/function project_deadzone:factions/recruitment/test_kit`

## バディ操作

- バディを右クリック: 装備・所持品画面
- `F6`: Commander Menu（Cキーの6重競合を回避）
- Commander Menuから追従、待機、移動、射撃停止などの命令を選ぶ
- 所有者UUIDとInventoryはワールド保存される

## 初期運用案

- ソロ: 最大2人を目安
- マルチ: 1プレイヤー1人を目安
- 死亡: 復活なし。再雇用
- 契約費: 鉄インゴット12個（テスト後に専用契約書またはFaction Reputationへ変更）

## 確認項目

1. 雇用者本人の命令だけを受ける
2. プレイヤーへ追従する
3. ゾンビ・敵勢力と戦う
4. 右クリックで装備と所持品を変更できる
5. ディメンション移動と再ログイン後も所有者・Inventoryが残る
6. 遠距離移動時に置き去り、窒息、フレンドリーファイアが起きない
