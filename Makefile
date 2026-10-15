.PHONY: setup db api web migrate seed import-form check format test openapi up down review-config review-up review-down
setup:
	npm ci
	uv sync --project services/api --frozen
db:
	docker compose --env-file .env -f infra/compose.yaml up -d db --wait
migrate:
	uv run --project services/api alembic -c services/api/alembic.ini upgrade head
seed:
	uv run --project services/api python scripts/seed_reference.py reference-data/declaration-profiles.json
import-form:
	uv run --project services/api python scripts/import_excel_form.py "example/FORM MẪU EXCEL LÀM WEB_V2.xls" reference-data/excel-layouts/original-form-xls-v9.json --retire-profile original-form-xls-v8 --retire-profile original-form-xls-v7 --retire-profile original-form-xls-v6 --retire-profile original-form-xls-v5 --retire-profile original-form-xls-v4
api:
	uv run --project services/api uvicorn ecus_api.main:create_app --factory --reload --host 127.0.0.1 --port 8000
web:
	npm run dev
openapi:
	npm run api:generate
check:
	uv run --project services/api ruff check services/api scripts
	uv run --project services/api ruff format --check services/api scripts
	uv run --project services/api mypy --config-file services/api/pyproject.toml services/api/src
	npm run lint
	npm run format:check
	npm run typecheck
	npm run api:check
format:
	uv run --project services/api ruff check --fix services/api scripts
	uv run --project services/api ruff format services/api scripts
test:
	uv run --project services/api pytest services/api/tests
	npm test
up:
	docker compose --env-file .env -f infra/compose.yaml --profile app up -d --build --wait
down:
	docker compose --env-file .env -f infra/compose.yaml --profile app down --remove-orphans
review-config:
	uv run --project services/api python scripts/setup_review_gateway.py
review-up: review-config
	docker compose --env-file .env -f infra/compose.yaml -f infra/compose.review.yaml --profile app up -d --build --wait
	uv run --project services/api python scripts/setup_review_gateway.py --connect-tunnel
review-down:
	docker compose --env-file .env -f infra/compose.yaml -f infra/compose.review.yaml --profile app down
