from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    plan: Literal["trial", "skill", "coach", "events", "team"] = "trial"
    edition: Literal["lite", "main"] = "lite"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    age: int | None = Field(default=None, ge=5, le=80)
    position: Literal["Goalkeeper", "Defender", "Midfielder", "Forward"] | None = None
    favourite_team: str | None = Field(default=None, max_length=60)
    country: str | None = Field(default=None, max_length=60)
    preferred_foot: Literal["Left", "Right", "Both"] | None = None


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    is_guest: bool
    plan: str
    plan_started_at: datetime
    created_at: datetime
    age: int | None
    position: str | None
    favourite_team: str | None
    country: str | None
    preferred_foot: str | None

    model_config = {"from_attributes": True}


class PlanIn(BaseModel):
    plan: Literal["trial", "skill", "coach", "events", "team"]


class AnalysisSummary(BaseModel):
    id: int
    title: str
    skill: str
    source: str
    sample_id: str | None
    status: str
    stage: str
    touches: int | None
    verdict: str | None
    created_at: datetime
    has_thumbnail: bool


class AnalysisOut(AnalysisSummary):
    error: str | None
    report: dict | None
    coaching: dict | None
    coaching_locked: bool  # the plan doesn't include coaching


class NotificationOut(BaseModel):
    id: int
    text: str
    link: str | None
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SupportIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    message: str = Field(min_length=10, max_length=2000)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    history: list[dict] = Field(default_factory=list, max_length=10)
    edition: Literal["lite", "main"] = "lite"


class ChatOut(BaseModel):
    reply: str
    source: Literal["ai", "faq"]


# ---- Main (Global) edition ----

class PhysicalIn(BaseModel):
    height_cm: int | None = Field(default=None, ge=100, le=230)
    weight_kg: int | None = Field(default=None, ge=20, le=150)
    birth_year: int | None = Field(default=None, ge=1940, le=2022)
    body_type: Literal["Slim", "Athletic", "Stocky"] | None = None
    shirt_number: int | None = Field(default=None, ge=1, le=99)
    prefs: dict[str, bool] | None = None


class MindsetIn(BaseModel):
    answers: dict[str, int]


class ReactionIn(BaseModel):
    times_ms: list[int] = Field(max_length=10)
    false_starts: int = 0


class LogicIn(BaseModel):
    token: str = Field(max_length=1000)
    answers: list[int] = Field(max_length=20)
    seconds: int = 0


class SessionDoneIn(BaseModel):
    session: str = Field(max_length=10)
    done: bool = True


class RoomIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    kind: Literal["team", "academy"] = "team"
    description: str | None = Field(default=None, max_length=300)
    min_touches: int | None = Field(default=None, ge=1, le=500)  # academy rooms: the trial's bar


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=12)


class TaskIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    notes: str | None = Field(default=None, max_length=500)
    target_touches: int | None = Field(default=None, ge=1, le=500)
    due_at: datetime
    assignee_id: int | None = None  # empty = the whole room


class SubmitIn(BaseModel):
    analysis_id: int


class ReviewIn(BaseModel):
    score: int = Field(ge=0, le=100)
    note: str | None = Field(default=None, max_length=500)


class ScoutIn(BaseModel):
    note: str = Field(max_length=2000)
