#!/usr/bin/env python3
"""
Script to download and verify the Gemini 3.1B GGUF model.
"""

import os
import sys
import hashlib
import requests
from pathlib import Path
from tqdm import tqdm

# Configuration
MODEL_NAME = "gemini-3.1b.Q4_K_M.gguf"
MODEL_URL = f"https://huggingface.co/TheBloke/gemini-3.1B-GGUF/resolve/main/{MODEL_NAME}"
MODEL_DIR = Path("models")
MODEL_PATH = MODEL_DIR / MODEL_NAME
EXPECTED_MD5 = ""  # We'll update this after first download
CHUNK_SIZE = 8192

def calculate_md5(file_path):
    """Calculate MD5 checksum of a file."""
    md5_hash = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

def download_file(url, dest):
    """Download a file with progress bar."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    with open(dest, 'wb') as f, tqdm(
        desc=dest.name,
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=CHUNK_SIZE):
            size = f.write(data)
            bar.update(size)

def main():
    print(f"Downloading {MODEL_NAME}...")
    print(f"URL: {MODEL_URL}")
    print(f"Destination: {MODEL_PATH.absolute()}")
    
    # Check if model already exists
    if MODEL_PATH.exists():
        print(f"Model already exists at {MODEL_PATH}")
        if EXPECTED_MD5:
            print("Verifying checksum...")
            md5 = calculate_md5(MODEL_PATH)
            if md5 == EXPECTED_MD5:
                print("Checksum verified!")
                return 0
            else:
                print(f"Warning: Checksum mismatch! Expected {EXPECTED_MD5}, got {md5}")
                return 1
        return 0
    
    try:
        # Download the model
        download_file(MODEL_URL, MODEL_PATH)
        print(f"\nSuccessfully downloaded {MODEL_NAME}")
        
        # Calculate and display checksum
        print("Calculating checksum...")
        md5 = calculate_md5(MODEL_PATH)
        print(f"MD5: {md5}")
        print("\nPlease update the EXPECTED_MD5 in this script with the above value")
        print("to enable checksum verification in the future.")
        
        return 0
        
    except Exception as e:
        print(f"Error downloading model: {e}", file=sys.stderr)
        if MODEL_PATH.exists():
            os.remove(MODEL_PATH)
        return 1

if __name__ == "__main__":
    sys.exit(main())
