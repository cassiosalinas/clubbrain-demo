"""Controlled tools the AI agents are allowed to call.

Non-negotiable principle (see CLAUDE.md / docs/architecture/vision.md):
the AI never gets direct DB/ontology access — only these functions, which
combine the Postgres identity layer (source of truth for "quem e quem")
with read-only Cypher against the Neo4j knowledge graph.
"""

import uuid

from sqlalchemy.orm import Session

from backend import models
from backend.graph.neo4j_client import run_query


def get_fan_360(db: Session, fan_id: uuid.UUID) -> dict:
    """Assemble the Fan 360 view: identity + memberships (Postgres) plus
    engagement/churn/segment signals (Neo4j)."""

    fan = db.query(models.Fan).filter(models.Fan.id == fan_id).first()
    if fan is None:
        return None

    memberships = (
        db.query(models.Membership)
        .filter(models.Membership.fan_id == fan_id)
        .all()
    )

    graph_rows = run_query(
        """
        MATCH (f:Fan {id: $fan_id})
        OPTIONAL MATCH (fp:FanProfile)-[:PROFILE_OF]->(f)
        OPTIONAL MATCH (f)-[:HAS_MEMBERSHIP]->(m:Membership)<-[:RISK_OF]-(cr:ChurnRisk)
        OPTIONAL MATCH (f)-[:BELONGS_TO_SEGMENT]->(seg:FanSegment)
        RETURN fp.engagement_score AS engagement_score,
               fp.matches_attended_count AS matches_attended_count,
               cr.risk_score AS churn_risk_score,
               collect(DISTINCT seg.name) AS segments
        """,
        fan_id=str(fan_id),
    )
    graph_data = graph_rows[0] if graph_rows else {}

    return {
        "fan_id": fan.id,
        "fan_since": fan.fan_since,
        "lifetime_value": float(fan.lifetime_value),
        "memberships": memberships,
        "engagement_score": graph_data.get("engagement_score"),
        "matches_attended_count": graph_data.get("matches_attended_count"),
        "churn_risk_score": graph_data.get("churn_risk_score"),
        "segments": [s for s in graph_data.get("segments", []) if s],
    }


def search_fans_at_risk(min_risk_score: float = 0.7) -> list[str]:
    """Return fan_ids whose ChurnRisk score is at or above the threshold.

    Mirrors the "fan em risco" heuristic used by clubbrain-alpha (active
    membership + rising churn score), but the score itself is computed
    once by the seed/ETL job and read here, not recomputed per-request.
    """

    rows = run_query(
        """
        MATCH (cr:ChurnRisk)-[:RISK_OF]->(m:Membership)<-[:HAS_MEMBERSHIP]-(f:Fan)
        WHERE cr.risk_score >= $min_risk_score AND m.status = 'active'
        RETURN DISTINCT f.id AS fan_id
        """,
        min_risk_score=min_risk_score,
    )
    return [row["fan_id"] for row in rows]
