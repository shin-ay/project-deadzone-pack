# Buddy・PMC契約部隊 RC1

## 使用する既存機能

- 雇用、所有者UUID、装備Inventory: `Simple Enemy Mod`
- 複数選択、命令、小隊、指揮官、車両搭乗: `TaCZ: Combined Arms`
- プレイヤー進行: PDZ Story Tier

PDZ独自処理は、既存MODだけでは表現できない「進行別の契約上限」、
「専属Buddyと一般契約兵の区別」、「昇進時の契約台帳引継ぎ」、
「Survivor同盟への接続」だけを所有する。独自の歩兵AIや命令系統は作らない。

## 雇用と契約枠

1. Survivor Campのハンク横にあるPMC募集テーブルを使う。
2. 鉄インゴット12個をメインハンドに持って右クリックする。
3. 1人目はPDZ専属Buddy、2人目以降はCombined Arms用の一般契約兵になる。

契約上限:

- Story Tier 0～1: 3名（最小戦闘分隊）
- Story Tier 2～3: 5名（指揮官＋歩兵／車両クルー）
- Story Tier 4～5: 7名（完全小隊）

未読込Chunkや別Dimensionの兵士も永続契約台帳へ残し、上限逃れを防ぐ。
死亡時は台帳から自動除外する。契約費は現在のSEM設定で鉄インゴット12個。

## 専属Buddy

- 1プレイヤーにつき常に1名だけ。
- Assault、Support、Scout、MedicのPDZ役割能力を持つ。
- Story Tierに応じた装備更新、緊急離脱、Recallなどを持つ。
- 役割処理を失わないよう、名誉勲章による指揮官昇進はできない。

## 一般契約兵とCombined Arms

- Tactical Data Terminalで複数選択して指揮する。
- 追従、待機、移動、射撃許可、目標指定、車両搭乗、護衛、巡回、
  捜索殲滅、陣地配置をCombined Arms純正処理で実行する。
- Story Tier 2以降、一般契約兵へ名誉勲章を使ってPMC指揮官へ昇進できる。
- 昇進前後で契約枠を二重消費しないようUUIDを引き継ぐ。
- 指揮官の小隊へ歩兵や車両クルーを編入できる。

## 性能方針

- 最大7名／プレイヤーをハード上限とする。
- 追加兵へBuddyの常時支援Pulse、装備自動更新、Recallを適用しない。
- Combined Armsの航空機・迫撃砲・砲兵Chunk Loadingは無効のまま。
- 自然生成US/RU、拠点守備兵、プレイヤー契約PMCの台帳を混ぜない。

## マルチ実測項目

1. T0、T2、T4で契約上限が3、5、7名になる。
2. 1人目だけがBuddy役割能力を受ける。
3. 契約兵が別Dimension／未読込でも追加雇用できない。
4. 死亡後に契約枠が空く。
5. Buddyへの名誉勲章は拒否され、追加兵はT2以降に昇進できる。
6. 昇進後も契約数が増えず、所有者が維持される。
7. Tactical Data Terminalで他プレイヤーの兵士を操作できない。
8. 車両搭乗、降車、護衛、巡回、小隊命令が成立する。
9. Survivor、US、RU、Spore、Zombieとの敵味方判定が設計通りになる。
10. 5人×最大7名（計35名）とCombined Armsイベント併用時のMSPT・Entity数を測る。
