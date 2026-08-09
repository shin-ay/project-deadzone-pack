# PROJECT DEADZONE 残タスク

## UI

- JOB再訓練をチャット選択から専用GUIへ置き換える。
- 現在JOB、変更後の基礎値、費用、維持される成長Lv、リセット対象を一画面で比較表示する。

## Buddy

- [実装済み／要マルチテスト] 4役割（Assault / Support / Scout / Medic）の能力値と支援効果。
- [実装済み／要マルチテスト] 雇用直後の役割選択案内とクリック式メニュー。
- 役割ごとの武器・防具ロードアウトを世界Tierに合わせて調整する。
- MedicによるBuddy/NPC蘇生との統合を検証する。

## Multiplayer technical debt

- 独自Weight Systemの全アイテム一括同期を分割または圧縮し、マルチ対応版へ更新する。
- クライアント専用MOD不足によるサーバー一覧の「FML非互換」表示を解消する。
- Connectivity / Cupboardを正式なクライアント・サーバー必須構成へ組み込む。

## 2026-08-02 αテスト次バッチ

### 今回実装済み／要マルチ確認

- 初参加チュートリアル（参加、JOB選択、キャンプ到達、探索準備）。
- Survival / Combat / Industry の主要MOD導線クエスト。
- RightClickHarvestのサーバー導入とDynamic Trees導線。
- 街のLost Souls補正をHP倍率型から出現数型へ変更。
- Simple Enemiesのランダム精鋭化と複数・高Tier報酬。
- Siege Tank / Ancient Abominationのサブ討伐ボス。
- ストーリーボスの発光、名称、防御・ノックバック耐性による視認性強化。
- TaCZ銃撃イベントのnull値エラー対策。

### 次にまとめて実装・検証

1. T1ボス討伐を起点にしたキャンプ襲撃と5人基準のWave調整。
2. 各MOD章の第2段階（Create加工、IE電力、Mekanism処理、TaCZ弾薬製造、車両）。
3. NPC売買・買取プールの更新、サブクエスト、世界Tier連動品揃え。
4. 匍匐・しゃがみ・遮蔽物・音・出血を統合した敵索敵解除。
5. Buddy Medicの蘇生、NPCダウン姿勢、役割別装備の世界Tier連動。
6. ChaosZ施設、Apocalypse Now移植施設の生成率・Loot・敵拠点化。
7. FTB Teams互換のPT HUD、マップ上のメンバー表示をマルチで再検証。

### ログ継続監視

- Infectiousの削除済みentity再追加警告。
- TFMG oil depositの遠方チャンクsetBlock警告。
- First Aidのdamage model欠落警告。
- Weight同期パケットの再肥大化。
