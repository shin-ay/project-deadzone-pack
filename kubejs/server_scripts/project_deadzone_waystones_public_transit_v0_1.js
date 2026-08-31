// PROJECT DEADZONE - village public transit v0.1
// Waystones are exploration rewards and public infrastructure, not craftable gear.

ServerEvents.recipes(event => {
  event.remove({ mod: 'waystones' })
  console.info('[PROJECT DEADZONE] Waystones public transit: all player recipes disabled')
})
