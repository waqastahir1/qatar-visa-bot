from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    passport = Column(String(50), nullable=False)
    visa = Column(String(50), nullable=False)
    mobile = Column(String(20), nullable=False)
    email = Column(String(100), nullable=False)
    priority = Column(String(20), default="normal")   # urgent / normal
    status = Column(String(30), default="waiting")    # waiting / booked / failed
    booked_date = Column(String(50), nullable=True)
    booked_time = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BotLog(Base):
    __tablename__ = "bot_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String(10), default="INFO")        # INFO / SUCCESS / WARNING / ERROR
    message = Column(Text, nullable=False)
    client_id = Column(Integer, nullable=True)


class BotSetting(Base):
    __tablename__ = "bot_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
