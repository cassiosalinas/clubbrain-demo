from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.agents.tools import get_club_overview
from backend.database import get_db
from backend.schemas import ClubOverviewOut

router = APIRouter(prefix="/club", tags=["club"])


@router.get("/overview", response_model=ClubOverviewOut)
def read_club_overview(db: Session = Depends(get_db)):
    """Direct REST access to the same aggregate numbers the Executive
    agent's get_club_overview tool uses — for a dashboard, going through
    the LLM for every page load would be slow and wasteful."""
    return get_club_overview(db)
