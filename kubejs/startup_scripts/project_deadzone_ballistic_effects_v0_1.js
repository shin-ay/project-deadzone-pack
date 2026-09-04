// PROJECT DEADZONE ballistic skill markers v0.2.
// These effects do nothing by themselves. TaCZ hit events consume their state.
StartupEvents.registry('mob_effect', event => {
  event.create('project_deadzone:explosive_rounds').color(0xff7a18).beneficial()
  event.create('project_deadzone:corrosive_rounds').color(0x75d34a).beneficial()
  event.create('project_deadzone:smart_link').color(0x35cfff).beneficial()
})
