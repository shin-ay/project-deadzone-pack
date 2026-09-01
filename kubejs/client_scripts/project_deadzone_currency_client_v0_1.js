// PROJECT DEADZONE currency presentation.
// Keep the retired paper money and disabled mint machinery out of JEI.
JEIEvents.hideItems(event => {
  event.hide('apocalypsenow:money')
  event.hide('lightmanscurrency:coinmint')
})
