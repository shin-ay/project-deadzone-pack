// PROJECT DEADZONE Mechanical Companion integration v0.1
// Automation T2: scout companion. T3 branches unlock support or combat modules.

const PDZ_COMPANION_LOCKED_OUTPUTS = [
  'createmechanicalcompanion:mechanical_wolf_link',
  'createmechanicalcompanion:mechanical_wolf_processor',
  'createmechanicalcompanion:mechanical_wolf_motherboard',
  'createmechanicalcompanion:reinforced_plates',
  'createmechanicalcompanion:netherite_plates',
  'createmechanicalcompanion:mounted_crossbow',
  'createmechanicalcompanion:tesla_tail',
  'createmechanicalcompanion:smelting_fangs',
  'createmechanicalcompanion:booster_rocket',
  'createmechanicalcompanion:quantum_drive',
  'createmechanicalcompanion:regenerative_casing',
  'createmechanicalcompanion:mounted_light',
  'createmechanicalcompanion:mob_radar'
]

ServerEvents.recipes(event => {
  PDZ_COMPANION_LOCKED_OUTPUTS.forEach(id => event.remove({output:id}))
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal('deadzonecompanion').requires(s=>s.hasPermission(2))
  root.then(Commands.literal('automation_test').executes(ctx=>{
    let p=ctx.source.player
    p.persistentData.putString('dz_career_t2','automation')
    p.persistentData.putBoolean('dz_career_kit_v4_t2_automation',false)
    p.tell(Text.of('[TEST] Automation T2 prepared. Relog or wait up to 10 seconds.').aqua())
    return 1
  }))
  root.then(Commands.literal('systems_test').executes(ctx=>{
    let p=ctx.source.player
    p.persistentData.putString('dz_career_t2','automation')
    p.persistentData.putString('dz_career_t3','systems_engineer')
    p.persistentData.putBoolean('dz_career_kit_v4_t3_systems_engineer',false)
    p.tell(Text.of('[TEST] Systems Engineer T3 module prepared.').lightPurple())
    return 1
  }))
  root.then(Commands.literal('architect_test').executes(ctx=>{
    let p=ctx.source.player
    p.persistentData.putString('dz_career_t2','automation')
    p.persistentData.putString('dz_career_t3','industrial_architect')
    p.persistentData.putBoolean('dz_career_kit_v4_t3_industrial_architect',false)
    p.tell(Text.of('[TEST] Industrial Architect T3 modules prepared.').lightPurple())
    return 1
  }))
  event.register(root)
})
