// PROJECT DEADZONE career equipment tooltips v0.1 - CLIENT script

const PDZ_CAREER_TOOLTIPS = {
  'kubejs:career_salvage_scanner':['Scavenger','Luck II 45s / Haste I 25s'],
  'kubejs:career_survival_rig':['Adapter','Absorption II 30s / Regeneration I 10s / Resistance I 10s'],
  'kubejs:career_rangefinder':['Marksman','Luck II 35s / Speed I 20s / Strength I 12s'],
  'kubejs:career_assault_injector':['Assault','Speed II 18s / Resistance I 10s / Strength I 12s'],
  'kubejs:career_trauma_station':['Field Surgeon','Heal 4 hearts / Regeneration II 10s'],
  'kubejs:career_responder_beacon':['Combat Medic','Nearby allies heal 3 hearts / Regeneration I 8s'],
  'kubejs:career_diagnostic_tool':['Ground Technician','Haste II 60s / Luck I 30s'],
  'kubejs:career_flight_computer':['Pilot','Slow Falling 50s / Speed II 25s'],
  'kubejs:career_control_tablet':['Automation Engineer','Haste II 75s / Resistance I 15s'],
  'kubejs:career_gunsmith_gauge':['Gunsmith','Haste I / Strength I / Luck I'],
  'kubejs:career_recon_sensor':['Recon','Speed II 30s / Luck II 40s / Invisibility 8s'],
  'kubejs:career_signal_jammer':['Infiltrator','Invisibility 16s / Speed II 16s / Resistance I 8s'],
  'kubejs:career_barrier_projector':['Guardian','Resistance II 20s / Absorption III 40s'],
  'kubejs:career_breaching_actuator':['Enforcer','Strength II 22s / Resistance I 14s'],
  'kubejs:career_field_cooker':['Provider','Food +5 / Saturation / Regeneration I 10s'],
  'kubejs:career_tracking_module':['Ranger','Speed II / Luck II 45s / Jump Boost I 30s']
}

ItemEvents.tooltip(event => {
  Object.keys(PDZ_CAREER_TOOLTIPS).forEach(id => {
    let data=PDZ_CAREER_TOOLTIPS[id]
    event.add(id,[
      Text.of('JOB Exclusive / Reusable').gold(),
      Text.of('Required career: '+data[0]).gray(),
      Text.of('Effect: '+data[1]).aqua(),
      Text.of('T3 boosts duration and strength.').lightPurple()
    ])
  })
  event.add('createmechanicalcompanion:mechanical_wolf_link',[
    Text.of('Automation Engineer T2 equipment').aqua(),
    Text.of('One companion per operator / wrench repair / automatic respawn').gray()
  ])
  event.add('createmechanicalcompanion:regenerative_casing',[
    Text.of('Systems Engineer T3: companion recovery module').lightPurple()
  ])
  event.add('createmechanicalcompanion:reinforced_plates',[
    Text.of('Industrial Architect T3: companion armor module').lightPurple()
  ])
  event.add('createmechanicalcompanion:mounted_crossbow',[
    Text.of('Industrial Architect T3: ranged support module').lightPurple()
  ])
})
