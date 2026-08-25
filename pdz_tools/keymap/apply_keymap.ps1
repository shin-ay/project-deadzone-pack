param([Parameter(Mandatory=$true)][string]$InstanceRoot)

$ErrorActionPreference = 'Stop'
$options = Join-Path $InstanceRoot 'options.txt'
if (!(Test-Path -LiteralPath $options -PathType Leaf)) { throw 'options.txt not found' }

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backup = "$options.pdz_keymap_backup_$stamp"
Copy-Item -LiteralPath $options -Destination $backup -Force

# Only key bindings are patched. Video, audio, sensitivity, language and
# accessibility settings remain the player's own settings.
$map = @{
  'key_key.inventory'='key.keyboard.e'
  'key_key.playerlist'='key.keyboard.tab'
  'key_key.drop'='key.keyboard.q'
  'key_key.swapOffhand'='key.keyboard.f'
  'key_key.sneak'='key.keyboard.left.control'
  'key_key.sprint'='key.keyboard.left.shift'

  'key_key.tacz.inspect.desc'='key.keyboard.h'
  'key_key.tacz.reload.desc'='key.keyboard.r'
  'key_key.tacz.crawl.desc'='key.keyboard.c'
  'key_key.tacz.melee.desc'='key.keyboard.v'
  'key_key.tacz.zoom.desc'='key.keyboard.unknown'
  'key_key.tacz.fire_select.desc'='key.keyboard.semicolon'
  'key_key.tacz.refit.desc'='key.keyboard.z'

  'key_key.voice_chat'='key.keyboard.caps.lock'
  'key_key.sophisticatedbackpacks.open_backpack'='key.keyboard.b'
  'key_key.sophisticatedbackpacks.inventory_interaction'='key.keyboard.unknown'
  'key_key.ping'='key.mouse.middle'
  'key_key.pdzjobui.open'='key.keyboard.j'
  'key_key.classmod.open_profile'='key.keyboard.k'
  'key_key.classmod.open_messenger'='key.keyboard.unknown'
  'key_mmorpg.key.hub_screen'='key.keyboard.g'
  'key_mmorpg.key.quick_drink_potion'='key.keyboard.p:ALT'
  'key_key.basic_nvg.night_vision_toggle'='key.keyboard.n'
  'key_key.basic_nvg.overlay_toggle'='key.keyboard.unknown'
  'key_key.basic_nvg.night_vision_overlay_toggle'='key.keyboard.unknown'
  'key_key.recruits.team_screen_key'='key.keyboard.u'

  'key_key.journeymap.map_toggle_alt'='key.keyboard.m'
  'key_key.journeymap.minimap_toggle_alt'='key.keyboard.j:CONTROL'
  'key_gui.xaero_open_map'='key.keyboard.unknown'
  'key_gui.xaero_minimap_settings'='key.keyboard.unknown'
  'key_gui.xaero_waypoints_key'='key.keyboard.unknown'
  'key_gui.xaero_open_settings'='key.keyboard.unknown'

  'key_key.tacmove.lean_left'='key.keyboard.a:ALT'
  'key_key.tacmove.lean_right'='key.keyboard.d:ALT'
  'key_key.legendarysurvivaloverhaul.body_health'='key.keyboard.h:CONTROL'
  'key_key.toms_storage.open_terminal'='key.keyboard.b:ALT'
  'key_key.zombiekit.exo_sneak_mode'='key.keyboard.c:ALT'
  'key_key.zombiekit.exo_combat_mode'='key.keyboard.v:ALT'
  'key_key.buildinggadgets2.undo'='key.keyboard.z:CONTROL'
}

$lines = Get-Content -LiteralPath $options -Encoding UTF8
$seen = @{}
$out = foreach ($line in $lines) {
  $idx = $line.IndexOf(':')
  if ($idx -gt 0) {
    $key = $line.Substring(0,$idx)
    if ($map.ContainsKey($key)) {
      $seen[$key] = $true
      "$key`:$($map[$key])"
      continue
    }
  }
  $line
}

$missing = @($map.Keys | Where-Object { -not $seen.ContainsKey($_) } | Sort-Object)
[IO.File]::WriteAllLines($options, $out, [Text.UTF8Encoding]::new($false))

Write-Host "[OK] Updated $($seen.Count) PROJECT DEADZONE key bindings."
Write-Host "[OK] Backup: $backup"
if ($missing.Count -gt 0) {
  Write-Warning "Bindings not present in this instance: $($missing -join ', ')"
}
