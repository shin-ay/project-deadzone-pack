# PROJECT DEADZONE Story Expansion v1.1

## 目的

メインストーリーを一本の通路ではなく、同じ事件を複数の勢力・施設・人物から見直す「編み込み型」にする。分岐数を増やすこと自体ではなく、プレイヤーの判断が勢力関係、台詞、報酬、後続任務へ残ることを重視する。

## 参考にした構成原則

- The Division 2: 各勢力が資源、領域、補給線を持ち、物語とオープンワールド活動を同じ目的へ接続する。
- Tacomaなどの環境ストーリーテリング: 説明文だけで語らず、施設に残された記録から事件の意味を再解釈させる。
- 非線形ナラティブ設計: 無制限に枝を増やさず、選択後に本流へ再合流させながら結果を保持する。
- 災害報道・避難計画・公衆衛生史: 正義と悪ではなく、限られた物資を誰へ配るか、命令と現場判断のどちらを優先するかを対立軸にする。

## 実装済みの物語構造

### 1. メイン本流

- T0: キャンプへの到達、生存基盤、周辺探索。
- T1: 公共施設の確保と救難信号。世界崩壊が単なる感染事故ではないと判明する。
- T2: Relay、AEGIS、Remnantの記録。治療計画と軍事転用が同じ研究から生まれた事実へ到達する。
- T3: WARDEN、ARGUS、Choir。人間側の統治と機械側の判断のどちらを残すか選ぶ。

### 2. 五勢力の横断ストーリー

各勢力は「接触→証拠→判断」の3段階。判断後も本流へ戻るが、選択タグを保持する。

| 勢力 | 中心テーマ | 最終判断 |
|---|---|---|
| CDF | 命令系統と現場自治 | 統一指揮 / 現場連合 |
| Raiders | 略奪経済と補給線 | 物流網解体 / 限定停戦 |
| Remnant | 古い命令と離反者 | 離反支援 / 司令網廃棄 |
| AEGIS | 治療と選別 | 治療記録公開 / 兵器化記録焼却 |
| WARDEN | 人間以外の判断主体 | ARGUSの処遇選択へ接続 |

全勢力の判断後、「勢力ストーリー：五つの答え」が完了する。これは勝利ではなく、以後の世界状態を決めた記録として扱う。

### 3. 現場記録

施設攻略を単なるLoot地点にしないため、12本の環境物語を追加した。

- Gas Station: 存在しない救急車
- Gun Shop: 二冊の台帳
- Police Station: 最後の保護房
- Fire Station: 火のない出動
- Hospital: 十三番目の患者
- Factory: 遅すぎるサボタージュ
- Relay: 聞かれていた会話
- Radio Tower: 救難信号の裏側
- Military Site: 救われない区域
- Reactor Saint: 封印された成功
- ARGUS Fragment: 一秒の欠陥
- Choir Vessel: 帰宅を繰り返す声

実際の施設・Boss進捗を満たすと自動完了する。クリック完了や中身のない説明ノードは使用しない。

## 実装ファイル

- `config/ftbquests/quests/chapters/deadzone_faction_storylines_01.snbt`
- `config/ftbquests/quests/chapters/deadzone_field_archives_01.snbt`
- `kubejs/server_scripts/project_deadzone_story_branches_v0_1.js`

## 管理コマンド

- `/deadzonestorybranch status`: 五勢力の判断状況を表示。
- `/deadzonestorybranch choose <choice>`: 解放済みの勢力判断を確定。

選択肢:

- `cdf_order`, `cdf_coalition`
- `raider_break`, `raider_truce`
- `remnant_defect`, `remnant_decommission`
- `aegis_release`, `aegis_burn`

WARDENの結末は既存のARGUS処遇コマンドへ接続する。

## テスト項目

1. `/reload`後にKubeJS/FTB Questsエラーが出ない。
2. 勢力ストーリーとフィールド記録の2章が表示される。
3. 各クエストのタイトル、説明、目標が日本語で表示される。
4. 警察署、消防署、Raiders拠点、Relayなどの実進捗で対応ノードが自動完了する。
5. 同じ勢力で二つ目の判断を選べない。
6. `/deadzonestorybranch status`に選択結果が残る。
7. 再接続・再起動後も選択と完了状態が維持される。
8. 新規アイコンに欠落テクスチャがない。

## 次章へ残す結果フック

以下はv1.1で保存済みで、T4以降の任務、商人、援軍、敵増援へ利用する。

- `dz_branch_choice_cdf`
- `dz_branch_choice_raider`
- `dz_branch_choice_remnant`
- `dz_branch_choice_aegis`
- `dz_story_argus_outcome`

この方式なら物語の厚みを増やしても、メイン進行を壊さず結果だけを後続コンテンツへ渡せる。
