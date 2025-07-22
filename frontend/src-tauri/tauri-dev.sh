#!/bin/bash

# Tauri Development Workflow Script
# Author: Your Development Assistant
# Purpose: Manage Tauri builds efficiently and prevent resource conflicts

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0  # Process found
    else
        return 1  # Process not found
    fi
}

# Function to kill existing processes
cleanup_processes() {
    print_status "Checking for existing Tauri/Cargo processes..."
    
    if check_process "tauri dev"; then
        print_warning "Found existing 'tauri dev' process. Terminating..."
        pkill -f "tauri dev"
        sleep 2
    fi
    
    if check_process "cargo run"; then
        print_warning "Found existing 'cargo run' process. Terminating..."
        pkill -f "cargo run"
        sleep 2
    fi
    
    print_success "Process cleanup complete"
}

# Function to clean build cache
clean_cache() {
    print_status "Cleaning build cache..."
    
    if [ -d "target" ]; then
        rm -rf target/
        print_status "Removed target/ directory"
    fi
    
    cargo clean
    print_success "Cargo cache cleaned"
}

# Function to deep clean (including registry)
deep_clean() {
    print_warning "Performing deep clean (this will re-download dependencies)..."
    
    clean_cache
    
    if [ -d "$HOME/.cargo/registry" ]; then
        rm -rf ~/.cargo/registry
        print_status "Removed cargo registry cache"
    fi
    
    if [ -d "$HOME/.cargo/git" ]; then
        rm -rf ~/.cargo/git
        print_status "Removed cargo git cache"
    fi
    
    print_success "Deep clean complete"
}

# Function to quick check
quick_check() {
    print_status "Running quick syntax check..."
    if cargo check; then
        print_success "Syntax check passed ✓"
        return 0
    else
        print_error "Syntax check failed ✗"
        return 1
    fi
}

# Function to build project
build_project() {
    print_status "Building project..."
    if cargo build; then
        print_success "Build completed ✓"
        return 0
    else
        print_error "Build failed ✗"
        return 1
    fi
}

# Function to run Tauri dev
run_tauri_dev() {
    print_status "Starting Tauri development server with cargo-watch..."
    print_warning "Press Ctrl+C to stop the development server"
    echo ""

    # Check if cargo-watch is installed
    if ! command -v cargo-watch &> /dev/null; then
        print_warning "cargo-watch is not installed. Installing..."
        cargo install cargo-watch
    fi

    # Use cargo-watch to run the app
    cargo watch -q -c -w src -x 'run --no-default-features'
}

# Function to show dependency info
show_deps() {
    print_status "Analyzing dependencies..."
    
    if command -v cargo-tree &> /dev/null; then
        echo ""
        print_status "Dependency tree (showing duplicates only):"
        cargo tree --duplicates
    else
        print_warning "cargo-tree not installed. Install with: cargo install cargo-tree"
        echo ""
        print_status "Basic dependency info:"
        cargo metadata --format-version 1 | jq '.packages | length'
    fi
}

# Function to setup cargo config
setup_cargo_config() {
    print_status "Setting up optimized Cargo configuration..."
    
    CARGO_CONFIG_DIR="$HOME/.cargo"
    CARGO_CONFIG_FILE="$CARGO_CONFIG_DIR/config.toml"
    
    mkdir -p "$CARGO_CONFIG_DIR"
    
    cat > "$CARGO_CONFIG_FILE" << 'EOF'
[build]
jobs = 2  # Limit parallel jobs to prevent resource contention

[net]
retry = 2
git-fetch-with-cli = true

[profile.dev]
incremental = true

[profile.release]
lto = true
codegen-units = 1
EOF

    print_success "Cargo configuration updated"
}

# Main function
main() {
    # Ensure we're in the correct directory
    cd "$(dirname "$0")"
    
    # Check for required commands
    if ! command -v cargo &> /dev/null; then
        print_error "Rust and Cargo are required but not installed."
        exit 1
    fi
    
    if ! command -v tauri &> /dev/null; then
        print_error "Tauri CLI is required but not installed. Install with: cargo install tauri-cli"
        exit 1
    fi
    
    # Parse command line arguments
    case "$1" in
        "clean")
            cleanup_processes
            clean_cache
            ;;
        "deep-clean")
            cleanup_processes
            deep_clean
            ;;
        "check")
            quick_check
            ;;
        "build")
            cleanup_processes
            build_project
            ;;
        "deps")
            show_deps
            ;;
        "setup")
            setup_cargo_config
            ;;
        "" | "run")
            cleanup_processes
            run_tauri_dev
            ;;
        *)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  clean      Clean build artifacts"
            echo "  deep-clean Deep clean including cargo caches"
            echo "  check      Quick syntax check"
            echo "  build      Build the project"
            echo "  deps       Show dependency information"
            echo "  setup      Configure Cargo for better performance"
            echo "  run        Run the Tauri dev server (default)"
            echo ""
            exit 1
            ;;
    esac
}

# Run the main function
main "$@"
