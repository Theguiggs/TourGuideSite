# Read-only view of repositories and worktrees. Does not traverse junctions.
param(
    [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot)
)
$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath($WorkspaceRoot)
foreach ($name in @('TourGuideApp', 'TourGuideWeb')) {
    $repoPath = Join-Path $workspaceRoot $name
    Write-Output "`n$name"
    & git --no-optional-locks -C $repoPath worktree list
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect $name" }
    $lines = & git --no-optional-locks -C $repoPath worktree list --porcelain
    foreach ($line in $lines) {
        if ($line.StartsWith('worktree ')) {
            $treePath = $line.Substring(9)
            $status = @(& git --no-optional-locks -C $treePath status --porcelain --untracked-files=normal)
            if ($LASTEXITCODE -ne 0) { throw "Cannot inspect $treePath" }
            if ($status.Count) { Write-Output "  $($status.Count) local status entries: $treePath" }
        }
    }
}
