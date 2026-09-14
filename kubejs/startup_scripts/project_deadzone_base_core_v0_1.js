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
    .opaque(false)
    .fullBlock(false)
    .notSolid()
    .model("kubejs:block/deadzone_base_core")
    // Stone plinth plus the central communications cage. The visual wooden
    // braces remain non-colliding so the one-block device is easy to approach.
    .box(1, 0, 1, 15, 4, 15)
    .box(5, 4, 5, 11, 13, 11)
})
