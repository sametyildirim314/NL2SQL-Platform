"""
API route definitions for the NL2SQL microservice.

Wired to the real LangGraph agent pipeline.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from agent.graph import agent
from api.schemas import NL2SQLRequest, NL2SQLResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["NL2SQL"])


@router.post(
    "/generate-sql",
    response_model=NL2SQLResponse,
    summary="Translate a natural-language question into a validated SQL query.",
)
async def generate_sql(request: NL2SQLRequest) -> NL2SQLResponse:
    """Accept a natural-language question, run the LangGraph NL2SQL agent,
    and return the generated SQL with a plain-language explanation.
    """
    logger.info(
        "generate-sql called | user_id=%s | question=%s",
        request.user_id,
        request.query[:80],
    )

    # Seed the initial agent state
    initial_state = {
        "question": request.query,
        "relevant_schema": "",
        "generated_sql": "",
        "validation_error": None,
        "explanation": "",
        "retry_count": 0,
    }

    try:
        result = await agent.ainvoke(initial_state)
    except Exception:
        logger.exception("Agent pipeline failed")
        return NL2SQLResponse(
            sql_query=None,
            explanation=None,
            error="Internal agent error. Please try again later.",
            status="failed",
        )

    # If the agent exhausted retries, validation_error will still be set
    if result.get("validation_error"):
        return NL2SQLResponse(
            sql_query=None,
            explanation=None,
            error=f"SQL validation failed after retries: {result['validation_error']}",
            status="failed",
        )

    return NL2SQLResponse(
        sql_query=result["generated_sql"],
        explanation=result.get("explanation", ""),
        error=None,
        status="success",
    )
