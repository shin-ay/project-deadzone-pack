# PROJECT DEADZONE 動的領土・MAP設計 v0.1

更新日: 2026-08-12

## 目的

勢力をバイオームへ固定配置するのではなく、ワールドごとに生成された拠点を起点として勢力圏を形成する。
拠点攻略、補給コンボイ、増援、取引拠点が同じ領土システムへ影響し、その状態をJourneyMapで確認できるようにする。

## 領土の基本単位

- ワールドを128m四方の戦略セルに分割する。
- 野外拠点台帳へ登録されたCoreを領土の起点にする。
- Coreの規模、Supply、Defenders、Alertから支配半径を計算する。
- 別勢力の影響力が近いセルはCONTESTED（係争地）として表示する。
- Core破壊または占領後に支配勢力を変更し、領土を再計算する。

## 拠点規模と基本支配半径

| 規模 | 基本半径 | 想定施設 |
|---|---:|---|
| Small | 320m | 検問所、通信所、小キャンプ |
| Medium | 480m | 警察署、消防署、野戦病院、補給基地 |
| Large | 640m | 軍事基地、研究所、勢力本部 |

補給が多いほど領土は広がる。警戒度が高く補給が途絶えた拠点は影響力が低下する。

## バイオームの扱い

バイオームは所有権そのものではなく、勢力の活動・生成・補給効率へ補正を与える。

| 地域 | 優勢候補 | 補正の方向性 |
|---|---|---|
| 平原・郊外 | Survivor / CDF | 取引、救助、食料補給 |
| 森林 | Raiders / Infected | 待ち伏せ、狩猟、低視認性 |
| 雪原・タイガ | Remnant / CDF | 軍用拠点、寒冷装備 |
| 山岳 | Remnant / WARDEN | 鉱物、通信、機械拠点 |
| 砂漠・荒野 | Raiders / Remnant | 車両コンボイ、長距離戦 |
| 沼地・ジャングル | AEGIS / Infected | 研究施設、変異体 |
| 海岸・海洋 | Salvager / WARDEN | 船舶、海上輸送 |
| Lost Cities | 拠点所有勢力 / Infected | 建物ごとの局地支配 |

## 勢力関係

| 勢力 | 基本関係 | 主な役割 |
|---|---|---|
| Survivor Network | プレイヤー友好 | キャンプ、交易、救助 |
| CDF / USUNIT | 友好〜中立 | 治安維持、パトロール |
| Raiders | 敵対 | 略奪、検問、補給コンボイ |
| Remnant / RUUNIT | 敵対寄り中立 | 軍事拠点、重装部隊 |
| AEGIS | 条件付き中立〜敵対 | 医療研究、感染体回収 |
| WARDEN | 敵対 | 機械生命体、施設防衛 |
| Infected | 全勢力と敵対 | 巣、Horde、都市汚染 |
| Independent | 中立 | 小規模商人、依頼、避難民 |

詳細な外交値は次段階で実装し、同勢力および同一コンボイ内の誤射・同士討ちを禁止する。

## コンボイとの接続

- コンボイ出発時に出発拠点のSupplyを消費する。
- 到着時に目的拠点のSupplyを増加し、領土を再計算する。
- 撃破時は補給が届かず、目的拠点の勢力圏拡大を阻止する。
- 未読込中は仮想座標だけを移動し、プレイヤー接近時のみNPCを実体化する。
- JourneyMapには仮想移動中も勢力色の旗アイコンと進行方向を表示する。

## JourneyMap表示

- `M`: JourneyMap全画面MAP。
- `J`: JOBキャリアUIを維持。
- 支配セル: 勢力色の半透明ポリゴン。
- 係争セル: 所有勢力色を薄く表示し、説明へ対立勢力を併記。
- 拠点: 勢力別アイコン、規模、Supply、Alertを表示。
- コンボイ: 旗アイコン、状態、出発地、目的地、進行方向を表示。
- Mob: JourneyMapのMob Iconを利用し、点表示ではなく種類別アイコンを優先する。
- 初期同期範囲は領土・拠点2,048m、活動1,536m。全世界の情報を最初から公開しない。

## 管理コマンド

- `/deadzoneactivity scan`: 周辺の拠点を台帳へ登録・更新。
- `/deadzoneactivity spawn raider_supply`: Raider補給コンボイを作成。
- `/deadzoneactivity list`: 拠点と活動を確認。
- `/deadzoneterritory rebuild`: 現在の拠点台帳から領土を再計算。
- `/deadzoneterritory status`: 現在地の所有勢力・係争状態を確認。
- `/deadzoneterritory list`: 勢力別セル数を確認。
- `/deadzoneterritory capture <faction>`: 96m以内の登録Coreを指定勢力へ変更。
- `/deadzonemap sync`: JourneyMap表示を即時同期。

## テスト順序

1. `deadzoneactivity scan`
2. `deadzoneterritory rebuild`
3. `deadzoneterritory list`
4. `deadzonemap sync`
5. MでMAPを開き、領土・拠点の位置を確認
6. `deadzoneactivity spawn raider_supply`
7. コンボイの仮想移動とMAPアイコンを確認
8. コンボイ到着または撃破後、領土が再計算されることを確認

## 次段階

- 拠点Coreの破壊イベントを台帳の`coreAlive`へ直結する。
- CDF Patrol、Infected Horde、Trade Caravanを同じ活動基盤へ追加する。
- 勢力外交値と敵味方判定を一本化する。
- Scout、無線機、通信塔でMAP公開範囲を拡張する。
- 拠点名、リーダー、Named NPC、交易内容をMAP詳細へ追加する。
