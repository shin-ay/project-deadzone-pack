# PROJECT DEADZONE レシピ・スキル制限監査 v0.2

更新日: 2026-08-02

## 結論

Puffish Skillsの説明とCraftTweakerのRecipeStages定義は、Engineeringの3分岐とMechanicsのVehicle分岐で対応している。
ただし旧定義はImmersive Engineering（IE）の大型機械を完成品IDで封鎖しており、IEは構造物をワールド内で形成する方式なので実際の制限として機能しない箇所があった。v0.2で形成用部材へ変更した。

MechanicsのRepair／Salvageはレシピ解禁ではなく、修理効率・回収効率を変える能力であるためRecipeStages対象外で正しい。

## 現在の対応表

| Skill Stage | 対象 | 状態 |
|---|---|---|
| Engineering Industry 1 | Create Depot/Press/Mixer、IE Workbench/Blast Furnace | Createは有効。IEはWorkbenchとBlastbrickを制限 |
| Engineering Industry 2 | Create Crushing Wheel/Deployer、IE Metal Press/Mixer/Auto Workbench | Createは有効。IE共通のHeavy Engineeringを制限 |
| Engineering Industry 3 | Create Mechanical Crafter/Steam Engine、IE Arc Furnace/Refinery/Diesel Generator | Createは有効。IE Reinforced Blastbrick/Radiator/Generatorを制限 |
| Engineering Fortification 1–3 | Building Gadgets、IE Gun/Chemical Turret | 有効 |
| Engineering Weapons 1–2 | IE Gunpart Hammer/Drum/Barrel | 有効 |
| Engineering Weapons 3 | Superb Warfare全レシピ | MOD ID `superbwarfare`、477レシピを対象 |
| Mechanics Vehicle 1 | Blocky Bikes全レシピ | MOD ID `blocky_bikes`、125レシピを対象 |
| Mechanics Vehicle 2 | Vehicle Mod全レシピ | MOD ID `vehicle`、64レシピを対象 |
| Mechanics Vehicle 3 | Immersive Aircraft全レシピ | MOD ID `immersive_aircraft`、27レシピを対象 |

## 確認済みの不具合と修正

- Recipe Stage同期スクリプトの日本語文字列と引用符が破損していたため、UTF-8の正常なv0.2へ全面修復。
- Repair／Salvageの6ステージをRecipe Stage同期対象から除外。これらはレシピ制限を持たない効果スキル。
- IE大型機械の存在しないクラフト完成品への指定を、実在する形成用部材へ変更。
- Create、Building Gadgets、Superb Warfare、Blocky Bikes、Vehicle Mod、Immersive Aircraftの実MOD IDをJAR内recipe namespaceと照合済み。

## 残る仕様上の限界

IEのMixer、Auto Workbench、Refineryは複数の大型機械と汎用部材を共有する。RecipeStagesだけで各機械の形成を完全に個別封鎖すると、同Tierの別設備や通常建築まで巻き込む。

そのため現段階では「主要な形成用部材による進行制限」とする。完全な個別制限が必要になった場合は、Engineer Hammerによるマルチブロック形成操作をKubeJSまたは専用互換MODで判定する。

## ゲーム内確認

1. `/reload`後、CraftTweakerエラーがないことを確認。
2. `/deadzoneprogression audit`で不一致が0になることを確認。
3. 未取得状態でJEIの対象レシピがロックされ、取得後に解禁されることを確認。
4. Industry 1でBlastbrick、Industry 2でHeavy Engineering、Industry 3でReinforced Blastbrick/Radiator/Generatorが解禁されることを確認。
