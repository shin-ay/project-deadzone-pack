# PROJECT DEADZONE 集落・勢力統合 v0.1

既存MODの担当範囲を維持しながら、PDZの物語フラグを実際のゲームプレイへ返す統合層。

- MCA: 民間住民、職業タグ、人口上限
- Village Expansion / Recruits: 集落経済、軍備、外交、装備更新
- Workers: 生産系施設だけで限定使用
- Easy NPC: 固有トレーダー、幹部、ボス、ストーリー担当
- FTB Quests: メインストーリーと勢力章
- Camp Contracts / Realm RPG / Bountiful: 一般住民の反復依頼
- PDZ bridge: 勢力選択による価格、援軍、敵増援、攻略コア制圧後の処理

## ゲーム内確認

1. `/reload`
2. `/deadzonequests`
3. `/deadzonestorybranch status`
4. 証拠条件を満たして `/deadzonestorybranch choose <選択肢>`
5. チャットに「結果反映」が表示される
6. `/deadzoneshops rotate` 後、ログの `storyFactor` を確認
7. `/deadzoneactivity list` で生成された援軍・交易隊・敵増援を確認
