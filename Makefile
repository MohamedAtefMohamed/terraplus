.PHONY: setup setup-backend setup-frontend dev backend frontend test test-backend test-frontend lint build docker docker-down reset-demo

setup: setup-backend setup-frontend

setup-backend:
	cd backend && python3 -m venv .venv && .venv/bin/pip install --upgrade pip && .venv/bin/pip install -r requirements-dev.txt

setup-frontend:
	cd frontend && corepack enable && pnpm install

dev:
	./scripts/dev.sh

backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

frontend:
	cd frontend && pnpm dev

test: test-backend test-frontend

test-backend:
	cd backend && .venv/bin/pytest

test-frontend:
	cd frontend && pnpm typecheck && pnpm lint

lint:
	cd backend && .venv/bin/ruff check app tests
	cd frontend && pnpm lint

build:
	cd frontend && pnpm build

docker:
	docker compose up --build

docker-down:
	docker compose down

reset-demo:
	./scripts/reset-demo.sh
