// PROJECT DEADZONE Currency v0.1
// Apocalypse Now money is scavenged currency, not a craftable resource.

ServerEvents.recipes(event => {
  event.remove({id: "apocalypsenow:cointomoney"})
  event.remove({id: "apocalypsenow:moneyrecipe"})
  event.remove({id: "apocalypsenow:coinsre"})
})
