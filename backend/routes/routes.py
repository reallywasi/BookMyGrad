from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional
from sqlalchemy.orm import Session
from database.db import get_db, Base, engine
from models.database_models import Freelancer, Project, Client, Message
from models.pydantic_models import (
    FreelancerCreate, FreelancerUpdate, FreelancerResponse,
    ProjectCreate, ProjectResponse,
    ClientCreate, ClientUpdate, ClientResponse,
    MessageCreate, MessageResponse,
    Token
)
from utils.auth import (
    hash_password, verify_password, create_access_token,
    get_current_freelancer, get_current_client, get_current_user
)
from datetime import timedelta

router = APIRouter()

# Create database tables
Base.metadata.create_all(bind=engine)

@router.post("/freelancers/register", response_model=FreelancerResponse)
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
    print(f"Registered freelancer: {db_freelancer.email}")
    return db_freelancer

@router.post("/freelancers/login", response_model=Token)
def login_freelancer(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    freelancer = db.query(Freelancer).filter(Freelancer.email == form_data.username).first()
    if not freelancer or not verify_password(form_data.password, freelancer.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(freelancer.id), "type": "freelancer"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "client_id": freelancer.id}

@router.get("/freelancers/me", response_model=FreelancerResponse)
def get_freelancer_me(freelancer: Freelancer = Depends(get_current_freelancer)):
    return freelancer

@router.put("/freelancers/me", response_model=FreelancerResponse)
def update_freelancer(freelancer_update: FreelancerUpdate, freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
    update_data = freelancer_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(freelancer, key, value)
    db.commit()
    db.refresh(freelancer)
    return freelancer

@router.get("/freelancers/me/projects", response_model=List[ProjectResponse])
def get_freelancer_projects(freelancer: Freelancer = Depends(get_current_freelancer), db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.freelancer_id == freelancer.id).all()

@router.post("/projects/", response_model=ProjectResponse)
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

@router.get("/projects/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@router.post("/clients/register", response_model=ClientResponse)
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
    try:
        db.commit()
        db.refresh(db_client)
        print(f"Registered client: {db_client.email}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(db_client.id), "type": "client"}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "client_id": db_client.id,
        "id": db_client.id,
        "email": db_client.email,
        "name": db_client.name,
        "company": db_client.company,
        "bio": db_client.bio,
        "website": db_client.website
    }

@router.post("/clients/login", response_model=Token)
def login_client(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == form_data.username).first()
    if not client or not verify_password(form_data.password, client.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(client.id), "type": "client"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "client_id": client.id}

@router.get("/clients/me", response_model=ClientResponse)
def get_client_me(client: Client = Depends(get_current_client)):
    return client

@router.put("/clients/me", response_model=ClientResponse)
def update_client(client_update: ClientUpdate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    update_data = client_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client

# NEW ENDPOINT: Get all clients
@router.get("/clients", response_model=List[ClientResponse], tags=["Clients"])
def get_all_clients(db: Session = Depends(get_db)):
    """
    Retrieve a list of all clients.
    """
    clients = db.query(Client).all()
    # You can choose to return an empty list or raise a 404 if no clients are found.
    # Returning an empty list is generally preferred for "get all" endpoints.
    return clients


@router.post("/messages/", response_model=MessageResponse)
def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sender_id = current_user["user"].id
    sender_type = current_user["type"]
    
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

@router.get("/messages/", response_model=List[MessageResponse])
def get_messages(
    other_party_id: Optional[int] = None,
    other_party_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user"].id
    user_type = current_user["type"]

    query = db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.sender_type == user_type)) |
        ((Message.receiver_id == user_id) & (Message.receiver_type == user_type))
    )

    if other_party_id is not None and other_party_type is not None:
        if other_party_type not in ["freelancer", "client"]:
            raise HTTPException(status_code=400, detail="Invalid other_party_type")
        query = query.filter(
            ((Message.sender_id == other_party_id) & (Message.sender_type == other_party_type)) |
            ((Message.receiver_id == other_party_id) & (Message.receiver_type == other_party_type))
        )

    messages = query.order_by(Message.timestamp).all()
    return messages

@router.get("/freelancers/", response_model=List[FreelancerResponse])
def get_freelancers(profession: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Freelancer)
    if profession:
        query = query.filter(Freelancer.profession.ilike(f"%{profession}%"))
    freelancers = query.all()
    return freelancers