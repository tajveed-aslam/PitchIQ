import os
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import analyses, auth, events, insights, me, player, rooms, samples, support

Base.metadata.create_all(bind=engine)

STARTED = time.time()
app = FastAPI(title="PitchIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,  # bearer tokens, no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(me.router, prefix="/me", tags=["me"])
app.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
app.include_router(samples.router, prefix="/samples", tags=["samples"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(support.router, prefix="/support", tags=["support"])
# Main (Global) edition
app.include_router(player.router, prefix="/player", tags=["player"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(rooms.router, prefix="/rooms", tags=["rooms"])


@app.get("/")
def health():
    out = {"status": "ok", "app": "PitchIQ API", "worker": "remote" if settings.worker_url else "in-process",
           "version": os.environ.get("RENDER_GIT_COMMIT", "local")[:7], "cpus_seen": os.cpu_count(),
           "uptime_s": round(time.time() - STARTED)}
    try:  # peak memory of this process since it started (Linux reports KB): watch it against Render's 512 MB
        import resource
        out["peak_memory_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024)
    except ImportError:  # Windows
        pass
    return out
