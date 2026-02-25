$ErrorActionPreference = "Stop"

$postgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "nl2sql_user" }
$postgresDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "nl2sql" }
$redisPassword = if ($env:REDIS_PASSWORD) { $env:REDIS_PASSWORD } else { "CHANGE_ME_redis_password_here" }

Write-Host "[1/8] Docker Compose service status" -ForegroundColor Cyan
docker compose ps

Write-Host "[2/8] PostgreSQL health (pg_isready)" -ForegroundColor Cyan
docker compose exec -T postgres sh -lc "pg_isready -U $postgresUser -d $postgresDb"

Write-Host "[3/8] Redis health (PING)" -ForegroundColor Cyan
docker compose exec -T redis sh -lc "redis-cli -a $redisPassword ping"

Write-Host "[4/8] AI Backend /health" -ForegroundColor Cyan
$ai = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
Write-Host "AI Backend status: $($ai.StatusCode)" -ForegroundColor Green

Write-Host "[5/8] Core Backend /health" -ForegroundColor Cyan
$core = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing
Write-Host "Core Backend status: $($core.StatusCode)" -ForegroundColor Green

Write-Host "[6/8] Frontend /health" -ForegroundColor Cyan
$fe = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
Write-Host "Frontend status: $($fe.StatusCode)" -ForegroundColor Green

Write-Host "[7/8] Core -> AI internal network call" -ForegroundColor Cyan
docker compose exec -T core-backend sh -lc "wget -qO- http://ai-backend:8000/health"

Write-Host "[8/8] Frontend -> Core internal network call" -ForegroundColor Cyan
docker compose exec -T frontend sh -lc "wget -qO- http://core-backend:8001/health"

Write-Host "Smoke test passed: all checks completed." -ForegroundColor Green
