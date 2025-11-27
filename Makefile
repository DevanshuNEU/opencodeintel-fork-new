.PHONY: help dev prod build test clean deploy

# Default target
help:
	@echo "CodeIntel - Development Commands"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev          - Start local dev (uses .env.dev)"
	@echo "  make dev-prod     - Test prod config locally (uses .env.prod)"
	@echo "  make stop         - Stop all services"
	@echo "  make clean        - Stop and remove all containers/volumes"
	@echo "  make logs         - View all logs"
	@echo "  make health       - Check service health"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run backend tests"
	@echo "  make test-ws      - Run WebSocket auth tests only"
	@echo "  make coverage     - Run tests with coverage report"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-backend  - Deploy backend to Railway"
	@echo "  make deploy-frontend - Deploy frontend to Vercel"

# ============================================
# LOCAL DEVELOPMENT
# ============================================

# Development with .env.dev
dev:
	@echo "🚀 Starting LOCAL DEV environment..."
	@cp .env.dev .env
	docker compose up -d --build
	@echo ""
	@echo "✅ Development environment started!"
	@echo "   Backend:  http://localhost:8000"
	@echo "   API Docs: http://localhost:8000/docs"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Redis:    localhost:6379"
	@echo ""
	@echo "View logs: make logs"

# Test production config locally (uses .env.prod)
dev-prod:
	@echo "🚀 Starting LOCAL environment with PROD config..."
	@cp .env.prod .env
	docker compose up -d --build
	@echo ""
	@echo "✅ Prod-config environment started!"
	@echo "   Backend:  http://localhost:8000"
	@echo "   Frontend: http://localhost:3000"

# Stop services
stop:
	docker compose down
	@echo "✅ Services stopped"

# Clean everything (including volumes)
clean:
	docker compose down -v --remove-orphans
	@echo "✅ Cleaned all containers and volumes"

# View logs
logs:
	docker compose logs -f

# Logs for specific service
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# ============================================
# TESTING
# ============================================

# Run all backend tests
test:
	cd backend && python3 -m pytest tests/ -v --no-cov

# Run WebSocket auth tests only
test-ws:
	cd backend && python3 -m pytest tests/test_websocket_auth.py -v --no-cov

# Run tests with coverage
coverage:
	cd backend && python3 -m pytest tests/ --cov=. --cov-report=html --cov-report=term
	@echo ""
	@echo "Coverage report: backend/htmlcov/index.html"

# ============================================
# DEPLOYMENT
# ============================================

# Deploy backend to Railway
deploy-backend:
	@echo "🚀 Deploying backend to Railway..."
	railway up
	@echo "✅ Backend deployed!"

# Deploy frontend to Vercel
deploy-frontend:
	@echo "🚀 Deploying frontend to Vercel..."
	cd frontend && vercel --prod
	@echo "✅ Frontend deployed!"

# Deploy everything
deploy-all: deploy-backend deploy-frontend
	@echo "✅ All services deployed!"

# ============================================
# UTILITIES
# ============================================

# Check service health
health:
	@echo "Checking services..."
	@curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "❌ Backend not responding"
	@curl -s -o /dev/null -w "" http://localhost:3000 && echo "✅ Frontend is up" || echo "❌ Frontend not responding"
	@docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && echo "✅ Redis is up" || echo "❌ Redis not responding"

# Shell into backend container
shell-backend:
	docker compose exec backend bash

# Shell into Redis
shell-redis:
	docker compose exec redis redis-cli

# Quick rebuild backend only
rebuild-backend:
	docker compose up -d --build backend
	@echo "✅ Backend rebuilt and restarted"

# Quick rebuild frontend only  
rebuild-frontend:
	docker compose up -d --build frontend
	@echo "✅ Frontend rebuilt and restarted"
