"""
LangGraph node functions for the NL2SQL agent.

Each node receives the full ``AgentState`` and returns a *partial* dict
of state updates that LangGraph merges back into the state.
"""
from __future__ import annotations

import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from agent.prompts import SQL_EXPLAIN_PROMPT, SQL_GENERATION_PROMPT
from agent.state import AgentState
from core.security import validate_sql
from services.llm import get_llm
from services.retriever import SchemaRetriever

logger = logging.getLogger(__name__)

# Shared retriever instance
_retriever = SchemaRetriever()


# ---------------------------------------------------------------------------
# Node 1 – Retrieve relevant schema DDL
# ---------------------------------------------------------------------------
async def retrieve_schema_node(state: AgentState) -> dict:
    """Fetch DDL / schema context relevant to the user's question."""

    question: str = state["question"]
    logger.info("retrieve_schema_node | question=%s", question[:80])

    schema = await _retriever.retrieve(question)

    return {"relevant_schema": schema}


# ---------------------------------------------------------------------------
# Node 2 – Generate SQL via LLM
# ---------------------------------------------------------------------------
async def generate_sql_node(state: AgentState) -> dict:
    """Call the local Llama 3.1 model to generate a SQL query."""

    prompt_text = SQL_GENERATION_PROMPT.format(
        schema=state["relevant_schema"],
        validation_error=state.get("validation_error") or "None",
        question=state["question"],
    )

    logger.info(
        "generate_sql_node | retry_count=%s | has_prev_error=%s",
        state.get("retry_count", 0),
        state.get("validation_error") is not None,
    )

    llm = get_llm()
    response = await llm.ainvoke(
        [
            SystemMessage(content="You are a SQL-only assistant. Output raw SQL and nothing else."),
            HumanMessage(content=prompt_text),
        ]
    )

    raw_sql = _clean_sql(response.content)
    logger.debug("generate_sql_node | raw LLM output: %s", raw_sql)

    return {"generated_sql": raw_sql}


def _clean_sql(text: str) -> str:
    """Strip markdown fences and extraneous whitespace from model output."""

    # Remove ```sql ... ``` blocks if the model wraps anyway
    text = re.sub(r"```(?:sql)?\s*", "", text)
    text = re.sub(r"```", "", text)
    # Collapse to a single statement; trim
    return text.strip()


# ---------------------------------------------------------------------------
# Node 3 – Validate generated SQL (DML blocking + syntax)
# ---------------------------------------------------------------------------
async def validate_sql_node(state: AgentState) -> dict:
    """Run the two-layer security validation on the generated SQL."""

    sql = state["generated_sql"]
    logger.info("validate_sql_node | sql=%s", sql[:120])

    result = validate_sql(sql)

    if result.is_valid:
        logger.info("validate_sql_node | PASS")
        return {"validation_error": None}

    retry = state.get("retry_count", 0) + 1
    logger.warning(
        "validate_sql_node | FAIL (%s) | retry_count=%s",
        result.error,
        retry,
    )
    return {
        "validation_error": result.error,
        "retry_count": retry,
    }


# ---------------------------------------------------------------------------
# Node 4 – Explain the validated SQL in plain language
# ---------------------------------------------------------------------------
async def explain_sql_node(state: AgentState) -> dict:
    """Call the LLM to produce a concise natural-language explanation."""

    prompt_text = SQL_EXPLAIN_PROMPT.format(
        sql_query=state["generated_sql"],
        question=state["question"],
    )

    logger.info("explain_sql_node | generating explanation")

    llm = get_llm()
    response = await llm.ainvoke(
        [
            SystemMessage(content="You are a concise data translator."),
            HumanMessage(content=prompt_text),
        ]
    )

    return {"explanation": response.content.strip()}
