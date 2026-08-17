PROJECT DEADZONE CINEMATIC SOUNDTRACK TEST v0.2

Direction:
- Exploration: cinematic post-apocalyptic score; piano, acoustic textures, strings and layered ambience.
- Combat: guitar, bass and live-style drums, with one orchestral battle variation.
- Boss: heavier metal and orchestral boss themes.
- The former mechanical-loop soundtrack has been backed up outside the active music folder.

Ambience Mini controls:
- P: reload music configuration
- End: pause/resume
- Page Up: skip to another track in the active playlist
- Page Down: print detected state to latest.log

Audition all tracks:
- Open PDZ_BGM_ALL.m3u8 in a media player.
- Or run PDZ_BGM_TEST_ON.bat, press P in game, then use Page Up.
- Run PDZ_BGM_TEST_OFF.bat and press P after testing.

Licensing:
- All v0.2 source tracks are CC0/public-domain dedications.
- Creator names and source pages are recorded in CREDITS_AND_LICENSES.txt.
- Audio has been volume-normalized and transcoded to Ogg Vorbis for PROJECT DEADZONE.
PROJECT DEADZONE adaptive soundtrack v0.3

Smooth transition model
- Normal location changes use Ambience Mini fade-out / fade-in.
- Named, boss and combat music use priorities. The exploration/location track
  is paused and resumes when danger ends instead of restarting from silence.
- There are no hard cuts except the death state.
- Location masters use a quiet 4-second intro and a 6-second tail so two tracks
  can overlap cleanly. Ambience Mini does not perform true beat/bar sync.

Priority order
6: nearby named enemy theme (faction-specific)
5: boss-bar encounter
4: ordinary combat
1: camp or faction outpost
0: biome, weather, cave and time-of-day exploration

Test commands (OP, full restart required after first installation)
/pdzbgmtest music_camp
/pdzbgmtest music_survivor
/pdzbgmtest music_cdf
/pdzbgmtest music_raider
/pdzbgmtest music_remnant
/pdzbgmtest music_aegis
/pdzbgmtest music_warden
/pdzbgmtest music_infected
/pdzbgmtest music_named_raider

Each command applies an invisible 30-second test state. Automatic location and
encounter detection refreshes its own state every two seconds.

Combat mix revision v0.4
- Heavy Battle: repaired the catches around the former 58 s and 1:08 marks.
- Orchestral Assault: recomposed at a slower pace, expanded to about 89 s,
  reduced melodic repetition, and added a subtle air/water ambience bed.
- Both revised masters are 48 kHz stereo Ogg Vorbis.

Named faction expansion v0.5
- CDF: Brass Vanguard - long military orchestra led by brass and timpani.
- Ash Jackals: Iron Jackal - escalating rock/metal suite with extended guitar.
- Remnant: Red Echo - melancholic guitar opening into orchestral pursuit.
- Aegis: Glass Dominion - polished, cold long-form orchestra.
- Warden: Signal Duel - analogue/digital synth conflict with guitar.
- Use /pdzbgmtest music_named_<faction> to audition each state for 30 seconds.
- These tracks use long intros/tails and Ambience Mini priority fading. They do
  not hard-cut the currently playing location theme.
