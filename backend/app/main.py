import os
import sys
import logging
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, Request, status, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.future import select
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession

# Add the backend directory to Python path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.append(str(BACKEND_DIR))

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

from enum import Enum
from datetime import datetime, timedelta
import json
from typing import Dict, Set, Optional, List, Any, Callable, Awaitable
from uuid import uuid4
from collections import defaultdict

class ConnectionState(Enum):
    CONNECTING = "connecting"
    AUTHENTICATED = "authenticated"
    DISCONNECTED = "disconnected"

class NotificationType(Enum):
    MESSAGE = "message"
    STATUS_UPDATE = "status_update"
    SYSTEM_ALERT = "system_alert"
    PRESENCE = "presence"
    HEARTBEAT = "heartbeat"

class WebSocketConnection:
    def __init__(self, websocket: WebSocket, client_id: str):
        self.websocket = websocket
        self.client_id = client_id
        self.user_id: Optional[str] = None
        self.state: ConnectionState = ConnectionState.CONNECTING
        self.last_heartbeat: datetime = datetime.utcnow()
        self.message_queue: List[Dict[str, Any]] = []
        self.subscriptions: Set[str] = set()

    async def send(self, message: Dict[str, Any]):
        try:
            await self.websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to {self.client_id}: {e}")

    def is_authenticated(self) -> bool:
        return self.state == ConnectionState.AUTHENTICATED and self.user_id is not None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocketConnection] = {}
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_timeout = 10  # seconds
        self.max_queue_size = 100  # Max messages to queue per user

    async def connect(self, websocket: WebSocket) -> WebSocketConnection:
        client_id = f"client-{uuid4().hex[:8]}"
        connection = WebSocketConnection(websocket, client_id)
        self.active_connections[client_id] = connection
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")
        return connection

    async def authenticate(self, client_id: str, user_id: str):
        if client_id in self.active_connections:
            connection = self.active_connections[client_id]
            connection.user_id = user_id
            connection.state = ConnectionState.AUTHENTICATED
            self.user_connections[user_id].add(client_id)
            logger.info(f"Client {client_id} authenticated as user {user_id}")
            
            # Send queued messages if any
            await self._process_queue(client_id)
            
            # Notify about user presence
            await self.broadcast_presence(user_id, "online")
            return True
        return False

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            connection = self.active_connections[client_id]
            user_id = connection.user_id
            
            # Remove from active connections
            del self.active_connections[client_id]
            
            # Clean up user connections
            if user_id and client_id in self.user_connections.get(user_id, set()):
                self.user_connections[user_id].remove(client_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
                    # Notify about user going offline
                    asyncio.create_task(self.broadcast_presence(user_id, "offline"))
            
            logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_to_user(self, user_id: str, message: Dict[str, Any], queue_if_offline: bool = True):
        """Send a message to all connections of a specific user"""
        sent = False
        if user_id in self.user_connections:
            for client_id in list(self.user_connections[user_id]):
                if client_id in self.active_connections:
                    connection = self.active_connections[client_id]
                    if connection.is_authenticated():
                        try:
                            await connection.send(message)
                            sent = True
                        except Exception as e:
                            logger.error(f"Error sending to {client_id}: {e}")
                            self.disconnect(client_id)
        
        # If user is offline and queuing is enabled, add to queue
        if not sent and queue_if_offline and user_id:
            await self._add_to_queue(user_id, message)

    async def broadcast(self, message: Dict[str, Any], exclude: Optional[Set[str]] = None):
        """Broadcast a message to all connected clients"""
        exclude = exclude or set()
        for client_id, connection in list(self.active_connections.items()):
            if client_id not in exclude and connection.is_authenticated():
                try:
                    await connection.send(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {e}")
                    self.disconnect(client_id)

    async def broadcast_presence(self, user_id: str, status: str):
        """Broadcast presence update for a user"""
        presence_msg = {
            "type": NotificationType.PRESENCE.value,
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(presence_msg, exclude=self.user_connections.get(user_id, set()))

    async def process_heartbeat(self, client_id: str):
        """Update last heartbeat time for a connection"""
        if client_id in self.active_connections:
            self.active_connections[client_id].last_heartbeat = datetime.utcnow()
            return True
        return False

    async def check_heartbeats(self):
        """Check for stale connections and clean them up"""
        now = datetime.utcnow()
        stale = []
        
        for client_id, connection in self.active_connections.items():
            if (now - connection.last_heartbeat).total_seconds() > self.heartbeat_interval + self.heartbeat_timeout:
                stale.append(client_id)
        
        for client_id in stale:
            logger.warning(f"Client {client_id} missed heartbeat, disconnecting")
            self.disconnect(client_id)

    async def _add_to_queue(self, user_id: str, message: Dict[str, Any]):
        """Add a message to the user's queue"""
        # In a production environment, this would persist to a database
        # For now, we'll just keep it in memory
        for client_id, conn in self.active_connections.items():
            if conn.user_id == user_id:
                if len(conn.message_queue) < self.max_queue_size:
                    conn.message_queue.append(message)
                    logger.debug(f"Queued message for user {user_id}")
                else:
                    logger.warning(f"Message queue full for user {user_id}")
                break

    async def _process_queue(self, client_id: str):
        """Process queued messages for a client"""
        if client_id in self.active_connections:
            connection = self.active_connections[client_id]
            while connection.message_queue:
                message = connection.message_queue.pop(0)
                try:
                    await connection.send(message)
                except Exception as e:
                    logger.error(f"Error sending queued message to {client_id}: {e}")
                    break

# Global connection manager instance
manager = ConnectionManager()

# Start heartbeat checker
async def start_heartbeat_checker():
    while True:
        try:
            await asyncio.sleep(manager.heartbeat_interval)
            await manager.check_heartbeats()
        except Exception as e:
            logger.error(f"Error in heartbeat checker: {e}")

# Load environment variables from .env file
env_path = BACKEND_DIR.parent / '.env'
load_dotenv(dotenv_path=env_path)
logger.info(f"Loaded environment from: {env_path}")

# Import local modules after path setup
from app.core.config import settings
from app.database import engine, init_db, get_db, import_models
from app.db.base import Base  # Import Base from db.base to avoid circular imports

# Function to create default roles and permissions
async def create_default_roles_and_permissions():
    """Create default roles and permissions if they don't exist"""
    async with AsyncSession(engine) as session:
        try:
            # Create default permissions
            permissions = [
                {"name": "user:read", "description": "Read user data", "resource": "user", "action": "read"},
                {"name": "user:write", "description": "Create/update users", "resource": "user", "action": "write"},
                {"name": "user:delete", "description": "Delete users", "resource": "user", "action": "delete"},
                {"name": "role:read", "description": "Read role data", "resource": "role", "action": "read"},
                {"name": "role:write", "description": "Create/update roles", "resource": "role", "action": "write"},
                {"name": "role:delete", "description": "Delete roles", "resource": "role", "action": "delete"},
                {"name": "permission:read", "description": "Read permission data", "resource": "permission", "action": "read"},
                {"name": "permission:assign", "description": "Assign permissions to roles", "resource": "permission", "action": "assign"},
            ]
            
            for perm_data in permissions:
                result = await session.execute(
                    select(Permission).filter(Permission.name == perm_data["name"])
                )
                perm = result.scalars().first()
                if not perm:
                    perm = Permission(**perm_data)
                    session.add(perm)
            
            await session.commit()
            
            # Create default roles
            result = await session.execute(select(Role).filter(Role.name == "admin"))
            admin_role = result.scalars().first()
            
            if not admin_role:
                admin_role = Role(
                    name="admin",
                    description="Administrator with full access"
                )
                session.add(admin_role)
                await session.commit()
                
                # Assign all permissions to admin role
                result = await session.execute(select(Permission))
                all_perms = result.scalars().all()
                admin_role.permissions = all_perms
                await session.commit()
            
            # Create default user role if it doesn't exist
            result = await session.execute(select(Role).filter(Role.name == "user"))
            user_role = result.scalars().first()
            
            if not user_role:
                user_role = Role(
                    name="user",
                    description="Regular user with basic access"
                )
                session.add(user_role)
                await session.commit()
                
                # Assign basic permissions to user role
                result = await session.execute(
                    select(Permission).filter(
                        Permission.name.in_(["user:read", "role:read", "permission:read"])
                    )
                )
                basic_perms = result.scalars().all()
                user_role.permissions = basic_perms
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error creating default roles and permissions: {e}")
            await session.rollback()
            raise

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Trosyn AI - Offline-first, self-hosted AI assistant platform",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    on_startup=[init_db, create_default_roles_and_permissions]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import API routers and middleware
from app.api.v1.endpoints import auth, testing, roles, memory, department_requests
from app.middleware.auth_middleware import auth_middleware, get_current_user
from app.middleware.permission_middleware import PermissionChecker, has_permission
from app.models.role import Role
from app.models.permission import Permission
from app.models.user import User

# Start the heartbeat checker when the app starts
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_heartbeat_checker())

async def verify_websocket_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token from WebSocket connection"""
    try:
        from app.core.config import settings
        from jose import jwt, JWTError
        
        if not token:
            return None
            
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        return None

# WebSocket endpoint for notifications
@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    # Accept the WebSocket connection
    await websocket.accept()
    
    # Create a new connection
    connection = await manager.connect(websocket)
    client_id = connection.client_id
    user_id = None
    
    try:
        # Wait for authentication message (timeout after 10 seconds)
        auth_message = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=10.0
        )
        
        try:
            message = json.loads(auth_message)
            if message.get("type") != "auth" or not message.get("token"):
                await connection.send({
                    "type": "error",
                    "message": "Authentication required",
                    "code": "authentication_required"
                })
                return
                
            # Verify the token
            token_data = await verify_websocket_token(message["token"])
            if not token_data:
                await connection.send({
                    "type": "error",
                    "message": "Invalid or expired token",
                    "code": "invalid_token"
                })
                return
                
            # Authenticate the connection
            user_id = token_data.get("sub")
            if not user_id:
                await connection.send({
                    "type": "error",
                    "message": "Invalid user ID in token",
                    "code": "invalid_token"
                })
                return
                
            await manager.authenticate(client_id, user_id)
            
            # Send welcome message
            await connection.send({
                "type": "auth_success",
                "message": "Successfully authenticated",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Main message loop
            while True:
                try:
                    # Set a timeout for receiving messages
                    data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=manager.heartbeat_interval + manager.heartbeat_timeout
                    )
                    
                    try:
                        message = json.loads(data)
                        
                        # Handle heartbeat messages
                        if message.get("type") == "heartbeat":
                            await manager.process_heartbeat(client_id)
                            continue
                            
                        # Process other message types
                        await handle_websocket_message(
                            client_id=client_id,
                            user_id=user_id,
                            message=message
                        )
                            
                    except json.JSONDecodeError:
                        await connection.send({
                            "type": "error",
                            "message": "Invalid JSON format",
                            "code": "invalid_format"
                        })
                    
                except asyncio.TimeoutError:
                    # Check if we should send a heartbeat
                    connection = manager.active_connections.get(client_id)
                    if connection and connection.is_authenticated():
                        # Send a ping to check if the connection is still alive
                        try:
                            await connection.send({"type": "ping"})
                            # Wait for pong
                            try:
                                pong = await asyncio.wait_for(
                                    websocket.receive_text(),
                                    timeout=manager.heartbeat_timeout
                                )
                                if pong.strip().lower() == 'pong':
                                    await manager.process_heartbeat(client_id)
                                    continue
                            except (asyncio.TimeoutError, Exception):
                                logger.warning(f"Client {client_id} did not respond to ping")
                                break
                        except Exception as e:
                            logger.error(f"Error sending ping to {client_id}: {e}")
                            break
                    
        except (json.JSONDecodeError, KeyError) as e:
            await connection.send({
                "type": "error",
                "message": "Invalid authentication message format",
                "code": "invalid_format"
            })
            return
            
    except asyncio.TimeoutError:
        await connection.send({
            "type": "error",
            "message": "Authentication timeout",
            "code": "auth_timeout"
        })
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)
    finally:
        manager.disconnect(client_id)

async def handle_websocket_message(client_id: str, user_id: str, message: Dict[str, Any]):
    """Handle incoming WebSocket messages"""
    if not user_id:
        return
        
    msg_type = message.get("type")
    
    try:
        if msg_type == "message":
            # Handle direct message
            recipient_id = message.get("recipient_id")
            if not recipient_id:
                raise ValueError("Missing recipient_id")
                
            # In a real app, you would save the message to the database here
            
            # Forward the message to the recipient
            await manager.send_to_user(recipient_id, {
                "type": "message",
                "from": user_id,
                "message": message.get("message", ""),
                "timestamp": datetime.utcnow().isoformat()
            })
            
        elif msg_type == "subscribe":
            # Handle subscription to channels or topics
            topics = message.get("topics", [])
            if not isinstance(topics, list):
                topics = [topics]
                
            connection = manager.active_connections.get(client_id)
            if connection:
                for topic in topics:
                    connection.subscriptions.add(topic)
                
                await connection.send({
                    "type": "subscription_update",
                    "subscribed_to": list(connection.subscriptions),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
        elif msg_type == "typing":
            # Handle typing indicator
            recipient_id = message.get("recipient_id")
            if recipient_id:
                await manager.send_to_user(recipient_id, {
                    "type": "user_typing",
                    "user_id": user_id,
                    "is_typing": message.get("is_typing", True),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
        # Add more message types as needed
        
    except Exception as e:
        logger.error(f"Error handling message: {e}", exc_info=True)
        connection = manager.active_connections.get(client_id)
        if connection:
            await connection.send({
                "type": "error",
                "message": str(e),
                "code": "processing_error"
            })

# Include API router
from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", dependencies=[Depends(PermissionChecker([{"resource": "system", "action": "read"}]))])
async def read_root():
    return {"message": "Welcome to the Trosyn AI API"}

async def init_app():
    """Initialize the application and its dependencies"""
    logger.info("Initializing application...")
    
    try:
        # Import models first to ensure they're registered with SQLAlchemy
        from app.database import import_models
        import_models()
        
        # Create database tables
        from app.database import init_db
        await init_db()
        
        # Create default roles and permissions
        await create_default_roles_and_permissions()
        
        logger.info("Application initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}", exc_info=True)
        raise

@app.on_event("startup")
async def startup_event():
    """Run tasks on application startup"""
    logger.info("Starting up...")
    try:
        await init_app()
    except Exception as e:
        logger.critical(f"Failed to start application: {str(e)}", exc_info=True)
        # In a production environment, you might want to exit the application here
        # import sys
        # sys.exit(1)

# Global exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(404)
async def not_found_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "Resource not found"},
    )

@app.exception_handler(500)
async def server_error_exception_handler(request: Request, exc: HTTPException):
    logger.exception("Internal server error")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(testing.router, prefix="/api/v1/testing", tags=["testing"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["roles"])
app.include_router(memory.router, prefix="/api/v1/memory", tags=["memory"])
app.include_router(department_requests.router, prefix="/api/v1/department-requests", tags=["department-requests"])

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="debug"
    )

