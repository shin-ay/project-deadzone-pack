# PROJECT DEADZONE ボス・勢力活動・コンボイ設計 v0.1

更新日: 2026-08-11

## 1. 基本方針

- メインストーリーのボスは感染者・変異体を中心にする。
- 人型Namedは勢力拠点、検問、輸送隊、施設攻略の指揮官として使う。
- バイオームごとに、その土地で暮らしてきたように見える変異体Namedを用意する。
- ボスはHPだけを増やさない。行動、護衛、地形、増援、弱点、撤退阻止を組み合わせる。
- コンボイやパトロールはプレイヤー付近へ突然出現させず、実在する勢力拠点を出発地・目的地にする。
- Scorched Gunsは未導入なので、WARDEN機械ボスは候補枠に留める。現行版では `infectious:mecha_zombie` と `infectious:robotic_zombie` を試作に使う。

## 2. ボスの分類

| 種別 | 主役 | 出現場所 | 再出現 | 主な報酬 |
|---|---|---|---|---|
| Story Boss | 感染者・変異体 | ストーリー施設 | 原則なし | Tier進行、固有素材、世界変化 |
| Facility Named | 人型指揮官 | 勢力拠点・役割施設 | 拠点再占領時のみ | 装備、情報、拠点鍵、Affix素材 |
| Biome Apex | 感染者・変異動物 | 各バイオーム | 低頻度 | Rare以上装備、部位素材、地図情報 |
| Convoy Named | 人型護衛隊長 | 拠点間の輸送経路 | あり | 輸送物資、勢力通貨、車両部品 |
| Final Boss | 感染集合体・機械中枢 | T3以降の専用施設 | なし | 分岐決着、Specialist解放素材 |

## 3. 現在導入済みMobから選ぶストーリーボス

Entity IDはローカルの導入済みJarから確認済み。

### T0: 最初の異常

| 役割 | Entity ID | 仮称 | 戦闘コンセプト |
|---|---|---|---|
| 初期中ボス | `mutantszombies:zombie_brute` | 門を叩く者 | 低速、強ノックバック。近接回避と味方連携の教材 |
| 初期ストーリーBoss | `mutantszombies:mutant_brute` | 道砕きグラウンド・ゼロ | 取り巻き感染者を呼ぶ。キャンプ襲撃の原因個体 |
| T0希少個体 | `infectious:screamer` | 泣き女 | 本体は弱いが叫びで周囲の感染者を集める |

T0では銃持ち人型を主役にしない。最初のボスは「撃ち合い」ではなく、感染世界のルールを覚える戦闘にする。

### T1: 変異の拡大

| 役割 | Entity ID | 仮称 | 戦闘コンセプト |
|---|---|---|---|
| T1 Story Boss | `apocalypse_zombies:tank` | 攻城体 SIEGE-01 | 正面装甲、部位破壊、側面攻撃。既存Siege Tankを正式採用 |
| 医療施設Boss | `infectious:mutant_zombie` | 被験体M-13 | 回復阻害と短時間の加速。AEGIS実験記録へ接続 |
| 消防施設Boss | `infectious:burning_zombie` | 灰の消防士 | 炎上床と遮蔽物破壊。Fire Station攻略用 |
| 警察施設Boss | `infectious:swat_zombie` | 封鎖隊長 | 高防御、盾役。人型Namedと混成配置可能 |

### T2: 生態系の崩壊

| 役割 | Entity ID | 仮称 | 戦闘コンセプト |
|---|---|---|---|
| T2 Story Boss | `infectious:ancient_zombie_boss` | 原初感染体 | 咆哮、感染者増援、段階変化。既存Ancient Abominationを昇格 |
| 地下Boss | `mutantszombies:rotten_mutant` | 腐食坑夫 | 毒・腐食エリア、採掘施設の閉所戦 |
| 追跡Boss | `infectious:zombified_rex` | RED JAW | 高速追跡。野外で遮蔽物と車両を使わせる |
| 沼地Boss | `infectious:fungal_zombie` | 菌床母体 | 胞子ゾーンと小型感染者生成 |

### T3: DEADZONE Protocol

| 役割 | Entity ID | 仮称 | 戦闘コンセプト |
|---|---|---|---|
| AEGIS深部Boss | `infectious:radioactive_zombie` | REACTOR SAINT | 放射汚染区域、除染装備と医療担当が重要 |
| WARDEN試作Boss | `infectious:mecha_zombie` | ARGUS Fragment | 機械増援、遠隔妨害、コア露出フェーズ |
| 感染側準ラスボス | `infectious:giant_zombie` | CHOIR VESSEL | 巨体、複数弱点、周辺のScreamerと同期 |
| 感染側ラスボス候補 | `infectious:doom_zombie` | THE CHOIR - First Voice | 複数フェーズ。感染者群体の意思を表現する |

`doom_zombie` は見た目と実挙動をクリエイティブ試験後に確定する。合わない場合は `giant_zombie` を母体にBrutal Bossesで能力を構成する。

## 4. 勢力別の人型Named

人型Namedは原則としてTaCZ NPCプリセット、または既存勢力召喚functionを使う。Simple Enemyは一般兵の母体として使い、固有名・装備・体力・会話・撤退条件を追加する。

| 勢力 | Leader / Major Named | 拠点Named候補 | 役割 |
|---|---|---|---|
| Survivor Network | レイ・アマハラ | 守備隊長ハンク | 防衛・救助。通常は戦闘対象にしない |
| CDF / USUNIT | エイドリアン・ヴェイル | マーシャル・グレイヴス、イネス・モロー | 警察署、検問、避難所防衛 |
| Raiders | ルーク・ケイン | ブラス・ハウンド、シンダー、トールマン | Gun Shop、Fire Station、Convoy |
| Remnant / RUUNIT | ヴィクトル・ソコロフ | ナディア・オルロワ、Echo-7 | 軍事拠点、Radio Tower、重装輸送隊 |
| AEGIS | エヴリン・クロス | ホワイトステッチ | Hospital、研究所、被験体護送 |
| WARDEN | ARGUS-9 | SENTINEL-3、COURIER-6 | 機械施設。現行は仮Entity、将来機械Mobへ移行 |

### 人型Namedの共通ルール

- 拠点Coreと連動し、Coreが生きている間は増援を要請する。
- HP50%と20%で固有台詞を出す。
- ただ巨大化するのではなく、通常兵より約1.08～1.18倍に留める。
- 武器・防具・AI役割を明確化する。司令官が全員LMG持ち、にはしない。
- Named撃破だけでは制圧完了にしない。Core、Spawner、Namedの目標をすべて処理する。

## 5. バイオーム固有Boss

| バイオーム群 | 優勢勢力 | Boss候補 | 出現条件 |
|---|---|---|---|
| Plains / Meadow | Survivor / CDF | `infectious:muscular_zombie`「草原の雄牛」 | 夜、Tier1以上、低確率 |
| Forest / Birch | Raiders / Infected | `mutantszombies:split_head_zombie`「枝裂き」 | 木陰・廃屋付近 |
| Dark Forest | Infected | `infectious:blind_zombie`「暗森の聴者」 | 音に強く反応。視覚は弱い |
| Taiga / Snowy | Remnant / CDF | `infectious:frozen_zombie`「白い墓標」 | 雪、夜、Tier1以上 |
| Mountain / Stony | Remnant / WARDEN | `mutantszombies:mutant_brute`「採石王」 | 高度・鉱山・軍事施設付近 |
| Desert / Badlands | Raiders / Remnant | `infectious:mummy`「砂葬王」 | 遺跡または輸送路付近 |
| Savanna | Raiders | 人型Convoy Named「トールマン」 | Raider拠点間の輸送時のみ |
| Swamp / Mangrove | Infected / AEGIS | `infectious:fungal_zombie`「沼の胞子母」 | 水辺・研究施設付近 |
| Jungle | AEGIS / Infected | `infectious:zombified_rex`「緑顎」 | Tier2以上、研究失敗イベント |
| Coast / Beach | Salvager / Raiders | `infectious:deep_sea_diver_zombie`「沈没船長」 | Shipwreck・海岸施設付近 |
| Ocean | WARDEN / Infected | `infectious:zombie_diver`護衛 + 将来機械Boss | Ocean Ruin・輸送イベント |
| Deep Underground | AEGIS / Infected | `infectious:ancient_zombie`「第零坑道」 | Mineshaft・地下研究所 |
| Lost Cities | 地区勢力 / Infected | 施設Named + Tier対応変異体 | 建物役割に合わせて固定 |

Biome Apexは自然湧きの置換ではなく、周辺にプレイヤーが一定時間滞在し、既存個体が存在しない場合だけ抽選する。これで大量生成とTPS悪化を防ぐ。

## 6. Division型の拠点活動

### 拠点状態

各登録拠点は以下を持つ。

- faction: 所有勢力
- size: small / medium / large
- supply: 0～100
- alert: 0～100
- defenders: 守備力
- coreAlive: Core状態
- lastActivity: 最終活動時刻

### 活動の種類

| 活動 | 出発 | 目的地 | 内容 | 到着時の効果 |
|---|---|---|---|---|
| Supply Convoy | 同勢力の補給拠点 | 同勢力の不足拠点 | 食料、弾薬、医療、燃料を輸送 | supply増加、商店更新、守備回復 |
| Reinforcement | 中・大拠点 | 襲撃中の同勢力拠点 | 兵士とMedicを輸送 | 増援出現、Named回復 |
| Patrol | 任意拠点 | 同じ拠点 | 周辺道路・施設を巡回 | alert低下、索敵範囲増加 |
| Assault Team | 敵対拠点 | 敵対拠点 | Core制圧を狙う攻撃隊 | 勝利側へ所有権移動 |
| Player Base Raid | 敵対勢力拠点 | Player Base Core | プレイヤー拠点を襲撃 | 防衛イベント、Heat低下 |
| Prisoner / Sample Transport | AEGIS・Raiders | 研究所・収容所 | NPCまたは感染体を護送 | 勢力研究・報酬プール強化 |
| Trade Caravan | Survivor / Independent | 友好拠点 | 取引商品を輸送 | 一時商人・特売品を解放 |

## 7. コンボイの実体と進行

### 発生条件

1. 同一ディメンションに有効な出発拠点と目的拠点がある。
2. 2拠点間は160～1,500ブロック。
3. 出発地のsupplyが必要量以上。
4. 同勢力の稼働中Convoyが上限未満。
5. 周辺チャンクが読み込まれていない間は実Entityを動かさず、時刻と経路だけ進める。

### 状態遷移

`PLANNED -> DEPARTING -> EN_ROUTE -> ENGAGED -> ARRIVED / DESTROYED / RETREATED`

- 遠距離では仮想移動。プレイヤーが96ブロック以内に来た時だけ護衛・貨物を実体化する。
- 貨物は護衛Mobのドロップではなく、破壊・回収可能なCargo EntityまたはLoot Containerに持たせる。
- 隊長を倒しても貨物が逃げれば完全勝利ではない。
- 貨物だけ奪って撤退する選択も許可する。

### Convoy構成

| Tier | 人数 | Named | 貨物 | 特徴 |
|---|---:|---:|---:|---|
| T0 | 3～5 | 0～1 | 1 | 偵察・軽補給。銃持ちは限定 |
| T1 | 5～8 | 1 | 1～2 | Scout、Rifleman、Medic |
| T2 | 8～12 | 1～2 | 2～3 | 重装兵、車両部品、増援信号 |
| T3 | 10～16 | 2 | 3～4 | 複数役割、機械護衛、航空支援候補 |

## 8. プレイヤー拠点襲撃の条件

- 日数だけでは開始しない。
- T1 Story Boss撃破、または敵対勢力Core破壊後に拠点位置が知られる。
- 勢力別Heatを持ち、Convoy襲撃・拠点制圧・Named撃破で増える。
- Heatが閾値を越えると偵察 -> 妨害 -> 本襲撃の順で進む。
- 初回から大群を出さない。偵察兵を逃がしたかどうかで次の襲撃精度が変わる。
- Infected襲撃は銃声、発電機、照明、出血、死体処理不足によるNoise / Scentで発生させる。

## 9. 拠点制圧と世界変化

- 敵拠点Coreを破壊すると、その拠点から出るPatrolとConvoyが止まる。
- 近隣の同勢力拠点が生きていれば、時間経過で再占領部隊を送る。
- Survivorへ引き渡すと商人・Fast Travel・納品所候補になる。
- 放置するとInfectedが占拠し、Lootは増えるが危険度も上がる。
- Convoyを護衛すると目的地の品揃えが増え、襲うと短期Lootは得るが勢力Heatが上がる。

## 実装状況（2026-08-11）

### v0.1 MVP 実装済み

- `dz_wilderness_site`を一次情報にした永続拠点台帳
- 台帳項目: faction / size / supply / alert / defenders / coreAlive / lastActivity
- Raider Supply Convoyの仮想ルート作成
- 未読込中はMobを生成せず、経過時間から座標のみ進行
- プレイヤー96m以内でQuartermasterと護衛を実体化
- 固定Loot樽は置かず、Quartermaster固有ドロップへ報酬を集約
- コンボイ全員を`dz_raiders`チームへ所属させ、同士討ちを防止
- 到着時に目的地Supplyを増加、撃破時にDESTROYEDへ遷移
- 旧T0ランダムコンボイの定期抽選を停止（手動テストは維持）

### 管理コマンド

- `/deadzoneactivity scan`: 読込済み拠点を台帳へ登録・更新
- `/deadzoneactivity list`: 拠点数と活動一覧を表示
- `/deadzoneactivity spawn raider_supply`: 条件を満たすRaider拠点間に補給車列を作成
- `/deadzoneactivity trace <ID>`: 活動の全状態を表示
- `/deadzoneactivity tick`: 仮想活動を即時更新
- `/deadzoneactivity test_near <ID>`: 指定活動をテスト者の近くへ強制実体化
- `/deadzoneactivity cancel <ID>`: 活動を中止

### 現在の発生条件

- 同一Dimension
- 拠点間160～1500ブロック
- 出発拠点Supply 20以上
- 同時進行上限3件
- 出発時Supplyを20消費、到着時に目的地Supplyを20増加

### 次の実装単位

1. CDF Patrolを同じActivity基盤へ追加
2. Infected Noise Hordeを音イベント起点で追加
3. 拠点Core制圧を台帳の`coreAlive`と同期
4. 車列構成をTier・参加人数・難易度で変動
5. Affix素材・弾薬・通貨の専用Loot Tableを接続

### v0.2 拠点役割基盤（2026-08-12）

- 各拠点へ勢力・規模とは別に戦略役割を保存する。
- 役割: `medical` / `communications` / `research` / `logistics` / `security` / `food` / `nest` / `trade` / `machine_node` / `shelter`。
- 既存拠点も次回`/deadzoneactivity scan`で役割が自動補完される。
- 施設と役割からNamed候補を台帳へ保存する。
- `/deadzoneactivity sites`で役割、規模、Supply、Named候補を一覧表示する。
- 次段階では役割を守備隊、補給内容、施設ボス、クエスト自動完了条件へ接続する。

### v0.3 CDF増援活動（2026-08-12）

- `REINFORCEMENT`活動を既存の仮想移動基盤へ追加。
- Security / Communicationsの中・大拠点を増援出発地として優先する。
- Alert 15以上、またはDefenders 8未満の友好拠点を救援対象にする。
- Medical / Trade / Shelter拠点への救援を優先する。
- プレイヤー96m以内でCDF兵3名とMedic 1名を実体化する。
- 到着時はAlertを18低下、Defendersを4～7回復する。
- T0では自動抽選を低確率、T1以降は比重を上げる。
- 管理コマンド: `/deadzoneactivity spawn cdf_reinforcement`。

## 10. 実装順

1. 既存 `dz_wilderness_site` マーカーから拠点台帳を生成する。
2. 現在のランダムT0 Convoyを停止し、2拠点間の仮想Convoyへ置換する。
3. `/deadzoneactivity list|spawn|trace|cancel` の管理コマンドを追加する。
4. RaidersのSupply Convoyを最初の実動テストにする。
5. Biome Apexを1バイオーム1体ずつ追加する。
6. T0～T2 Story Bossの召喚・台詞・報酬・クエスト連携を確定する。
7. 人型Facility Namedを既存Gun Shop、Police、Fire Station、Hospitalへ接続する。
8. WARDEN用機械Mobの採用MODを決め、T3枠を差し替える。

## 11. 最初のテストセット

- Story: `mutantszombies:mutant_brute`、`apocalypse_zombies:tank`、`infectious:ancient_zombie_boss`
- Biome: Forestの枝裂き、Snowyの白い墓標、Swampの胞子母
- Facility: Gun Shopのブラス・ハウンド、Hospitalのホワイトステッチ
- Activity: Raider Supply Convoy、CDF Patrol、Infected Noise Horde

このセットで、感染者Story Boss、人型Named、Biome Apex、動く勢力活動の4系統を一度に検証できる。
