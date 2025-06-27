"""
Memory Engine Demo

This script demonstrates how to use the Trosyn AI Memory Engine to store and retrieve
user-specific context and interactions.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from trosyn_sync.memory import MemoryEngine, utils

def main():
    # Create a memory engine for a user
    user_id = "demo_user_123"
    
    # Generate an encryption key (in a real app, you'd store this securely)
    password = "secure_password_123"
    encryption_key = utils.generate_encryption_key(password)
    
    print("Creating memory engine...")
    memory = MemoryEngine(
        user_id=user_id,
        encryption_key=encryption_key
    )
    
    # Set up initial user information
    print("\nSetting up user profile...")
    memory.update_context({
        "name": "Alex",
        "role": "Software Developer",
        "preferences": {
            "voice": "friendly",
            "assistant_mode": "detailed"
        },
        "context": {
            "current_focus": "Implementing memory engine",
            "recent_documents": ["memory_engine.py", "utils.py"]
        }
    })
    
    # Simulate some interactions
    print("\nSimulating interactions...")
    memory.add_interaction(
        query="How do I implement a memory engine?",
        response="I can help you design a memory engine. First, let's define the data model...",
        metadata={"source": "demo_script"}
    )
    
    memory.add_interaction(
        query="What about encryption?",
        response="For encryption, we can use Fernet from the cryptography library...",
        metadata={"source": "demo_script"}
    )
    
    # Show the current memory state
    print("\nCurrent memory state:")
    import json
    print(json.dumps(memory.memory, indent=2, default=str))
    
    # Get a summary for AI context
    print("\nAI Context Summary:")
    summary = memory.get_context_summary()
    print(json.dumps(summary, indent=2, default=str))
    
    # Generate a welcome message
    print("\nWelcome message:")
    print(utils.create_welcome_message(memory.memory))
    
    # Export the memory
    export_path = Path("memory_export.dat")
    print(f"\nExporting memory to {export_path}...")
    memory.export_memory(export_path)
    
    # Verify the export
    if utils.validate_memory_file(export_path, encryption_key):
        print("Memory export is valid!")
    
    # Import the memory to a new instance
    print("\nImporting memory to a new instance...")
    new_memory = MemoryEngine.import_memory(
        user_id="imported_user",
        import_path=export_path,
        encryption_key=encryption_key
    )
    
    print("\nImported memory summary:")
    print(json.dumps(new_memory.get_context_summary(), indent=2, default=str))
    
    # Clean up
    export_path.unlink()
    print("\nDemo complete!")

if __name__ == "__main__":
    main()
