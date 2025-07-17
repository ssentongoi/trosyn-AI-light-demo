"""
Utility functions for the memory engine.

Provides helper functions for common memory operations and integration with the AI system.
"""

import base64
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from . import MemoryEngine


def generate_encryption_key(password: str, salt: Optional[bytes] = None) -> bytes:
    """
    Generate a secure encryption key from a password.

    Args:
        password: User-provided password
        salt: Optional salt (random bytes if not provided)

    Returns:
        Encryption key suitable for use with MemoryEngine
    """
    if salt is None:
        salt = os.urandom(16)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
    )

    key = base64.urlsafe_b64encode(kdf.derive(password.encode("utf-8")))
    return key


def get_default_memory_path() -> Path:
    """
    Get the default path for storing memory files.

    Returns:
        Path object pointing to the default memory storage directory
    """
    return Path.home() / ".trosyn_ai" / "memory"


def create_welcome_message(memory: Dict[str, Any]) -> str:
    """
    Generate a welcome message based on the user's memory.

    Args:
        memory: User's memory data

    Returns:
        Personalized welcome message
    """
    name = memory.get("name", "there")
    last_active = memory.get("usage_stats", {}).get("last_active")

    if not name or name.lower() == "user":
        greeting = "Hello!"
    else:
        greeting = f"Hello, {name}!"

    if last_active:
        try:
            last_active_dt = datetime.fromisoformat(last_active)
            now = datetime.now(timezone.utc)
            days_ago = (now - last_active_dt).days

            if days_ago == 0:
                time_ago = "today"
            elif days_ago == 1:
                time_ago = "yesterday"
            elif days_ago < 7:
                time_ago = f"{days_ago} days ago"
            elif days_ago < 30:
                weeks = days_ago // 7
                time_ago = f"{weeks} week{'s' if weeks > 1 else ''} ago"
            else:
                months = days_ago // 30
                time_ago = f"{months} month{'s' if months > 1 else ''} ago"

            return f"{greeting} Welcome back. You were last here {time_ago}."
        except (ValueError, TypeError):
            pass

    return f"{greeting} Welcome to Trosyn AI!"


def get_ai_context(memory_engine: MemoryEngine) -> Dict[str, Any]:
    """
    Get context for AI prompt generation based on user memory.

    Args:
        memory_engine: Initialized MemoryEngine instance

    Returns:
        Dictionary with context for AI prompt
    """
    context = memory_engine.get_context_summary()

    # Add system prompt based on user preferences
    preferences = context.get("user", {}).get("preferences", {})
    assistant_mode = preferences.get("assistant_mode", "detailed")

    system_prompt = []

    # Add user information
    if context.get("user", {}).get("name"):
        system_prompt.append(f"You are speaking with {context['user']['name']}.")

    if context.get("user", {}).get("role"):
        system_prompt.append(f"Their role is: {context['user']['role']}.")

    # Add context from recent activities
    if context.get("context", {}).get("current_focus"):
        system_prompt.append(f"Current focus: {context['context']['current_focus']}")

    if context.get("context", {}).get("recent_topics"):
        topics = ", ".join(f'"{t}"' for t in context["context"]["recent_topics"])
        system_prompt.append(f"Recent topics: {topics}.")

    # Add assistant mode instructions
    if assistant_mode == "concise":
        system_prompt.append(
            "Be concise in your responses. Provide direct answers without elaboration "
            "unless specifically asked for more details."
        )
    elif assistant_mode == "detailed":
        system_prompt.append(
            "Provide detailed, thorough responses. Include explanations and context "
            "to ensure clarity and understanding."
        )

    return {
        "system_prompt": " ".join(system_prompt),
        "user_preferences": preferences,
        "context": context.get("context", {}),
    }


def validate_memory_file(
    file_path: Path, encryption_key: Optional[bytes] = None
) -> bool:
    """
    Validate if a file is a valid memory export.

    Args:
        file_path: Path to the memory file
        encryption_key: Optional encryption key if the file is encrypted

    Returns:
        bool: True if the file is a valid memory export, False otherwise
    """
    try:
        data = file_path.read_bytes()

        if encryption_key:
            try:
                cipher = Fernet(encryption_key)
                data = cipher.decrypt(data)
            except InvalidToken:
                return False

        memory = data.decode("utf-8")
        parsed = json.loads(memory)

        # Check for required fields
        return all(key in parsed for key in ["user_id", "created_at", "updated_at"])

    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        return False
