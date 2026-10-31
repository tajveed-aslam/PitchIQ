"""Minimal Gemini client over its REST API (generateContent), using httpx, which the API already loads.

Replaces the google-genai SDK: importing the SDK added ~46 MB (more on Linux), and it happened the first time a
report needed coaching, right when the video analysis was at its memory peak, which pushed the free server
(512 MB) over its limit and restarted it (BUG-15).
"""

import httpx

from ..config import settings

URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def generate(system: str, contents: list[dict], *, schema: dict | None = None, temperature: float = 0.4,
             max_tokens: int | None = None, timeout: float = 20) -> str:
    """One call to Gemini. contents: [{"role": "user"|"model", "text": "..."}]. Returns the reply text (JSON text
    when a response schema is given). Raises on HTTP errors and empty replies; callers fall back."""
    config: dict = {"temperature": temperature}
    if schema is not None:
        config.update(responseMimeType="application/json", responseSchema=schema)
    if max_tokens is not None:
        config["maxOutputTokens"] = max_tokens
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": c["role"], "parts": [{"text": c["text"]}]} for c in contents],
        "generationConfig": config,
    }
    r = httpx.post(URL.format(model=settings.gemini_model), json=body, timeout=timeout,
                   headers={"x-goog-api-key": settings.gemini_api_key})
    r.raise_for_status()
    parts = r.json()["candidates"][0]["content"]["parts"]
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise ValueError("empty reply")
    return text
