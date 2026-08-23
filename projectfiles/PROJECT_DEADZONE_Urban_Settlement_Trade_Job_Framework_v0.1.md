# PROJECT DEADZONE 都市・集落・交易・JOB統合仕様 v0.1

更新日: 2026-08-20  
状態: 設計確定・縦切り実装待ち  
上位方針: `PROJECT_DEADZONE_Master_Vision_v1.0.md`

## 1. 目的

都市生成、集落、勢力拠点、交易、Class/JOBを別々の機能にしない。

プレイヤーが次の流れを自然に経験できる世界を作る。

1. 初期都市でClassを確定し、世界と操作を理解する。
2. 都市内の担当NPCを訪ね、最初のJOBへ就職する。
3. 遠征、生活、生産、交易によってJOBと地域を成長させる。
4. 条件を満たしたら、別の担当NPCから上位JOBを選ぶ。
5. 都市、集落、前線拠点を物流で結び、戦闘以外でも世界を攻略する。

## 2. 規模ごとの生成責任

都市や拠点は、同じGeneratorで大きさだけを変えて作らない。規模ごとに生成方式と担当コンテンツを分ける。

| 区分 | 目安Footprint | 生成方式 | 主な役割 | 配置方針 |
|---|---:|---|---|---|
| 初期友好都市 | 256～384m級 | 半固定Template + Jigsaw拡張 | 導入、就職、交易、治療、保管、交通 | Worldごとにほぼ固定。安全と導線を優先 |
| 大都市 | 768～1536m級 | PDZ City Generator | 複数地区、Main Story、Boss、地下、広域Loot | 低頻度。都市間幹線・鉄道・港のAnchorになる |
| 中規模都市 | 384～768m級 | PDZ City Generator | 地域中枢、勢力拠点、専門市場、Side Story | 大都市間と資源地帯の中継点 |
| 小都市・町 | 192～384m級 | Village/Jigsaw拡張 | 生活、交易、地域依頼、補給 | 地形と道路へ追従して生成 |
| 集落 | 96～256m級 | Village/Jigsaw Pool | 釣り、農業、狩猟、採掘など単一産業 | Biome・水辺・資源へ強く依存 |
| 勢力基地 | 64～256m級 | 既存Structureの拠点化 + 専用Jigsaw | 戦闘、制圧、Convoy、Named | 既存建造物へFaction/Core/Spawnerを注入 |
| 野外施設 | 32～128m級 | 既存Structure MOD | 小規模探索、救難、隠し依頼 | 単独生成を許すが、役割とTierを必ず付ける |

### 2.1 Lost Citiesの扱い

Lost Citiesは完成品の都市をそのまま大量生成する担当から外す。

- 既存建物Asset、地下設備、荒廃表現、Paletteの供給元として利用する。
- 現在開発中のPDZ City Generatorが大都市・中規模都市の配置と道路構造を担当する。
- City Generatorから呼び出せるAssetへ建物を整理し、入口、地盤、用途、寸法をMetadata化する。
- 海上床抜け、地形非追従、道路・鉄道衝突を許容しない。

### 2.2 Village/Jigsawの扱い

小都市、町、集落はバニラ村と同じ「道路から建物を生やす」考え方を使う。

- 道路Pieceから接道方向、入口方向、建物候補を決める。
- Biome、産業、勢力、荒廃度ごとにPoolを分ける。
- 建物単体ではなく、井戸、広場、市場、倉庫、畑、桟橋、壁、門を含む集落単位で組む。
- 敵対・中立・友好は同じ外形を色替えするのではなく、防御、住民、Loot、看板、照明、補修率を変える。

## 3. 初期友好都市

現在のキャンプを大きくしただけの安全地帯ではなく、MMOのStarter Townとして設計する。

### 3.1 必須地区

| 地区 | 必須施設 | ゲーム上の役割 |
|---|---|---|
| 到着区 | Gate、案内所、掲示板 | Prologue終了、操作・世界説明、初期Quest |
| Career区 | Class確認所、各JOB窓口、訓練場 | 就職、転職、Skill試射、Build説明 |
| 生活区 | 食堂、診療所、宿泊、共同倉庫 | 食事、治療、Respawn、保管 |
| 市場区 | 雑貨、物々交換、市場、買取 | 売買、納品、地域需要の確認 |
| 工房区 | 修理、工作、弾薬、車両整備 | 装備維持、工業導線、車両導線 |
| 交通区 | Garage、停留所、将来の駅 | 遠征開始、都市間物流 |
| 行政区 | Story NPC、勢力窓口、作戦盤 | Main Story、地域状態、Faction説明 |

### 3.2 必須NPC

- 案内官: Prologueと操作説明。説明を読み終わるまで戦場へ出さない。
- Class Registrar: 初期Classの確定・再確認。
- Career Officer: 取得可能なJOB、条件、役割、支給品を一覧表示。
- JOB Mentor: JOB別の就職・転職、訓練、専用Quest。
- Quartermaster: 初期装備、補給、修理Kit、通貨交換。
- Medic: 治療、感染対策、Medic導線。
- Engineer/Mechanic: 修理、工作、車両、工業導線。
- Cook/Farmer/Fisher: 生活系納品と食事Buff導線。
- Contract Receptionist: Bountifulの地域契約窓口。
- Market Trader: 地域在庫と需要連動価格を扱う。
- Transport Officer: 車両、鉄道、Convoy、Fast Travel解放。
- Story Liaison: Main StoryとFaction関係を担当。

同名NPCを別拠点へ複製しない。役職は共通でも名前、Skin、台詞、品揃えは都市ごとに変える。

### 3.3 初期導線

1. Lobby/PrologueでClassを選ぶ。
2. 初期都市の到着区へ転送する。
3. 案内官から都市地図、操作、医療、死亡、Quest、Lootの説明を受ける。
4. Career区で最初のJOBを選ぶ。
5. JOB Starter Kitを受け取り、訓練Questを完了する。
6. 市場で最初の納品依頼を確認する。
7. Gateから最初の遠征へ出る。

Class選択中やJOB説明中に自動転送しない。転送は明示的な確定操作の後だけ行う。

## 4. ClassとJOBの分離

### 4.1 Class

Classはキャラクター作成時に選ぶ土台で、簡単には変えない。

- 初期能力値10ポイントの配分。
- Starter Kitの系統。
- Talent開始地点。
- 最初に推奨表示されるJOB。
- Class固有の小さなPassive。

ClassはJOBを永久に固定しない。異なるJOBへ進めるが、得意Classから外れるほど育成や装備条件に準備が必要になる。

### 4.2 JOB

JOBはNPCを通じて就職・転職する、現在の専門役割である。

- 一度にActiveにできるJOBは1つ。
- 取得済みJOBのLv、Action XP、支給履歴は保存する。
- 転職は友好都市・専門拠点のJOB Mentor前でのみ可能。
- 戦闘中、Down中、敵対地域では転職不可。
- 初回就職は無料。再転職費用は軽くし、Build変更を罰ゲームにしない。
- Active JOBだけが専用Skill、支給装備、JOB Passiveを有効にする。
- 汎用Talent、Class、装備、Action熟練はJOBを変えても残る。

### 4.3 表示と解放

JOB UIでは、未解放JOBを全部並べて灰色にしない。

| 状態 | 表示 |
|---|---|
| 条件を知らない上位JOB | 非表示 |
| Mentorや情報を発見したJOB | シルエット + 日本語の概要 |
| 条件不足 | 必要Lv、Action XP、Story、施設を日本語表示 |
| 選択可能 | Full icon、Passive、Skill、支給品、長所・短所を表示 |
| 取得済み | Lv、XP、現在のBuild、転職ボタンを表示 |

### 4.4 昇格ではなくJOB Change

見た目は「上位職へ進化」だが、内部処理は候補から選ぶJOB Changeとする。

初期案:

- Base JOB: Tutorial完了 + 対応Mentor。
- T2 JOB: Base JOB Lv10 + Relevant Action XP 300 + 地域Story条件。
- T3 JOB: JOB Lv25 + Relevant Action XP 1200 + 対応Boss/施設条件。
- T4以降: 現行長期テストでは非表示。設計だけ保持する。

条件値はマルチテストで調整する。重要なのは、Lv到達だけで自動変身させず、NPCとの会話と選択を挟むことである。

### 4.5 NPC配置例

| 系統 | 就職場所 | 上位Mentor候補 |
|---|---|---|
| Security / Weapons | Guard HQ、射撃場 | 軍事基地、警察署、Faction司令部 |
| Medic | Clinic | 病院、研究所、救難拠点 |
| Survival / Scout | Ranger Office | 森林基地、狩猟小屋、前線観測所 |
| Scavenger | Salvage Yard | Scrapyard、地下市場、物流基地 |
| Mechanic | Garage | 車両Depot、鉄道Depot、航空施設 |
| Engineer | Workshop | 工場、発電所、研究施設 |
| Farmer / Cook / Fisher | Market・Farm・Dock | 農業集落、漁村、食品工場 |
| Anomaly Researcher | 初期は非表示 | WARDEN/AEGIS研究施設発見後に表示 |

## 5. 都市・集落の需要と供給

### 5.1 基本方針

完全な全Item経済Simulationは作らない。プレイヤーが理解できる8カテゴリで需要を管理する。

1. 食料
2. 水・生活物資
3. 医療
4. 弾薬・武器部品
5. 金属・建材
6. 燃料・電力部品
7. 車両・物流部品
8. 研究・異常物資

各都市・集落は次の情報を持つ。

```text
settlement_id
name
scale
faction
biome_and_location
population_state
primary_industry
exports[2-3]
demands[2-4]
shortage_state
development_level
connected_routes
story_flags
```

### 5.2 既存MODの責任分担

| 責任 | 採用候補 | PDZでの使い方 |
|---|---|---|
| 日替わり・週替わり需要 | Bountiful | 地域Decreeで魚、作物、医療、部品、討伐を切替 |
| 在庫・店・価格 | Lightman's Currency | 在庫とDemand-based Pricing、Trader、Wallet |
| 物々交換・人物固有取引 | Easy NPC | 現金を使わない交換、Faction固有品 |
| 一度きりの復興納品 | FTB Quests | 施設復旧、道路開通、人口回復、品揃え解放 |
| NPCの連続依頼 | Realm RPG Quests | 住民の困り事、人物関係、地域Story |
| 住民・防衛 | MCA/Recruits | 市民、Guard、Recruit。経済計算の正本にはしない |
| Class/JOB能力 | Mine and Slash + PDZ data | JOB条件、Skill、Talent、装備条件 |

Lightman's Currencyは1.20.1 Forge版があり、在庫量に応じて価格を変えるDemand-based Pricingを持つため、最有力の経済基盤候補とする。導入前にtest Profileで既存通貨、Trader、Server負荷との互換を確認する。

### 5.3 プレイヤーから見える需要

- 市場入口に「不足物資」「高価買取」「余剰在庫」を表示する。
- Mapの都市情報から、代表需要と輸出品を確認できる。
- Contract Boardにはその地域で意味のある依頼だけを出す。
- 価格変化だけで理由を隠さず、「病院被害で医療不足」など原因を文章で示す。
- 需要は15分ごとに揺らさず、Minecraft日単位またはStoryイベントで変える。

### 5.4 報酬

納品報酬は通貨だけにしない。

- 通貨または地域Voucher。
- 都市・勢力Reputation。
- JOB/Action XP。
- 都市Development。
- 現地では作れない輸出品。
- Rare素材、Affix素材、燃料、弾薬、修理部品。
- 新しいTrader、JOB Mentor、交通路、Fast Travelの解放。

### 5.5 都市類型と交易例

| 類型 | 主な輸出 | 主な需要 | 遠征理由 |
|---|---|---|---|
| 初期友好都市 | 基礎補給、低Tier修理、情報 | 食料、医療、建材 | 生活職の最初の納品先 |
| 漁村・港町 | 魚、塩、水産加工、船用品 | 燃料、医療、機械部品 | 海洋Lootと都市食料を交換 |
| 農業集落 | 作物、畜産、料理素材 | 工具、肥料、医療、防衛品 | 食事Buff経済の中心 |
| 工業都市 | 金属、機械、電力部品、修理 | 食料、水、化学素材 | 装備・車両・除染の供給地 |
| 鉄道町 | 輸送枠、燃料、補修部品 | あらゆる地域物資 | 大口納品と都市間物流 |
| Scavenger市場 | Salvage、旧世界部品、Affix素材 | 食料、弾薬、薬 | Rare部品と危険な依頼 |
| 研究拠点 | 除染、特殊医療、異常装備 | Sample、電力、護衛 | 後半BuildとStory解放 |
| 前線基地 | 弾薬、軍用品、作戦情報 | 食料、医療、修理、燃料 | 防衛イベントと高額契約 |

## 6. 地域成長

納品を無限換金で終わらせず、都市の状態へ返す。

| Development | 都市の変化 |
|---:|---|
| 0 崩壊 | Trader少、照明不足、Guard不足、価格不安定 |
| 1 生存 | 基礎市場、診療、共同倉庫が利用可能 |
| 2 復旧 | 工房、専門Trader、JOB Mentor、定期Convoyを解放 |
| 3 安定 | 鉄道/交通、Rare契約、上位JOB、一部安全圏を解放 |
| 4 地域中枢 | Story分岐、Faction作戦、Boss前線、高Tier市場を解放 |

発展で完全安全にはしない。襲撃、輸送損失、Story事件により不足は再発するが、プレイヤーの成果を毎回ゼロへ戻さない。

## 7. 最小縦切り実装

最初から全都市へ展開しない。次の1ループを完成させる。

1. 初期友好都市を半固定生成する。
2. Career Officerと3系統以上のJOB Mentorを配置する。
3. 農業集落、漁村、工業拠点を1つずつJigsaw生成する。
4. 各拠点へ輸出2、需要3を設定する。
5. Bountiful Board、Easy NPC取引、地域Traderを接続する。
6. 3拠点を道路またはConvoyで結ぶ。
7. 納品で初期都市Developmentが1段階上がる。
8. Development上昇でT2 JOB Mentorまたは交通を1つ解放する。

## 8. 実装順序

### P0: 設計・互換確認

- 現行通貨、Trader、Bountiful定義、JOBデータの棚卸し。
- Lightman's Currencyをtest Profileで起動・Server接続確認。
- 初期都市の施設PlotとNPC責任表を確定。
- Base JOB/T2/T3のNPC、条件、非表示ルールをデータ化。

### P1: 初期都市

- 半固定Templateを作る。
- Lobbyから確定操作で転送する。
- Career区、市場区、工房区を先行実装する。
- NPC重複、空中Spawn、地下Spawn、同名NPCを検査する。

### P2: 交易縦切り

- 3集落のJigsaw Pool。
- 地域Decreeと納品Contract。
- 在庫・需要価格・物々交換。
- Map情報と日本語の需要理由。

### P3: JOB Change

- Career Officer UI/会話。
- 非表示・発見・条件不足・選択可能の4状態。
- Active JOB切替と取得済み進捗保持。
- 上位JOBをNPC・Story・施設へ結び付ける。

### P4: 大中都市

- City Generatorへ都市Anchorと専門市場を統合。
- 大都市は複数地区、中都市は1～2産業へ特化。
- 地域市場、鉄道、Convoy、Story、Bossを接続する。

## 9. 完成判定

- 初参加者が戦闘中のCampへ放り出されず、ClassとJOBを理解して選べる。
- JOBはLv到達だけで自動昇格せず、NPCを訪ねて候補から選べる。
- 条件未達JOBは日本語で理由が分かり、未発見JOBは見えない。
- 釣り、農業、料理、工業だけでも都市へ貢献し、通貨以外の成長報酬を得られる。
- 集落ごとに買う物・売る物が違い、移動と物流に意味がある。
- 大都市、中都市、集落、勢力基地が見た目だけでなく遊びの役割で区別される。
- 交易、Quest、JOB、都市Developmentが二重に進捗を持たず、責任MODが明確である。

