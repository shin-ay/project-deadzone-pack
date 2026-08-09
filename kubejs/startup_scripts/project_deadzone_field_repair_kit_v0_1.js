// PROJECT DEADZONE portable repair item. Full restart required.
StartupEvents.registry("item", event => {
  event.create("field_repair_kit")
    .displayName("野戦修理キット")
    .texture("immersiveengineering:item/toolbox")
    .maxStackSize(16)
    .tooltip("§7オフハンドの装備耐久を回復")
    .tooltip("§bMechanic 40% / Engineer 32% / その他 25%")
    .tooltip("§aAffix・熟練度・銃の内部データを維持")
})
