# 起床後レビュー待ち変更一覧

更新日: 2026-08-30

## ローカル実装済み

- 成長の担当を `Mine & Slash Level / PDZ JOB / Passive Skill Tree Talent` に整理。
- 独立Mastery変換、独立Profession枠、旧テスト用熟練Rankの新規処理を停止。保存データは保持。
- Dynamic Trees Nature's Spiritのredwood / frosty redwood修正版を、実際に読まれるMinecraft直下の `trees/` へ配置。
- Thirst 1.4.0のGlobal Loot Modifier登録漏れと、Pam's Crops 1.0.3の欠落Lootを補う極小Forge互換シムを作成。ビルド成果物はまだDEV内のみ。
- システム責任表を作成。

## 隔離検証済み

- LC2H 4.1.0-BETA + Lost Cities 7.5.2 + Quantified API 2.2.0は専用サーバー起動・worldgen・正常終了に成功。
- Dynamic Trees Growth Logic Kitエラー: 2件から0件。
- KubeJS: 45/45 scripts、エラー0・警告0。
- Global Loot Modifier読込警告: 18件から0件。Thirst 15件とPam's Crops 3件を隔離サーバーで解消。
- NFM / Decocraft家具Lootエラー: 48件から0件。NFM beige家具20種は対応するwhite家具へ、Decocraftの状態ブロック26種は通常アイテムへ戻す。取得可能アイテムが存在しないPicnic Basket 2状態は竹3本へサルベージする。
- PDZ自作Loot 3件を修復。ガソリンスタンドT1/T2は実在するMTS Official Pack部品へ統一し、病院ロッカーのTaCZ弾薬・銃は汎用アイテム + `AmmoId` / `GunId` NBT形式へ変更。隔離サーバーで `project_deadzone` のLoot解析失敗0件を確認。
- More Protectablesの未導入連携先用Loot 27件を無害な空Lootへ差し替え。実在する本体ブロックのLootは変更していない。Apocalypse Nowのタイガ村Lootは廃止済み `officer_chestplate` を現行の `officer_beret_chestplate` へ置換。計28件とも隔離サーバーで解析失敗0件を確認。
- Thirstの未導入Brewin' and Chewin' / Farmer's Respite連携Loot 10件を無害な空Lootへ差し替え。Thirst本体の水分・既存Lootは変更せず、隔離サーバーでThirst Loot解析失敗0件を確認。
- 残るLoot 17件を修復。Keerdmの未使用Point Blank版6件、Create Radarの未登録旧ブロック3件、ShelfModの1.21 Pale Oak混入2件、Patchouli未導入環境のSuperb Warfare / ZombieKit説明書各1件を無害化。Vehicle 4件は空Lootにせず、上流JARに実装済みだが未登録だった `copy_fluid_tanks` をForge DeferredRegisterで接続し、タンク内容保持機能を維持した。
- 最終隔離起動でLoot Table解析失敗0件、Global Loot Modifier失敗0件、KubeJS 45/45、正常起動・正常停止を確認。

## 上流MOD側に残る技術警告

- TFMG 1.0.2fの `forge:buckets/sulfuric_acid` はJAR内JSONが0バイト。
- Create Radar 0.4.6の `radar_animal` / `radar_hostile` もJAR内JSONが0バイト。
- Minecraftはタグの各寄与ファイルを個別に解析するため、外部データパックで正常JSONを重ねても元JARの3警告は消えない。
- 第三者JARの改変再配布は行わず、上流更新候補の調査対象として保留する。現時点では起動継続・ゲーム内登録への致命影響は確認されていない。

## 要判断

### LC2H 4.1.0-BETA

採用候補。実クライアントで新規チャンクの都市外観とマルチ高速移動を確認してから反映する。

### Create: Sentry Mechanical Arm

0.3.5と最新版0.3.6の両方で、起動ごとに `NoSuchFieldException: recipes` が106回発生する。MODを外すと0件。

ただし既存スモークワールドには次の保存済みIDがあるため、実サーバーワールドで設置物の有無を確認するまで削除しない。

- `sentrymechanicalarm:blaze_fire_control`
- `sentrymechanicalarm:sentry_mechanical_arm`
- 関連アイテム、painting variant

推奨順序:

1. 実ワールドで設置物を監査。
2. 未使用ならMODをサーバー・配布の両方から外す。
3. 使用中なら回収してから外すか、作者側のCreate 6.0.8対応を待つ。

## 反映時のセット

1. LC2H 3点更新。
2. `trees/dtnatures_spirit/species/*.json` をサーバーと配布へ追加。
3. 成長整理済みKubeJS 3ファイルを同期。
4. `pdz-loot-compat-1.0.0.jar` をクライアント・サーバー双方へ同期。
5. Sentryの採否を決める。
6. `packwiz refresh`、Prism起動、マルチ接続を確認してからpush。

互換JARの隔離検証済みSHA-256:

`503B5D8CD333C3FE88ECFF4BA26D0782C8D5D7113CE9E6461FBAA87D5C4C672B`

## Loot技術監査結果

監査開始時に確認したLoot Table解析失敗はすべて解消し、残り0件になった。

TFMGとCreate Radarが同梱する0バイトタグ3件はLootとは別の上流警告であり、外部データパックでは元JAR寄与の解析警告を抑止できないため、引き続き上流更新待ちとする。
