// PROJECT DEADZONE legacy JourneyMap overlay retirement v0.2
//
// JourneyMap itself remains enabled.  The old PDZ overlay was compiled against
// JourneyMap API v2 (IClientPlugin), which is not present in the distributed
// 1.20.1 client.  Loading PDZJourneyMapPlugin therefore threw a
// ClassNotFoundException every time the server sent its 30-second refresh.
// Territory/site presentation is currently handled by the native map and
// in-world discovery UI, so this legacy packet listener is intentionally gone.

console.info('[PROJECT DEADZONE] Legacy JourneyMap custom overlay disabled; native JourneyMap remains active')
