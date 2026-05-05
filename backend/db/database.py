from dotenv import load_dotenv
load_dotenv()  # Must be called before reading any env vars

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/tendermind")

# psycopg2 reads sslmode from the connection URL query string.
# Do NOT pass sslmode via connect_args — it causes a conflict.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Test connection before use — prevents stale connection crashes
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,        # Recycle connections every 30 min
    pool_timeout=30,
    connect_args={
        "connect_timeout": 10,  # ✅ 10-second connection timeout
        "options": "-c isolation_level=READ_COMMITTED"  # ✅ Read-committed isolation (safe + performant)
    },
    echo=False,
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
    from . import models  # noqa: F401 — triggers model registration
    Base.metadata.create_all(bind=engine)
    logger.info("DB tables ensured")
