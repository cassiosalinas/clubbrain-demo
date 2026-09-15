from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.v1 import agents, ai, fans, segments

app = FastAPI(title="ClubBrain — MVP Vasco", version="0.1.0")

# Kept for flexibility (e.g. an external frontend later), but the demo
# frontend below is served same-origin specifically to avoid this: behind
# GitHub Codespaces' port-forwarding proxy, a cross-origin POST's CORS
# preflight (OPTIONS, always sent without cookies per spec) gets blocked
# by the proxy's own auth gate before it ever reaches FastAPI — no CORS
# config on our side can fix that, since the block happens upstream of
# the app entirely.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fans.router, prefix="/api/v1")
app.include_router(segments.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


# Demo frontend, same-origin as the API — see the CORS comment above for
# why. Visit /demo/fan-explorer.html; the base-url field there can be
# left as the current origin.
app.mount("/demo", StaticFiles(directory="frontend", html=True), name="demo")
