from fastapi import APIRouter

from app.api.v1.endpoints import auth, chat, department_requests, roles, testing

api_router = APIRouter()

# Include routers from endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(testing.router, prefix="/test", tags=["Testing"])
api_router.include_router(roles.router, prefix="/roles", tags=["Role Management"])
api_router.include_router(chat.router)
api_router.include_router(
    department_requests.router,
    prefix="/department-requests",
    tags=["Department Requests"],
)
