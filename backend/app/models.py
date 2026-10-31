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


# ---- Main (Global) edition. New tables only, so the live database needs no migration (create_all adds them). ----

class PlayerProfile(Base):
    """The physical side of the full player card. Optional, entered by the player. No health data beyond what a
    football card shows (the brief's blood group is left out on purpose: sensitive and not needed for training)."""
    __tablename__ = "player_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    shirt_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Settings page: which notifications the player wants ({"tasks": true, "reports": true, "badges": true}).
    prefs: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Assessment(Base):
    """A finished test: mindset (self-assessment questionnaire), reaction (in-browser tap test) or logic (pattern
    puzzles graded by the server). score is 0-100; detail keeps the per-trait scores or the raw timings."""
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12), index=True)  # mindset | reaction | logic
    score: Mapped[int] = mapped_column(Integer)
    detail: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class TrainingPlan(Base):
    """A weekly plan written from the player's measured numbers (services/training.py). done: ids of finished
    sessions ("d1s0" = day 1, session 0)."""
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan: Mapped[dict] = mapped_column(JSON)
    done: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(30))
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Room(Base):
    """A coach's group room: a team squad, or an academy trial where applicants are checked against criteria.
    Players join with a code that expires (the brief's security requirement); the coach can issue a new one."""
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(10), default="team")  # team | academy
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    join_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    code_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    criteria: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # academy: {"min_touches": 20, ...}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    members: Mapped[list["RoomMember"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class RoomMember(Base):
    __tablename__ = "room_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    scouting_note: Mapped[str | None] = mapped_column(Text, nullable=True)  # academy rooms: the coach's report

    room: Mapped[Room] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class Task(Base):
    """A video task for the whole room (assignee_id empty) or one player, with a deadline and an optional target."""
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    skill: Mapped[str] = mapped_column(String(20), default="juggling")
    target_touches: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    room: Mapped[Room] = relationship(back_populates="tasks")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class Submission(Base):
    """A player hands in one of their analysed videos for a task; the coach scores it and adds a note."""
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"))
    coach_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100
    coach_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    task: Mapped[Task] = relationship(back_populates="submissions")
    analysis: Mapped[Analysis] = relationship()
