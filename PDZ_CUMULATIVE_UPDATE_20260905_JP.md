# PROJECT DEADZONE 累積更新 2026-09-05

配布版: `BETA-20260905-STORY-ARSENAL-RC4-1`

## 初回導入・村

- 初期村スポーンはVillage Spawn Pointを実行所有者として維持する。
- Recruitsとの初期化競合を専用互換JARで回避する。
- 読み込まれた村をVillage Recruits勢力として自動認識し、独立した道路生成を抑止する。
- Camp候補距離、村サービス配置、Bountiful Board重複、旧Affix作業台横取りを整理する。
- Recruits雇用費をEmeraldからPDZ Creditへ統一する。

## Story Arsenal

- TaCZ Weapon Research & Blueprints 1.1とFzzy Config 0.5.9を追加する。
- 銃本体を研究対象とし、弾薬とアタッチメントは自由にする。
- ローカルで検出した全494銃をS0 149／S1 222／S2 95／S3 28へ分類する。
- S0はGlock 17、S1はGas Station BossのM4A1、S2はPolice Station BossのM700、S3はRadio Tower BossのRPG7を研究入口にする。
- Boss撃破後は研究ポイントと素材を使い、同段階の欲しい銃を研究する。
- 物理Blueprintにも同じ前提を適用し、未解禁段階の飛び越しを防ぐ。
- 旧TaCZ RecipeStageを廃止し、Weapon Researchを銃本体の製造・研究解禁の唯一の所有者にする。
- 使用時ガードも研究ツリーと同じ生成カタログを参照し、分類の食い違いを防ぐ。
- Jキーの兵器研究端末、研究ベンチの主要表示とFTB戦闘訓練を日本語化する。
- Story S0～S3、JOB、Boss報酬、車両承認、レシピ段階の橋渡しを維持する。
- LR Tactical手榴弾のブロック破壊を無効化する。
- JOB UIを0.5.3へ更新する。

## TaCZ Tweaks / TAA

- TaczAttributeAdd 1.3.8を追加する。
- TaCZ Tweaksは操作・移動・First Aid/LSO/MTS互換を担当する。
- TAAはADS、装填、反動、精度、射程、弾速、装弾数、弾数などのビルド補正を担当する。
- TaCZ Tweaksの数値Modifierは全項目を等倍に固定し、TAAと二重補正しない。
- 銃ダメージ属性は今回1.0のままにし、PDZ/M&Sの現行ダメージ処理へ重ねない。

## 既知の試験項目

- Weapon ResearchのS0～S3研究グラフは静的監査済み。次回起動時にDatapack読込、J画面、研究ベンチ、Boss解禁Capabilityを実機確認する。
- TAAはTaCZ改造画面へMixinするため、改造画面、ツールチップ、反動、マルチショットを実機確認する。
- 新規ワールドで村スポーン、Camp距離、Village Recruits自動認識を確認する。
