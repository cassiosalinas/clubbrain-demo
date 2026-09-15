# MVP Vasco (ClubBrain)

Backend real do ClubBrain para o Vasco da Gama — ver `CLAUDE.md` para o
brief completo do projeto e `docs/architecture/vision.md` para decisões
de arquitetura e simplificações deliberadas do Alpha.

Stack: FastAPI + PostgreSQL (Identity) + Neo4j (Knowledge Graph) +
Claude API (Intelligence, ainda não conectada — ver vision.md item 1).

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

Demo visual (Fan Explorer — lista fãs em risco, Fan 360, pergunta à IA):
`http://localhost:8000/demo/fan-explorer.html`. Servida pelo próprio
backend (mesma origem) de propósito — rodando atrás do proxy de porta do
GitHub Codespaces, um POST feito de uma origem diferente (ex. um
`http.server` numa outra porta) tem seu preflight CORS bloqueado pelo
proxy antes de chegar no FastAPI. Same-origin evita o problema inteiro.

## Estrutura

```
mvp-vasco/
├── ontology/
│   ├── vasco_sports_ontology_v1.yaml   ← 26 objetos, 6 domínios
│   └── vasco_neo4j_schema.cypher       ← constraints/índices do grafo
├── backend/
│   ├── main.py                ← junta os routers
│   ├── api/v1/                ← fans.py, segments.py, ai.py
│   ├── agents/tools.py        ← tools controladas (única porta pra IA)
│   ├── graph/neo4j_client.py  ← único ponto de acesso ao driver Neo4j
│   ├── models/                ← SQLAlchemy (Identity layer)
│   └── schemas.py             ← contrato Pydantic da API
├── database/
│   ├── migrations/001_init.sql
│   └── seed/seed.py           ← gera ~500 fãs fictícios (pseudonimizados)
├── docs/architecture/vision.md
└── frontend/                  ← plugar demo.clubbrain.ai aqui depois
```

## Endpoints do Alpha (SEE)

- `GET /api/v1/fans/{fan_id}/360` — identidade + memberships (Postgres) +
  engajamento/risco/segmentos (Neo4j)
- `GET /api/v1/segments/at-risk?min_score=0.7` — busca de segmento
- `POST /api/v1/ai/ask` — pergunta em linguagem natural (ainda sem LLM
  real, ver `docs/architecture/vision.md`)

## Status

Este é o primeiro commit: ontologia, schema do grafo, scaffolding do
backend e seed fictício. **Nada foi rodado/testado ainda neste ambiente**
(sem Docker/Python disponíveis localmente) — precisa rodar
`docker compose up --build` e o seed antes de confiar em qualquer
endpoint. Ver "Primeiras tarefas concretas" em `CLAUDE.md` para os
próximos passos (conectar ao front existente, integrações reais).
