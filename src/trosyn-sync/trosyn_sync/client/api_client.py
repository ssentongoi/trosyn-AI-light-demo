import httpx
from typing import Dict, Any, Optional


from ..config import settings
from ..logging_config import logger


class ApiClient:
    """An asynchronous client for interacting with the Trosyn Sync API of other nodes."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        headers = {"X-Sync-Token": settings.SYNC_TOKEN}
        self.client = httpx.AsyncClient(base_url=self.base_url, headers=headers)

    async def get_document_manifest(self) -> Optional[Dict[str, Any]]:
        """Fetches the document manifest from the remote node."""
        try:
            response = await self.client.get("/api/v1/documents/manifest")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching manifest from {self.base_url}: {e}")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching manifest from {self.base_url}: {e}")
        return None

    async def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a single document from the remote node."""
        try:
            response = await self.client.get(f"/api/v1/documents/{document_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching document {document_id} from {self.base_url}: {e}")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching document {document_id} from {self.base_url}: {e}")
        return None

    async def close(self):
        """Closes the underlying HTTP client."""
        await self.client.aclose()
