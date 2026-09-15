import uuid

from sqlalchemy import (
    ARRAY,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from backend.database import Base


class Club(Base):
    __tablename__ = "club"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    short_name = Column(Text, nullable=False)
    founded_year = Column(String)
    primary_color = Column(Text)
    crest_url = Column(Text)


class Person(Base):
    __tablename__ = "person"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name_hash = Column(Text, nullable=False)
    email_hash = Column(Text)
    phone_hash = Column(Text)
    cpf_hash = Column(Text)
    birth_date = Column(Date)
    city = Column(Text)
    state = Column(Text)
    country = Column(Text)
    source_systems = Column(ARRAY(Text))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Fan(Base):
    __tablename__ = "fan"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("person.id"), nullable=False, unique=True)
    fan_since = Column(Date)
    favorite_player_id = Column(UUID(as_uuid=True))
    lifetime_value = Column(Numeric(12, 2), nullable=False, default=0)
    acquisition_channel = Column(Text)


class Employee(Base):
    __tablename__ = "employee"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("person.id"), nullable=False, unique=True)
    club_id = Column(UUID(as_uuid=True), ForeignKey("club.id"), nullable=False)
    department = Column(Text)
    role_title = Column(Text)
    hired_at = Column(Date)


class Membership(Base):
    __tablename__ = "membership"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fan_id = Column(UUID(as_uuid=True), ForeignKey("fan.id"), nullable=False)
    plan_name = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    monthly_value = Column(Numeric(10, 2), nullable=False)
    started_at = Column(Date, nullable=False)
    renews_at = Column(Date, nullable=False)
    cancelled_at = Column(Date)
