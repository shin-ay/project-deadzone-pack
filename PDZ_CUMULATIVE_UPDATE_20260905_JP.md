# PROJECT DEADZONE 累積更新 2026-09-05

配布版: `BETA-20260905-STORY-ARSENAL-TAA-1`

## 初回導入・村

- 初期村スポーンはVillage Spawn Pointを実行所有者として維持する。
- Recruitsとの初期化競合を専用互換JARで回避する。
- 読み込まれた村をVillage Recruits勢力として自動認識し、独立した道路生成を抑止する。
- Camp候補距離、村サービス配置、Bountiful Board重複、旧Affix作業台横取りを整理する。
- Recruits雇用費をEmeraldからPDZ Creditへ統一する。

## Story Arsenal

- TaCZ Weapon Research & Blueprints 1.1とFzzy Config 0.5.9を追加する。
- 銃本体を研究対象とし、弾薬とアタッチメントは自由にする。
- Story S0～S3、JOB、Boss報酬、車両承認、レシピ段階の橋渡しを追加する。
- LR Tactical手榴弾のブロック破壊を無効化する。
- JOB UIを0.5.3へ更新する。

## TaCZ Tweaks / TAA

- TaczAttributeAdd 1.3.8を追加する。
- TaCZ Tweaksは操作・移動・First Aid/LSO/MTS互換を担当する。
- TAAはADS、装填、反動、精度、射程、弾速、装弾数、弾数などのビルド補正を担当する。
- TaCZ Tweaksの数値Modifierは全項目を等倍に固定し、TAAと二重補正しない。
- 銃ダメージ属性は今回1.0のままにし、PDZ/M&Sの現行ダメージ処理へ重ねない。

## 既知の試験項目

- Weapon Researchの正式なS0～S3研究グラフは実カタログ出力後に確定する。現状はPDZのStory承認ガードも併用する。
- TAAはTaCZ改造画面へMixinするため、改造画面、ツールチップ、反動、マルチショットを実機確認する。
- 新規ワールドで村スポーン、Camp距離、Village Recruits自動認識を確認する。
