param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$brandingDir = Join-Path $repoRoot 'assets\branding'
$iconsDir = Join-Path $repoRoot 'assets\icons'
$socialDir = Join-Path $repoRoot 'assets\social'
New-Item -ItemType Directory -Force -Path $brandingDir, $iconsDir, $socialDir | Out-Null

function New-Canvas([int]$width, [int]$height, [bool]$transparent = $false) {
  $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  if ($transparent) {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  } else {
    $graphics.Clear([System.Drawing.Color]::FromArgb(255, 2, 7, 4))
  }
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-CroppedImage($graphics, $source, $sourceRect, $destinationRect) {
  $graphics.DrawImage(
    $source,
    $destinationRect,
    $sourceRect.X,
    $sourceRect.Y,
    $sourceRect.Width,
    $sourceRect.Height,
    [System.Drawing.GraphicsUnit]::Pixel
  )
}

function Save-Png($bitmap, [string]$path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-Icon([int]$size, [string]$path, [double]$artScale = 0.88) {
  $canvas = New-Canvas $size $size
  $graphics = $canvas.Graphics
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, $size, $size),
    [System.Drawing.Color]::FromArgb(255, 2, 14, 6),
    [System.Drawing.Color]::FromArgb(255, 23, 12, 2),
    55
  )
  $graphics.FillRectangle($background, 0, 0, $size, $size)
  $background.Dispose()

  $artWidth = [int]($size * $artScale)
  $artHeight = [int]($artWidth * 0.53)
  $artX = [int](($size - $artWidth) / 2)
  $artY = [int](($size - $artHeight) / 2 - ($size * 0.025))
  $mascotCrop = [System.Drawing.Rectangle]::new(240, 112, 620, 330)
  Draw-CroppedImage $graphics $source $mascotCrop ([System.Drawing.Rectangle]::new($artX, $artY, $artWidth, $artHeight))

  Save-Png $canvas.Bitmap $path
  $graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

$source = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $SourcePath))
try {
  # The supplied master contains a generous transparent surround. This crop keeps
  # the complete wordmark, mascot, and tagline while removing that dead space.
  $logoCanvas = New-Canvas 720 530 $true
  Draw-CroppedImage $logoCanvas.Graphics $source ([System.Drawing.Rectangle]::new(82, 105, 876, 645)) ([System.Drawing.Rectangle]::new(0, 0, 720, 530))
  Save-Png $logoCanvas.Bitmap (Join-Path $brandingDir 'snakebit-logo.png')
  $logoCanvas.Graphics.Dispose()
  $logoCanvas.Bitmap.Dispose()

  New-Icon 512 (Join-Path $iconsDir 'icon-512.png') 0.9
  New-Icon 512 (Join-Path $iconsDir 'icon-512-maskable.png') 0.7
  New-Icon 192 (Join-Path $iconsDir 'icon-192.png') 0.9
  New-Icon 180 (Join-Path $iconsDir 'apple-touch-icon.png') 0.86
  New-Icon 32 (Join-Path $iconsDir 'favicon-32x32.png') 0.94
  New-Icon 16 (Join-Path $iconsDir 'favicon-16x16.png') 0.98

  $faviconBitmap = [System.Drawing.Bitmap]::FromFile((Join-Path $iconsDir 'favicon-32x32.png'))
  try {
    $iconHandle = $faviconBitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $stream = [System.IO.File]::Create((Join-Path $iconsDir 'favicon.ico'))
    try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose() }
  } finally {
    $faviconBitmap.Dispose()
  }

  $ogCanvas = New-Canvas 1200 630
  $ogGraphics = $ogCanvas.Graphics
  $ogBackground = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, 1200, 630),
    [System.Drawing.Color]::FromArgb(255, 1, 12, 4),
    [System.Drawing.Color]::FromArgb(255, 24, 11, 2),
    22
  )
  $ogGraphics.FillRectangle($ogBackground, 0, 0, 1200, 630)
  $ogBackground.Dispose()
  Draw-CroppedImage $ogGraphics $source ([System.Drawing.Rectangle]::new(82, 105, 876, 645)) ([System.Drawing.Rectangle]::new(195, 20, 810, 596))

  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
  $encoderParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $encoderParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 88L)
  $ogCanvas.Bitmap.Save((Join-Path $socialDir 'og-image.jpg'), $jpegCodec, $encoderParameters)
  $encoderParameters.Dispose()
  $ogGraphics.Dispose()
  $ogCanvas.Bitmap.Dispose()
} finally {
  $source.Dispose()
}
