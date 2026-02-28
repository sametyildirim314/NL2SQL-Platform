"""
Pydantic request / response models for the NL2SQL API.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class NL2SQLRequest(BaseModel):
    """Incoming natural-language query."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        examples=["Hangi departmanda en çok çalışan var?"],
    )
    user_id: str | None = Field(
        default=None,
        description="Optional caller identifier for auditing.",
    )


class NL2SQLResponse(BaseModel):
    """Response containing the generated SQL, explanation, or error."""

    sql_query: str | None = Field(
        default=None,
        description="The generated SQL query (SELECT only).",
    )
    explanation: str | None = Field(
        default=None,
        description="Plain-language explanation of the SQL logic.",
    )
    error: str | None = Field(
        default=None,
        description="Error message if the pipeline failed.",
    )
    status: str = Field(
        ...,
        examples=["success", "failed"],
        description="Overall request status.",
    )
