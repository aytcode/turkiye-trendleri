# README ekran görüntülerini ve sosyal önizleme görselini yeniden üretir (Windows + Microsoft Edge).
# Önce yerel sunucuyu başlatın:  node scripts/serve.mjs 4174
param([string]$Base = "http://localhost:4174")

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root "docs\assets"
$profile = Join-Path $env:TEMP "tt-edge-shot"

function Shot($url, $file, $w, $h, $scheme) {
  # preferredColorScheme: 0 = koyu, 1 = açık
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 `
    --user-data-dir=$profile --blink-settings=preferredColorScheme=$scheme `
    --window-size="$w,$h" --virtual-time-budget=8000 --screenshot="$assets\$file" $url 2>$null | Out-Null
  Write-Host "$file"
}

Shot "$Base/" "anasayfa.png" 1280 1500 1
Shot "$Base/" "anasayfa-koyu.png" 1280 1500 0
Shot "$Base/ornek.html" "ornek-rapor.png" 1280 2300 1

# 1200x630 paylaşım görseli (2x ölçek yok: platformlar tam bu boyutu bekler)
& $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir=$profile `
  --window-size=1200,630 --virtual-time-budget=6000 --screenshot="$assets\og.png" `
  ("file:///" + (Join-Path $root "scripts\og-card.html").Replace('\', '/')) 2>$null | Out-Null
Write-Host "og.png"
