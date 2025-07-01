from fastapi import Header, HTTPException, status

from ...config import settings


async def get_sync_token(x_sync_token: str = Header(None)):
    """Dependency to verify the X-Sync-Token header."""
    if not x_sync_token or x_sync_token != settings.SYNC_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing sync token",
        )
    return x_sync_token
