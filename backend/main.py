from fastapi import FastAPI

from backend.api.v1 import ai, fans, segments

app = FastAPI(title="ClubBrain — MVP Vasco", version="0.1.0")

app.include_router(fans.router, prefix="/api/v1")
app.include_router(segments.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
