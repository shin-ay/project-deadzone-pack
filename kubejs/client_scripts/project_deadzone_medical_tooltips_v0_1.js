ItemEvents.tooltip(event => {
  event.add('legendarysurvivaloverhaul:bandage', [
    Text.green('LSO部位治療: 3回分 / 部位HPを3ずつ回復'),
    Text.aqua('部位ステータス画面で負傷部位を選択して使用'),
    Text.gray('治療時間: 15秒 / 回復促進: 60秒'),
    Text.darkGray('通常HPではなく、選択した部位へ作用します')
  ])
  event.add('kubejs:field_medical_kit', [
    Text.green('右クリック: LSO包帯を1個取り出す'),
    Text.aqua('Medicは他プレイヤーの最悪部位を安定化できます'),
    Text.gray('感染症がある場合は同時治療し、5分間の免疫を付与'),
    Text.darkGray('/deadzonehealth で実部位HPを診断')
  ])
  event.add('apocalypsenow:bandage', [
    Text.gray('Apocalypse Nowの通常医療品・Camp医療供給品'),
    Text.yellow('LSO部位画面で使う包帯とは別アイテムです')
  ])
  event.add('apocalypsenow:pain_killers', [
    Text.gray('痛みを抑える通常医療品'),
    Text.yellow('部位損傷そのものはLSO包帯・Medkit・休養で治療')
  ])
  event.add('apocalypsenow:morphine', [
    Text.gray('緊急時の通常医療品・Field Medical Kit素材'),
    Text.yellow('LSOのMorphineとは別アイテムです')
  ])
  event.add('apocalypsenow:adrenaline_syringe', [
    Text.gray('用途: 緊急時の即時回復'),
    Text.yellow('重傷部位の本格治療には包帯または医療キットを使用')
  ])
  event.add('apocalypsenow:medicalkit', [
    Text.gray('Camp重傷処置に必要な総合医療物資'),
    Text.aqua('LSO Medkitと組み合わせて /deadzonehealth treat_trauma')
  ])
event.add('apocalypsenow:antibiotics', [
    Text.green('全感染系統の軽症～重症を完全治療'),
    Text.aqua('治療後は再感染免疫 5分')
  ])
  event.add('apocalypsenow:homemadeantibiotics', [
    Text.yellow('全感染系統に有効: 軽症は完治 / 中等症以上は1段階緩和')
  ])
  event.add('infectious:antibiotics', [
    Text.green('全感染系統に有効: 中等症まで完治 / 重症は1段階緩和')
  ])
  event.add('minecraft:golden_apple', [
    Text.yellow('全感染系統に有効: 軽症は完治 / 中等症以上は1段階緩和')
  ])
  event.add('minecraft:enchanted_golden_apple', [
    Text.green('全感染系統の軽症～重症を完全治療'),
    Text.aqua('治療後は再感染免疫 10分')
  ])
})
