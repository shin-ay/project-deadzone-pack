# NPC勢力バランステスト v0.2

ゲームを完全に再起動してから実施する。TacZ NPCのconfigは`/reload`だけでは反映されない場合がある。

## 変更

- Civil Defense PMC: 最大HP 20、Armor 2
- Raiders: 1部隊4人から7人
- Survivor: 村人モデルから`TacZ: NPCs`のプレイヤー型モデルへ変更
- Survivor skin: `villager1.png`と`villager2.png`からランダム

## 確認コマンド

`/function project_deadzone:factions/test/spawn_all`

確認:

1. Survivorがプレイヤー型モデルで2種類の見た目になる
2. Survivorがゾンビ、Raiders、Remnantを敵として認識する
3. Civil Defenseが以前より短時間で倒せる
4. Raidersが7人で出現する
5. Minecraft teamによる同士討ち防止が維持される

## 独自スキン化

64x64のMinecraftプレイヤースキンPNGをリソースパックへ追加し、
`config/tacznpc_loadouts.json`の`survivors.skin[].id`を差し替える。
