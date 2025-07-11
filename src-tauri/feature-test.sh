#!/bin/bash
echo "🔧 Testing with different features..."
cargo test --no-default-features
cargo test --all-features
