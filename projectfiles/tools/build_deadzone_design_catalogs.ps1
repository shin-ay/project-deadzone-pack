param(
    [string]$InstanceRoot = "C:\Users\shinc\curseforge\minecraft\Instances\PROJECT DEADZONE v0.1"
)

$ErrorActionPreference = "Stop"
$outputRoot = Join-Path $InstanceRoot "projectfiles\design"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

function Get-GunName {
    param([hashtable]$Lang, [string]$Namespace, [string]$Id)
    $keys = @(
        "$Namespace.gun.$Id.name",
        "$Namespace.gun.$Id",
        "tacz.gun.$Id.name",
        "tacz.gun.$Id"
    )
    foreach ($key in $keys) {
        if ($Lang.ContainsKey($key)) { return [string]$Lang[$key] }
    }
    return ($Id -replace "_", " ")
}

function Get-GunClass {
    param([string]$Value)
    if ($Value -match "rpg|m320|m79|minigun|can.cannon|launcher|excaliber") { return "重火器" }
    if ($Value -match "aa12|saiga12|genesis12|spas|spasi|m870|db.long|db.short|shotgun|thunderbird") { return "ショットガン" }
    if ($Value -match "dp28|rpk|m249|evolys|mg3|migraine3|aug.hbar|scar.hamr|mg36") { return "LMG" }
    if ($Value -match "awp|aws|m95|m107|m700|kar98|ssg69|wawan|wa2000|svd|dragonuv|m82|gm6|mrad|msr|ar338|mini.fix|timeless|lonetrail") { return "スナイパー" }
    if ($Value -match "mk14|mk11|sr25|scar.ssr|sl8|sks|sg550|hk417|ar10|fn.fal|hk.g3") { return "DMR/バトルライフル" }
    if ($Value -match "mp5|mp7|p90|pego|ump|uzi|uji|mac10|makten|vector|apc9|apacoba|arp9|harpa9|saiga9|vityas|luty|udp9|ro635|sterling") { return "SMG/PDW" }
    if ($Value -match "glock|p320|m17|m9a4|m1911|mk23|hk45|p99|cz75|b93r|deagle|taurus|rhino|c96|af2011|1851|colt.mars|welrod|pistol|revolver") { return "ハンドガン" }
    if ($Value -match "hanger|samula|nailgun|potassium") { return "特殊/ネタ" }
    return "アサルトライフル"
}

function Get-Region {
    param([string]$Value)
    if ($Value -match "(^|[^a-z])ak|aks|rpk|sks|svd|dragonuv|dp28|saiga|vityas|qbz|type.81|rpg7|ots.14|gerosa|cz75") { return "東側" }
    if ($Value -match "hanger|samula|nailgun|potassium|timeless|lonetrail|cursed|blicky|excaliber") { return "架空/その他" }
    return "西側/民間"
}

function Get-Era {
    param([string]$Value)
    if ($Value -match "ak12|ak15|ak19|ak308|ak.alpha|ak.delta|rpk16|svdm|qbz.191|hk416|hk417|scar|mk18|m4a1|g36|p320|m17|m9a4|evolys|apc9|arp9|honey.badger|vector|mp7|ump|saiga|vityas|spr15|genesis|quatro|sr15|sr16|z15|z80|modern|tactical|taktis") { return "新式" }
    if ($Value -match "hanger|samula|nailgun|potassium|timeless|lonetrail|cursed|blicky|excaliber") { return "架空/特殊" }
    return "旧式"
}

function Get-GunTier {
    param([string]$Era, [string]$Class, [string]$Region)
    if ($Era -eq "架空/特殊") { return "T5/原則除外" }
    if ($Class -eq "重火器") { return "T3-T5" }
    if ($Era -eq "新式") {
        if ($Class -match "LMG|スナイパー|DMR") { return "T3-T5" }
        return "T2-T4"
    }
    if ($Class -match "ハンドガン|SMG|ショットガン") { return "T0-T2" }
    return "T1-T3"
}

$taczRoot = Join-Path $InstanceRoot "tacz"
$lang = @{}
Get-ChildItem -LiteralPath $taczRoot -Recurse -File -Filter "en_us.json" | ForEach-Object {
    try {
        $obj = Get-Content -Raw -LiteralPath $_.FullName | ConvertFrom-Json
        $obj.PSObject.Properties | ForEach-Object { $lang[$_.Name] = $_.Value }
    } catch {
        Write-Warning "Skipped invalid language file: $($_.FullName)"
    }
}

$gunRows = @()
$gunDirs = Get-ChildItem -LiteralPath $taczRoot -Recurse -Directory |
    Where-Object { $_.Name -eq "guns" -and $_.Parent.Name -eq "index" }
foreach ($dir in $gunDirs) {
    $namespace = $dir.Parent.Parent.Name
    $pack = $dir.FullName.Substring($taczRoot.Length + 1).Split([IO.Path]::DirectorySeparatorChar)[0]
    foreach ($file in Get-ChildItem -LiteralPath $dir.FullName -File -Filter "*.json") {
        $id = $file.BaseName
        $name = Get-GunName $lang $namespace $id
        $search = "$id $name".ToLowerInvariant()
        $class = Get-GunClass $search
        $region = Get-Region $search
        $era = Get-Era $search
        $tier = Get-GunTier $era $class $region
        $rarity = if ($tier -match "T5") { "legendary" } elseif ($tier -match "T3-T5") { "rare" } elseif ($tier -match "T2-T4") { "uncommon" } else { "common" }
        $gunRows += [pscustomobject]@{
            GunId = "$namespace`:$id"
            DisplayName = $name
            Pack = $pack
            Region = $region
            Era = $era
            WeaponClass = $class
            SuggestedTier = $tier
            SuggestedRarity = $rarity
            Review = if ($name -eq ($id -replace "_", " ")) { "表示名要確認" } else { "" }
        }
    }
}
$gunRows = $gunRows | Sort-Object GunId
$gunRows | Export-Csv -LiteralPath (Join-Path $outputRoot "deadzone_gun_catalog_v0_1.csv") -NoTypeInformation -Encoding UTF8

function Get-ArmorCategory {
    param([string]$Id)
    if ($Id -match "mekasuit|exo|juggernaut|bombsquad|heavy") { return "重装/パワーアーマー" }
    if ($Id -match "hazmat|biohazard|contamination|gasmask|gas_mask|respirator|fire.fighter|diving|scuba") { return "環境防護" }
    if ($Id -match "swat|riot|police|bulletproof|body.vest|armor|armour|military|army|soldier|spec.ops|security") { return "防弾/軍用" }
    if ($Id -match "ghill|guill|hunter|biker|motorcycle|football|hockey|construction") { return "軽装/特殊衣服" }
    return "衣服/装飾"
}

function Get-ArmorTier {
    param([string]$Category, [string]$Id)
    if ($Category -eq "重装/パワーアーマー") { return "T4-T5" }
    if ($Category -eq "環境防護") {
        if ($Id -match "advanced|level.a|mekanism") { return "T3-T5" }
        return "T1-T3"
    }
    if ($Category -eq "防弾/軍用") {
        if ($Id -match "juggernaut|spec.ops|military.riot|bombsquad") { return "T3-T4" }
        return "T1-T3"
    }
    return "T0-T2"
}

$armorRows = @()
$dumpRoot = Join-Path $InstanceRoot "logs\registrydumper\itemdump"
Get-ChildItem -LiteralPath $dumpRoot -File -Filter "*.json" |
    Where-Object { $_.BaseName -ne "minecraft" } |
    ForEach-Object {
        $mod = $_.BaseName
        $ids = Get-Content -Raw -LiteralPath $_.FullName | ConvertFrom-Json
        foreach ($id in $ids) {
            $isStandard = $id -match "(_helmet|_chestplate|_leggings|_boots)$"
            $isSpecial = $id -match "mekasuit_bodyarmor|free_runners_armored|jetpack_armored|scuba_mask|hazmat_(mask|gown|pants)|gas_mask$"
            if (!$isStandard -and !$isSpecial) { continue }
            $slot = if ($id -match "_helmet$|mask$") { "head" } elseif ($id -match "_chestplate$|bodyarmor$|gown$|jetpack") { "chest" } elseif ($id -match "_leggings$|pants$") { "legs" } elseif ($id -match "_boots$|runners") { "feet" } else { "unknown" }
            $category = Get-ArmorCategory $id
            $setKey = $id -replace "(_helmet|_chestplate|_leggings|_boots)$", ""
            $armorRows += [pscustomobject]@{
                ItemId = $id
                Mod = $mod
                Slot = $slot
                SetKey = $setKey
                Category = $category
                SuggestedTier = Get-ArmorTier $category $id
                Detection = if ($isStandard) { "標準部位名" } else { "特殊名称候補" }
            }
        }
    }
$armorRows = $armorRows | Sort-Object ItemId -Unique
$armorRows | Export-Csv -LiteralPath (Join-Path $outputRoot "deadzone_armor_catalog_v0_1.csv") -NoTypeInformation -Encoding UTF8

$gunGroups = $gunRows | Group-Object Region, Era | Sort-Object Name
$armorGroups = $armorRows | Group-Object Category | Sort-Object Name
$summary = @(
    "# PROJECT DEADZONE Equipment Catalog Summary v0.1",
    "",
    "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "",
    "## Guns",
    "",
    "- Gun IDs: $($gunRows.Count)",
    "- Source rule: TaCZ gun packs under data/<namespace>/index/guns",
    "- Old/New cutoff: base design before 1990 = old; 1990 onward or explicit modernization = new",
    "",
    "| Region / Era | Count |",
    "|---|---:|"
)
foreach ($group in $gunGroups) { $summary += "| $($group.Name) | $($group.Count) |" }
$summary += @(
    "",
    "## Armor candidates",
    "",
    "- Wearable candidates: $($armorRows.Count)",
    "- Standard armor-slot naming is reliable; special-name entries require an in-game registry-class audit.",
    "",
    "| Category | Count |",
    "|---|---:|"
)
foreach ($group in $armorGroups) { $summary += "| $($group.Name) | $($group.Count) |" }
$summary | Set-Content -LiteralPath (Join-Path $outputRoot "deadzone_equipment_catalog_summary_v0_1.md") -Encoding UTF8

Write-Output "GUNS=$($gunRows.Count)"
Write-Output "ARMOR_CANDIDATES=$($armorRows.Count)"
Write-Output "OUTPUT=$outputRoot"
