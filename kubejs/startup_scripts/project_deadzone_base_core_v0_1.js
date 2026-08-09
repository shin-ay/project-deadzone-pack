// PROJECT DEADZONE Base Core v0.1
// A full Minecraft restart is required after changing startup registrations.

StartupEvents.registry("block", event => {
  event.create("deadzone_base_core")
    .displayName("DEADZONE Base Core")
    .hardness(8.0)
    .resistance(24.0)
    .requiresTool(true)
    .soundType("metal")
    .lightLevel(0.4)
    .textureAll("minecraft:block/lodestone_top")
})
