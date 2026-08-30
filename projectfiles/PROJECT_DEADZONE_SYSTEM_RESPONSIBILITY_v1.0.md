# PROJECT DEADZONE システム責任表 v1.0

更新日: 2026-08-30

## プレイヤーに見せる成長

| 要素 | 正式な担当 | 役割 | 使用しない重複 |
|---|---|---|---|
| 総合レベル・基礎能力・装備要求 | Mine & Slash | 唯一のキャラクターLv、能力値、装備Lv、Affix、Salvage | PDZ独自ランク、独自熟練Lv |
| 役割 | PROJECT DEADZONE JOB | 初期装備、得意行動、固有アビリティ、昇進目標 | M&Sのファンタジークラス、独立Profession枠 |
| ビルド | Passive Skill TreeのPDZ Talent | 戦闘・生存・支援・工業の選択 | M&S Talent、独立Mastery通貨、旧カテゴリ別ツリー |
| 生活・工業行動 | 各既存MOD + 統合XPブリッジ | 釣り、農業、狩猟、採掘、製作でもM&S XPを得る | 行動ごとの新しいLvバー |

## ワールドと難易度

| 要素 | 正式な担当 | ルール |
|---|---|---|
| World Tier | PDZ距離帯 | キャンプからの距離でT0-T4。放置日数では上げない |
| 敵の難易度 | PDZ Difficulty Director | オンラインプレイヤーの最高M&S Lvと経過プレイを入力にする。World Tierとは分離 |
| 都市生成 | Lost Cities + LC2H | Lost Citiesが内容、LC2Hが計画・性能・構造保護を担当 |
| 通常構造物 | 既存構造MOD + datapack | World Tier別の配置候補を担当。LC2Hの構造保護と衝突しないことを検証する |
| 世界の変化 | 既存MODのNPC・クエスト・構造・取引 | チャット通知だけで完了扱いにせず、NPC、在庫、拠点、敵構成の少なくとも一つを変える |

## 戦闘と生存

| 要素 | 正式な担当 | ルール |
|---|---|---|
| 正式HP | Mine & Slashの実体HP | バニラハートは非表示。Party HUDと負傷表示はこの値を参照する |
| 部位負傷 | First Aid系統合 | 最大HPとは別のHPを作らず、状態異常・治療需要を担当する |
| 銃 | TaCZ + gun packs | 射撃、弾薬、銃性能。M&S側は装備要求とAffixだけを追加する |
| 近接 | Epic Fight + M&S | 操作・モーションはEpic Fight、数値と要求はM&S |
| 感染 | Infection系MOD | 回復手段と死亡リスクを担当。M&S自動回復だけで無意味にならないようにする |

## UI原則

- プレイヤーが日常的に見る成長画面は `JOB`、`M&S`、`Talent` の3つまで。
- 状況確認のためにコマンド入力を要求しない。既存MODのGUI、NPC会話、クエスト画面を入口にする。
- 同じ値を複数HUDで表示しない。正式HP、World Tier、JOB状態には表示元を一つだけ持たせる。
- 廃止システムの保存データは即削除しない。新規付与とUI入口だけ止め、移行確認後に掃除する。

## 2026-08-30 実装状態

- `project_deadzone_progression_unified_v0_1.js` が戦闘・生活・工業XPをM&Sへ統合。
- `project_deadzone_growth_mvp_v0_1.js` から独自行動Rank、Mastery grade、旧6カテゴリのテスト付与を撤去。
- 独立Mastery変換とProfession枠は登録を停止。既存プレイヤーデータは保持。
- Puffish Skillsはカテゴリ一覧が空で、旧カテゴリはすでに非表示。レガシーデータだけ保持。
- M&SのAscendancyはJOB初期能力の内部同期に使われているため削除しない。プレイヤー向け導線はJOB UIとPassive Skill Treeへ限定する。
- 次の優先は、M&Sの残存ファンタジー表示の縮退と、T0-T2の縦切り完成。
