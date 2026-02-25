#!/usr/bin/env bash
set -euo pipefail

echo "[1/10] Docker Compose service status"
docker compose ps

if [[ -f .env ]]; then
  set -a
  source <(sed 's/\r$//' .env)
  set +a
fi

POSTGRES_USER_VAL="${POSTGRES_USER:-nl2sql_user}"
POSTGRES_DB_VAL="${POSTGRES_DB:-nl2sql}"
REDIS_PASSWORD_VAL="${REDIS_PASSWORD:-CHANGE_ME_redis_password_here}"

echo "[2/10] Waiting for postgres and redis to become healthy"
for i in {1..30}; do
  PG_OK=0
  REDIS_OK=0

  if docker compose exec -T postgres sh -lc "pg_isready -U ${POSTGRES_USER_VAL} -d ${POSTGRES_DB_VAL}" >/dev/null 2>&1; then
    PG_OK=1
  fi

  if docker compose exec -T redis sh -lc "redis-cli -a ${REDIS_PASSWORD_VAL} ping" 2>/dev/null | grep -q PONG; then
    REDIS_OK=1
  fi

  if [[ "$PG_OK" -eq 1 && "$REDIS_OK" -eq 1 ]]; then
    break
  fi

  sleep 2
  if [[ "$i" -eq 30 ]]; then
    echo "Postgres/Redis healthy durumuna geçemedi"
    exit 1
  fi
done

echo "[3/10] PostgreSQL health (pg_isready)"
docker compose exec -T postgres sh -lc "pg_isready -U ${POSTGRES_USER_VAL} -d ${POSTGRES_DB_VAL}"

echo "[4/10] Redis health (PING)"
docker compose exec -T redis sh -lc "redis-cli -a ${REDIS_PASSWORD_VAL} ping"

echo "[5/10] AI Backend /health"
curl -fsS http://localhost:8000/health

echo
echo "[6/10] Core Backend /health"
curl -fsS http://localhost:8001/health

echo
echo "[7/10] Frontend /health"
curl -fsS http://localhost:3000/health

echo
echo "[8/10] Core -> AI internal network call"
docker compose exec -T core-backend sh -lc "wget -qO- http://ai-backend:8000/health"

echo
echo "[9/10] Frontend -> Core internal network call"
docker compose exec -T frontend sh -lc "wget -qO- http://core-backend:8001/health"

echo
echo "[10/10] Final compose status"
docker compose ps

echo "Smoke test passed: all checks completed."
