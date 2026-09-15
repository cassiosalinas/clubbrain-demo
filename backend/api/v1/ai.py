"""Natural-language endpoint over the knowledge graph (GraphRAG entry point).

Known Alpha simplification, same pattern as clubbrain-alpha's `/ai/ask`:
this assembles an answer from the controlled tools below plus a fixed
template — it does NOT call the Anthropic API yet. That swap is isolated
to this file; the AIAskResponse contract does not change when it happens.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from backend.agents.tools import search_fans_at_risk
from backend.schemas import AIAskRequest, AIAskResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/ask", response_model=AIAskResponse)
def ask(request: AIAskRequest):
    used_tools = ["search_fans_at_risk"]
    at_risk = search_fans_at_risk(min_risk_score=0.7)

    answer = (
        f"Encontrei {len(at_risk)} torcedor(es) com socio ativo e risco de "
        f"cancelamento >= 0.7. Pergunta original: \"{request.question}\". "
        "(Resposta gerada por template — integracao com Claude API para "
        "GraphRAG completo e o proximo passo, ver README.md.)"
    )

    return AIAskResponse(
        answer=answer,
        used_tools=used_tools,
        generated_at=datetime.now(timezone.utc),
    )
