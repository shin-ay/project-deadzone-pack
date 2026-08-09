# PROJECT DEADZONE NPC World Tier Scaling v0.2

## 方針

World Tierは単純なHP増加だけでなく、NPCの構成・装備・行動を段階的に変える。
通常個体を弾の吸収体にしない。高耐久はHeavy、Commander、Bossに限定する。

## 数値補正

| 勢力 | HP / Tier | Armor / Tier | 射撃ダメージ / Tier | 命中補正 / Tier | 備考 |
|---|---:|---:|---:|---:|---|
| Survivor | +3% | +0.25 | +2% | +1% | プレイヤー支援側 |
| Raiders | +6% | +0.5 | +3% | +1% | 数で圧力をかける |
| Civil Defense | +4% | +0.5 | +3% | +2% | 安定した分隊行動 |
| Remnant | +8% | +1.0 | +4% | +3% | 少数精鋭 |

射撃ダメージはTaCZイベントで倍率適用する。命中精度はNPC MODが公開する属性・設定を確認してから接続する。

## Tierごとの変化

| Tier | 構成変化 | 装備変化 | 特殊役職 |
|---|---|---|---|
| T0 | 民間人・小規模Raiders | 民間銃・旧式銃 | Scout |
| T1 | Medicを低確率追加 | 防弾ベスト・旧式軍用銃 | Medic / Enforcer |
| T2 | Civil Defense分隊、Remnant偵察 | 中装甲・標準軍用銃 | Officer / Marksman |
| T3 | Remnant正規分隊 | 新式銃・重装備 | Heavy |
| T4 | 精鋭分隊・拠点防衛 | 新式高性能銃 | Elite / Commander |
| T5 | ボス護衛・最終地域 | Exo・特殊武器 | Boss専用 |

## ダウン・蘇生

- 通常NPC: 1回だけダウン可能
- ダウン中: 追撃3回まで保護、4回目で処刑
- 通常出血時間: 15秒
- Medic蘇生: 3秒
- Tier 3以降のMedic: 蘇生時間を2.5秒へ短縮候補
- Heavy: 出血時間を20秒へ延長候補
- Boss: 個別フェーズ制御を使い、通常ダウン処理の対象外

## 明日確認する項目

1. `/deadzonestory set tier_0`
2. 対象NPCの近くで `/deadzonefaction inspect`
3. `/deadzonestory set tier_5`
4. 同じNPCで `/deadzonefaction inspect`
5. `latest.log` の `[DEADZONE NPC TIER]` を確認

HPとArmorが変化していれば次にTaCZ射撃ダメージ補正を有効化する。
変化していなければNPC MOD側の属性上書きを回避する同期方式へ変更する。
