from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..dependencies import get_db
from ..models import User
from ..schemas import LoginIn, SignupIn, TokenOut
from ..security import create_access_token, hash_password, verify_password
from ..services.analyses import notify

router = APIRouter()


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Log in instead.")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password), plan=body.plan,
                edition=body.edition)
    db.add(user)
    db.flush()
    notify(db, user, "Welcome to PitchIQ! Start with a sample video or film your first session.", "/dashboard")
    db.commit()
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or user.is_guest or user.is_seed or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/demo", response_model=TokenOut)
def demo(db: Session = Depends(get_db)):
    """Log in as the shared demo player (seeded with past analyses). No password: it's public on purpose."""
    user = db.scalar(select(User).where(User.email == settings.demo_email, User.is_guest.is_(True)))
    if not user:
        raise HTTPException(status_code=503, detail="The demo account isn't set up yet.")
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/demo-coach", response_model=TokenOut)
def demo_coach(db: Session = Depends(get_db)):
    """Log in as the shared demo coach (Main edition): two seeded rooms with players, tasks and hand-ins."""
    from ..seed_main import DEMO_COACH_EMAIL
    user = db.scalar(select(User).where(User.email == DEMO_COACH_EMAIL, User.is_guest.is_(True)))
    if not user:
        raise HTTPException(status_code=503, detail="The demo coach isn't set up yet.")
    return TokenOut(access_token=create_access_token(user.id))
