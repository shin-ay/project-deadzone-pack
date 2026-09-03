// PROJECT DEADZONE Epic Fight mobility policy v0.1
// Allow movement input during basic attack animations. Epic Fight's built-in
// CANCELABLE_MOVE path suppresses attack root-motion while the player is
// actively moving, so holding back can create distance without removing the
// small lunge from neutral attacks.

ServerEvents.loaded(event => {
  event.server.runCommandSilent("gamerule stiffComboAttacks false")
  console.info("[PROJECT DEADZONE][Epic Fight] stiffComboAttacks=false (retreat during melee enabled)")
})
