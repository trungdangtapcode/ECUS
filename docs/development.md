# Development guide

## Add a backend feature

1. Add a focused module under `services/api/src/ecus_api/modules/` with schemas, service, router and models as needed. Prefer concrete functions over speculative abstractions.
2. Register models in `db/models.py`; import the router in `main.py`.
3. Generate and review a migration using `uv run --project services/api alembic -c services/api/alembic.ini revision --autogenerate -m "describe change"`.
4. Add tests for business behavior and failure paths. Use fixture data with no customer information.
5. Run `make migrate`, `npm run api:generate` and `make check`.

SQLAlchemy sessions are scoped to a request or job transaction. Never share an `AsyncSession` between concurrent tasks. Services own commits; the session dependency only opens and closes the session. Keep original evidence immutable when adding document workflows.

## Add a frontend feature

Place feature-specific pages, queries and forms together under `features/<feature>/`. Use the generated API client, TanStack Query for server state, and existing shared components for consistent controls. Keep protocol errors in the API boundary and display localized error codes.

Add user-facing strings to both locale JSON files. Prefer interpolation over concatenation, format dates/numbers with `Intl`, and set dynamic document/aria labels through translation keys. Locale preference is persisted locally and defaults through `VITE_DEFAULT_LOCALE`.

Reference values come from the API. Labels can be localized by stable reference code; use the supplied English name as fallback for new codes. Do not repeat procedure allowlists in frontend validation.

## Add an AI workflow

Create a feature-owned Pydantic schema with explicit nullable fields and `extra="forbid"`. Call the `StructuredAI` interface from a service, not from an HTTP handler. Specify source page/region identifiers in the input and validate returned references. Do not treat model-provided coordinates or HS codes as validated evidence.

Register a job handler during application startup only after its service has version checks and idempotent commits. Use `app.state.jobs.submit(...)` from the application boundary; keep handlers independent of request sessions. AI keys remain in the backend; frontend configuration prefixed with `VITE_` is public.

Tests use `httpx.MockTransport`. Running a provider benchmark is a separate deliberate action, with synthetic or approved documents and an explicit model configuration. No existing customer document is sent during setup or CI.

## Checks and dependencies

Use `uv add --project services/api <package>` for runtime Python dependencies and `uv add --project services/api --group dev <package>` for development dependencies. Use `npm install --workspace @ecus/web <package>` or the appropriate workspace for JavaScript dependencies. Commit the updated lockfiles.

`make check` runs Python lint/format/type checks, web lint/types, and contract drift checks. `make test` runs backend and locale tests. Browser tests exercise the real PostgreSQL-backed case flow using the isolated Compose project described in the root README.

Do not modify the original planning PDFs, chat export or customer examples. Keep all new source code, comments and developer documentation in English; Vietnamese is confined to localization resources and intentionally preserved business source material.
