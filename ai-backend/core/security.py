"""
SQL security validation – blocks DML/DDL operations via regex + sqlglot AST parsing.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import sqlglot
from sqlglot import exp


# Blacklisted SQL statement types (DML / DDL that mutate data)
_BLOCKED_STATEMENT_TYPES: set[type] = {
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Create,
}

# Quick regex pre-check (case-insensitive) for obviously dangerous keywords
_DML_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|MERGE|REPLACE|EXEC|EXECUTE)\b",
    re.IGNORECASE,
)


@dataclass
class ValidationResult:
    is_valid: bool
    error: str | None = None


def validate_sql(sql: str) -> ValidationResult:
    """Validate that *sql* is a safe, read-only SELECT statement.

    Performs two layers of validation:
    1. **Regex** – fast pre-flight check for clearly dangerous keywords.
    2. **AST**  – parses with sqlglot and inspects statement types.

    Returns a ``ValidationResult`` with ``is_valid=True`` when the query is safe
    or ``is_valid=False`` with a human-readable ``error`` message otherwise.
    """

    cleaned = sql.strip().rstrip(";").strip()
    if not cleaned:
        return ValidationResult(is_valid=False, error="Empty SQL query.")

    # ---- Layer 1: Regex ----
    match = _DML_PATTERN.search(cleaned)
    if match:
        keyword = match.group(0).upper()
        return ValidationResult(
            is_valid=False,
            error=f"Blocked: DML/DDL keyword '{keyword}' detected.",
        )

    # ---- Layer 2: AST parsing via sqlglot ----
    try:
        parsed = sqlglot.parse(cleaned)
    except sqlglot.errors.ParseError as exc:
        return ValidationResult(
            is_valid=False,
            error=f"SQL syntax error: {exc}",
        )

    for statement in parsed:
        if statement is None:
            continue
        for node in statement.walk():
            if type(node) in _BLOCKED_STATEMENT_TYPES:
                return ValidationResult(
                    is_valid=False,
                    error=f"Blocked: {type(node).__name__} statement is not allowed.",
                )

    return ValidationResult(is_valid=True)
