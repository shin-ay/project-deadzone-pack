// PROJECT DEADZONE reusable Medic starter equipment.
// Registry changes require a full client/server restart.
StartupEvents.registry("item", event => {
  event.create("field_medical_kit")
    .displayName("Field Medical Kit")
    .maxDamage(12)
    .unstackable()
})
