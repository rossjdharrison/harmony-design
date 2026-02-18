# Harmony Design System - Docker Development Helper Script (PowerShell)
# Provides convenient commands for working with Docker development environment

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

# Script configuration
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

# Function to print colored messages
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    } catch {
        Write-Error-Custom "Docker is not running. Please start Docker and try again."
        exit 1
    }
}

# Build the development container
function Build-Container {
    Write-Info "Building development container..."
    docker-compose build harmony-dev
    Write-Info "Build complete!"
}

# Start the development environment
function Start-Environment {
    Write-Info "Starting development environment..."
    docker-compose up -d harmony-dev
    Write-Info "Development environment is running!"
    Write-Info "Access the container with: .\scripts\docker-dev.ps1 shell"
}

# Stop the development environment
function Stop-Environment {
    Write-Info "Stopping development environment..."
    docker-compose down
    Write-Info "Development environment stopped!"
}

# Open a shell in the running container
function Open-Shell {
    Write-Info "Opening shell in development container..."
    docker-compose exec harmony-dev /bin/bash
}

# Run a command in the container
function Invoke-Command {
    param([string[]]$CommandArgs)
    Write-Info "Running command: $($CommandArgs -join ' ')"
    docker-compose exec harmony-dev @CommandArgs
}

# Build WASM modules
function Build-Wasm {
    Write-Info "Building WASM modules..."
    docker-compose exec harmony-dev bash -c "cd harmony-schemas && wasm-pack build --target web"
    Write-Info "WASM build complete!"
}

# Run tests
function Invoke-Tests {
    Write-Info "Running tests..."
    docker-compose exec harmony-dev bash -c "cd harmony-schemas && cargo test"
    Write-Info "Tests complete!"
}

# Run Chrome tests for UI components
function Invoke-ChromeTests {
    Write-Info "Running Chrome tests for UI components..."
    docker-compose exec harmony-dev bash -c "google-chrome --headless --disable-gpu --no-sandbox --dump-dom file:///workspace/components/controls/harmony-fader.test.html"
    Write-Info "Chrome tests complete!"
}

# Clean build artifacts
function Clear-BuildArtifacts {
    Write-Warn "Cleaning build artifacts..."
    docker-compose exec harmony-dev bash -c "cargo clean && rm -rf node_modules"
    Write-Info "Clean complete!"
}

# Show logs
function Show-Logs {
    docker-compose logs -f harmony-dev
}

# Show usage
function Show-Usage {
    @"
Harmony Design System - Docker Development Helper

Usage: .\scripts\docker-dev.ps1 <command>

Commands:
    build           Build the development container
    start           Start the development environment
    stop            Stop the development environment
    shell           Open a shell in the running container
    run <cmd>       Run a command in the container
    build-wasm      Build WASM modules
    test            Run Rust tests
    test-chrome     Run Chrome UI component tests
    clean           Clean build artifacts
    logs            Show container logs
    help            Show this help message

Examples:
    .\scripts\docker-dev.ps1 build
    .\scripts\docker-dev.ps1 start
    .\scripts\docker-dev.ps1 shell
    .\scripts\docker-dev.ps1 run cargo build
    .\scripts\docker-dev.ps1 build-wasm
    .\scripts\docker-dev.ps1 test

"@
}

# Main command dispatcher
Test-Docker

switch ($Command) {
    "build" {
        Build-Container
    }
    "start" {
        Start-Environment
    }
    "stop" {
        Stop-Environment
    }
    "shell" {
        Open-Shell
    }
    "run" {
        Invoke-Command -CommandArgs $Args
    }
    "build-wasm" {
        Build-Wasm
    }
    "test" {
        Invoke-Tests
    }
    "test-chrome" {
        Invoke-ChromeTests
    }
    "clean" {
        Clear-BuildArtifacts
    }
    "logs" {
        Show-Logs
    }
    { $_ -in "help", "--help", "-h", $null } {
        Show-Usage
    }
    default {
        Write-Error-Custom "Unknown command: $Command"
        Write-Host ""
        Show-Usage
        exit 1
    }
}