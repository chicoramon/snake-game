[CmdletBinding()]
param(
  [string]$BuildDirectory = 'dist',
  [string]$Remote = 'origin',
  [string]$Branch = 'gh-pages',
  [string]$CommitMessage = 'Deploy Snake game preview',
  [switch]$DryRun
)

# Publish the Vite artifact under /preview without replacing the production
# files at the root of gh-pages.
& (Join-Path $PSScriptRoot 'deploy-gh-pages.ps1') `
  -BuildDirectory $BuildDirectory `
  -Remote $Remote `
  -Branch $Branch `
  -TargetDirectory 'preview' `
  -CommitMessage $CommitMessage `
  -DryRun:$DryRun

exit $LASTEXITCODE
