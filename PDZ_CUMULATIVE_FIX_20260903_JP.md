# PDZ 累積修正・検証記録（2026-09-03）

## 修正概要

- Infectious 1.7の初期スポーン手続き26種が、Forgeへ追加される前のEntityを半径10ブロック条件で`discard()`していた不整合を互換MODで抑止。同じremovedインスタンスをServerLevelが再追加する経路を解消。
- PDZ側もInfectiousのEntityJoinをcancelしない方針へ統一。放射線Tier制限はプレイヤーへの効果除去で維持し、キャンプ保護の汎用spawn拒否からInfectiousを除外。
- Epic Fight戦闘モードへ基本1.20倍、実際の攻撃アニメーション遷移から取得したコンボ段数へ1.15/1.50倍を適用し、診断値を保存。
- TaCZ銃撃の独自クリティカル判定を最終ダメージへ接続。近接はMine and Slash標準クリティカルを維持し二重判定を回避。
- `apocalypsenow:coins` / `apocalypsenow:money` の決済・報酬経路をCreditへ移行。旧通貨参照は移行回収、レシピ削除、クライアント非表示に限定。
- `minecraft:emerald` の決済・報酬利用をCreditへ移行。残存参照は通常素材、戦利品、設定上の重み、クエスト表示アイコンのみ。
- 標準Merchant取引をPDZ上で利用不可にし、Easy NPCとLightman's Currency市場へ決済経路を限定。
- Easy NPC商店を店舗別期限・ロード時/利用時更新へ変更し、連続商品を抑制。
- PDZ管理対象のLightman's Currency自販機だけを座標登録し、チャンクロード時/利用時に期限切れ更新。私営自販機、所有者、creative、税設定は変更しない。
- Crabber's Delight 1.2.3をclient/server両側へ追加。料理分類と魚介連携を追加し、未導入Sully's Mod参照レシピを条件付き化。
- 温泉中の重複した再生・耐性・耐寒系表示を非表示へまとめ、Farmer's Delightの快適系表示を代表として維持。タレント/戦闘/職業の短時間内部効果もアイコン非表示へ移し、長時間料理バフは表示を維持。

## 通貨用途監査

対象: KubeJS、データパック、loot table、レシピ、FTB Quests、Easy NPC取引、村/拠点/荒野商人、報酬関数、設定ファイル。

- 置換対象: buy / sell / cost / payment / reward / trade、および商品・報酬ItemStack。
- 維持対象: エメラルドの通常素材・装飾・自然loot、検索用ID一覧、クエスト表示アイコン。
- 旧通貨IDの維持対象: 所持品移行回収、旧レシピ除去、JEI等の非表示処理。

## 検証

- packwiz: 5,525エントリを実ファイルSHA-256と照合し不一致0件。`pack.toml`のindex hashも一致。
- Crabber's Delight jar: Modrinth配布SHA-1 `a625f5b0e377597f7c884768ea8b9d0a81206831` とclient/QA server双方が一致。
- 専用サーバー: Forge 47.4.10 / Minecraft 1.20.1で起動し `Done (15.355s)` 到達。追加PDZスクリプトは全てロード、対象KubeJSエラー0件、Crabber固有レシピ警告0件。
- Infectiousスポーン試験: 通常/Radioactive/Farmer/Fungal/Hazmat/Balloon/Burning/Crawling/Climber/Ancientを含む13回で`marked as removed already` 0件、`Fetching packet for removed entity` 0件。
- MCAスポーン試験: 最初のZombieVillagerEntityMCA生成時だけ`defineId`が37件（数ms内）発生し、その後3体の追加生成で再発0件。MCA 7.6.26のクラス静的初期化警告で、PDZの反復スポーン処理ではなく生成実害も確認されないため本体改変は行わない。
- 変更したHUDポリシー/職業/タレント/スキルスクリプトは専用サーバーで全てロードし、対象KubeJSエラー0件。Mine and Slash連携クラスも正常ロード。
- 実サーバーは未変更。startup scriptと新規MODを含むため、本番適用には完全停止、client/server同時配備、再起動が必要。

## 再起動後の監視基準

- `marked as removed already` と `Fetching packet for removed entity` は0件を合格基準とする。
- MCA `ZombieVillagerEntityMCA defineId` は再起動後の初回生成時に限る37件前後の一括警告を既知挙動とし、その後の生成ごとに増える場合だけ回帰扱いする。
- 起動完了後の定常運転で連続する`Can't keep up`がないこと。初回データパックロード単発は別計測にする。

## 既存ワールドと移行

- Crabber's Delightのヤシ、貝殻、カニ等のworldgenは新規生成チャンクにのみ現れる。既存チャンクは変更しない。
- 既存の拠点大型自販機は、管理者がPDZ設定カードを持ってスニーク右クリックすると管理市場として登録・修復される。
- 旧固定プリセットの設定カード処理と管理市場登録を同一トランザクションへ統合。成功メッセージが出た機体は必ず2時間ローテーション対象となり、大型機の上段をクリックした場合も下段座標へ正規化する。
- 自動設置村市場は既存の村サービス座標レジストリから取り込み、ロード済みチャンクだけを遅延更新する。強制チャンクロードと全ワールド走査は行わない。
