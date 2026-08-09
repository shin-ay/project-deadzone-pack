# 建物改装用・読み込みテスト

対象ワールド: `新規ワールド (5)`

Structure Blockは1辺48ブロックまでなので、大型建物は複数のStructureへ分割されています。
建物全体を表示するときは、建物を置きたい南西下端に立って次のコマンドを実行してください。

- 警察署: `/function project_deadzone:building_edit/load_policestation`
- 消防署: `/function project_deadzone:building_edit/load_firestation`
- 観測所: `/function project_deadzone:building_edit/load_observatory`
- 監視塔: `/function project_deadzone:building_edit/load_watch_tower`
- 学校: `/function project_deadzone:building_edit/load_school`
- 通信塔: `/function project_deadzone:building_edit/load_radio_tower`
- 大型店舗: `/function project_deadzone:building_edit/load_walmart`
- 巨大病院: `/function project_deadzone:building_edit/load_hospital`
- 空母: `/function project_deadzone:building_edit/load_aircraft_carrier`

最初は警察署で確認してください。単体Structure名は
`project_deadzone:deadzone_chaosz_policestation_edit` です。

追加したfunctionの認識には `/reload` が必要です。Structure NBTを追加した後は、
確実に反映するため一度タイトル画面へ戻ってワールドへ入り直してください。

大型建物を編集・保存するときは、読み込み時と同じ48ブロック単位の各セクション名で保存します。
各セクションの原点は
`F:\minecraft_pj\PROJECT_DEADZONE_RoleBuildingRenovation_v0.1\chaosz\<建物名>\*_import_manifest.json`
の `origin` に記録されています。

## 病院の保存区画ガイド

病院は読み込み時に基準点を自動記録します。改装後、次を実行すると36区画の原点へ
区画番号と保存サイズが透過表示されます。

`/function project_deadzone:building_edit/guide_hospital`

表示例 `x1_y2_z0 / 48x48x48` の完全な保存名は
`project_deadzone:deadzone_chaosz_gianthospital_edit_x1_y2_z0` です。

ガイド消去:

`/function project_deadzone:building_edit/clear_guides`
