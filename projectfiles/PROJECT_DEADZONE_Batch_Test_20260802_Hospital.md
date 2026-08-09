# PROJECT DEADZONE 一括テスト：Hospitalストーリー

## 反映

1. サーバーを再起動する。
2. `/reload` を実行してKubeJSエラーがないことを確認する。
3. `/ftbquests reload` を実行してFTB Questsエラーがないことを確認する。

## Hospital編

1. `/deadzonestoryboss test_menu` に `HOSPITAL` が表示される。
2. `/deadzonestoryboss hospital` で5ブロック前方に `Corrupt Field Medic` が出現する。
3. 接近するとHospital導入・到達クエストが自動完了する。
4. ボスHPが70以上で、参加人数に応じて増加する。
5. ボスが通常NPCのダウン状態に入らず、HP 0で撃破できる。
6. 撃破時にHospital制圧クエストが自動完了する。
7. 報酬にMoney 20、包帯6、絆創膏4、鎮痛剤、XP 30が表示される。
8. Hospital制圧後に消防署編が解放される。

## 状態確認

- `/deadzonestoryboss status` で `hospital` が完了表示になる。
- 手動チェックボックスが表示されない。
- テストをやり直す場合は、FTB Questsの編集モードでHospital章の進捗をリセットする。
