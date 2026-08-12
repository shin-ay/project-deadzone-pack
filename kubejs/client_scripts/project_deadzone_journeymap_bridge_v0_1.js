// PROJECT DEADZONE JourneyMap client bridge v0.1

NetworkEvents.dataReceived('pdz_journeymap_sync', event => {
  try {
    let bridge = Java.loadClass('com.projectdeadzone.jobui.client.PDZJourneyMapPlugin')
    bridge.update(String(event.data.payload || ''))
  } catch (err) {
    console.error('[PDZ MAP] Client overlay bridge failed: '+err)
  }
})

console.info('[PROJECT DEADZONE] JourneyMap client bridge v0.1 loaded')
