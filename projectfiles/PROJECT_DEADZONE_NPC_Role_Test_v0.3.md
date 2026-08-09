# NPC役職編成テスト v0.3

既存の検証済み編成は変更せず、役職差を加えた比較用編成を追加した。

## 召喚

広い場所で次を実行する。

```mcfunction
/function project_deadzone:factions/test/spawn_roles
```

## 編成

- Survivor: 一般人1、Guard 1、Medic 1
- Civil Defense: Guard 2、Officer 1、Medic 1
- Raiders: 通常3、Scout 2、Enforcer 1、Medic 1
- Remnant: Soldier 2、Officer 1、Heavy 1、Medic 1

## 想定する強さ

- Survivorは拠点防衛用で、積極的な攻略戦力にはしない。
- Civil Defenseは少人数でもRaiderへ抵抗できるが、圧倒はしない。
- Raidersは個体性能を抑え、7人の人数差で脅威を作る。
- Remnantは後半施設用。Heavyを正面から撃ち合うと危険な強さにする。

## 確認項目

1. 各役職名と人数が合っている
2. 同一勢力で同士討ちしない
3. Raider Scoutだけ明確に速い
4. Raider Enforcerは強いが、序盤武器でも集中攻撃なら倒せる
5. Remnant Heavyは遅く、硬い
6. Civil Defenseが強すぎてRaider 7人を簡単に全滅させない
7. NPCが最初の致死ダメージでダウンする
8. 同勢力のMedicが16ブロック以内にいると約3秒後に蘇生する
9. 蘇生後、再度倒されると死亡する
10. Medicが倒れているか離れている場合、ダウンしたNPCが約30秒で失血死する

終了後は次で周辺のテストNPCだけ削除する。

```mcfunction
/function project_deadzone:factions/cleanup_near
```
