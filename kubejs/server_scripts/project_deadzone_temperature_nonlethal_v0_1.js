// PROJECT DEADZONE temperature ownership policy (retired compatibility hook).
// Legendary Survival Overhaul is the sole runtime owner of temperature.
// Its common config keeps secondary effects enabled while dangerous heat and
// cold effects are disabled. Temperature affects actions/resources but does
// not directly damage the player. No hurt-event cancellation belongs here.
console.info('[PROJECT DEADZONE] Temperature hurt hook retired: LSO config owns nonlethal temperature policy')
