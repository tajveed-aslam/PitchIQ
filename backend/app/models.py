from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False)  # the shared demo account
    is_seed: Mapped[bool] = mapped_column(Boolean, default=False)  # fictional leaderboard players
    edition: Mapped[str] = mapped_column(String(10), default="lite")

    plan: Mapped[str] = mapped_column(String(20), default="trial")
    plan_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    # Short profile (Lite): shown on the simple player card.
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position: Mapped[str | None] = mapped_column(String(30), nullable=True)
    favourite_team: Mapped[str | None] = mapped_column(String(60), nullable=True)
    country: Mapped[str | None] = mapped_column(String(60), nullable=True)
    preferred_foot: Mapped[str | None] = mapped_column(String(10), nullable=True)

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    skill: Mapped[str] = mapped_column(String(20), default="juggling")
    title: Mapped[str] = mapped_column(String(120), default="Juggling session")
    source: Mapped[str] = mapped_column(String(10), default="upload")  # upload | sample | seed
    sample_id: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # queued -> processing -> done | rejected (quality gate said re-film) | failed
    status: Mapped[str] = mapped_column(String(12), default="queued", index=True)
    stage: Mapped[str] = mapped_column(String(12), default="queued")
    worker_job_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # analysis/report.py output
    coaching: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # services/coaching.py output
    thumbnail: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)  # small JPEG; videos aren't kept
    touches: Mapped[int | None] = mapped_column(Integer, nullable=True)  # copied out of the report for lists/ranking

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="analyses")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(String(300))
    link: Mapped[str | None] = mapped_column(String(200), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship(back_populates="notifications")


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
