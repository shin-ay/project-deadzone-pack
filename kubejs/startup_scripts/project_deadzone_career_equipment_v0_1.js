// PROJECT DEADZONE reusable career equipment registry.
// Full restart required after changing registry entries.

const PDZ_CAREER_EQUIPMENT = [
  ['career_salvage_scanner','Salvage Scanner','kubejs:item/career_salvage_scanner'],
  ['career_survival_rig','Adaptive Survival Rig','kubejs:item/career_survival_rig'],
  ['career_rangefinder','Ballistic Rangefinder','kubejs:item/career_rangefinder'],
  ['career_assault_injector','Assault Injector','kubejs:item/career_assault_injector'],
  ['career_trauma_station','Portable Trauma Station','kubejs:item/career_trauma_station'],
  ['career_responder_beacon','Responder Beacon','kubejs:item/career_responder_beacon'],
  ['career_diagnostic_tool','Vehicle Diagnostic Tool','kubejs:item/career_diagnostic_tool'],
  ['career_flight_computer','Portable Flight Computer','kubejs:item/career_flight_computer'],
  ['career_control_tablet','Automation Control Tablet','kubejs:item/career_control_tablet'],
  ['career_gunsmith_gauge','Gunsmith Calibration Gauge','kubejs:item/career_gunsmith_gauge'],
  ['career_recon_sensor','Recon Threat Sensor','kubejs:item/career_recon_sensor'],
  ['career_signal_jammer','Portable Signal Jammer','kubejs:item/career_signal_jammer'],
  ['career_barrier_projector','Barrier Projector','kubejs:item/career_barrier_projector'],
  ['career_breaching_actuator','Breaching Actuator','kubejs:item/career_breaching_actuator'],
  ['career_field_cooker','Compact Field Cooker','kubejs:item/career_field_cooker'],
  ['career_tracking_module','Wilderness Tracking Module','kubejs:item/career_tracking_module']
]

StartupEvents.registry('item',event=>{
  PDZ_CAREER_EQUIPMENT.forEach(def=>{
    event.create(def[0]).displayName(def[1]).unstackable().texture('layer0',def[2])
  })
})
