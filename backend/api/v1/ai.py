"""Generic natural-language endpoint over the knowledge graph.

Kept as a stable, unrestricted-persona endpoint (both tools available)
for backward compatibility with existing callers (frontend/fan-explorer.html
included) — the three specialized personas (Executive/Fan/Marketing) live
in backend/api/v1/agents.py and share the same runner/tool machinery.
Calls the real Claude API with a small tool-use loop when
ANTHROPIC_API_KEY is set; falls back to a fixed-template answer otherwise.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.agents.personas import TOOL_SCHEMAS, execute_tool
from backend.agents.runner import has_api_key, run_tool_loop
from backend.agents.tools import search_fans_at_risk
from backend.database import get_db
from backend.schemas import AIAskRequest, AIAskResponse

router = APIRouter(prefix="/ai", tags=["ai"])

TOOLS = [TOOL_SCHEMAS["search_fans_at_risk"], TOOL_SCHEMAS["get_fan_360"]]

SYSTEM_PROMPT = (
    "Voce e o assistente de inteligencia do ClubBrain para o Vasco da Gama. "
    "Responda em portugues, de forma direta, citando os numeros que "
    "encontrar. Use APENAS as tools disponiveis para obter dados — nunca "
    "invente numeros nem descreva dados que nao vieram de uma tool."
)


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
    if not has_api_key():
        return _template_answer(request)

    return run_tool_loop(
        system_prompt=SYSTEM_PROMPT,
        tool_schemas=TOOLS,
        execute_tool=lambda name, tool_input: execute_tool(db, name, tool_input),
        question=request.question,
    )
