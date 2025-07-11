# Trosyn AI Memory Engine

The Memory Engine provides persistent, user-specific memory for Trosyn AI, enabling personalized interactions and context awareness while maintaining user privacy and data security.

## Features

- **Local Storage**: All data is stored locally on the user's device
- **Optional Encryption**: Memory can be encrypted with a user-provided password
- **Context-Aware**: Tracks user interactions, preferences, and context
- **Export/Import**: Users can export and import their memory for backup or migration
- **Privacy-Focused**: No automatic syncing or cloud storage

## Core Components

### MemoryEngine Class

The main class that handles all memory operations:

```python
from trosyn_sync.memory import MemoryEngine
from pathlib import Path

# Initialize with optional encryption
memory = MemoryEngine(
    user_id="unique_user_id",
    storage_path=Path("/custom/storage/path"),  # Optional
    encryption_key=encryption_key  # Optional
)

# Update user context
memory.update_context({
    "name": "Alex",
    "role": "Researcher",
    "preferences": {"theme": "dark"}
})

# Record an interaction
memory.add_interaction(
    query="How does this work?",
    response="Let me explain...",
    metadata={"source": "web_interface"}
)

# Get context for AI
context = memory.get_context_summary()
```

### Utility Functions

Helper functions for common operations:

```python
from trosyn_sync.memory import utils

# Generate encryption key from password
key = utils.generate_encryption_key("user_password")

# Get default storage path
path = utils.get_default_memory_path()

# Create welcome message
welcome = utils.create_welcome_message(memory.memory)

# Get AI context
ai_context = utils.get_ai_context(memory)
```

## Data Structure

Memory is stored in a JSON format with the following structure:

```json
{
  "user_id": "unique_id",
  "name": "User Name",
  "role": "User Role",
  "preferences": {
    "voice": "neutral",
    "assistant_mode": "detailed"
  },
  "context": {
    "last_topics": ["recent topic 1", "recent topic 2"],
    "current_focus": "Current task or focus",
    "recent_documents": ["doc1.txt", "doc2.pdf"]
  },
  "interactions": [
    {
      "id": "uuid",
      "timestamp": "2025-06-26T12:00:00Z",
      "query": "User query",
      "response": "AI response",
      "metadata": {}
    }
  ],
  "usage_stats": {
    "sessions": 5,
    "last_active": "2025-06-26T12:00:00Z"
  },
  "created_at": "2025-06-26T12:00:00Z",
  "updated_at": "2025-06-26T12:00:00Z"
}
```

## Security

- Memory files can be encrypted using AES-256
- Each user's memory is stored in a separate file
- No automatic syncing or cloud storage
- Users must explicitly export/import their data

## Integration

### With AI Models

```python
# Get context for AI prompt
auto_context = utils.get_ai_context(memory)

# Use in your AI prompt
prompt = f"""
{auto_context['system_prompt']}

User: {user_input}
Assistant:
"""
```

### With Web Applications

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_memory_engine(user_id: str = Depends(oauth2_scheme)):
    # In a real app, validate the token and get user ID
    return MemoryEngine(user_id=user_id)

@app.get("/api/context")
async def get_context(memory: MemoryEngine = Depends(get_memory_engine)):
    return memory.get_context_summary()
```

## Best Practices

1. **Encryption**: Always use encryption for sensitive data
2. **Backup**: Regularly export and back up memory files
3. **Privacy**: Be transparent about what data is stored
4. **Performance**: Keep memory files small and efficient
5. **Validation**: Always validate imported memory files

## Example

See `docs/examples/memory_engine_demo.py` for a complete usage example.
