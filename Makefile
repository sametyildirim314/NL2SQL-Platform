# ============================================================
# Makefile – NL2SQL Platform Komutları
# ============================================================

.PHONY: help dev up down build logs clean deploy-k8s

help: ## Bu yardım mesajını göster
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Docker Compose ───

dev: ## Geliştirme ortamını başlat (tüm servisler)
	docker compose up -d --build
	@echo "\n✅ Tüm servisler ayağa kalktı:"
	@echo "   Frontend:     http://localhost:3000"
	@echo "   Core API:     http://localhost:8001"
	@echo "   AI Backend:   http://localhost:8000"
	@echo "   PostgreSQL:   localhost:5432"
	@echo "   Redis:        localhost:6379"

up: ## Servisleri başlat (build olmadan)
	docker compose up -d

down: ## Tüm servisleri durdur
	docker compose down

build: ## Tüm image'ları yeniden derle
	docker compose build --no-cache

logs: ## Tüm servislerin loglarını izle
	docker compose logs -f

logs-ai: ## AI Backend loglarını izle
	docker compose logs -f ai-backend

logs-core: ## Core Backend loglarını izle
	docker compose logs -f core-backend

ps: ## Çalışan container'ları listele
	docker compose ps

clean: ## Tüm container'ları, volume'ları ve image'ları temizle
	docker compose down -v --rmi all --remove-orphans
	docker system prune -f

restart: ## Tüm servisleri yeniden başlat
	docker compose restart

# ─── Health Checks ───

health: ## Tüm servislerin sağlık durumunu kontrol et
	@echo "=== Health Checks ==="
	@curl -sf http://localhost:8000/health && echo "✅ AI Backend: OK" || echo "❌ AI Backend: DOWN"
	@curl -sf http://localhost:8001/health && echo "✅ Core Backend: OK" || echo "❌ Core Backend: DOWN"
	@curl -sf http://localhost:3000/health && echo "✅ Frontend: OK" || echo "❌ Frontend: DOWN"

# ─── Database ───

db-shell: ## PostgreSQL shell'e bağlan
	docker compose exec postgres psql -U nl2sql_user -d nl2sql

redis-cli: ## Redis CLI'ye bağlan
	docker compose exec redis redis-cli

# ─── Kubernetes ───

deploy-k8s: ## Kubernetes'e deploy et
	kubectl apply -f k8s/base/namespace.yaml
	kubectl apply -f k8s/base/configmap.yaml
	kubectl apply -f k8s/base/secrets.yaml
	kubectl apply -f k8s/base/postgres.yaml
	kubectl apply -f k8s/base/redis.yaml
	kubectl apply -f k8s/base/ai-backend.yaml
	kubectl apply -f k8s/base/core-backend.yaml
	kubectl apply -f k8s/base/frontend.yaml
	kubectl apply -f k8s/base/ingress.yaml
	@echo "\n✅ Kubernetes deployment tamamlandı."

k8s-status: ## Kubernetes deployment durumunu göster
	kubectl -n nl2sql get all

k8s-logs-ai: ## K8s AI Backend logları
	kubectl -n nl2sql logs -f -l app.kubernetes.io/name=ai-backend

k8s-logs-core: ## K8s Core Backend logları
	kubectl -n nl2sql logs -f -l app.kubernetes.io/name=core-backend

# ─── Monitoring ───

monitoring-up: ## Monitoring stack'i başlat (Prometheus)
	docker compose --profile monitoring up -d
