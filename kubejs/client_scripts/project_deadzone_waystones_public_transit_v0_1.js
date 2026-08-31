// Hide disabled portable warp equipment and station blocks from JEI.
// Generated village stations remain visible and usable in the world.

JEIEvents.hideItems(event => {
  event.hide('@waystones')
})
