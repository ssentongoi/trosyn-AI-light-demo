from pydantic import BaseModel
from .user import User

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
