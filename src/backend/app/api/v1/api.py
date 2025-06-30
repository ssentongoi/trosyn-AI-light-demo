from fastapi import APIRouter
from app.api.v1.endpoints import auth, testing

api_router = APIRouter()

# Include routers from endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(testing.router, prefix="/test", tags=["Testing"])
