import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.agents.tools import get_fan_360
from backend.database import get_db
from backend.schemas import FanProfileOut

router = APIRouter(prefix="/fans", tags=["fans"])


@router.get("/{fan_id}/360", response_model=FanProfileOut)
def read_fan_360(fan_id: uuid.UUID, db: Session = Depends(get_db)):
    profile = get_fan_360(db, fan_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Fan not found")
    return profile
