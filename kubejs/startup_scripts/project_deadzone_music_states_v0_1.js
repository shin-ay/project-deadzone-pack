// Hidden, no-op state effects used as a per-player bridge to Ambience Mini.
// The server decides where each player is; Ambience Mini only chooses music.
StartupEvents.registry('mob_effect', event => {
  const states = [
    ['music_camp', 0xd8b36a],
    ['music_survivor', 0x71b77a],
    ['music_cdf', 0x5c8fd6],
    ['music_raider', 0xc46c35],
    ['music_remnant', 0x8a5050],
    ['music_aegis', 0x80cad0],
    ['music_warden', 0x9b72c7],
    ['music_infected', 0x718346],
    ['music_named_survivor', 0xb8d890],
    ['music_named_cdf', 0x8ab8ef],
    ['music_named_raider', 0xef7b35],
    ['music_named_remnant', 0xc45a5a],
    ['music_named_aegis', 0xa6eff0],
    ['music_named_warden', 0xc98cf2],
    ['music_named_infected', 0x9eaa4e],
    ['music_named_unknown', 0xd4a560]
  ]
  states.forEach(state => event.create('project_deadzone:' + state[0]).color(state[1]).beneficial())
})
