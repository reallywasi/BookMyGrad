from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from database.db import Base
from datetime import datetime

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