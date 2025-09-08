# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use env var in docker-compose; fallback helps local dev
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://finance_user:finance_pass_2024@localhost:5432/finance_tracker",
)

# For Postgres, no special connect args needed
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy session.
    Ensures the session is closed after request handling.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()