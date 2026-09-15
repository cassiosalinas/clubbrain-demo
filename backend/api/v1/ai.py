"""Natural-language endpoint over the knowledge graph (GraphRAG entry point).

Calls the real Claude API with a small tool-use loop when
ANTHROPIC_API_KEY is set; falls back to the old template answer
otherwise (e.g. local dev without a key configured). The AI never
touches Postgres/Neo4j directly — only the two controlled tools below,
which wrap backend/agents/tools.py exactly like every other endpoint.
"""

import json
import os
import uuid
from datetime import datetime, timezone

from anthropic import Anthropic
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.agents.tools import get_fan_360, search_fans_at_risk
from backend.database import get_db
from backend.schemas import AIAskRequest, AIAskResponse

router = APIRouter(prefix="/ai", tags=["ai"])

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-5"
MAX_TOOL_TURNS = 4

TOOLS = [
    {
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
    {
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
]

SYSTEM_PROMPT = (
    "Voce e o assistente de inteligencia do ClubBrain para o Vasco da Gama. "
    "Responda em portugues, de forma direta, citando os numeros que "
    "encontrar. Use APENAS as tools disponiveis para obter dados — nunca "
    "invente numeros nem descreva dados que nao vieram de uma tool."
)


def _execute_tool(db: Session, name: str, tool_input: dict) -> dict:
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

    raise ValueError(f"unknown tool: {name}")


def _template_answer(request: AIAskRequest) -> AIAskResponse:
    at_risk = search_fans_at_risk(min_risk_score=0.7)
    answer = (
        "[ANTHROPIC_API_KEY nao configurada — resposta por template] "
        f"Encontrei {len(at_risk)} torcedor(es) com socio ativo e risco de "
        f"cancelamento >= 0.7. Pergunta original: \"{request.question}\"."
    )
    return AIAskResponse(
        answer=answer,
        used_tools=["search_fans_at_risk"],
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/ask", response_model=AIAskResponse)
def ask(request: AIAskRequest, db: Session = Depends(get_db)):
    if not ANTHROPIC_API_KEY:
        return _template_answer(request)

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    used_tools: list[str] = []
    messages = [{"role": "user", "content": request.question}]

    for _ in range(MAX_TOOL_TURNS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            answer_text = "".join(
                block.text for block in response.content if block.type == "text"
            )
            return AIAskResponse(
                answer=answer_text or "(sem resposta)",
                used_tools=used_tools,
                generated_at=datetime.now(timezone.utc),
            )

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            used_tools.append(block.name)
            result = _execute_tool(db, block.name, block.input)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, default=str),
                }
            )
        messages.append({"role": "user", "content": tool_results})

    return AIAskResponse(
        answer="Nao consegui montar uma resposta dentro do limite de chamadas de tools.",
        used_tools=used_tools,
        generated_at=datetime.now(timezone.utc),
    )
