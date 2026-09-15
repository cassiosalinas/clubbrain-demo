"""Persona-specific agent endpoints: Executive, Fan, Marketing.

CLAUDE.md's Agents layer ("2-3 agentes: Executive, Fan, Marketing")
implemented as one route per persona (backend/agents/personas.py),
sharing the same tool-use loop as the generic /ai/ask endpoint. A
persona only ever gets the subset of controlled tools listed in its own
AgentPersona.tool_names.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.agents.personas import AGENTS, TOOL_SCHEMAS, execute_tool
from backend.agents.runner import has_api_key, run_tool_loop
from backend.agents.tools import search_fans_at_risk
from backend.database import get_db
from backend.schemas import AIAskRequest, AIAskResponse

router = APIRouter(prefix="/agents", tags=["agents"])


def _template_answer(agent_name: str, request: AIAskRequest) -> AIAskResponse:
    at_risk = search_fans_at_risk(min_risk_score=0.7)
    answer = (
        f"[agente {agent_name} — ANTHROPIC_API_KEY nao configurada, resposta "
        f"por template] Encontrei {len(at_risk)} torcedor(es) com socio "
        f"ativo e risco de cancelamento >= 0.7. Pergunta original: "
        f"\"{request.question}\"."
    )
    return AIAskResponse(
        answer=answer,
        used_tools=["search_fans_at_risk"],
        generated_at=datetime.now(timezone.utc),
    )


@router.get("")
def list_agents():
    return [{"name": a.name, "label": a.label} for a in AGENTS.values()]


@router.post("/{agent_name}/ask", response_model=AIAskResponse)
def ask_agent(agent_name: str, request: AIAskRequest, db: Session = Depends(get_db)):
    persona = AGENTS.get(agent_name)
    if persona is None:
        raise HTTPException(status_code=404, detail=f"unknown agent: {agent_name}")

    if not has_api_key():
        return _template_answer(persona.name, request)

    tool_schemas = [TOOL_SCHEMAS[name] for name in persona.tool_names]
    return run_tool_loop(
        system_prompt=persona.system_prompt,
        tool_schemas=tool_schemas,
        execute_tool=lambda name, tool_input: execute_tool(db, name, tool_input),
        question=request.question,
    )
