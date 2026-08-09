# PROJECT DEADZONE 一括テスト：キャンプ反復依頼

## 前提

- サーバーと全クライアントを再起動する。
- JOB選択とSurvivor Camp到達を済ませる。

## 一括確認

1. Base Coreを右クリックし、「依頼掲示板を開く」を押す。
2. `/deadzonecontracts` でも同じ一覧が表示されることを確認する。
3. 感染者掃討を受注し、感染者を倒すと進捗が増えることを確認する。
4. `/deadzonecontracts turnin` で未達成時は報酬を受け取れないことを確認する。
5. OPで `/deadzonecontracts reset_all` を実行する。
6. 共同備蓄を受注し、パン8個と `survival_instinct:gallon_of_water` 1個を所持して納品する。
7. Apocalypse Now MoneyとSurvival XPが付与され、素材が消費されることを確認する。
8. 完了直後、同じ依頼が30分待機になることを確認する。
9. World Tier 0では「略奪者の排除」が非表示、T1以降では表示されることを確認する。

## 探索準備トリガー

1. `/deadzonestory prep_status` を実行する。
2. 食料2、飲料1、治療用品2、武器1の各行が表示される。
3. 条件不足では「探索準備」が完了しない。
4. 4条件を同時に満たすと自動完了する。
5. Gas Stationボスへ接近しただけでは完了しない。

## 水分互換

- Survival Instinctの水・ソーダ・ジュースで水分が回復する。
- Apocalypse Nowの缶入り水・エナジードリンク・コーヒーで水分が回復する。

## ラグ確認

- サーバー再起動後、`view-distance=6`、`simulation-distance=5`になっていることを確認する。
- 未生成市街地へ複数人で移動し、引き戻しの頻度を確認する。
- 継続する場合は、再現直前に `/spark profiler start --timeout 60` を実行する。
