// Thin natural RU patrols; authored faction/story encounters are exempt.
EntityEvents.spawned('simpleenemymod:ruunit',event=>{
  let e=event.entity
  e.server.scheduleInTicks(20,()=>{
    if(!e || !e.alive || e.tags.contains('dz_raider') || e.tags.contains('dz_story_npc') ||
       e.tags.contains('dz_story_boss') || e.tags.contains('dz_elite') || e.tags.contains('dz_t0_convoy'))return
    if(Math.random()>0.16)e.discard()
  })
})
