# Development guide

For reusable rationale and tradeoffs, read the [engineering playbook](engineering-playbook.md).
For a new repository, use the [bootstrap plan](project-bootstrap-plan.md) and adapt the
[instruction and decision templates](project-instructions-template.md). These guides
separate recommended practices from the current [runtime architecture](runtime-architecture.md).

## Plan and finish a change

Start from the operator's behavior, the server invariant and the smallest independent
verification that can prove the result. Implement a vertical slice through schema,
service, API, UI and output when those layers are affected. Preserve original evidence
and historical artifacts. Keep temporary analysis and operational inputs outside Git.

After implementation, report what changed, which checks ran and what remains unverified.
For AI-assisted flows, distinguish accepted proposals, source-value choices, manual
corrections and actual output comparison. A successful mock response does not establish
live model accuracy, and a completed job does not establish business correctness.

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

Framer Motion timing, spring parameters and travel distances belong in the presentation
registry. Shared layout indicators connect selected navigation items; content hooks animate
existing elements rather than remounting feature state on navigation. Keep document
scroll containers and source selection stable. New motion must honor reduced-motion
preferences, including preference changes while an animation is running. Verify tab
changes preserve unsaved state and avoid automatic mutations or extra processing requests.
Decorative loops pause outside the viewport and stop for reduced motion. Default motion
configuration is shared through `MotionRoot`; feature modules do not maintain separate
timing constants. Inspect actual intermediate transforms in browser tests, not only class names.
Keep edge-to-edge rows inside their scrollable bounds: use contained reveal masks and
inward hover scales for list controls. Table rows reveal without translating their layout;
their padded action icons can move independently. Do not hide scrollbars to cover animation
overflow: narrow data tables still need horizontal scrolling. Sample scroll dimensions
during entry, filtering, hover, focus and press, not just after the animation settles.

Use the presentation registry's spacing tokens for inline items, form groups, sections
and responsive panel insets. A panel that paints its own surface needs an inner gutter;
flat table rows can align with that gutter without another layer of padding. Give
instructions, field groups and actions explicit separation instead of relying on browser
paragraph margins, which the base stylesheet resets. Verify narrow layouts and preserve
independent evidence scrolling when changing the workbench structure.

## Add an AI workflow

Create a feature-owned Pydantic schema with explicit nullable fields and `extra="forbid"`. Call the `StructuredAI` interface from a service, not from an HTTP handler. Specify source page/region identifiers in the input and validate returned references. Do not treat model-provided coordinates or HS codes as validated evidence.

Register a job handler during application startup only after its service has version checks and idempotent commits. Use `app.state.jobs.submit(...)` from the application boundary; keep handlers independent of request sessions. AI keys remain in the backend; frontend configuration prefixed with `VITE_` is public.

Tests use `httpx.MockTransport`. Running a provider benchmark is a separate deliberate action, with synthetic or approved documents and an explicit model configuration. No existing customer document is sent during setup or CI.

## Checks and dependencies

Use `uv add --project services/api <package>` for runtime Python dependencies and `uv add --project services/api --group dev <package>` for development dependencies. Use `npm install --workspace @ecus/web <package>` or the appropriate workspace for JavaScript dependencies. Commit the updated lockfiles.

`make check` runs Python lint/format/type checks, web lint/types, and contract drift checks.
`make test` runs backend and frontend unit tests. Run `npm run build` for the production
frontend. Browser tests exercise the real PostgreSQL-backed case flow using the isolated
Compose project described in the root README; run them for operator-flow changes, not
for documentation-only edits. Inspect the actual downloaded artifact when export changes.

Use tests that protect an invariant or a failure/recovery path. Avoid tests that merely
repeat the implementation. Keep paid live evaluations separate from default checks;
record their scope and manual interventions. Always clean up disposable Compose projects
in `finally`, including on failure, without stopping operational or unrelated services.

Do not modify the original planning PDFs, chat export or customer examples. Keep new
source code, comments and technical documentation in English. Localized product copy
belongs in locale resources; operator guides may use the operator's language.
