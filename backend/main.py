



# from fastapi import FastAPI, HTTPException, Depends, status
# from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel, EmailStr
# from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker, Session
# from passlib.context import CryptContext
# from jose import JWTError, jwt
# from datetime import datetime, timedelta
# from typing import List, Optional

# # FastAPI app
# app = FastAPI(title="Freelancer Platform API")

# # CORS configuration
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # SQLite database setup
# DATABASE_URL = "sqlite:///freelancer.db"
# engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()

# # Password hashing
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# # JWT settings
# SECRET_KEY = "your-secret-key-please-change-this"  # Change this in production!
# ALGORITHM = "HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES = 30

# # OAuth2 scheme
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="freelancers/login")

# # Database Models
# class Freelancer(Base):
#     __tablename__ = "freelancers"
#     id = Column(Integer, primary_key=True, index=True)
#     email = Column(String, unique=True, index=True)
#     password = Column(String)
#     name = Column(String)
#     bio = Column(Text)
#     portfolio = Column(Text)
#     profession = Column(String)

# class Project(Base):
#     __tablename__ = "projects"
#     id = Column(Integer, primary_key=True, index=True)
#     freelancer_id = Column(Integer, ForeignKey("freelancers.id"))
#     title = Column(String)
#     description = Column(Text)
#     highlights = Column(Text)
#     technology_used = Column(Text)

# class Client(Base):
#     __tablename__ = "clients"
#     id = Column(Integer, primary_key=True, index=True)
#     email = Column(String, unique=True, index=True)
#     password = Column(String)
#     name = Column(String)
#     company = Column(String, nullable=True)

# class Message(Base):
#     __tablename__ = "messages"
#     id = Column(Integer, primary_key=True, index=True)
#     sender_id = Column(Integer)
#     sender_type = Column(String)  # 'freelancer' or 'client'
#     receiver_id = Column(Integer)
#     receiver_type = Column(String)  # 'freelancer' or 'client'
#     content = Column(Text)
#     timestamp = Column(DateTime, default=datetime.utcnow)

# # Create tables
# Base.metadata.create_all(bind=engine)

# # Pydantic Models
# class FreelancerCreate(BaseModel):
#     email: EmailStr
#     password: str
#     name: str
#     bio: str
#     portfolio: str
#     profession: str

# class FreelancerUpdate(BaseModel):
#     name: Optional[str] = None
#     bio: Optional[str] = None
#     portfolio: Optional[str] = None
#     profession: Optional[str] = None

# class FreelancerResponse(BaseModel):
#     id: int
#     email: EmailStr
#     name: str
#     bio: str
#     portfolio: str
#     profession: str

#     class Config:
#         orm_mode = True

# class ProjectCreate(BaseModel):
#     title: str
#     description: str
#     highlights: str
#     technology_used: str

# class ProjectResponse(BaseModel):
#     id: int
#     freelancer_id: int
#     title: str
#     description: str
#     highlights: str
#     technology_used: str

#     class Config:
#         orm_mode = True

# class ClientCreate(BaseModel):
#     email: EmailStr
#     password: str
#     name: str
#     company: Optional[str] = None

# class ClientResponse(BaseModel):
#     id: int
#     email: EmailStr
#     name: str
#     company: Optional[str]

#     class Config:
#         orm_mode = True

# class MessageCreate(BaseModel):
#     receiver_id: int
#     receiver_type: str  # 'freelancer' or 'client'
#     content: str

# class MessageResponse(BaseModel):
#     id: int
#     sender_id: int
#     sender_type: str
#     receiver_id: int
#     receiver_type: str
#     content: str
#     timestamp: datetime

#     class Config:
#         orm_mode = True

# class Token(BaseModel):
#     access_token: str
#     token_type: str

# # Dependency
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# # Helper functions
# def hash_password(password: str) -> str:
#     return pwd_context.hash(password)

# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     return pwd_context.verify(plain_password, hashed_password)

# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.utcnow() + expires_delta
#     else:
#         expire = datetime.utcnow() + timedelta(minutes=15)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt

# async def get_current_freelancer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         email: str = payload.get("sub")
#         if email is None:
#             raise credentials_exception
#     except JWTError:
#         raise credentials_exception
#     freelancer = db.query(Freelancer).filter(Freelancer.email == email).first()
#     if freelancer is None:
#         raise credentials_exception
#     return freelancer

# async def get_current_client(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         email: str = payload.get("sub")
#         if email is None:
#             raise credentials_exception
#     except JWTError:
#         raise credentials_exception
#     client = db.query(Client).filter(Client.email == email).first()
#     if client is None:
#         raise credentials_exception
#     return client

# # Endpoints
# @app.post("/freelancers/register", response_model=FreelancerResponse)
# def create_freelancer(freelancer: FreelancerCreate, db: Session = Depends(get_db)):
#     db_freelancer = db.query(Freelancer).filter(Freelancer.email == freelancer.email).first()
#     if db_freelancer:
#         raise HTTPException(status_code=400, detail="Email already registered")
#     hashed_password = hash_password(freelancer.password)
#     db_freelancer = Freelancer(
#         email=freelancer.email,
#         password=hashed_password,
#         name=freelancer.name,
#         bio=freelancer.bio,
#         portfolio=freelancer.portfolio,
#         profession=freelancer.profession
#     )
#     db.add(db_freelancer)
#     db.commit()
#     db.refresh(db_freelancer)
#     return db_freelancer

# @app.post("/freelancers/login", response_model=Token)
# def login_freelancer(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
#     freelancer = db.query(Freelancer).filter(Freelancer.email == form_data.username).first()
#     if not freelancer or not verify_password(form_data.password, freelancer.password):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect email or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": freelancer.email}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}

# @app.get("/freelancers/me", response_model=FreelancerResponse)
# def get_freelancer_me(freelancer: Freelancer = Depends(get_current_freelancer)):
#     return freelancer

# @app.put("/freelancers/me", response_model=FreelancerResponse)
# def update_freelancer(freelancer_update: FreelancerUpdate, freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
#     update_data = freelancer_update.dict(exclude_unset=True)
#     for key, value in update_data.items():
#         setattr(freelancer, key, value)
#     db.commit()
#     db.refresh(freelancer)
#     return freelancer

# @app.get("/freelancers/me/projects", response_model=List[ProjectResponse])
# def get_freelancer_projects(freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
#     return db.query(Project).filter(Project.freelancer_id == freelancer.id).all()

# @app.post("/projects/", response_model=ProjectResponse)
# def create_project(project: ProjectCreate, freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
#     db_project = Project(
#         freelancer_id=freelancer.id,
#         title=project.title,
#         description=project.description,
#         highlights=project.highlights,
#         technology_used=project.technology_used
#     )
#     db.add(db_project)
#     db.commit()
#     db.refresh(db_project)
#     return db_project

# @app.get("/projects/", response_model=List[ProjectResponse])
# def get_projects(db: Session = Depends(get_db)):
#     return db.query(Project).all()

# @app.post("/clients/register", response_model=ClientResponse)
# def create_client(client: ClientCreate, db: Session = Depends(get_db)):
#     db_client = db.query(Client).filter(Client.email == client.email).first()
#     if db_client:
#         raise HTTPException(status_code=400, detail="Email already registered")
#     hashed_password = hash_password(client.password)
#     db_client = Client(
#         email=client.email,
#         password=hashed_password,
#         name=client.name,
#         company=client.company
#     )
#     db.add(db_client)
#     db.commit()
#     db.refresh(db_client)
#     return db_client

# @app.post("/clients/login", response_model=Token)
# def login_client(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
#     client = db.query(Client).filter(Client.email == form_data.username).first()
#     if not client or not verify_password(form_data.password, client.password):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect email or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": client.email}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}

# @app.get("/clients/me", response_model=ClientResponse)
# def get_client_me(client: Client = Depends(get_current_client)):
#     return client

# @app.post("/messages/", response_model=MessageResponse)
# def send_message(
#     message: MessageCreate,
#     freelancer: Optional[Freelancer] = Depends(get_current_freelancer),
#     client: Optional[Client] = Depends(get_current_client),
#     db: Session = Depends(get_db)
# ):
#     if freelancer is None and client is None:
#         raise HTTPException(status_code=401, detail="Authentication required")
#     if freelancer and client:
#         raise HTTPException(status_code=400, detail="Cannot be both freelancer and client")

#     sender_id = freelancer.id if freelancer else client.id
#     sender_type = "freelancer" if freelancer else "client"
    
#     # Validate receiver
#     if message.receiver_type not in ["freelancer", "client"]:
#         raise HTTPException(status_code=400, detail="Invalid receiver_type")
#     if message.receiver_type == "freelancer":
#         receiver = db.query(Freelancer).filter(Freelancer.id == message.receiver_id).first()
#     else:
#         receiver = db.query(Client).filter(Client.id == message.receiver_id).first()
#     if not receiver:
#         raise HTTPException(status_code=404, detail=f"{message.receiver_type.capitalize()} not found")

#     db_message = Message(
#         sender_id=sender_id,
#         sender_type=sender_type,
#         receiver_id=message.receiver_id,
#         receiver_type=message.receiver_type,
#         content=message.content
#     )
#     db.add(db_message)
#     db.commit()
#     db.refresh(db_message)
#     return db_message

# @app.get("/messages/", response_model=List[MessageResponse])
# def get_messages(
#     other_party_id: int,
#     other_party_type: str,
#     freelancer: Optional[Freelancer] = Depends(get_current_freelancer),
#     client: Optional[Client] = Depends(get_current_client),
#     db: Session = Depends(get_db)
# ):
#     if freelancer is None and client is None:
#         raise HTTPException(status_code=401, detail="Authentication required")
#     if freelancer and client:
#         raise HTTPException(status_code=400, detail="Cannot be both freelancer and client")

#     user_id = freelancer.id if freelancer else client.id
#     user_type = "freelancer" if freelancer else "client"

#     # Validate other party
#     if other_party_type not in ["freelancer", "client"]:
#         raise HTTPException(status_code=400, detail="Invalid other_party_type")
#     if other_party_type == "freelancer":
#         other_party = db.query(Freelancer).filter(Freelancer.id == other_party_id).first()
#     else:
#         other_party = db.query(Client).filter(Client.id == other_party_id).first()
#     if not other_party:
#         raise HTTPException(status_code=404, detail=f"{other_party_type.capitalize()} not found")

#     # Fetch messages (sent or received)
#     messages = db.query(Message).filter(
#         ((Message.sender_id == user_id) & (Message.sender_type == user_type) &
#          (Message.receiver_id == other_party_id) & (Message.receiver_type == other_party_type)) |
#         ((Message.sender_id == other_party_id) & (Message.sender_type == other_party_type) &
#          (Message.receiver_id == user_id) & (Message.receiver_type == user_type))
#     ).order_by(Message.timestamp).all()
    
#     return messages












from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi.encoders import jsonable_encoder

# FastAPI app
app = FastAPI(title="Freelancer Platform API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite database setup
DATABASE_URL = "sqlite:///freelancer.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "your-secret-key-please-change-this"  # Change this in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="clients/login")

# Database Models
class Freelancer(Base):
    __tablename__ = "freelancers"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String)
    bio = Column(Text)
    portfolio = Column(Text)
    profession = Column(String)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    freelancer_id = Column(Integer, ForeignKey("freelancers.id"))
    title = Column(String)
    description = Column(Text)
    highlights = Column(Text)
    technology_used = Column(Text)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String)
    company = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    website = Column(String, nullable=True)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer)
    sender_type = Column(String)  # 'freelancer' or 'client'
    receiver_id = Column(Integer)
    receiver_type = Column(String)  # 'freelancer' or 'client'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.drop_all(bind=engine)  # Drop existing tables
Base.metadata.create_all(bind=engine)  # Recreate tables

# Pydantic Models
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
        orm_mode = True
        from_attributes = True

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
        orm_mode = True
        from_attributes = True

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
        orm_mode = True
        from_attributes = True

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
        orm_mode = True
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    client_id: Optional[int] = None

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_type: str = payload.get("type")
        if email is None or user_type is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    if user_type == "freelancer":
        user = db.query(Freelancer).filter(Freelancer.email == email).first()
    else:
        user = db.query(Client).filter(Client.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_freelancer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = await get_current_user(token, db)
    if not isinstance(user, Freelancer):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as freelancer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_client(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = await get_current_user(token, db)
    if not isinstance(user, Client):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as client",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# Endpoints
@app.post("/freelancers/register", response_model=FreelancerResponse)
def create_freelancer(freelancer: FreelancerCreate, db: Session = Depends(get_db)):
    db_freelancer = db.query(Freelancer).filter(Freelancer.email == freelancer.email).first()
    if db_freelancer:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hash_password(freelancer.password)
    db_freelancer = Freelancer(
        email=freelancer.email,
        password=hashed_password,
        name=freelancer.name,
        bio=freelancer.bio,
        portfolio=freelancer.portfolio,
        profession=freelancer.profession
    )
    db.add(db_freelancer)
    db.commit()
    db.refresh(db_freelancer)
    return db_freelancer

@app.post("/freelancers/login", response_model=Token)
def login_freelancer(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    freelancer = db.query(Freelancer).filter(Freelancer.email == form_data.username).first()
    if not freelancer or not verify_password(form_data.password, freelancer.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": freelancer.email, "type": "freelancer"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "client_id": freelancer.id}

@app.get("/freelancers/me", response_model=FreelancerResponse)
def get_freelancer_me(freelancer: Freelancer = Depends(get_current_freelancer)):
    return freelancer

@app.put("/freelancers/me", response_model=FreelancerResponse)
def update_freelancer(freelancer_update: FreelancerUpdate, freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
    update_data = freelancer_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(freelancer, key, value)
    db.commit()
    db.refresh(freelancer)
    return freelancer

@app.get("/freelancers/me/projects", response_model=List[ProjectResponse])
def get_freelancer_projects(freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.freelancer_id == freelancer.id).all()

@app.post("/projects/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
    db_project = Project(
        freelancer_id=freelancer.id,
        title=project.title,
        description=project.description,
        highlights=project.highlights,
        technology_used=project.technology_used
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/projects/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.post("/clients/register", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.email == client.email).first()
    if db_client:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hash_password(client.password)
    db_client = Client(
        email=client.email,
        password=hashed_password,
        name=client.name,
        company=client.company,
        bio=client.bio,
        website=client.website
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_client.email, "type": "client"}, expires_delta=access_token_expires
    )
    return jsonable_encoder(ClientResponse.from_orm(db_client), exclude_none=True) | {"access_token": access_token, "token_type": "bearer", "client_id": db_client.id}

@app.post("/clients/login", response_model=Token)
def login_client(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == form_data.username).first()
    if not client or not verify_password(form_data.password, client.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": client.email, "type": "client"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "client_id": client.id}

@app.get("/clients/me", response_model=ClientResponse)
def get_client_me(client: Client = Depends(get_current_client)):
    return client

@app.put("/clients/me", response_model=ClientResponse)
def update_client(client_update: ClientUpdate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    update_data = client_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client

@app.post("/messages/", response_model=MessageResponse)
def send_message(
    message: MessageCreate,
    freelancer: Optional[Freelancer] = Depends(get_current_freelancer),
    client: Optional[Client] = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    if freelancer is None and client is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if freelancer and client:
        raise HTTPException(status_code=400, detail="Cannot be both freelancer and client")

    sender_id = freelancer.id if freelancer else client.id
    sender_type = "freelancer" if freelancer else "client"
    
    # Validate receiver
    if message.receiver_type not in ["freelancer", "client"]:
        raise HTTPException(status_code=400, detail="Invalid receiver_type")
    if message.receiver_type == "freelancer":
        receiver = db.query(Freelancer).filter(Freelancer.id == message.receiver_id).first()
    else:
        receiver = db.query(Client).filter(Client.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail=f"{message.receiver_type.capitalize()} not found")

    db_message = Message(
        sender_id=sender_id,
        sender_type=sender_type,
        receiver_id=message.receiver_id,
        receiver_type=message.receiver_type,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

@app.get("/messages/", response_model=List[MessageResponse])
def get_messages(
    other_party_id: Optional[int] = None,
    other_party_type: Optional[str] = None,
    freelancer: Optional[Freelancer] = Depends(get_current_freelancer),
    client: Optional[Client] = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    if freelancer is None and client is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if freelancer and client:
        raise HTTPException(status_code=400, detail="Cannot be both freelancer and client")

    user_id = freelancer.id if freelancer else client.id
    user_type = "freelancer" if freelancer else client.id

    query = db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.sender_type == user_type)) |
        ((Message.receiver_id == user_id) & (Message.receiver_type == user_type))
    )

    if other_party_id is not None and other_party_type is not None:
        if other_party_type not in ["freelancer", "client"]:
            raise HTTPException(status_code=400, detail="Invalid other_party_type")
        if other_party_type == "freelancer":
            other_party = db.query(Freelancer).filter(Freelancer.id == other_party_id).first()
        else:
            other_party = db.query(Client).filter(Client.id == other_party_id).first()
        if not other_party:
            raise HTTPException(status_code=404, detail=f"{other_party_type.capitalize()} not found")
        query = query.filter(
            ((Message.sender_id == other_party_id) & (Message.sender_type == other_party_type)) |
            ((Message.receiver_id == other_party_id) & (Message.receiver_type == other_party_type))
        )

    messages = query.order_by(Message.timestamp).all()
    return messages