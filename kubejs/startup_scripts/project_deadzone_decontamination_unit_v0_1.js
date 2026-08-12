// PROJECT DEADZONE Field Decontamination Unit v0.1
// Startup registration: restart Minecraft after updating this file.

StartupEvents.registry("block", event => {
  event.create("field_decontamination_unit")
    .displayName("Field Decontamination Unit")
    .hardness(5.0)
    .resistance(12.0)
    .requiresTool(true)
    .soundType("metal")
    .lightLevel(0.55)
    .textureAll("mekanism:block/models/radioactive_waste_barrel")
})
