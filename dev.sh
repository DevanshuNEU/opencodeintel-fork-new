#!/bin/bash
# Quick rebuild script for CodeIntel development
# Usage: ./dev.sh [frontend|backend|all]

set -e

cd "$(dirname "$0")"

case "${1:-frontend}" in
  frontend|f)
    echo "🔄 Rebuilding frontend only..."
    docker compose build frontend
    docker compose up -d frontend
    echo "✅ Frontend rebuilt in ~10s"
    ;;
  backend|b)
    echo "🔄 Rebuilding backend only..."
    docker compose build backend
    docker compose up -d backend
    echo "✅ Backend rebuilt"
    ;;
  all|a)
    echo "🔄 Rebuilding all services..."
    docker compose build
    docker compose up -d
    echo "✅ All services rebuilt"
    ;;
  logs|l)
    docker compose logs -f "${2:-frontend}"
    ;;
  restart|r)
    echo "🔄 Restarting ${2:-all} without rebuild..."
    if [ -n "$2" ]; then
      docker compose restart "$2"
    else
      docker compose restart
    fi
    ;;
  down|d)
    docker compose down
    ;;
  status|s)
    docker compose ps
    ;;
  clean)
    echo "⚠️  Full rebuild with no cache..."
    docker compose build --no-cache
    docker compose up -d
    ;;
  *)
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  frontend, f    Rebuild frontend only (~10s)"
    echo "  backend, b     Rebuild backend only (~2min first time, cached after)"
    echo "  all, a         Rebuild all services"
    echo "  logs, l [svc]  Follow logs (default: frontend)"
    echo "  restart, r     Restart without rebuild"
    echo "  down, d        Stop all services"
    echo "  status, s      Show container status"
    echo "  clean          Full rebuild, no cache (slow!)"
    ;;
esac
