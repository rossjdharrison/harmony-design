# verify-structure.ps1
# Verifies the Harmony Design System directory structure
# Ensures no nested harmony-design directories exist

$ErrorActionPreference = "Stop"

Write-Host "Verifying Harmony Design System directory structure..." -ForegroundColor Cyan

$rootPath = "harmony-design"
$issues = @()

# Check for nested harmony-design directories
Write-Host "`nChecking for nested directories..." -ForegroundColor Yellow
$nestedDirs = Get-ChildItem -Path $rootPath -Recurse -Force -Directory | Where-Object { 
    $_.Name -eq "harmony-design" -or $_.Name -like "harmony-desi*"
}

if ($nestedDirs) {
    foreach ($dir in $nestedDirs) {
        $issues += "CRITICAL: Nested directory found at: $($dir.FullName)"
    }
}

# Verify expected structure exists
Write-Host "Checking expected directories..." -ForegroundColor Yellow
$expectedDirs = @(
    "src",
    "primitives",
    "molecules",
    "organisms",
    "templates",
    "bounded-contexts",
    "scripts"
)

foreach ($dir in $expectedDirs) {
    $fullPath = Join-Path $rootPath $dir
    if (-not (Test-Path $fullPath)) {
        Write-Host "  WARNING: Expected directory missing: $dir" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ $dir" -ForegroundColor Green
    }
}

# Verify critical files
Write-Host "`nChecking critical files..." -ForegroundColor Yellow
$criticalFiles = @(
    "DESIGN_SYSTEM.md",
    "src/event-bus.js"
)

foreach ($file in $criticalFiles) {
    $fullPath = Join-Path $rootPath $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "  WARNING: Expected file missing: $file" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
}

# Report results
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "✓ Directory structure verification PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Directory structure verification FAILED" -ForegroundColor Red
    Write-Host "`nIssues found:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    exit 1
}