# PROJECT DEADZONE NPC勢力テスト v0.1

## 実装勢力

| 勢力 | Entity | team | 共通tag |
|---|---|---|---|
| Survivor Network | `minecraft:villager` | `dz_survivors` | `dz_npc`, `dz_survivor` |
| Civil Defense Force | `simpleenemymod:pmcunit` | `dz_civildef` | `dz_npc`, `dz_civildef` |
| Raiders | `tacz_bandits:bandit` | `dz_raiders` | `dz_npc`, `dz_raider`, `dz_hostile` |
| Remnant Military | `simpleenemymod:ruunit` | `dz_remnant` | `dz_npc`, `dz_remnant`, `dz_hostile` |

TaCZ NPCsはテンプレート依存が強いため、初期勢力テストからは外しています。
Survivorは安全確認のためVillagerを使用し、後から会話・交易NPCへ置換します。

## 初回だけ実行

新しいテストワールドごとに一度だけ実行します。

```mcfunction
/function project_deadzone:factions/setup
```

## 4勢力の一括テスト

周囲40ブロック程度に4勢力が配置されるため、広い場所で実行します。

```mcfunction
/function project_deadzone:factions/test/spawn_all
```

確認項目：

- Survivorが攻撃しない
- Civil DefenseのPMCがプレイヤーを攻撃しない
- RaidersがプレイヤーとCivil Defenseを攻撃する
- Remnantがプレイヤーおよび他勢力を攻撃する
- 同じ色・同じteamのNPC同士が攻撃しない
- 銃撃、リロード、遮蔽物移動でクラッシュしない
- 4勢力の人数がチャットへ表示される

## 個別召喚

```mcfunction
/function project_deadzone:factions/squad/survivors
/function project_deadzone:factions/squad/civildef
/function project_deadzone:factions/squad/raiders
/function project_deadzone:factions/squad/remnant
```

## 状態確認

```mcfunction
/function project_deadzone:factions/status
```

## Raider拠点の制圧判定

Raiderを施設内へ配置後、施設中心で次を実行します。

```mcfunction
/function project_deadzone:factions/control/create_raider_site
```

Raider全滅後に次を実行すると、半径32ブロック以内にRaiderがいない拠点を
制圧済みへ変更し、緑色のパーティクルを表示します。

```mcfunction
/function project_deadzone:factions/control/check_raider_sites
```

## テストNPCの削除

実行者から64ブロック以内の`dz_npc`と制圧テストマーカーだけを削除します。
通常Mobや建物には影響しません。

```mcfunction
/function project_deadzone:factions/cleanup_near
```

## 次段階

初期テスト後に以下を調整します。

- SEMの射程、命中率、分隊人数
- 武器・弾薬ドロップ率
- PMCの雇用価格とCivil Defenseの友好条件
- 施設別の守備人数と再スポーン有無
- Survivorの会話、交易、救助状態
- 制圧完了時のStage、Quest、Loot解禁
