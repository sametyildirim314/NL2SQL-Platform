from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="NL2SQL AI Backend", version="0.1.0")


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "ai-backend"})


@app.get("/")
async def root() -> JSONResponse:
    return JSONResponse({"message": "NL2SQL AI Backend çalışıyor"})
