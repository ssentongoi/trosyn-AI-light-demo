from fastapi import APIRouter, Depends

from ....auth.security import verify_token
from ....schemas.sync import SyncRequest
from ....sync.engine import SyncEngine

router = APIRouter()
sync_engine = SyncEngine()


@router.post("/request", dependencies=[Depends(verify_token)])
async def request_sync(sync_request: SyncRequest):
    """Analyzes a peer's manifest and returns a sync plan."""
    sync_plan = sync_engine.get_sync_plan(sync_request)
    return sync_plan
