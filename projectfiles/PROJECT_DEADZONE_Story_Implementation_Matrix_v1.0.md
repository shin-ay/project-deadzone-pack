# PROJECT DEADZONE ストーリー実装マトリクス v1.0

更新日: 2026-08-13

## 1. 管理方針

- 世界共有: World Tier、施設所有、Story Boss撃破、勢力活動、ARGUS-9最終判断。
- 個人管理: 会話、人物サブクエスト、報酬受領、JOB、Talent、専門職進捗。
- メイン進行は手動チェックを使わず、会話・施設到達・装置操作・Named撃破で完了する。
- 同じ条件を先に満たしていたプレイヤーも、後から参加した時に自動補完する。
- 分岐は大型施設を永久消失させず、敵対度、価格、友軍、報酬経路を変える。

## 2. 現行プレイアブル導線

| 段階 | Chapter | 主な施設 | 必須トリガー | 世界変化 | 実装状態 |
|---|---|---|---|---|---|
| T0 | 最後の放送 | Survivor Camp、Gas Station | JOB選択、キャンプ到達、探索準備、門を叩く者撃破 | Raider偵察隊、T1解禁 | 接続済み |
| T1 | 道を持つ者 | Gun Shop、Police Station、Fire Station | 施設到達、施設Named撃破、補給線確保 | CDF巡回、Raider Convoy、拠点襲撃 | 基礎接続済み |
| T2 | 三つの命令 | Hospital、Factory、Remnant Relay、Radio Tower | 病院Named、工場復旧、無線鍵、原初感染体 | 勢力支援選択、拠点活動本格化 | 病院まで接続、分岐未実装 |
| T3 | DEADZONE Protocol | Military Base、地下司令壕、Laboratory、WARDEN Core | 三中枢停止、3体のStory Boss、ARGUS-9判断 | T3地域安定化、周回解禁 | 設計確定、未実装 |

## 3. T0「最後の放送」

1. Radio 107.3の断片を受信する。
2. JOBを選択し、Starter Kitを受領する。
3. Survivor Campへ到達し、レイ、ミナト、シオリ、ハンク、マヤ、ゴロー、ユイを確認する。
4. 食料、水、医療品、武器を各1種以上準備する。
5. Gas Stationを調査し、通信部品と燃料記録を回収する。
6. Named感染体「門を叩く者」を撃破する。
7. T1を解禁する。放送復旧によってRaidersにもキャンプ位置が露見する。

## 4. T1「道を持つ者」

1. Raider Roadblockの通行料要求を受ける。
2. Gun Shopの武器台帳、またはPolice StationのCDF認証を入手する。
3. CDFから武器登録と避難民引き渡し要求を受ける。
4. Raider補給Coreを破壊、買収、奪取のいずれかで無力化する。
5. Fire Stationのシンダー派を止める。
6. Story Boss「攻城体 SIEGE-01」を撃破する。

Gun Shop、Police Station、Fire Stationのうち二施設を主攻略にする。残りは消滅させず、サブ攻略として残す。

## 5. T2「三つの命令」

1. CDF、Raiders、Remnantから同じ無線鍵を要求される。
2. Hospitalでホワイトステッチと被験体M-13を追跡する。
3. Factoryを復旧し、Radio Tower用部品を製造する。
4. Remnant Relayを攻略または交渉し、Protocol座標断片を入手する。
5. 地下研究坑道でAEGIS廃棄記録を発見する。
6. CDF、Raiders、Remnantの支援先を選ぶ。
7. Story Boss「原初感染体」を撃破する。

支援しなかった勢力の大型コンテンツは消さない。一部依頼、価格、巡回、報酬経路を変える。

## 6. T3「DEADZONE Protocol」

1. Radio Towerを完全復旧し、AEGISとARGUS-9へ接続する。
2. Military Baseまたは地下司令壕からProtocol権限を奪う。
3. AEGIS Laboratoryでクロス博士の計画を確認する。
4. WARDEN隔離網の三中枢を停止する。
5. REACTOR SAINTを撃破し、除染手段を確保する。
6. ARGUS Fragmentを撃破する。
7. CHOIR VESSELを撃破し、First Voiceの存在を確認する。
8. ARGUS-9を破壊、再設定、分離から選択する。

T3終了時点ではFirst Voice本体を討伐しない。T4以降の脅威として音声と座標だけを残す。

## 7. 勢力ライン

| 勢力 | ライン名 | 主な判断 | 主な報酬 |
|---|---|---|---|
| CDF | 最後の命令 | ヴェイルの統制か、イネスの現場連合か | 地図、防具、修理、友軍巡回 |
| Raiders | 値札のない道 | ルークとの限定停戦か、物流網解体か | 密輸武器、Affix素材、車両部品 |
| Remnant | 命令の亡霊 | ソコロフ支持、ナディア離反、双方排除 | 軍用装備、T3座標、重工業部品 |
| AEGIS | 治療対象 | 治療技術奪取、限定協力、研究破棄 | 感染治療、除染、上位医療 |
| WARDEN | 許可されていない生命 | 機械網の破壊、再設定、分離 | 機械Buddy、タレット、機械Affix素材 |

## 8. 実装判定

- 完了済み: 既存メインクエストIDと自動進行IDの一致確認。
- 完了済み: メインストーリーIIをPolice Station完了後へ接続。
- 完了済み: Hospitalの三クエストを順番接続し、自動進行IDを実データへ修正。
- 確認済み: T0～T3既存本文はUTF-8で正常。PowerShell監査時もUTF-8を明示する。
- 完了済み: 依存ロック中に自動完了が失敗しても完了扱いにしない再試行処理へ更新。
- 完了済み: T2章「三つの命令」を追加。Factory、Remnant Relay、支援選択、AEGIS記録、原初感染体を接続。
- 完了済み: FactoryとAEGIS施設は既存の野外施設台帳、Relayは既存Stronghold Core、原初感染体は既存Entityを利用。
- 完了済み: `/deadzonestory support` にCDF、Raiders、Remnantの永続選択を追加。
- 完了済み: `/deadzonestoryboss primordial` に原初感染体のテスト召喚を追加。
- 完了済み: T3章「DEADZONE Protocol」を追加。Military Base、AEGIS Laboratory、WARDEN三中枢、三Boss、ARGUS-9三択を接続。
- 完了済み: T3施設判定は既存の野外施設台帳を利用し、新しい常時スキャン処理を増やさない構成にした。
- 完了済み: REACTOR SAINT、ARGUS Fragment、CHOIR VESSELの専用Boss召喚functionと撃破フラグを追加。
- 完了済み: WARDEN中枢は異なる施設IDだけを数え、同一施設での連打を拒否する。
- 完了済み: ARGUS-9三択は三Boss撃破とWARDEN中枢3基停止を必須とし、サーバー全体で一度だけ確定する。
- 次: Camp主要NPC人物クエストを最低1本ずつ実装。

## 9. T2テスト手順

1. `/reload` 後、クエスト画面に「メインストーリー III：三つの命令」が表示されること。
2. Hospitalと旧T3通信網の完了後、「止まった生産線」が解放されること。
3. 工業・物流施設へ128m以内まで接近し、Factory到達が自動完了すること。
4. 銅8、鉄8、Create電子管2を納品し、Factory復旧が完了すること。
5. `/deadzonecore build_remnant` でRelayをテスト生成し、128m以内で到達が完了すること。
6. 外部装置と守備隊を排除してCoreを制圧し、Relay制圧が完了すること。
7. `/deadzonestory support` から支援先を一つ選び、再選択が拒否されること。
8. AEGIS所属の研究・地下施設へ接近し、廃棄記録が自動完了すること。
9. `/deadzonestoryboss primordial` で原初感染体を召喚し、撃破でT2 BossとAct 2完了が進むこと。
10. `/deadzonestoryboss status` で `primordial` が完了表示になること。

## 10. T3テスト手順

1. `/reload` 後、クエスト画面に「メインストーリー IV：DEADZONE Protocol」が表示されること。
2. T2完了後、Military Base・司令施設・核シェルターへ160m以内まで接近し、「黒い権限証」が自動完了すること。
3. AEGIS所属のLaboratory・研究施設へ160m以内まで接近し、「クロス博士の選択」が自動完了すること。
4. `/deadzonestoryboss reactor_saint` でBossを召喚し、撃破で「炉心の聖者」が完了すること。
5. 異なるWARDEN所属施設の48m以内で `/deadzonestory warden_disable` を3回実行する。同じ施設での再実行が拒否されること。
6. `/deadzonestoryboss argus_fragment` でBossを召喚し、撃破で「欠けた観測者」が完了すること。
7. Infected所属の巣・研究施設へ160m以内まで接近し、「最初の声」が自動完了すること。
8. `/deadzonestoryboss choir_vessel` でBossを召喚し、撃破で「合唱する器」が完了すること。
9. 前提未達では `/deadzonestory argus` が拒否され、全前提達成後だけ三択が表示されること。
10. ARGUS-9を破壊・再設定・分離のいずれかで確定し、他プレイヤーからの再選択が拒否されること。
11. `/deadzonestoryboss status` でT3三Bossが完了表示になること。
