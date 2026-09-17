import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class MembershipOut(BaseModel):
    id: uuid.UUID
    plan_name: str
    status: str
    monthly_value: float
    started_at: date
    renews_at: date
    cancelled_at: Optional[date] = None

    class Config:
        from_attributes = True


class FanProfileOut(BaseModel):
    """Fan 360: identidade (Postgres) + sinais agregados (Neo4j)."""

    fan_id: uuid.UUID
    fan_since: Optional[date] = None
    lifetime_value: float
    memberships: list[MembershipOut] = []
    engagement_score: Optional[float] = None
    matches_attended_count: Optional[int] = None
    churn_risk_score: Optional[float] = None
    segments: list[str] = []


class SegmentSearchResult(BaseModel):
    segment_name: str
    definition_rule: str
    fan_count: int
    fan_ids: list[uuid.UUID]


class ClubOverviewOut(BaseModel):
    total_fans: int
    active_memberships: int
    monthly_recurring_revenue: float
    merchandise_revenue_paid: float
    sponsorship_annual_value: float
    fans_at_risk_070: int


class AIAskRequest(BaseModel):
    club_id: uuid.UUID
    question: str


class AIAskResponse(BaseModel):
    answer: str
    used_tools: list[str] = []
    generated_at: datetime
