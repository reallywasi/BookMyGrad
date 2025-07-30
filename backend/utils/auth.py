from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from models.database_models import Freelancer, Client # Ensure these are correctly imported
from database.db import get_db # Ensure this is correctly imported

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
# IMPORTANT: Change this in production! Use a strong, randomly generated key.
SECRET_KEY = "your-very-secret-key-that-should-be-randomly-generated-and-stored-securely"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Default token expiration

# OAuth2 scheme
# The tokenUrl specifies the URL that the client (e.g., your frontend)
# should use to obtain a new token when authentication is required.
# It primarily affects the 'WWW-Authenticate' header in 401 responses.
# It DOES NOT cause FastAPI to automatically redirect.
# A generic name like "/token" is often used.
# Your actual login endpoints are in routes.py (e.g., /freelancers/login, /clients/login).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

def hash_password(password: str) -> str:
    """Hashes a plain text password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Creates a new JWT access token.

    Args:
        data (dict): The data to encode in the token (e.g., {"sub": user_id, "type": "user_type"}).
        expires_delta (Optional[timedelta]): Optional timedelta for token expiration.
                                            Defaults to 15 minutes if not provided.

    Returns:
        str: The encoded JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Dependency to get the current authenticated user (either Freelancer or Client).

    Raises HTTPException for invalid credentials or expired tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("sub"))
        user_type: str = payload.get("type")

        if user_id is None or user_type is None:
            raise credentials_exception

        user = None
        if user_type == "freelancer":
            user = db.query(Freelancer).filter(Freelancer.id == user_id).first()
        elif user_type == "client":
            user = db.query(Client).filter(Client.id == user_id).first()
        else:
            # Handle unknown user types gracefully
            raise credentials_exception

        if user is None:
            raise credentials_exception
            
        return {"user": user, "type": user_type}
    except JWTError:
        # This catches various JWT errors, including ExpiredSignatureError
        raise credentials_exception

async def get_current_client(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Dependency to get the current authenticated Client.
    Requires get_current_user to have already authenticated a user.
    """
    if current_user["type"] != "client":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as client",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user["user"]

async def get_current_freelancer(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Dependency to get the current authenticated Freelancer.
    Requires get_current_user to have already authenticated a user.
    """
    if current_user["type"] != "freelancer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as freelancer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user["user"]