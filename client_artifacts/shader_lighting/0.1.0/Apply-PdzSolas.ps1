param(
 [string]$InstancePath='',
 [switch]$Activate,
 [switch]$InstallPrismHook
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$utf8=[Text.UTF8Encoding]::new($false)
$map=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'lighting-map.json') -Raw -Encoding UTF8|ConvertFrom-Json
if(!$InstancePath){$InstancePath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))}
$root=[IO.Path]::GetFullPath($InstancePath)
if(!(Test-Path -LiteralPath (Join-Path $root 'mods'))){throw 'Expected a Minecraft profile root containing mods'}
$shaderDir=Join-Path $root 'shaderpacks'
New-Item -ItemType Directory -Path $shaderDir -Force|Out-Null
$base=Join-Path $shaderDir $map.baseFilename
if(!(Test-Path -LiteralPath $base)){throw 'Official Solas base missing. Run the normal Packwiz update first.'}
if((Get-FileHash -LiteralPath $base -Algorithm SHA256).Hash -ne $map.baseSha256){throw 'Unsupported or changed Solas base. Original shader was left untouched.'}
$output=Join-Path $shaderDir $map.name
$stamp=Get-Date -Format 'yyyyMMdd_HHmmss_fff'
$backup=Join-Path $root ".pdz_stage_backups\solas_lighting\$stamp"
$groupKeys=@($map.groups.PSObject.Properties.Name)
$allIds=@($map.entries|ForEach-Object {$_.id})
if(($allIds|Sort-Object -Unique).Count -ne $allIds.Count){throw 'Duplicate mapping IDs'}

# The patch contains only PDZ-owned mappings and transform code; base shader code stays local.
$source=[IO.Compression.ZipFile]::OpenRead($base)
function Read-ShaderText([string]$name){
 $e=$source.GetEntry($name);if(!$e){throw "Missing base file: $name"}
 $reader=[IO.StreamReader]::new($e.Open(),[Text.Encoding]::UTF8,$true)
 try{return $reader.ReadToEnd()}finally{$reader.Dispose()}
}
$properties=Read-ShaderText 'shaders/block.properties'
foreach($id in $allIds){
 $pattern='(?<![a-zA-Z0-9_./:-])'+[regex]::Escape($id)+'(?=[:\s\\]|$)(?::[^\s\\]+)*'
 $properties=[regex]::Replace($properties,$pattern,'')
}
$properties+="`n`n# PDZ Lighting $($map.revision): actual fixture states, lantern-reference luminance`n"
foreach($key in $groupKeys){
 $g=$map.groups.$key
 $tokens=@($map.entries|Where-Object color -eq $key|ForEach-Object {$_.selectors}|Sort-Object -Unique)
 if(!$tokens.Count){continue}
 if([regex]::IsMatch($properties,'(?m)^block\.'+$g.blockId+'\s*=')){throw 'Custom block group collides with upstream'}
 $properties+='block.'+$g.blockId+' = '+($tokens -join " \`n")+"`n"
}

$inv=[Globalization.CultureInfo]::InvariantCulture
function Float([double]$value){return $value.ToString('0.0###',$inv)}
$colorCode="`n    // PDZ-only fixture emitters: match lantern luminance; no flame animation on electric lights.`n"
foreach($key in $groupKeys){
 $g=$map.groups.$key;$id=[int]$g.blockId-10000
 $rgb='vec3('+(Float $g.rgb[0])+', '+(Float $g.rgb[1])+', '+(Float $g.rgb[2])+')'
 $colorCode+="    if (id == $id) { vec3 pdzRgb = $rgb; return pdzRgb * TLCF_I * dot(vec3(TLCF_R, TLCF_G, TLCF_B), vec3(0.2126, 0.7152, 0.0722)) / max(dot(pdzRgb, vec3(0.2126, 0.7152, 0.0722)), 0.001); }`n"
}
$light=Read-ShaderText 'shaders/lib/vx/blocklightColor.glsl'
$function=[regex]::new('\bgetBlocklightColor\s*\([^)]*\)\s*\{')
if($function.Matches($light).Count -ne 1){throw 'Unrecognized upstream lighting function'}
$light=$function.Replace($light,[Text.RegularExpressions.MatchEvaluator]{param($m) $m.Value+$colorCode},1)

$pbr=Read-ShaderText 'shaders/lib/pbr/generatedPBR.glsl'
$conditions=($groupKeys|ForEach-Object {'mat == '+$map.groups.$_.blockId}) -join ' || '
$pbrCode="    // PDZ fixture highlight mask; leave dark supports non-emissive.`n    if ($conditions) { float pdzMask = smoothstep(0.35, 0.9, dot(albedo.rgb, vec3(0.2126, 0.7152, 0.0722))); emission = max(emission, pdzMask * 0.85); }`n"
$anchor=[regex]::new('(?m)^\s*#ifdef GENERATED_EMISSION\s*$')
if($anchor.Matches($pbr).Count -lt 1){throw 'Unrecognized upstream PBR function'}
$pbr=$anchor.Replace($pbr,[Text.RegularExpressions.MatchEvaluator]{param($m) "`n"+$pbrCode+$m.Value},1)
$changes=@{'shaders/block.properties'=$properties;'shaders/lib/vx/blocklightColor.glsl'=$light;'shaders/lib/pbr/generatedPBR.glsl'=$pbr}
$temp=Join-Path $shaderDir ('pdz-solas-build-'+[guid]::NewGuid().ToString('N')+'.tmp')
$stream=[IO.File]::Open($temp,[IO.FileMode]::CreateNew)
$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create,$false)
try {
 foreach($entry in $source.Entries){
  $dest=$zip.CreateEntry($entry.FullName,[IO.Compression.CompressionLevel]::Optimal)
  $dest.LastWriteTime=$entry.LastWriteTime
  $outStream=$dest.Open()
  try{
   if($changes.ContainsKey($entry.FullName)){$bytes=$utf8.GetBytes($changes[$entry.FullName]);$outStream.Write($bytes,0,$bytes.Length)}
   else{$inputStream=$entry.Open();try{$inputStream.CopyTo($outStream)}finally{$inputStream.Dispose()}}
  }finally{$outStream.Dispose()}
 }
 $e=$zip.CreateEntry('PDZ_LIGHTING_README.txt');$e.LastWriteTime=$source.Entries[0].LastWriteTime;$writer=[IO.StreamWriter]::new($e.Open(),$utf8)
 try{$writer.Write("Private PDZ lighting modification $($map.revision), generated locally from official Solas Shader 3.7b by Septonious. Original source and credits retained. Do not redistribute this generated ZIP. Distribute the original PDZ patch instead. $($map.upstream)")}
 finally{$writer.Dispose()}
}finally{$zip.Dispose();$source.Dispose()}

# Verify the private output before installing or changing the selected pack.
$check=[IO.Compression.ZipFile]::OpenRead($temp)
try{
 foreach($key in $changes.Keys){if(!$check.GetEntry($key)){throw 'Generated shader missing a patched file'}}
}finally{$check.Dispose()}
$same=(Test-Path -LiteralPath $output) -and ((Get-FileHash -LiteralPath $temp).Hash -eq (Get-FileHash -LiteralPath $output).Hash)
if($same){Remove-Item -LiteralPath $temp}
else{
 New-Item -ItemType Directory -Path $backup -Force|Out-Null
 if(Test-Path -LiteralPath $output){Copy-Item -LiteralPath $output -Destination (Join-Path $backup $map.name)}
 Move-Item -LiteralPath $temp -Destination $output -Force
}
$baseOptions=$base+'.txt';$newOptions=$output+'.txt'
if((Test-Path -LiteralPath $baseOptions) -and !(Test-Path -LiteralPath $newOptions)){Copy-Item -LiteralPath $baseOptions -Destination $newOptions}

if($Activate){
 $cfg=Join-Path $root 'config\oculus.properties'
 if(!(Test-Path -LiteralPath $cfg)){$cfg=Join-Path $root 'config\iris.properties'}
 if(Test-Path -LiteralPath $cfg){
  $raw=[IO.File]::ReadAllText($cfg)
  $selected=[regex]::Match($raw,'(?m)^shaderPack=(.*)$').Groups[1].Value.Trim()
  if(!$selected -or $selected -eq $map.baseFilename -or $selected -like 'Solas PDZ Lighting*'){
   $next=[regex]::Replace($raw,'(?m)^shaderPack=.*$',('shaderPack='+$map.name))
   if($next -eq $raw -and !$raw.Contains('shaderPack=')){$next+="`nshaderPack=$($map.name)`n"}
   if($next -ne $raw){New-Item -ItemType Directory -Path $backup -Force|Out-Null;Copy-Item -LiteralPath $cfg -Destination (Join-Path $backup (Split-Path $cfg -Leaf));[IO.File]::WriteAllText($cfg,$next,$utf8)}
  }
 }
}
if($InstallPrismHook){
 $cfg=Join-Path (Split-Path $root -Parent) 'instance.cfg'
 if(Test-Path -LiteralPath $cfg){
  $raw=[IO.File]::ReadAllText($cfg)
  $old=[regex]::Match($raw,'(?m)^PreLaunchCommand=(.*)$').Groups[1].Value
  if($old -match 'packwiz-installer-bootstrap\.jar|Update-And-Apply-Solas\.ps1'){
   $command='powershell.exe -NoProfile -ExecutionPolicy Bypass -File pdz_tools/shader_lighting/Update-And-Apply-Solas.ps1 -JavaPath "$INST_JAVA"'
   $encoded='"'+$command.Replace('\','\\').Replace('"','\"')+'"'
   $next=[regex]::Replace($raw,'(?m)^PreLaunchCommand=.*$',('PreLaunchCommand='+$encoded))
   if($next -ne $raw){New-Item -ItemType Directory -Path $backup -Force|Out-Null;Copy-Item -LiteralPath $cfg -Destination (Join-Path $backup 'instance.cfg');[IO.File]::WriteAllText($cfg,$next,$utf8)}
  }else{Write-Warning 'Custom Prism pre-launch command preserved. Use Apply-Solas-PDZ.cmd after updates.'}
 }
}
$result=[pscustomobject]@{revision=$map.revision;profile=$root;shader=$map.name;sha256=(Get-FileHash -LiteralPath $output).Hash.ToLowerInvariant();mappedBlocks=@($map.entries).Count;sourceUnchanged=((Get-FileHash -LiteralPath $base).Hash -eq $map.baseSha256);visualQA='pending';serverChange=$false}
$result|ConvertTo-Json|Write-Output
