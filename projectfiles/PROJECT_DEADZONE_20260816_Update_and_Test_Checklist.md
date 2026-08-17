# PROJECT DEADZONE 2026-08-16 更新内容・翌日テスト

## 今日までの確定更新

### 集落・勢力基盤

- MCA Reborn 7.6.26 安定版を本番ローカルへ導入。
- MCAの初回Destinyキャラクター作成画面を無効化し、PDZの導入フローへ統一。
- Packwiz作業ツリーへMCA Reborn 7.6.26を登録。7.7.0 betaは不採用。
- MCAとWorkersを民間住民として扱い、PDZの敵対・エリート・ダウン処理から除外。
- RecruitsとVillage Expansionを武装勢力として扱い、MOD本来の所属・敵対判定を維持。
- Easy NPCは固有名ストーリーNPC・商人として継続使用。
- PDZ独自処理はボス、攻略コア、クエスト、固有コンボイへ限定。

### 競合対策

- 旧PDZ Activity Directorの自動パトロール・襲撃生成を移行時にOFF。
- 旧PDZ Territoryの常時自動再構築を停止。
- Activity DirectorとTerritoryの手動確認コマンドは維持。
- PDZコンボイ、攻略コア、ボス、Easy NPCは削除していない。

### 配布・サーバー

- Packwizインデックスを更新済み（ローカル作業ツリー）。
- サーバーパッチ `PDZ_SERVER_SETTLEMENT_FRAMEWORK_20260816.zip` を作成。
- 模擬サーバーへBATを実行し、終了コード0を確認。
- MCA本体とKubeJS 3ファイルのローカル／パッチ／適用先SHA-256一致を確認。
- ZIPは7エントリあり、中身が空になる問題なし。

## 明日の確認順

### A. 本番ローカル起動

- [ ] タイトル画面までクラッシュせず到達する。
- [ ] 新規ワールドを作成できる。
- [ ] ワールド参加時にMCAのDestinyキャラクター作成画面が開かない。
- [ ] `latest.log` にMCA 7.6.26がロード済みと出る。
- [ ] Architectury依存エラーが出ない。
- [ ] KubeJS startup/server script errorが出ない。

### B. 民間集落（MCA）

- [ ] 新規生成地域または新規ワールドで人型のMCA住民を確認する。
- [ ] MCA住民がPDZ勢力NPCとして赤枠・敵対化されない。
- [ ] MCA住民がPDZダウン状態やエリートへ変化しない。
- [ ] 会話・職業・取引画面を開ける。
- [ ] 同じ場所にWorkersや旧テスト住民が大量重複生成されない。

### C. 武装集落（Village Expansion / Recruits）

- [ ] Recruitsの所属・敵対関係が全員友好化されていない。
- [ ] 友好集落の兵士はプレイヤーへ攻撃しない。
- [ ] 敵対集落の兵士は本来の条件で敵対する。
- [ ] 武装NPC同士が同一勢力内で攻撃し合わない。
- [ ] 外部勢力NPCにPDZダウン・エリート処理が入らない。

### D. 旧独自処理の停止確認

- [ ] `/deadzoneactivity auto status` が `OFF`。
- [ ] 10分程度滞在して旧Director由来の重複パトロールが発生しない。
- [ ] ログの `automatic legacy director disabled` は移行時の1回だけ。
- [ ] 領土が一定間隔で全再描画され続けない。
- [ ] `/deadzoneterritory status` は実行できる。

### E. 維持機能

- [ ] PDZコンボイの手動テストが動く。
- [ ] 攻略拠点のコア破壊・制圧判定が動く。
- [ ] ボス召喚・死亡・報酬が動く。
- [ ] Easy NPCの既存商人・ストーリーNPCが消えていない。
- [ ] キャンプNPCとガードが互いに敵対しない。

### F. サーバー

- [ ] サーバー停止中に更新BATを適用する。
- [ ] `/reload` ではなく完全再起動する。
- [ ] クライアントとサーバー双方がMCA 7.6.26で一致する。
- [ ] 複数人が接続でき、mod channel mismatchが出ない。
- [ ] 10～20分稼働後、NPC重複生成やログ連打がない。

## ログで検索する文字

```text
Settlement Compat
automatic legacy director disabled
ERROR
Exception
Failed to load
Unknown entity
Ticking entity
```

## 次に実装する内容

1. [x] MCA住民の職業タグ・人口上限を終末世界向けに調整（半径96mで28人、宿の流入と出生を抑制）。
2. [x] Village Expansion/Recruitsを最寄り勢力拠点へ接続し、友好・中立・敵対別ロードアウトプールタグを設定。
3. [x] 一般住民クエスト、勢力依頼、メインストーリーを別レイヤーへ整理（`/deadzonequests`）。
4. [x] Workersを自動集落建築から外し、生産系拠点ロールだけで許可。
5. [x] 固有勢力のボス・幹部・トレーダーをEasy NPCと攻略コアへ接続。制圧時は幹部を停止し、トレーダーを解放。
6. [x] 勢力選択を交易価格・買取額・味方援軍・交易隊・敵増援へ反映。

### 勢力装備プールタグ

- CDF / Survivor: `dz_loadout_security`
- Independent: `dz_loadout_survivor`
- Raider: `dz_loadout_scrap`
- Remnant: `dz_loadout_military`

装備そのものの選択はRecruits/Village Expansionのネイティブ軍備・技術ツリーを使い、PDZは勢力別プールだけを指定する。これにより二重AIと装備の上書き競合を避ける。

### 物語選択の実反映

- CDF現場連合: 食料価格 -10%
- Raider限定停戦: 食料価格 -10%、交易隊を要請
- AEGIS治療データ公開: 医療価格 -20%、味方援軍を要請
- AEGIS記録焼却: 医療価格 +10%
- Remnant離反支援: 部品価格 -15%、味方援軍を要請
- Remnant司令網廃棄: 部品価格 +10%、敵増援が反応
- CDF統一指揮: 部品・医療価格 -5%、味方援軍を要請
- Jackals物流網解体: Raider敵増援が反応

## 検証済みファイル

- `kubejs/server_scripts/project_deadzone_settlement_npc_compat_v0_1.js`
- `kubejs/server_scripts/project_deadzone_faction_activity_v0_1.js`
- `kubejs/server_scripts/project_deadzone_faction_territory_v0_1.js`
- `mods/minecraft-comes-alive-7.6.26+1.20.1-universal.jar`
- `F:/minecraft_pj/PDZ/REL/PDZ_SERVER_SETTLEMENT_FRAMEWORK_20260816.zip`
