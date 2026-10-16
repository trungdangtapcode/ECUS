# Repository conventions

- Keep source identifiers, comments, API messages and new technical documentation in English.
- Put user-facing text in `apps/web/src/locales/{en,vi}.json`. Render API errors by stable code, never by the server message. Keep locale keys and interpolation variables aligned.
- Write product copy for customs operations staff using the system. Keep private conversation context, development milestones and client acceptance out of interface labels, system-generated review reasons and export notices.
- Keep deployment values in environment configuration. No credentials, model names or customer identifiers in application code. Operational defaults belong in `Settings`, not in feature modules.
- Keep business work within documents → extraction → reconciliation → consolidation → Excel template export. See `docs/runtime-architecture.md` for supported behavior and boundaries. Preserve source material; do not claim formal business approval.
- Keep design variants in the frontend presentation registry. Share API queries, validation and form state across variants; do not import prototype fixtures or remount feature screens when switching designs.
- Load declaration profiles from reference data through the database/API. Do not duplicate allowed procedure lists in frontend or service code. Treat the supplied files as examples, not an authoritative legal dataset.
- Backend flow: HTTP router → feature service → database/provider adapter. Business modules must not depend on transport-specific OpenAI types. Avoid generic repository abstractions until a concrete need exists.
- Generate the TypeScript API contract with `npm run api:generate` after API schema changes; never hand-edit generated files. Commit both lockfiles and generated contracts.
- Use Alembic for schema changes. `metadata.create_all` is reserved for isolated tests. Reference imports are explicit and idempotent.
- Run a single API process/replica while using the in-process job runner. Interrupted jobs are recorded and require an explicit retry. No Celery/Redis without revisiting the architecture decision.
- Tests must mock AI transport and never consume paid API credits by default. Keep customer files, secrets and full document bodies out of logs and fixtures.
- The application is for internal use. Individual authentication, authorization and legal/HS validation are not implemented. See `docs/runtime-architecture.md` for supported extraction, OCR, review and export behavior. Do not expose the unauthenticated API publicly.
- Verify changes with `make check`, `make test`, and `npm run build`. Run browser tests against an isolated Compose project when changing user flows.
- Stop this project's Compose services after each acceptance or test run, including on failure. Preserve the main data volumes; remove only disposable test volumes. Do not stop unrelated projects or the Docker daemon.
- Preserve `statements/`, `example/` and existing planning documents as source material. Do not modify or publish original customer documents.
