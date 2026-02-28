"""
AgentState TypedDict – the shared state flowing through the LangGraph pipeline.
"""
from __future__ import annotations

from typing import TypedDict


class AgentState(TypedDict):
    question: str
    relevant_schema: str
    generated_sql: str
    validation_error: str | None
    explanation: str
    retry_count: int
