from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


def _url(url: str) -> str:
    # Neon hands out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver named (psycopg 3).
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _url(settings.database_url)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,  # Neon closes idle connections; check before use instead of failing a request
)
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _foreign_keys(conn, _record):
        # SQLite ignores ON DELETE CASCADE unless asked; Postgres (production) always applies it. Same behaviour
        # in tests and local runs as in production.
        conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
