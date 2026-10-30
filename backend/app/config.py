import secrets
import sys
import warnings

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # No default on purpose: a secret in a public repo would let anyone forge tokens. See the check below.
    secret_key: str = ""
    database_url: str = "sqlite:///./pitchiq.db"
    access_token_expire_minutes: int = 60 * 24 * 7
    algorithm: str = "HS256"

    # Comma-separated frontend origins allowed by CORS (both editions' Vercel URLs in production).
    frontend_origins: str = "http://localhost:3000,http://localhost:3100"

    # Analysis worker (Hugging Face Space). Empty = run the analysis inside this process (local dev and tests).
    worker_url: str = ""
    worker_key: str = ""

    # Gemini writes the coaching. Empty = rule-based coaching only.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"  # flash-latest "thinks" for 20+ s; lite answers in ~1 s

    # The shared guest account visitors use from "Try the demo"; it is reset by the seed.
    demo_email: str = "demo@pitchiq.app"

    # Upload limits (the Lite data saver normally keeps uploads to a few MB).
    max_upload_mb: int = 40

    # Public "Analyse this sample" runs per visitor per hour (raised for local end-to-end test runs).
    sample_runs_per_hour: int = 6

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


settings = Settings()

if not settings.secret_key:
    if "pytest" not in sys.modules:
        warnings.warn("SECRET_KEY is not set: using a random one, so tokens stop working on restart.", stacklevel=1)
    settings.secret_key = secrets.token_hex(32)
