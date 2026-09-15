"""Shared Claude tool-use loop.

Extracted so every agent persona endpoint (backend/api/v1/ai.py's single
generic endpoint, backend/api/v1/agents.py's Executive/Fan/Marketing
personas) runs the exact same bounded tool-calling loop instead of each
keeping its own copy that could drift.
"""

import json
import os
from datetime import datetime, timezone
from typing import Callable

from anthropic import Anthropic

from backend.schemas import AIAskResponse

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-5"
MAX_TOOL_TURNS = 4


def has_api_key() -> bool:
    return bool(ANTHROPIC_API_KEY)


def run_tool_loop(
    system_prompt: str,
    tool_schemas: list[dict],
    execute_tool: Callable[[str, dict], dict],
    question: str,
) -> AIAskResponse:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    used_tools: list[str] = []
    messages = [{"role": "user", "content": question}]

    for _ in range(MAX_TOOL_TURNS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system_prompt,
            tools=tool_schemas,
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
            result = execute_tool(block.name, block.input)
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
