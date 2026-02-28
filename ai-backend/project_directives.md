# SYSTEM CONTEXT & IMPLEMENTATION DIRECTIVE FOR AI CODER AGENT

## 1. PROJECT OVERVIEW
**Project:** NL2SQL (Natural Language to SQL) AI Backend Engine.
**Role:** You are the AI Backend Developer Agent. Your task is to build a standalone, secure, and explainable NL2SQL microservice.
**Tech Stack:** Python 3.10+, FastAPI, LangGraph, LangChain, Pydantic, local LLM inference.
**Target Model:** `llama3.1:8b-instruct-q4_K_M` (Locally hosted, accessed via Ollama/vLLM bindings).

## 2. ARCHITECTURAL CONSTRAINTS & WORKSPACE
* **Workspace:** ALL development, files, and scripts MUST be created strictly inside the `/ai-backend` directory. Do not modify or create files outside of this root folder.
* **Isolation:** This is a backend-only AI service. Do NOT build frontends.
* **Asynchronous:** All API endpoints and LLM calls must be async (`async def`, `ainvoke`).
* **No Direct DB Execution:** The AI Backend DOES NOT execute the query on the production database. It only generates, validates, and explains the SQL. 
* **Security Strictness:** The system MUST strictly block any DML operations (INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER) via AST parsing and Regex before returning the query.

## 3. DIRECTORY STRUCTURE
Implement the project using the following modular structure inside `/ai-backend`:

```text
/ai-backend
├── main.py                 # FastAPI application instance and router inclusion
├── requirements.txt        # Project dependencies
├── core/
│   ├── config.py           # Environment variables and settings (LLM URL, etc.)
│   └── security.py         # AST/Regex SQL validation logic (DML blocking)
├── api/
│   ├── routes.py           # FastAPI endpoints (/api/v1/...)
│   └── schemas.py          # Pydantic models (Request/Response)
├── agent/
│   ├── graph.py            # LangGraph StateGraph definition, edges, and compilation
│   ├── nodes.py            # Node functions (retrieve, generate, validate, explain)
│   ├── state.py            # AgentState TypedDict definition
│   └── prompts.py          # System prompt templates
└── services/
    ├── llm.py              # LLM binding configurations (e.g., ChatOllama)
    └── retriever.py        # Mock RAG/VectorDB logic (SchemaRetriever)
4. LANGGRAPH STATE MACHINE DESIGN
4.1 State Definition (agent/state.py)
Python
from typing import TypedDict

class AgentState(TypedDict):
    question: str
    relevant_schema: str
    generated_sql: str
    validation_error: str | None
    explanation: str
    retry_count: int
4.2 Graph Routing & Logic (agent/graph.py & agent/nodes.py)
Node 1: retrieve_schema_node: Fetches relevant DDL/Schema based on the question (use mock data for now). Updates state["relevant_schema"].

Node 2: generate_sql_node: Calls llama3.1:8b. Injects schema. If validation_error exists, instructs the model to fix it. Updates state["generated_sql"].

Node 3: validate_sql_node: Validates generated_sql. If valid, validation_error = None. If invalid (DML detected or syntax error), sets validation_error.

Node 4: explain_sql_node: Calls LLM to explain the logic of the validated SQL. Updates state["explanation"].

Conditional Logic: After validate_sql_node, if validation_error is not None AND retry_count < 3, route back to generate_sql_node. Otherwise, proceed to explain_sql_node or return an error.

5. SYSTEM PROMPT TEMPLATES (agent/prompts.py)
The llama3.1:8b-instruct model can be chatty. You MUST use strict system prompts to force pure outputs.

SQL Generation Prompt:

Plaintext
You are an expert SQL Data Analyst AI. 
Your goal is to generate a highly optimized, syntactically correct SQL query based on the user's question and the provided database schema.

SCHEMA:
{schema}

RULES:
1. ONLY return the raw SQL query.
2. DO NOT wrap the SQL in markdown blocks (no ```sql).
3. DO NOT add any explanations, greetings, or conversational text.
4. STRICTLY PROHIBITED: Any DML statements (INSERT, UPDATE, DELETE, DROP, TRUNCATE). Use SELECT only.
5. PREVIOUS ERROR TO FIX (If any): {validation_error}

USER QUESTION: {question}
Explain SQL Prompt:

Plaintext
You are a Data Translator. 
Explain the logic of the following SQL query in simple, non-technical natural language. 
Briefly explain which tables were used, what filters were applied, and what the final output represents.
Keep it under 3 sentences.

SQL QUERY:
{sql_query}

USER QUESTION:
{question}
6. API CONTRACTS (api/schemas.py & api/routes.py)
Python
from pydantic import BaseModel, Field

class NL2SQLRequest(BaseModel):
    query: str = Field(..., example="Hangi departmanda en çok çalışan var?")
    user_id: str | None = None

class NL2SQLResponse(BaseModel):
    sql_query: str | None
    explanation: str | None
    error: str | None
    status: str = Field(..., example="success|failed")
7. EXECUTION DIRECTIVES FOR THE AI AGENT
Acknowledge and Setup: Read this entire context. Create the /ai-backend directory and standard requirements.txt.

Scaffold: Create all the subdirectories and blank .py files defined in Section 3.

Implement Iteratively: Implement the models, then the LLM/Retriever services, then the LangGraph nodes/graph, and finally tie them together in the FastAPI routes.

No Placeholders for Core Logic: Write actual functional code for LangChain/LangGraph bindings, using ChatOllama (or similar) pointed to http://localhost:11434. You may mock the actual VectorDB data, but the architectural plumbing must be real.