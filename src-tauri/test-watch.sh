#!/bin/bash
echo "👀 Watching for changes..."
# Install with: cargo install cargo-watch
cargo watch -x "test documents::tests --lib"
