# PROJECT DEADZONE — Quest / Story Initial Plan v0.1

## 1. Design Goal

クエストは単なるMOD説明リストではなく、次の4つを同時に担当する。

1. PROJECT DEADZONEのストーリーを進める
2. 各MODの遊び方へ自然に誘導する
3. Boss・探索・拠点発展によってTierを上げる
4. Tierに応じてレシピ・アイテム・Skill Treeを解禁する

クエスト完了報酬は物資不足を壊さない範囲に抑える。強力な銃や完成車を直接配るのではなく、設計図、部品、Skill XP、Perk Point、Recipe Stage、特殊Lootへのアクセスを中心にする。

---

## 2. Reference Packs and Lessons

### DeceasedCraft

- 生存ガイド、銃、車両、機械、電力を独立章に整理
- 建物探索と研究資料をメインストーリーへ接続
- 「治療法の研究」のように収集物が物語を前進させる

### Cursed Walking

- CreateをT1 / T2 / T3に分割
- 銃器もWorkbenchと銃種をTier別に整理
- 上位設備が希少素材や危険地帯への探索理由になる

### Biohazard Project Genesis

- Chapter 1～6の番号付きストーリー
- チュートリアル、食料、放射線、TaCZなどを別章に分離
- メインストーリーとMODガイドを混同しない構造

### Prominence II

- Boss討伐をレベル上限や次段階の解禁条件に利用
- BossごとにLore、討伐条件、トロフィー報酬を設定

### The Last War

- Boss戦を「準備クエスト → 討伐 → 報酬」の小さな物語として構成
- ランダム報酬を利用し、毎回同じ装備だけを配らない

---

## 3. Core Story Premise

大規模感染と都市封鎖から数週間後。

プレイヤーは「DEADZONE」と呼ばれる隔離都市圏で目を覚ます。政府の避難放送は途絶え、残っているのは断片的な無線、封鎖施設、放棄された研究記録だけ。

都市には感染者だけでなく、物資を支配するBandit、暴走した軍用装備、変異個体、定期的に押し寄せるHordeが存在する。

プレイヤーの目的は単なる脱出ではない。

- 生存者ネットワークを再建する
- 都市インフラを復旧する
- 感染と変異の原因を調査する
- DEADZONE Protocolの正体を知る
- 最後に「脱出」「封鎖維持」「都市奪還」のいずれかへ進む

初期版では結末を固定せず、Chapter 4程度まで実装可能な構造にする。

---

## 4. Progression Tiers

| Tier | 呼称 | 主な到達条件 | 主な解禁 |
|---:|---|---|---|
| T0 | Stranded | 初回参加、Job選択 | 基本クラフト、Starter Kit |
| T1 | Survivor | 水・食料・治療・避難所を確保 | 基本工具、T1銃整備、簡易防衛 |
| T2 | Scavenger | 都市施設を複数探索、最初の特殊感染者を撃破 | T2 Loot Pool、基本車両修理、Create初期 |
| T3 | Operator | Horde防衛または中Boss討伐、通信設備復旧 | Police/Tactical Loot、BlockyBikes、高度医療 |
| T4 | Specialist | Job系専門クエスト、軍事施設攻略 | Superb Warfare、軍用Loot、高度工業 |
| T5 | Deadzone Veteran | メインBoss群と研究記録を完成 | 最終レシピ、最終Perk、エンディング準備 |

実装Stage候補:

```text
deadzone_tier_0
deadzone_tier_1
deadzone_tier_2
deadzone_tier_3
deadzone_tier_4
deadzone_tier_5
```

Job Stage、Skill Perk Stageとは分ける。

```text
deadzone_job_engineer
deadzone_job_mechanic
deadzone_perk_engineering_weapons
deadzone_perk_mechanics_vehicle
```

上位レシピは「Tier + Job/Perk」の両方を満たす形式を基本とする。

---

## 5. Main Story Chapters

## Prologue — The Last Broadcast

目的:

- 初回ログイン
- Class SelectionでJobを選ぶ
- Starter Kitを受け取る
- Quest Book、Skill Tree、ステータス確認方法を知る
- 最初の無線放送を読む

物語:

「避難区域は失われた。生存者は周波数 107.3 を使用せよ」

報酬:

- 水またはパン程度
- Firearms以外を含む初期Skill説明
- T0 Stage

## Chapter 1 — First 72 Hours

目的:

- 安全な建物を確保
- 水を入手または浄化
- 食料を確保
- First Aidを使用
- 簡易近接武器を用意
- 夜または最初のHordeを生存

関連MOD:

- Thirst Was Taken
- Farmer's Delight
- First Aid
- Survival Instinct
- Sophisticated Backpacks

章の終点:

- 「拠点の確保」
- T1 Survivor解禁

報酬候補:

- 小型Supply Cache
- Skill XP選択報酬
- 基本収納または照明レシピ

## Chapter 2 — The Silent City

目的:

- Lost Citiesの都市を探索
- Gas Station、住宅、Gun Storeなど異なる施設を発見
- Lootコンテナを開ける
- Banditまたは武装敵と遭遇
- 最初の研究記録または無線部品を回収

関連MOD:

- Lost Cities
- Lootr
- ChaosZ Structures
- Bandits / TaCZ NPCs
- Xaero Map

章の終点:

- 最初の特殊感染者または小Bossを撃破
- T2 Scavenger解禁

報酬候補:

- Gun Tier MasterのT1-Civilian抽選
- 地図情報
- Scavenging XP
- 車両修理部品の一部

## Chapter 3 — Restore the Signal

目的:

- Radio / 通信設備に必要な部品を集める
- 電力源を作る
- 防衛設備を設置
- Hordeを1回防衛
- 新しい救難信号を受信

関連MOD:

- Immersive Engineering
- Create
- SecurityCraft
- MineTraps
- The Hordes

章の終点:

- 通信設備復旧
- T3 Operator解禁

報酬候補:

- PoliceまたはTactical Lootへの限定アクセス
- BlockyBikes基本整備
- 防衛用レシピ
- Skill Tree追加ポイント

## Chapter 4 — Engines in the Dark

目的:

- 放棄車両を発見
- 燃料を確保
- 車両を修理
- BlockyBikeまたはImmersive Vehicleを稼働
- 工業設備で交換部品を作る

関連MOD:

- Immersive Vehicles
- Vehicle Mod
- BlockyBikes
- Create
- Immersive Engineering

分業:

- Mechanic: 修理、診断、Salvage
- Engineer: 部品製造、製造設備

章の終点:

- 遠距離探索手段の確保
- 軍事区域への導線

## Chapter 5 — Red Moon Protocol

目的:

- Blood Moonまたは強化Hordeに備える
- 複数の防衛設備を準備
- Mutant / 高危険度感染者を撃破
- 感染サンプルを回収

関連MOD:

- Enhanced Celestials
- The Hordes
- Mutants Zombies
- Apocalypse Zombies
- Infectious
- Lost Souls

章の終点:

- サンプル解析
- T4 Specialist解禁

報酬候補:

- Job専門クエスト解禁
- Superb Warfare基礎部品
- 高度医療・防具レシピ

## Chapter 6 — The Arsenal

目的:

- 軍事施設を攻略
- T3-Military Lootを回収
- Superb Warfare製造設備を構築
- 弾薬または部品の生産ラインを作る
- 軍用BossまたはBandit Commanderを撃破

関連MOD:

- TaCZ
- Create TaCZ Automation
- Superb Warfare
- Immersive Engineering
- Mekanism

制限:

- 強力な兵器はT4だけでは作れない
- Engineer系Perkまたは専門クエストも必要

## Chapter 7 — Project DEADZONE

目的:

- 都市各所の研究記録を揃える
- 感染源、封鎖命令、軍事計画の関係を解明
- 最終Boss群を倒す
- 最終通信を送信

分岐候補:

1. Extraction — 脱出路を確保
2. Containment — 封鎖を維持
3. Reclamation — 都市奪還を開始

初期実装では分岐直前まででよい。

---

## 6. Side Quest Chapters

## Jobs and Skills

- 各Jobの役割説明
- Skill XPの獲得方法
- Firearms / MedicalなどのTree導線
- Lv10 Specialist

## Ballistics

- T1: 民間銃、基本弾薬、整備
- T2: Police / Civilian / Surplus
- T3: Tactical / Military
- T4: Special / Boss / Unique

Gun Tier Master v0.2を唯一の分類元にする。

## Medicine and Infection

- First Aid
- 蘇生
- 感染
- 高度治療
- Medic Perk

## Vehicles

- 燃料
- 修理
- Salvage
- BlockyBikes
- Immersive Vehicles
- Aircraft

## Industry

- Create T1～T3
- Immersive Engineering
- Mekanism
- TaCZ Automation
- Superb Warfare

## Base Defense

- 照明
- Trap
- SecurityCraft
- Horde対策
- 拠点防衛実績

## Food and Long-Term Survival

- Farmer's Delight
- Aquaculture
- Diet
- 水
- Survivalist Perk

## Exploration and Collections

- 建物発見
- Research Notes
- Music Disc / Trophy / Plushieなどの収集
- 特殊車両・特殊銃の発見

収集章はメイン進行の必須条件にしない。

---

## 7. Boss Quest Structure

すべてのBossを単純なKill Taskにしない。

基本テンプレート:

1. Intel — 情報または研究記録を見つける
2. Preparation — 必要装備、医療品、防具を用意
3. Locate — 建物、Biome、Structureを発見
4. Eliminate — Bossを倒す
5. Recovery — TrophyまたはSampleを回収
6. Unlock — Tier、Recipe、Skill、Loot Poolを解禁

Boss候補は、実際のEntity IDとスポーン条件をRegistry Dumpで確認してから確定する。

---

## 8. Reward Policy

### Common Quest

- 少量の食料、水、包帯
- 少量のSkill XP
- 素材選択報酬

### Milestone Quest

- Recipe Stage
- Skill Point
- Perk Tree解禁
- Utility item
- Supply Cache

### Boss Quest

- 固有Trophy
- Tier Unlock
- 上位Loot Poolへのアクセス
- Blueprint / Research Token
- ランダムRare報酬

### Avoid

- 完成した上位銃の大量配布
- 完成車の通常報酬化
- 弾薬の大量配布
- 食料・医療不足を無意味にする反復報酬
- 必須MODごとに同じ「アイテムを作るだけ」のクエストを大量配置

---

## 9. Recipe Unlock Rules

レシピ制限は3層で管理する。

```text
World Tier
  + Job / Skill Perk
  + Quest Milestone
```

例:

```text
Superb Warfare最終兵器
  deadzone_tier_4
  + deadzone_perk_engineering_weapons
  + arsenal研究クエスト完了
```

```text
BlockyBikes高度製造
  deadzone_tier_3
  + MechanicまたはEngineer系Perk
  + Vehicle章の基本修理完了
```

マルチで特定Jobが不在だと完全停止する問題を避けるため、次のどちらかを用意する。

- 高コストの代替レシピ
- 取引・Loot・共有Stageによる代替経路

---

## 10. First Implementation Scope

最初から全章を実装しない。

### Quest Prototype v0.1

実装対象:

1. Prologue
2. Chapter 1 — First 72 Hours
3. Chapter 2 — The Silent Cityの前半
4. Jobs and Skills
5. Ballistics T1

確認項目:

- 4人マルチで進捗共有が適切か
- 報酬が物資不足を壊さないか
- Tier Stageが全員へ共有されるか
- Job専門クエストが他Jobを排除しすぎないか
- Quest Bookが説明書ではなく次の行動を示しているか
- Bossや施設を探す理由が自然に生まれるか

次の実装前に、各MODのItem ID、Entity ID、Advancement ID、Structure IDをローカルデータから確定する。

---

## 11. Localization Policy

クエストのタイトル、サブタイトル、説明、Task名はSNBTへ直接書かず、翻訳キーを使用する。

FTB Quests側:

```snbt
title: "{quest.deadzone.prologue.last_broadcast.title}"
subtitle: "{quest.deadzone.prologue.last_broadcast.subtitle}"
description: [
  "{quest.deadzone.prologue.last_broadcast.description}"
]
```

英語:

```text
kubejs/assets/deadzone/lang/en_us.json
```

```json
{
  "quest.deadzone.prologue.last_broadcast.title": "The Last Broadcast",
  "quest.deadzone.prologue.last_broadcast.subtitle": "Find out what happened to the evacuation zone.",
  "quest.deadzone.prologue.last_broadcast.description": "The emergency channel is still transmitting a fragmented message."
}
```

日本語:

```text
kubejs/assets/deadzone/lang/ja_jp.json
```

```json
{
  "quest.deadzone.prologue.last_broadcast.title": "最後の放送",
  "quest.deadzone.prologue.last_broadcast.subtitle": "避難区域で何が起きたのか調べる。",
  "quest.deadzone.prologue.last_broadcast.description": "緊急周波数から、途切れたメッセージが繰り返し流れている。"
}
```

Minecraftの言語が日本語なら`ja_jp`、英語なら`en_us`が自動的に使われる。

命名規則:

```text
quest.deadzone.<chapter>.<quest_id>.title
quest.deadzone.<chapter>.<quest_id>.subtitle
quest.deadzone.<chapter>.<quest_id>.description
quest.deadzone.<chapter>.<quest_id>.task.<task_id>
quest.deadzone.<chapter>.<quest_id>.reward.<reward_id>
```

英語を基準言語兼フォールバックとして必ず用意し、日本語も同時に追加する。片方だけを先行実装しない。
