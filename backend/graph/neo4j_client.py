import os

from neo4j import GraphDatabase

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "vasco12345")

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


def run_query(query: str, **params):
    """Execute a read/write Cypher query and return records as dicts.

    This is the ONLY way the rest of the backend (and the AI agent tools)
    is allowed to touch the graph — no driver access outside this module,
    per the "AI never gets direct DB/ontology access" principle.
    """
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, **params)
        return [record.data() for record in result]


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
