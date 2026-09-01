// PROJECT DEADZONE expedition sleeping bag client presentation v0.1

const PDZ_COMFORTS_CLIENT_COLORS = [
  "white", "orange", "magenta", "light_blue", "yellow", "lime", "pink",
  "gray", "light_gray", "cyan", "purple", "blue", "brown", "green",
  "red", "black"
]

ItemEvents.tooltip(event => {
  PDZ_COMFORTS_CLIENT_COLORS.forEach(color => {
    event.add("comforts:sleeping_bag_" + color, [
      Text.gold("遠征用寝具"),
      Text.green("眠ってもリスポーン地点は変更されません"),
      Text.gray("使用後は壊して回収できます")
    ])
    event.add("comforts:hammock_" + color, [
      Text.gold("拠点用休憩設備"),
      Text.aqua("昼を休んで夜へ進めるハンモック"),
      Text.gray("防御を固めた家やテラスの休憩場所に")
    ])
  })
})
