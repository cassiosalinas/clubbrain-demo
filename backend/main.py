from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1 import ai, fans, segments

app = FastAPI(title="ClubBrain — MVP Vasco", version="0.1.0")

# Alpha only: the demo frontend (frontend/fan-explorer.html) is opened as a
# static file or from a different origin than the API, so CORS is wide
# open here. Tighten this to the real frontend's origin before any
# non-fictitious data touches this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fans.router, prefix="/api/v1")
app.include_router(segments.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
