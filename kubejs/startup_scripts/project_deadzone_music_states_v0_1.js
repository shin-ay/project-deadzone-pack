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
    ['music_named_unknown', 0xd4a560],
    ['music_boss_01', 0xd98b32],
    ['music_boss_02', 0x4eb7d8],
    ['music_boss_03', 0x8a4bb8],
    ['music_boss_04', 0xe35a2f],
    ['music_boss_05', 0xd5a34a],
    ['music_boss_06', 0xb79049],
    ['music_boss_07', 0xd8e8e8],
    ['music_boss_08', 0x5f7898],
    ['music_boss_09', 0x6d352d],
    ['music_boss_10', 0x4f75a8],
    ['music_boss_11', 0x8acb4a],
    ['music_boss_12', 0xaa2727],
    ['music_boss_13', 0x64703c]
  ]
  states.forEach(state => event.create('project_deadzone:' + state[0]).color(state[1]).beneficial())
})
