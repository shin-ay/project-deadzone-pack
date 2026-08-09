# PROJECT DEADZONE 役割施設改装計画 v0.1（2026-07-31更新）

## 進行の基本

World Tierはマルチ共通とし、主要施設の攻略・復旧を全参加者へ反映する。

| Tier | ストーリー段階 | 主な施設・勢力 | 主な解禁 |
|---:|---|---|---|
| T0 | Stranded | 開始地点、最後の放送 | JOB、Starter Kit |
| T1 | Survivor | Survivor避難所 | 基本生存設備、T1装備 |
| T2 | Scavenger | Raider占拠警察署 | 都市Loot、民間銃器、基礎修理 |
| T3 | Operator | 消防署、通信施設 | Tactical Loot、通信、拠点防衛 |
| T4 | Specialist | 病院、軍事施設 | 高度医療、車両、工業設備 |
| T5 | Deadzone Veteran | 研究施設、最終拠点 | 最終レシピ、最終Perk、エンディング |

## 主要施設の役割

### Survivor避難所

- PrologueとChapter 1のハブ
- JOB管理、Buddy募集、交易、納品
- 物資不足と最初の救助依頼を提示

### 警察署

- Raidersが占拠
- Chapter 2最初の本格攻略施設
- 指揮官撃破と武器庫確保でT2へ進行

### 消防署

- Civil Defenseの救難信号または包囲拠点
- 発電、消火、救助装備を回収
- 通信設備復旧への導線

### 病院

- 感染者と特殊変異体が占拠
- 医療記録と感染サンプルを回収
- 高度医療、感染耐性、研究施設への手掛かり

### 軍事施設

- Remnant Militaryが占拠
- 重装備、弾薬、軍用車両を配置
- Superb Warfareと軍用品の解禁地点

### 研究施設

- DEADZONE Protocolの真相
- 最終Boss群とエンディング分岐

## 改装用コマンド一覧

### 建物を編集ワールドへ読み込む

コマンド実行者の現在位置を基準に建物を配置する。十分に平坦で空いた場所に立って実行する。

```mcfunction
/function project_deadzone:building_edit/load_policestation
/function project_deadzone:building_edit/load_firestation
/function project_deadzone:building_edit/load_hospital
/function project_deadzone:building_edit/load_school
/function project_deadzone:building_edit/load_walmart
/function project_deadzone:building_edit/load_observatory
/function project_deadzone:building_edit/load_radio_tower
/function project_deadzone:building_edit/load_watch_tower
/function project_deadzone:building_edit/load_aircraft_carrier
/function project_deadzone:building_edit/load_survivor_camp
```

実動状態のSurvivor Campを確認する場合：

```mcfunction
/function project_deadzone:building_edit/load_survivor_camp_active
```

### 編集対象施設のサイズ表

ChaosZから個別編集用へ登録済みの施設。寸法はすべて`X × Y × Z`、セクション上限は原則`48 × 48 × 48`。

| 施設 | 全体サイズ | セクション数 | 保存Structure名 | 自動分割保存 |
|---|---:|---:|---|---|
| 警察署 | 32 × 30 × 48 | 1 | `project_deadzone:deadzone_chaosz_policestation_edit` | 不要 |
| 巨大病院 | 128 × 156 × 112 | 36 | `project_deadzone:deadzone_chaosz_gianthospital_edit_x#_y#_z#` | 実装済み |
| 消防署 | 48 × 30 × 32 | 1 | `project_deadzone:deadzone_chaosz_firestation12_edit` | 不要 |
| 学校 | 96 × 24 × 64 | 4 | `project_deadzone:deadzone_chaosz_bufschooll3ya_edit_x#_y0_z#` | 今後追加 |
| 大型店舗（Walmart） | 176 × 24 × 128 | 12 | `project_deadzone:deadzone_chaosz_walmart2_edit_x#_y0_z#` | 今後追加 |
| 観測所 | 32 × 24 × 32 | 1 | `project_deadzone:deadzone_chaosz_observatory_edit` | 不要 |
| 通信塔 | 16 × 70 × 16 | 2 | `project_deadzone:deadzone_chaosz_radio_tower1_edit_x0_y#_z0` | 今後追加 |
| 監視塔 | 16 × 41 × 16 | 1 | `project_deadzone:deadzone_chaosz_watch_tower1_edit` | 不要 |
| 空母 | 256 × 72 × 96 | 24 | `project_deadzone:deadzone_chaosz_aircraftcarrier_edit_x#_y#_z#` | 今後追加 |

`#`はセクション番号。複数セクションの施設には、改装を開始する時点で次の3点を施設専用セットとして用意する。

1. `guide_<facility>`：分割位置と区画名の表示
2. `save_<facility>_all`：建物を復元しながら全区画を自動保存
3. `load_<facility>`：保存結果を別の空き場所へ再構築して検証

Apocalypse Now由来の9棟は建物ごとの実寸確認後、この表へ追記する。単体で48ブロック以内なら通常保存、超える場合のみ同じ自動分割保存方式を適用する。

### 大型建物の保存補助

病院は`128 x 156 x 112`を、Minecraftの保存上限に合わせて36区画へ分割する。

まず保存範囲の原点と区画名を表示する。

```mcfunction
/function project_deadzone:building_edit/guide_hospital
```

改装完了後、36区画を一括保存する。各区画の直近へ一時的にストラクチャーブロックを置き、保存後に元のブロックを復元するため、建物内へストラクチャーブロックは残らない。

```mcfunction
/function project_deadzone:building_edit/save_hospital_all
```

保存後は病院を別の空き場所へ再読込し、右端、中央の継ぎ目、上下階の境界を確認する。

```mcfunction
/function project_deadzone:building_edit/load_hospital
```

旧外周配置のストラクチャーブロックが残っている場合と、表示ガイドを消す場合：

```mcfunction
/function project_deadzone:building_edit/clear_hospital_structure_blocks
/function project_deadzone:building_edit/clear_guides
```

病院の分割サイズ：

- X：`48 + 48 + 32 = 128`
- Y：`48 + 48 + 48 + 12 = 156`
- Z：`48 + 48 + 16 = 112`

注意：ストラクチャーブロックの相対位置は各軸±48までのため、36個を建物外の同じ列へ常設する方式は使用しない。

### ストラクチャーブロックで保存・再読込

```mcfunction
/give @s minecraft:structure_block
/reload
```

1. ストラクチャーブロックを設置し、`SAVE`モードへ変更する。
2. Structure Nameへ対象IDを入力する。
3. 相対位置とサイズを合わせ、`DETECT`または手入力で範囲を確認する。
4. `SHOW INVISIBLE BLOCKS`を有効にして、空気・Structure Void・マーカーの抜けを確認する。
5. `SAVE`を押す。
6. 検証時は別のストラクチャーブロックを`LOAD`モードにし、同じIDを入力して読み込む。

主な保存ID：

```text
project_deadzone:deadzone_chaosz_policestation_edit
project_deadzone:deadzone_chaosz_firestation_edit
project_deadzone:deadzone_chaosz_hospital_edit
project_deadzone:deadzone_survivor_camp_edit
project_deadzone:deadzone_shop1_edit
```

保存IDは既存の読み込みfunctionが参照する名前と完全に一致させる。大型施設は1個のストラクチャーに無理に収めず、ガイドに従って分割保存する。

### 改装後の確認

```mcfunction
/reload
/function project_deadzone:building_edit/load_policestation
```

上の2行目は確認対象の`load_*`へ置き換える。次を確認する。

- 建物の向き、基準座標、高さ
- ドア、棚、収納ブロックの向き
- Lootカテゴリ、Tier、Fill率
- NPC・車両・マーカーの位置
- 空気置換による欠損や、旧ブロックの残留
- 大型建物の分割境界

## World Tier管理コマンド

```mcfunction
/deadzonestory status
/deadzonestory advance
/deadzonestory set tier_0
/deadzonestory set tier_1
/deadzonestory set tier_2
/deadzonestory set tier_3
/deadzonestory set tier_4
/deadzonestory set tier_5
/deadzonestory sync
```

`advance`と`set`は管理・テスト用。正式プレイでは施設制圧、Boss撃破、FTB Questsの報酬から呼び出す。
