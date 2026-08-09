# Skill Tier Gate テスト v0.1

## 制限

| World Tier | 取得可能なスキル |
|---:|---|
| T0 | Core Lv1 |
| T1 | Core Lv2、各分岐Tier 1 |
| T2 | Core Lv3～4、各分岐Tier 2 |
| T3以上 | Core Lv5～6、各分岐Tier 3 |

現在のツリーは3段階構成のため、T4とT5では将来追加するSpecialist／Masteryスキルを解禁する。

## テスト

```mcfunction
/reload
/deadzonestory set tier_0
/deadzoneskillgate sync
```

Kでツリーを開き、Core Lv1以外を取得できないことを確認する。

```mcfunction
/deadzonestory set tier_1
```

約5秒待つか`/deadzoneskillgate sync`を実行し、Core Lv2とTier 1 Perkが取得可能になることを確認する。

同様にT2、T3を確認する。

既に取得済みの上位スキルは自動削除しない。厳密な新規進行テストでは、既存の各Skill Tree用リセットコマンドを実行してから確認する。
