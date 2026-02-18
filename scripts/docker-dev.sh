#!/bin/bash
# Harmony Design System - Docker Development Helper Script
# Provides convenient commands for working with Docker development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Build the development container
build() {
    print_info "Building development container..."
    docker-compose build harmony-dev
    print_info "Build complete!"
}

# Start the development environment
start() {
    print_info "Starting development environment..."
    docker-compose up -d harmony-dev
    print_info "Development environment is running!"
    print_info "Access the container with: ./scripts/docker-dev.sh shell"
}

# Stop the development environment
stop() {
    print_info "Stopping development environment..."
    docker-compose down
    print_info "Development environment stopped!"
}

# Open a shell in the running container
shell() {
    print_info "Opening shell in development container..."
    docker-compose exec harmony-dev /bin/bash
}

# Run a command in the container
run_command() {
    print_info "Running command: $*"
    docker-compose exec harmony-dev "$@"
}

# Build WASM modules
build_wasm() {
    print_info "Building WASM modules..."
    docker-compose exec harmony-dev bash -c "cd harmony-schemas && wasm-pack build --target web"
    print_info "WASM build complete!"
}

# Run tests
test() {
    print_info "Running tests..."
    docker-compose exec harmony-dev bash -c "cd harmony-schemas && cargo test"
    print_info "Tests complete!"
}

# Run Chrome tests for UI components
test_chrome() {
    print_info "Running Chrome tests for UI components..."
    docker-compose exec harmony-dev bash -c "google-chrome --headless --disable-gpu --no-sandbox --dump-dom file:///workspace/components/controls/harmony-fader.test.html"
    print_info "Chrome tests complete!"
}

# Clean build artifacts
clean() {
    print_warn "Cleaning build artifacts..."
    docker-compose exec harmony-dev bash -c "cargo clean && rm -rf node_modules"
    print_info "Clean complete!"
}

# Show logs
logs() {
    docker-compose logs -f harmony-dev
}

# Show usage
usage() {
    cat << EOF
Harmony Design System - Docker Development Helper

Usage: $0 <command>

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
    $0 build
    $0 start
    $0 shell
    $0 run cargo build
    $0 build-wasm
    $0 test

EOF
}

# Main command dispatcher
check_docker

case "${1:-}" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    shell)
        shell
        ;;
    run)
        shift
        run_command "$@"
        ;;
    build-wasm)
        build_wasm
        ;;
    test)
        test
        ;;
    test-chrome)
        test_chrome
        ;;
    clean)
        clean
        ;;
    logs)
        logs
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        echo ""
        usage
        exit 1
        ;;
esac