param([Parameter(Mandatory=$true)][string]$JavaPath)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if(!(Test-Path -LiteralPath $JavaPath)){throw 'Prism Java path is unavailable'}
Push-Location $root
try{
 & $JavaPath -jar packwiz-installer-bootstrap.jar -g 'https://raw.githubusercontent.com/shin-ay/project-deadzone-pack/main/pack.toml'
 if($LASTEXITCODE -ne 0){throw "Packwiz update failed ($LASTEXITCODE); shader patch was not applied"}
 & (Join-Path $PSScriptRoot 'Apply-PdzSolas.ps1') -InstancePath $root -Activate
}finally{Pop-Location}
