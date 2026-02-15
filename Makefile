# CodeIntel Development Makefile
# Usage: make [target]

.PHONY: f b all logs restart down status clean help

# Default target - rebuild frontend
f frontend:
	@echo "Rebuilding frontend..."
	@docker compose build frontend
	@docker compose up -d frontend
	@echo "Done"

b backend:
	@echo "Rebuilding backend..."
	@docker compose build backend
	@docker compose up -d backend
	@echo "Done"

all:
	@docker compose build
	@docker compose up -d

up:
	@docker compose up -d

down:
	@docker compose down

restart:
	@docker compose restart

logs:
	@docker compose logs -f frontend

logs-backend:
	@docker compose logs -f backend

status ps:
	@docker compose ps

clean:
	@echo "Full rebuild (slow)..."
	@docker compose build --no-cache
	@docker compose up -d

help:
	@echo "make f          - Rebuild frontend (~10s)"
	@echo "make b          - Rebuild backend"
	@echo "make all        - Rebuild everything"
	@echo "make up         - Start services"
	@echo "make down       - Stop services"
	@echo "make logs       - Frontend logs"
	@echo "make status     - Container status"
	@echo "make clean      - Full rebuild (slow)"
