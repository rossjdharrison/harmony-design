# fix-nested-structure.ps1
# Automatically fixes nested harmony-design directory structure
# Moves contents from harmony-design/harmony-design/* to harmony-design/*

$ErrorActionPreference = "Stop"

Write-Host "Harmony Design System - Nested Structure Fix" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$rootPath = "harmony-design"
$nestedPath = Join-Path $rootPath "harmony-design"

# Check if nested directory exists
if (-not (Test-Path $nestedPath)) {
    Write-Host "`n✓ No nested directory found. Structure is correct." -ForegroundColor Green
    exit 0
}

Write-Host "`n⚠ Nested directory detected at: $nestedPath" -ForegroundColor Yellow
Write-Host "This will move all contents to the correct location." -ForegroundColor Yellow

# List contents to be moved
Write-Host "`nContents to be moved:" -ForegroundColor Cyan
Get-ChildItem -Path $nestedPath -Force | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor White
}

# Confirm action
$confirm = Read-Host "`nProceed with fix? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

# Perform the move
Write-Host "`nMoving files..." -ForegroundColor Cyan
try {
    Get-ChildItem -Path $nestedPath -Force | ForEach-Object {
        $destPath = Join-Path $rootPath $_.Name
        
        # Check if destination exists
        if (Test-Path $destPath) {
            Write-Host "  ⚠ Skipping $($_.Name) - already exists at destination" -ForegroundColor Yellow
        } else {
            Move-Item -Path $_.FullName -Destination $rootPath -Force
            Write-Host "  ✓ Moved $($_.Name)" -ForegroundColor Green
        }
    }
    
    # Remove empty nested directory
    if ((Get-ChildItem -Path $nestedPath -Force).Count -eq 0) {
        Remove-Item -Path $nestedPath -Force
        Write-Host "`n✓ Removed empty nested directory" -ForegroundColor Green
    }
    
    Write-Host "`n✓ Structure fix completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "`n✗ Error during fix: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}