from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    plan: Literal["trial", "skill", "coach", "events"] = "trial"


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
    plan: Literal["trial", "skill", "coach", "events"]


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


class ChatOut(BaseModel):
    reply: str
    source: Literal["ai", "faq"]
