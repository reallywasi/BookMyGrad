from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class FreelancerCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    bio: str
    portfolio: str
    profession: str

class FreelancerUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    portfolio: Optional[str] = None
    profession: Optional[str] = None

class FreelancerResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    bio: str
    portfolio: str
    profession: str

    class Config:
        from_attributes = True  # Updated from orm_mode

class ProjectCreate(BaseModel):
    title: str
    description: str
    highlights: str
    technology_used: str

class ProjectResponse(BaseModel):
    id: int
    freelancer_id: int
    title: str
    description: str
    highlights: str
    technology_used: str

    class Config:
        from_attributes = True  # Updated from orm_mode

class ClientCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    company: Optional[str]
    bio: Optional[str]
    website: Optional[str]

    class Config:
        from_attributes = True  # Updated from orm_mode

class MessageCreate(BaseModel):
    receiver_id: int
    receiver_type: str  # 'freelancer' or 'client'
    content: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_type: str
    receiver_id: int
    receiver_type: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True  # Updated from orm_mode

class Token(BaseModel):
    access_token: str
    token_type: str
    client_id: Optional[int] = None