"""Agent personas — the Alpha's version of CLAUDE.md's Agents layer
("2-3 agentes: Executive, Fan, Marketing").

Every persona shares the exact same three controlled tools
(backend/agents/tools.py) and the exact same Claude tool-use loop
(backend/agents/runner.py) — what differs is the system prompt (what the
agent is for) and which tools it's allowed to reach for. This is what
keeps "the AI never touches DB directly" true even as the roster of
agents grows: a persona can't call a tool that isn't in its own list.
"""

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from backend.agents.tools import get_club_overview, get_fan_360, search_fans_at_risk

TOOL_SCHEMAS = {
    "search_fans_at_risk": {
        "name": "search_fans_at_risk",
        "description": (
            "Retorna a lista de fan_ids com socio-torcedor ativo e "
            "risk_score de cancelamento (churn) maior ou igual ao limite "
            "informado."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "min_risk_score": {
                    "type": "number",
                    "description": "Limite minimo de risco, 0.0 a 1.0. Default 0.7.",
                }
            },
        },
    },
    "get_fan_360": {
        "name": "get_fan_360",
        "description": (
            "Retorna a visao 360 de um torcedor especifico: desde quando "
            "e fan, lifetime value, quantidade de memberships, "
            "engajamento, risco de churn e segmentos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"fan_id": {"type": "string", "description": "UUID do fan"}},
            "required": ["fan_id"],
        },
    },
    "get_club_overview": {
        "name": "get_club_overview",
        "description": (
            "Retorna metricas agregadas do clube: total de fans, "
            "memberships ativos, receita recorrente mensal (MRR), receita "
            "de loja paga, valor anual total de patrocinio e quantidade "
            "de fans em risco de churn (score >= 0.7)."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
}


def execute_tool(db: Session, name: str, tool_input: dict) -> dict:
    if name == "search_fans_at_risk":
        min_score = tool_input.get("min_risk_score", 0.7)
        fan_ids = search_fans_at_risk(min_risk_score=min_score)
        return {"fan_count": len(fan_ids), "fan_ids": fan_ids[:50]}

    if name == "get_fan_360":
        fan_id = uuid.UUID(tool_input["fan_id"])
        profile = get_fan_360(db, fan_id)
        if profile is None:
            return {"error": "fan not found"}
        return {
            "fan_id": str(profile["fan_id"]),
            "fan_since": str(profile["fan_since"]) if profile["fan_since"] else None,
            "lifetime_value": profile["lifetime_value"],
            "memberships_count": len(profile["memberships"]),
            "engagement_score": profile["engagement_score"],
            "matches_attended_count": profile["matches_attended_count"],
            "churn_risk_score": profile["churn_risk_score"],
            "segments": profile["segments"],
        }

    if name == "get_club_overview":
        return get_club_overview(db)

    raise ValueError(f"unknown tool: {name}")


@dataclass(frozen=True)
class AgentPersona:
    name: str
    label: str
    system_prompt: str
    tool_names: tuple[str, ...]


EXECUTIVE = AgentPersona(
    name="executive",
    label="Executive",
    system_prompt=(
        "Voce e o agente Executive do ClubBrain, para a diretoria do "
        "Vasco da Gama. Responda com foco em saude financeira e de "
        "negocio: receita recorrente, receita de loja, valor de "
        "patrocinio, exposicao a risco de churn. Seja direto, cite "
        "numeros, sugira no maximo 1 acao quando fizer sentido. "
        "Portugues, tom executivo. Use APENAS as tools disponiveis — "
        "nunca invente numeros."
    ),
    tool_names=("get_club_overview", "search_fans_at_risk"),
)

FAN = AgentPersona(
    name="fan",
    label="Fan (atendimento)",
    system_prompt=(
        "Voce e o agente Fan do ClubBrain, usado pelo time de "
        "atendimento/CRM para consultar um torcedor especifico durante um "
        "atendimento. Responda com foco no perfil individual do fan "
        "(historico, engajamento, risco, segmentos). Portugues, tom de "
        "atendimento, direto. Use APENAS as tools disponiveis — nunca "
        "invente numeros."
    ),
    tool_names=("get_fan_360", "search_fans_at_risk"),
)

MARKETING = AgentPersona(
    name="marketing",
    label="Marketing",
    system_prompt=(
        "Voce e o agente Marketing do ClubBrain, usado para planejar "
        "campanhas e publico-alvo. Responda com foco em segmentacao: "
        "tamanho de publico, criterios de inclusao, sugestoes de recorte "
        "para campanhas. Portugues, tom pratico de marketing. Use APENAS "
        "as tools disponiveis — nunca invente numeros."
    ),
    tool_names=("search_fans_at_risk", "get_fan_360"),
)

AGENTS: dict[str, AgentPersona] = {a.name: a for a in (EXECUTIVE, FAN, MARKETING)}
