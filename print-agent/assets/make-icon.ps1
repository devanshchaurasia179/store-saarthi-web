Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(64, 64)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(79, 110, 247))

$whiteBrush = [System.Drawing.Brushes]::White

# Printer body
$body = New-Object System.Drawing.Rectangle(12, 22, 40, 26)
$g.FillRectangle($whiteBrush, $body)

# Paper tray top
$top = New-Object System.Drawing.Rectangle(18, 14, 28, 12)
$g.FillRectangle($whiteBrush, $top)

# Paper output
$paper = New-Object System.Drawing.Rectangle(18, 40, 28, 14)
$grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 220, 255))
$g.FillRectangle($grayBrush, $paper)

$g.Dispose()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bmp.Save("$scriptDir\tray-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "tray-icon.png created at $scriptDir"
