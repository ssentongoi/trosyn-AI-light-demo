from fastapi import APIRouter

from .endpoints import documents, sync

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(sync.router, prefix="/sync", tags=["Sync"])
