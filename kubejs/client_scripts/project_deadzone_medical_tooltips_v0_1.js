ItemEvents.tooltip(event => {
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
