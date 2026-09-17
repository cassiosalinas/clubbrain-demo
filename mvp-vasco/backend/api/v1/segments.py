from fastapi import APIRouter, Query

from backend.agents.tools import search_fans_at_risk
from backend.schemas import SegmentSearchResult

router = APIRouter(prefix="/segments", tags=["segments"])


@router.get("/at-risk", response_model=SegmentSearchResult)
def read_fans_at_risk(min_score: float = Query(0.7, ge=0.0, le=1.0)):
    fan_ids = search_fans_at_risk(min_risk_score=min_score)
    return SegmentSearchResult(
        segment_name="fans_em_risco_de_churn",
        definition_rule=f"membership ativa AND churn_risk_score >= {min_score}",
        fan_count=len(fan_ids),
        fan_ids=fan_ids,
    )
