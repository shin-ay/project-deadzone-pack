// PROJECT DEADZONE Starter Bike Recipes v0.1
// Low-tier bikes deliberately stay on the crafting table. Advanced models keep
// their original production path so later Create/Mechanics progression matters.

ServerEvents.recipes(event => {
  const starterBikes = [
    {
      output: "blocky_bikes:jawa_250",
      engine: "blocky_bikes:jawa_250engine"
    },
    {
      output: "blocky_bikes:simson_s_51",
      engine: "blocky_bikes:engine_simson_s_51"
    },
    {
      output: "blocky_bikes:forterx_125",
      engine: "blocky_bikes:forterx_125_engine"
    }
  ]

  starterBikes.forEach(bike => {
    event.remove({ output: bike.output })
    event.shaped(bike.output, [
      "TFS",
      "WEW"
    ], {
      T: "blocky_bikes:toolkit",
      F: "blocky_bikes:frame",
      S: "blocky_bikes:sparepartsforforks",
      W: "blocky_bikes:wheels",
      E: bike.engine
    }).id("project_deadzone:starter_bikes/" + bike.output.split(":")[1])
  })
})
