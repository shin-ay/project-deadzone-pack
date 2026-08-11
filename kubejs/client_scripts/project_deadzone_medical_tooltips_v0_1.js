ItemEvents.tooltip(event => {
  event.add('legendarysurvivaloverhaul:bandage', [
    Text.green('LSO部位治療: 3回分 / 部位HPを3ずつ回復'),
    Text.aqua('部位ステータス画面で負傷部位を選択して使用'),
    Text.gray('治療時間: 15秒 / 回復促進: 60秒'),
    Text.darkGray('通常HPではなく、選択した部位へ作用します')
  ])
  event.add('kubejs:field_medical_kit', [
    Text.green('右クリック: LSO包帯を1個取り出す'),
    Text.aqua('Medicは他プレイヤーへ右クリックして包帯を渡せます'),
    Text.gray('感染症がある場合は同時に治療します')
  ])
  event.add('apocalypsenow:bandage', [
    Text.gray('用途: 軽傷の部位治療'),
    Text.aqua('Body Statusで負傷部位を選択してから使用'),
    Text.darkGray('クイック使用時は自動選択のため、狙った部位を治せません')
  ])
  event.add('apocalypsenow:pain_killers', [
    Text.gray('用途: 痛みを抑えながら部位HPを徐々に回復'),
    Text.aqua('Body Statusで治療する部位を選択できます')
  ])
  event.add('apocalypsenow:morphine', [
    Text.gray('用途: 重傷部位の応急処置'),
    Text.aqua('Body Statusで治療する部位を選択できます')
  ])
  event.add('apocalypsenow:adrenaline_syringe', [
    Text.gray('用途: 緊急時の即時回復'),
    Text.yellow('重傷部位の本格治療には包帯または医療キットを使用')
  ])
  event.add('apocalypsenow:medicalkit', [
    Text.gray('用途: 大きく損傷した部位の治療'),
    Text.aqua('Body Statusで負傷部位を選択してから使用')
  ])
})
