# PROJECT DEADZONE Design Handoff — 2026-07-30

## 完成したデータ

### 装備台帳

- `deadzone_gun_catalog_v0_1.csv`
  - TaCZ Gun ID 223件
  - 東側／西側・民間／架空
  - 旧式／新式
  - 武器クラス
  - 推奨World Tierと希少度
- `deadzone_armor_catalog_v0_1.csv`
  - バニラ除外
  - 装備候補404件
  - 部位、セットキー、用途カテゴリ、推奨Tier
- `deadzone_equipment_catalog_summary_v0_1.md`
  - 件数集計

### NPC

- `deadzone_npc_loadout_matrix_v0_1.csv`
  - 4勢力、27ロードアウト
  - 役職・Tier・銃・防具・分隊比率
- `deadzone_armor_profiles_v0_1.csv`
  - 16防具プロファイル
- `deadzone_npc_tier_scaling_spec_v0_2.md`
  - HP、防御、射撃、命中、役職解放、ダウン仕様

### クエストと進行

- `deadzone_faction_quest_progression_v0_1.csv`
  - T0からT5まで12段階
  - 建物、攻略目標、勢力、Boss候補、レシピ・装備解放

## ライブ環境へまだ適用していない部分

以下は明日のNPC Tier診断後に有効化する。

- TaCZ射撃ダメージ倍率
- NPC命中精度
- World Tier別の自動ロードアウト切替
- 分隊構成とスポーン比率
- FTB Questsへのクエストライン書き出し

HP・防御の基盤が動いていない状態で上記を重ねると原因切り分けが難しくなるため、設計とID検証まで完了した状態で止めている。

## 明日の最初のテスト

ゲームを完全再起動する。

```mcfunction
/deadzonestory set tier_0
/deadzonefaction inspect
/deadzonestory set tier_5
/deadzonefaction inspect
```

期待値の例:

- Remnant Heavy T0: HP 44 / Armor 10
- Remnant Heavy T5: HP 61.6 / Armor 15
- Civil Defense Guard T0: HP 20 / Armor 2
- Civil Defense Guard T5: HP 24 / Armor 4.5

`latest.log` では次を検索する。

```text
[DEADZONE NPC TIER]
```

## 診断後の分岐

### HP・防御が変わる

1. TaCZ射撃ダメージ倍率を有効化
2. T0/T3/T5のNPC装備プールを接続
3. 分隊構成を接続
4. マルチで体感調整

### HP・防御が変わらない

1. `[DEADZONE NPC TIER]` の有無を確認
2. ログがなければ対象タグ・イベント登録を修正
3. ログがあり数値が戻るならNPC MODの属性上書き対策へ変更
4. 補正処理をKubeJS側の定期再適用またはSpawn finalizeへ移す

## 自動台帳の再生成

TaCZパックやMODを追加・削除した場合:

```powershell
$source = Get-Content -Raw -Encoding UTF8 -LiteralPath ".\projectfiles\tools\build_deadzone_design_catalogs.ps1"
& ([scriptblock]::Create($source))
```

これにより銃・アーマー台帳と集計が現在のインスタンス内容から再生成される。
