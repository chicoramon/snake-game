[CmdletBinding()]
param(
  [string]$BuildDirectory = 'dist',
  [string]$Remote = 'origin',
  [string]$Branch = 'gh-pages',
  [string]$TargetDirectory = '',
  [string]$CommitMessage = 'Deploy Snake game',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param(
    [Parameter(Mandatory)] [string]$WorkingDirectory,
    [Parameter(Mandatory)] [string[]]$Arguments
  )

  & git -C $WorkingDirectory @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

$repoRoot = ([string](& git rev-parse --show-toplevel)).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repoRoot) {
  throw 'Run this script from inside the SnakeGame Git repository.'
}

# The build creates hashed JS/CSS and an asset-aware service worker. Always
# regenerate it immediately before publishing rather than deploying source.
Push-Location $repoRoot
try {
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
} finally {
  Pop-Location
}

$buildPath = Join-Path $repoRoot $BuildDirectory
$indexPath = Join-Path $buildPath 'index.html'
$serviceWorkerPath = Join-Path $buildPath 'sw.js'
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "Production index.html was not found: $indexPath"
}
if (-not (Test-Path -LiteralPath $serviceWorkerPath -PathType Leaf)) {
  throw "Production sw.js was not found: $serviceWorkerPath"
}

$remoteUrl = ([string](& git -C $repoRoot remote get-url $Remote)).Trim()
if ($LASTEXITCODE -ne 0 -or -not $remoteUrl) {
  throw "Git remote '$Remote' is not configured."
}

$remoteHead = & git -C $repoRoot ls-remote --heads $Remote "refs/heads/$Branch"
if ($LASTEXITCODE -ne 0) {
  throw "Could not connect to Git remote '$Remote'."
}

$targetRelative = $TargetDirectory.Trim()
if ($targetRelative) {
  if ([IO.Path]::IsPathRooted($targetRelative) -or $targetRelative -match '(^|[\\/])\.\.([\\/]|$)') {
    throw 'TargetDirectory must be a safe relative path inside the published branch.'
  }
  $targetRelative = $targetRelative.TrimStart([char[]]@('\', '/')).TrimEnd([char[]]@('\', '/'))
  if (-not $targetRelative) { throw 'TargetDirectory must not resolve to the branch root.' }
}

$tempPath = Join-Path ([IO.Path]::GetTempPath()) ("snake-game-pages-" + [guid]::NewGuid().ToString('N'))

try {
  if ($remoteHead) {
    & git clone --quiet --branch $Branch --single-branch $remoteUrl $tempPath
    if ($LASTEXITCODE -ne 0) { throw "Could not clone $Remote/$Branch." }
  } else {
    & git clone --quiet --no-checkout $remoteUrl $tempPath
    if ($LASTEXITCODE -ne 0) { throw "Could not clone $Remote." }
    Invoke-Git -WorkingDirectory $tempPath -Arguments @('switch', '--orphan', $Branch)
  }

  # This is an isolated temporary checkout created above. Root publishing
  # replaces the production artifact; a target folder replaces only that
  # folder, so /preview can coexist with the live Pages site.
  $publishPath = $tempPath
  if ($targetRelative) {
    $publishPath = Join-Path $tempPath $targetRelative
    if (Test-Path -LiteralPath $publishPath) {
      Remove-Item -LiteralPath $publishPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $publishPath -Force | Out-Null
  } else {
    Get-ChildItem -LiteralPath $tempPath -Force |
      Where-Object Name -notin @('.git', '.github') |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
  }

  Copy-Item -Path (Join-Path $buildPath '*') -Destination $publishPath -Recurse -Force
  [IO.File]::WriteAllText((Join-Path $tempPath '.nojekyll'), '')

  Invoke-Git -WorkingDirectory $tempPath -Arguments @('add', '--all')
  & git -C $tempPath diff --cached --quiet
  $hasChanges = $LASTEXITCODE -eq 1
  if ($LASTEXITCODE -notin @(0, 1)) { throw 'Could not inspect the prepared GitHub Pages changes.' }

  if (-not $hasChanges) {
    Write-Host 'GitHub Pages is already up to date.'
    return
  }

  if ($DryRun) {
    $targetLabel = if ($targetRelative) { "/$targetRelative" } else { '/' }
    Write-Host "Dry run complete. These files would be deployed to ${targetLabel}:"
    Invoke-Git -WorkingDirectory $tempPath -Arguments @('status', '--short')
    return
  }

  $gitName = ([string](& git -C $tempPath config user.name)).Trim()
  $gitEmail = ([string](& git -C $tempPath config user.email)).Trim()
  if (-not $gitName -or -not $gitEmail) {
    throw 'Configure Git user.name and user.email before deploying.'
  }

  $datedMessage = "$CommitMessage - $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')) UTC"
  Invoke-Git -WorkingDirectory $tempPath -Arguments @('commit', '--quiet', '-m', $datedMessage)
  Invoke-Git -WorkingDirectory $tempPath -Arguments @('push', 'origin', "HEAD:$Branch")

  $siteUrl = 'https://chicoramon.github.io/snake-game/'
  if ($targetRelative) { $siteUrl += "$targetRelative/" }
  Write-Host "Deployed the Vite production build to $Remote/$Branch."
  Write-Host "Site: $siteUrl"
}
finally {
  if (Test-Path -LiteralPath $tempPath) {
    Remove-Item -LiteralPath $tempPath -Recurse -Force
  }
}
