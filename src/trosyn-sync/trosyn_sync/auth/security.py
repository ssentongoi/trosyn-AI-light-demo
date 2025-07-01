import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from ..config import settings

ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # Dummy tokenUrl


def create_access_token(data: dict):
    """Creates a new JWT access token."""
    to_encode = data.copy()
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str = Depends(oauth2_scheme)):
    """Verifies the JWT token and checks if the node is allowed."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        node_id: str = payload.get("sub")
        if node_id is None:
            raise credentials_exception
        if node_id not in settings.ALLOWED_NODE_IDS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Node not authorized",
            )
        return node_id
    except jwt.PyJWTError:
        raise credentials_exception
