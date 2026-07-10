param(
  [string]$Commit = "HEAD",
  [string]$OutputDir = "RELEASES",
  [switch]$Upload,
  [string]$ServerHost = "root@64.90.30.232",
  [string]$SshKey = "C:\Users\29102\.ssh\server-hk-key",
  [string]$BindAddress = "192.168.50.151",
  [string]$RemoteDir = "/opt/coc-platform-data/incoming-releases"
)

$ErrorActionPreference = "Stop"

function Invoke-ReleaseStep {
  param(
    [string]$Label,
    [scriptblock]$Script,
    [string]$WorkingDirectory = (Get-Location).Path
  )

  Push-Location $WorkingDirectory
  try {
    & $Script
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed: $Label"
    }
  }
  finally {
    Pop-Location
  }
}

$RepoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot

$ResolvedCommit = (git rev-parse $Commit).Trim()
$ShortCommit = (git rev-parse --short=12 $ResolvedCommit).Trim()
$Branch = ((git branch --show-current) -join "").Trim()
if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = "detached"
}

Invoke-ReleaseStep -Label "git diff --quiet" -Script { git diff --quiet }
Invoke-ReleaseStep -Label "git diff --cached --quiet" -Script { git diff --cached --quiet }

$OutputPath = Join-Path $RepoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

$WorkRoot = Join-Path ([System.IO.Path]::GetTempPath()) "coc-release-$ShortCommit-$(Get-Date -Format 'yyyyMMddHHmmss')"
$SourceRoot = Join-Path $WorkRoot "source"
New-Item -ItemType Directory -Force -Path $SourceRoot | Out-Null

try {
  Write-Host "== Build server =="
  Invoke-ReleaseStep -Label "npm run build" -WorkingDirectory (Join-Path $RepoRoot "apps\server") -Script { npm run build }

  Write-Host "== Build web =="
  Invoke-ReleaseStep -Label "npm run build" -WorkingDirectory (Join-Path $RepoRoot "apps\web") -Script { npm run build }

  Write-Host "== Archive committed source =="
  $ArchivePath = Join-Path $WorkRoot "source.tar"
  Invoke-ReleaseStep -Label "git archive" -Script { git archive --format=tar "--output=$ArchivePath" $ResolvedCommit }
  Invoke-ReleaseStep -Label "tar extract source" -Script { tar -xf $ArchivePath -C $SourceRoot }

  Write-Host "== Add build artifacts =="
  Copy-Item -Recurse -Force (Join-Path $RepoRoot "apps\server\dist") (Join-Path $SourceRoot "apps\server\dist")

  $ServerPublic = Join-Path $SourceRoot "apps\server\public"
  if (Test-Path $ServerPublic) {
    Remove-Item -Recurse -Force $ServerPublic
  }
  New-Item -ItemType Directory -Force -Path $ServerPublic | Out-Null
  Copy-Item -Recurse -Force (Join-Path $RepoRoot "apps\web\dist\*") $ServerPublic

  $Metadata = [ordered]@{
    commit = $ResolvedCommit
    shortCommit = $ShortCommit
    branch = $Branch
    builtAtUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    repoRoot = $RepoRoot
    packageKind = "sunken-city-production-release"
    serverEntry = "apps/server/dist/index.js"
    staticRoot = "apps/server/public"
  } | ConvertTo-Json -Depth 4
  Set-Content -Path (Join-Path $SourceRoot "release-manifest.json") -Value $Metadata -Encoding UTF8

  $PackageName = "coc-platform-$ShortCommit.tar.gz"
  $PackagePath = Join-Path $OutputPath $PackageName
  if (Test-Path $PackagePath) {
    Remove-Item -Force $PackagePath
  }

  Write-Host "== Package $PackagePath =="
  Invoke-ReleaseStep -Label "tar package release" -Script { tar -czf $PackagePath -C $SourceRoot . }

  $ShaPath = "$PackagePath.sha256"
  $Hash = (Get-FileHash -Algorithm SHA256 $PackagePath).Hash.ToLowerInvariant()
  Set-Content -Path $ShaPath -Value "$Hash  $PackageName" -Encoding ASCII

  if ($Upload) {
    Write-Host "== Upload to ${ServerHost}:$RemoteDir =="
    Invoke-ReleaseStep -Label "ssh create remote release dir" -Script { ssh -b $BindAddress -i $SshKey $ServerHost "mkdir -p '$RemoteDir'" }
    Invoke-ReleaseStep -Label "scp release package" -Script { scp -B -o "BindAddress=$BindAddress" -i $SshKey $PackagePath $ShaPath "${ServerHost}:$RemoteDir/" }
  }

  Write-Host "Release package: $PackagePath"
  Write-Host "SHA256: $Hash"
}
finally {
  if (Test-Path $WorkRoot) {
    try {
      Remove-Item -Recurse -Force $WorkRoot -ErrorAction Stop
    }
    catch {
      Write-Warning "Could not remove temporary directory: $WorkRoot"
    }
  }
}
