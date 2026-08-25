// PROJECT DEADZONE logistics contract item v0.1

StartupEvents.registry("item", event => {
  event.create("logistics_manifest")
    .displayName("封印輸送マニフェスト")
    .tooltip("契約貨物の受領証。投棄すると契約失敗になる。")
    .texture("layer0", "minecraft:item/map")
    .maxStackSize(1)
})
