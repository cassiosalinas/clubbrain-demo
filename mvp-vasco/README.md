# MVP Vasco (ClubBrain)

Backend real do ClubBrain para o Vasco da Gama — ver `CLAUDE.md` para o
brief completo do projeto e `docs/architecture/vision.md` para decisões
de arquitetura e simplificações deliberadas do Alpha.

Stack: FastAPI + PostgreSQL (Identity) + Neo4j (Knowledge Graph) +
Claude API (Intelligence — ver vision.md item 1; requer
`ANTHROPIC_API_KEY` no `.env`, senão cai num template de texto fixo).

## Rodando localmente (5 minutos)

```bash
cp .env.example .env
docker compose up --build
```

Isso sobe Postgres (schema de `database/migrations/001_init.sql` aplicado
automaticamente), Neo4j (browser em `http://localhost:7474`, user
`neo4j` / senha `vasco12345`) e o backend em `http://localhost:8000`.

Aplique as constraints/índices do grafo (uma vez, contra o Neo4j subindo
local ou Aura):

```bash
docker compose exec neo4j cypher-shell -u neo4j -p vasco12345 -f /dev/stdin < ontology/vasco_neo4j_schema.cypher
```

Popule com dados fictícios (Postgres + Neo4j):

```bash
docker compose exec backend python -m database.seed.seed
```

O script imprime um `club_id`. Verifique o marco do "Dia 1":

```bash
curl "http://localhost:8000/health"
curl "http://localhost:8000/api/v1/segments/at-risk?min_score=0.7"
```

Docs interativas: `http://localhost:8000/docs`

Demo visual: `http://localhost:8000/demo/` (redireciona pro Cockpit).
Servida pelo próprio backend (mesma origem) de propósito — rodando atrás
do proxy de porta do GitHub Codespaces, um POST feito de uma origem
diferente (ex. um `http.server` numa outra porta) tem seu preflight CORS
bloqueado pelo proxy antes de chegar no FastAPI. Same-origin evita o
problema inteiro.

- `cockpit.html` — KPIs do clube, fãs em risco, Fan 360, chat com os
  agentes (Executive/Fan/Marketing/genérico)
- `fan-explorer.html` — versão anterior, mais crua, só lista+detalhe+pergunta

## Estrutura

```
mvp-vasco/
├── ontology/
│   ├── vasco_sports_ontology_v1.yaml   ← 26 objetos, 6 domínios
│   └── vasco_neo4j_schema.cypher       ← constraints/índices do grafo
├── backend/
│   ├── main.py                ← junta os routers
│   ├── api/v1/                ← fans.py, segments.py, ai.py, agents.py
│   ├── agents/
│   │   ├── tools.py           ← tools controladas (única porta pra IA)
│   │   ├── personas.py        ← Executive/Fan/Marketing (CLAUDE.md camada 6)
│   │   └── runner.py          ← loop de tool-use do Claude (compartilhado)
│   ├── graph/neo4j_client.py  ← único ponto de acesso ao driver Neo4j
│   ├── models/                ← SQLAlchemy (Identity layer)
│   └── schemas.py             ← contrato Pydantic da API
├── database/
│   ├── migrations/001_init.sql
│   └── seed/seed.py           ← gera ~500 fãs fictícios (pseudonimizados)
├── docs/architecture/vision.md
└── frontend/                  ← plugar demo.clubbrain.ai aqui depois
```

## Endpoints do Alpha (SEE + começo de UNDERSTAND)

- `GET /api/v1/fans/{fan_id}/360` — identidade + memberships (Postgres) +
  engajamento/risco/segmentos (Neo4j)
- `GET /api/v1/segments/at-risk?min_score=0.7` — busca de segmento
- `POST /api/v1/ai/ask` — pergunta em linguagem natural, persona
  genérica com acesso a todas as tools (chama a Claude API de verdade
  com `ANTHROPIC_API_KEY` configurada, senão cai num template)
- `GET /api/v1/agents` — lista os agentes especializados disponíveis
- `POST /api/v1/agents/{executive|fan|marketing}/ask` — mesma mecânica,
  mas cada persona só enxerga um subconjunto de tools e tem um system
  prompt focado (ver `backend/agents/personas.py`)
- `GET /api/v1/club/overview` — métricas agregadas (MRR, receita de
  loja, patrocínio, fãs em risco) sem passar pelo LLM — usado pelo
  Cockpit e pela tool `get_club_overview` do agente Executive

## Status

Ontologia, schema do grafo, backend completo (Fan 360, segmentos, IA
genérica + 3 agentes especializados), seed cobrindo os 6 domínios da
ontologia, e um frontend de demo (`/demo/fan-explorer.html`) — tudo
rodado e verificado via GitHub Codespaces (ver `CLAUDE.md` para o brief
original). Ainda não plugado: front-end real (`demo.clubbrain.ai`) e
deploy em produção (Neo4j Aura + Supabase + Railway — recomendado no
`CLAUDE.md`, ainda não configurado).
