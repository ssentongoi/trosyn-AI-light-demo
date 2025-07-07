# API v1 endpoints package initialization
from . import auth, testing, roles, memory

# List of all endpoint routers
routers = [
    auth.router,
    testing.router,
    roles.router,
    memory.router,
]
