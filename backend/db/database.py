from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/tendermind")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Test connection before use — prevents stale connection crashes
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,        # Recycle connections every 30 min
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    from . import models
    models.Base.metadata.create_all(bind=engine)
