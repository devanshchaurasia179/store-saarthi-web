Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 256)
$bitmaps = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(79, 110, 247))
    
    $whiteBrush = [System.Drawing.Brushes]::White
    $margin = [int]($size * 0.18)
    $bodyH  = [int]($size * 0.4)
    $bodyY  = [int]($size * 0.34)
    $topH   = [int]($size * 0.2)
    $topY   = $bodyY - $topH + 2
    $w      = $size - $margin * 2
    
    $g.FillRectangle($whiteBrush, $margin, $bodyY, $w, $bodyH)
    $g.FillRectangle($whiteBrush, $margin + 4, $topY, $w - 8, $topH)
    $g.Dispose()
    $bitmaps += $bmp
}

# Write ICO file manually
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outPath = "$scriptDir\icon.ico"
$stream  = [System.IO.File]::OpenWrite($outPath)
$writer  = New-Object System.IO.BinaryWriter($stream)

$count = $bitmaps.Count
# ICO header
$writer.Write([uint16]0)       # reserved
$writer.Write([uint16]1)       # type: icon
$writer.Write([uint16]$count)  # image count

# Collect PNG bytes for each size
$pngBlocks = @()
foreach ($bmp in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBlocks += ,$ms.ToArray()
    $ms.Dispose()
}

# Directory entries start after header (6 bytes) + count * 16 bytes
$offset = 6 + $count * 16

foreach ($i in 0..($count - 1)) {
    $s    = $sizes[$i]
    $bytes = $pngBlocks[$i]
    $w    = if ($s -eq 256) { 0 } else { $s }
    $h    = if ($s -eq 256) { 0 } else { $s }
    $writer.Write([byte]$w)
    $writer.Write([byte]$h)
    $writer.Write([byte]0)   # color count
    $writer.Write([byte]0)   # reserved
    $writer.Write([uint16]1) # color planes
    $writer.Write([uint16]32) # bits per pixel
    $writer.Write([uint32]$bytes.Length)
    $writer.Write([uint32]$offset)
    $offset += $bytes.Length
}

foreach ($bytes in $pngBlocks) {
    $writer.Write($bytes)
}

$writer.Flush()
$writer.Close()
$stream.Close()

foreach ($bmp in $bitmaps) { $bmp.Dispose() }
Write-Host "icon.ico created at $outPath"
