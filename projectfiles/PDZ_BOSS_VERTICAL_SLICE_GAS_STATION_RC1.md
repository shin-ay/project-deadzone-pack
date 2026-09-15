# PDZ Gas Station Boss Vertical Slice RC1

## Purpose

Use the first mandatory Gas Station operation to validate the boss combat standard before rebuilding later story bosses and FIRST VOICE.

## Ownership

- Brutal Bosses owns Axel's entity creation, scale and base combat AI.
- Mine and Slash owns combat stats and multiplayer durability scaling.
- PDZ only bridges the story trigger, encounter presentation, weak points, phase objects, cleanup and rewards.
- The legacy Fuel Route Scout encounter is no longer spawned by the Gas Station story path.

## Encounter

1. Phase 1: destroy the two visible rear fuel tanks to remove resistance and mobility support.
2. At 65% HP: an ammunition bearer and three emergency fuel cylinders appear. Destroying cylinders deals encounter damage and creates a short vulnerability window.
3. At 30% HP: Axel enters a final offensive state.
4. Every 12 seconds: Axel marks a fixed 3.5-block impact area. The incendiary grenade detonates 1.5 seconds later for 4 base damage and brief slowness.

Nearby players receive a persistent action-bar objective showing HP and the current counterplay. Axel is 1.35 visual scale and carries an M4A1 instead of the former S0 minigun.

## Multiplayer checks

- Target duration: 3-6 minutes for 1-4 players using current S0 equipment.
- Both rear tanks are visible, follow Axel correctly and accept gun/melee hits from players.
- Phase transitions cannot be skipped by a high-damage shot.
- The warning area is readable with shaders, and 1.5 seconds is enough to evade without feeling trivial.
- All nearby participants receive story progression and bridge rewards exactly once.
- Reset/death leaves no slimes, block displays, bearers or cylinders behind.
- The boss returns to its encounter area and does not chase through the world.

## Combat survivability target

- Story-boss damage to players is reduced by 40% before the final safety cap.
- While healthy, a single combat hit is capped at 68% of maximum HP for a standard build and 50% for a tank build.
- The safety cap only covers entity and projectile combat; environmental, void and administrative damage remain unchanged.
- Boss HP and phase durability stay intact so the change creates reaction time without turning the fight into a short damage race.

## Test commands

- `/deadzonestoryboss gasstation` — spawn the actual story-linked encounter at the operator.
- `/deadzoneboss axel_status` — inspect phase and runtime-object state.
- `/deadzonebosstest probe` — inspect M&S durability, phase gate and pulse data.
- `/deadzoneboss axel_reset` — reset the nearby test encounter without rewards.
