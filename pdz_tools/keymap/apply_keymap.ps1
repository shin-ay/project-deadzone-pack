param([Parameter(Mandatory=$true)][string]$InstanceRoot)
$options = Join-Path $InstanceRoot 'options.txt'
if (!(Test-Path -LiteralPath $options)) { throw 'options.txt not found' }
$backup = "$options.pdz_keymap_backup_20260812"
Copy-Item -LiteralPath $options -Destination $backup -Force
$map = @{
  'key_key.journeymap.map_toggle_alt'='key.keyboard.m'
  'key_key.journeymap.minimap_toggle_alt'='key.keyboard.unknown'
  'key_gui.xaero_open_map'='key.keyboard.unknown'
  'key_gui.xaero_minimap_settings'='key.keyboard.unknown'
  'key_gui.xaero_waypoints_key'='key.keyboard.unknown'
  'key_gui.xaero_open_settings'='key.keyboard.unknown'
}
$lines = Get-Content -LiteralPath $options -Encoding UTF8
$out = foreach ($line in $lines) {
  $idx = $line.IndexOf(':')
  if ($idx -gt 0) {
    $key = $line.Substring(0,$idx)
    if ($map.ContainsKey($key)) { "$key`:$($map[$key])"; continue }
  }
  $line
}
Set-Content -LiteralPath $options -Value $out -Encoding UTF8
